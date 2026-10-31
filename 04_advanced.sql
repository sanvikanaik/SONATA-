-- =====================================================================
-- SONATA : 04_advanced.sql   (run AFTER 01_schema.sql and 02_seed.sql)
-- Contains: functions, views, triggers, stored procedures (with transactions)
-- Safe to re-run: every object is dropped first.
-- =====================================================================
USE gig_marketplace;

DROP VIEW IF EXISTS v_public_users;
DROP VIEW IF EXISTS v_open_gigs;
DROP VIEW IF EXISTS v_provider_leaderboard;
DROP VIEW IF EXISTS v_gig_finance;
DROP VIEW IF EXISTS v_open_disputes;
DROP FUNCTION  IF EXISTS fn_avg_rating;
DROP FUNCTION  IF EXISTS fn_gig_committed;
DROP TRIGGER   IF EXISTS trg_gig_after_insert;
DROP TRIGGER   IF EXISTS trg_gig_status_log;
DROP TRIGGER   IF EXISTS trg_application_before_insert;
DROP TRIGGER   IF EXISTS trg_rating_before_insert;
DROP PROCEDURE IF EXISTS sp_accept_application;
DROP PROCEDURE IF EXISTS sp_fund_gig;
DROP PROCEDURE IF EXISTS sp_complete_gig;
DROP PROCEDURE IF EXISTS sp_raise_dispute;
DROP PROCEDURE IF EXISTS sp_resolve_dispute;

DELIMITER $$

-- =====================================================================
-- A. FUNCTIONS
-- =====================================================================
CREATE FUNCTION fn_avg_rating(p_user_id INT) RETURNS DECIMAL(3,2)
READS SQL DATA
BEGIN
    DECLARE v_avg DECIMAL(3,2);
    SELECT AVG(rating) INTO v_avg FROM rating WHERE ratee_id = p_user_id;
    RETURN COALESCE(v_avg, 0);
END$$

CREATE FUNCTION fn_gig_committed(p_gig_id INT) RETURNS DECIMAL(10,2)
READS SQL DATA
BEGIN
    DECLARE v_total DECIMAL(10,2);
    SELECT SUM(agreed_amount) INTO v_total
    FROM gig_participant WHERE gig_id = p_gig_id AND role = 'provider';
    RETURN COALESCE(v_total, 0);
END$$

-- =====================================================================
-- B. TRIGGERS
--    The app sets  SET @app_user_id = <logged in user>  so the audit
--    trail knows WHO made a change (stays NULL for direct SQL).
-- =====================================================================

-- B1. Log the creation of every new gig
CREATE TRIGGER trg_gig_after_insert AFTER INSERT ON gig
FOR EACH ROW
BEGIN
    INSERT INTO gig_status_history (gig_id, old_status, new_status, remarks, changed_by)
    VALUES (NEW.gig_id, NULL, NEW.status, 'Gig posted', NEW.poster_id);
END$$

-- B2. Log every status change automatically (audit trail)
CREATE TRIGGER trg_gig_status_log AFTER UPDATE ON gig
FOR EACH ROW
BEGIN
    IF NOT (OLD.status <=> NEW.status) THEN
        INSERT INTO gig_status_history (gig_id, old_status, new_status, remarks, changed_by)
        VALUES (NEW.gig_id, OLD.status, NEW.status,
                CONCAT('Status changed from ', OLD.status, ' to ', NEW.status),
                @app_user_id);
    END IF;
END$$

-- B3. Business rules for applications
CREATE TRIGGER trg_application_before_insert BEFORE INSERT ON gig_application
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_poster INT;
    DECLARE v_type   VARCHAR(20);

    SELECT status, poster_id INTO v_status, v_poster FROM gig WHERE gig_id = NEW.gig_id;
    SELECT user_type INTO v_type FROM users WHERE user_id = NEW.provider_id;

    IF v_status <> 'open' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Applications are only allowed for open gigs';
    END IF;
    IF v_poster = NEW.provider_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'You cannot apply to your own gig';
    END IF;
    IF v_type = 'requester' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Requester-only accounts cannot apply to gigs';
    END IF;
END$$

-- B4. Business rules for ratings
CREATE TRIGGER trg_rating_before_insert BEFORE INSERT ON rating
FOR EACH ROW
BEGIN
    DECLARE v_status VARCHAR(20);
    DECLARE v_both   INT;

    SELECT status INTO v_status FROM gig WHERE gig_id = NEW.gig_id;
    SELECT COUNT(*) INTO v_both FROM gig_participant
     WHERE gig_id = NEW.gig_id AND user_id IN (NEW.rater_id, NEW.ratee_id);

    IF v_status <> 'completed' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Ratings are only allowed after a gig is completed';
    END IF;
    IF v_both < 2 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Both rater and ratee must have taken part in this gig';
    END IF;
END$$

-- =====================================================================
-- C. STORED PROCEDURES WITH TRANSACTIONS
--    Each one is all-or-nothing: if any step fails, everything is rolled back.
--    Escrow flow:  accept (payment pending) -> fund (held) -> complete (released)
-- =====================================================================

-- C1. Requester accepts a provider's application
CREATE PROCEDURE sp_accept_application(IN p_application_id INT, IN p_actor_id INT)
BEGIN
    DECLARE v_gig INT;           DECLARE v_provider INT;
    DECLARE v_price DECIMAL(10,2); DECLARE v_app_status VARCHAR(20);
    DECLARE v_poster INT;        DECLARE v_gig_status VARCHAR(20);
    DECLARE v_budget DECIMAL(10,2);

    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET @app_user_id = p_actor_id;
    START TRANSACTION;

    SELECT gig_id, provider_id, quoted_price, application_status
      INTO v_gig, v_provider, v_price, v_app_status
      FROM gig_application WHERE application_id = p_application_id FOR UPDATE;

    IF v_gig IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Application not found';
    END IF;

    SELECT poster_id, status, budget INTO v_poster, v_gig_status, v_budget
      FROM gig WHERE gig_id = v_gig FOR UPDATE;

    IF v_poster <> p_actor_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only the gig poster can accept applications';
    END IF;
    IF v_app_status <> 'pending' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This application is not pending';
    END IF;
    IF v_gig_status NOT IN ('open','booked') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This gig is no longer accepting bookings';
    END IF;
    IF fn_gig_committed(v_gig) + v_price > v_budget THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Accepting this quote would exceed the gig budget';
    END IF;

    UPDATE gig_application SET application_status = 'accepted' WHERE application_id = p_application_id;

    INSERT INTO gig_participant (gig_id, user_id, role, agreed_amount, application_id)
    VALUES (v_gig, v_provider, 'provider', v_price, p_application_id);

    -- requester row holds the running total the requester has agreed to pay
    INSERT INTO gig_participant (gig_id, user_id, role, agreed_amount)
    VALUES (v_gig, v_poster, 'requester', v_price)
    ON DUPLICATE KEY UPDATE agreed_amount = agreed_amount + v_price;

    INSERT INTO payment (gig_id, payer_id, payee_id, amount, payment_status)
    VALUES (v_gig, v_poster, v_provider, v_price, 'pending');

    UPDATE gig SET status = 'booked' WHERE gig_id = v_gig AND status = 'open';

    COMMIT;
    SELECT 'Application accepted, gig booked' AS result;
END$$

-- C2. Requester funds the escrow (pending -> held)
CREATE PROCEDURE sp_fund_gig(IN p_gig_id INT, IN p_actor_id INT)
BEGIN
    DECLARE v_poster INT; DECLARE v_status VARCHAR(20); DECLARE v_rows INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET @app_user_id = p_actor_id;
    START TRANSACTION;
    SELECT poster_id, status INTO v_poster, v_status FROM gig WHERE gig_id = p_gig_id FOR UPDATE;

    IF v_poster IS NULL OR v_poster <> p_actor_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only the gig poster can fund this gig';
    END IF;
    IF v_status <> 'booked' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only booked gigs can be funded';
    END IF;

    UPDATE payment SET payment_status = 'held' WHERE gig_id = p_gig_id AND payment_status = 'pending';
    SET v_rows = ROW_COUNT();
    IF v_rows = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'No pending payments to fund';
    END IF;

    COMMIT;
    SELECT CONCAT(v_rows, ' payment(s) now held in escrow') AS result;
END$$

-- C3. Requester marks the gig done: held payments are released to providers
CREATE PROCEDURE sp_complete_gig(IN p_gig_id INT, IN p_actor_id INT)
BEGIN
    DECLARE v_poster INT; DECLARE v_status VARCHAR(20); DECLARE v_pending INT; DECLARE v_rows INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET @app_user_id = p_actor_id;
    START TRANSACTION;
    SELECT poster_id, status INTO v_poster, v_status FROM gig WHERE gig_id = p_gig_id FOR UPDATE;

    IF v_poster IS NULL OR v_poster <> p_actor_id THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only the gig poster can complete this gig';
    END IF;
    IF v_status <> 'booked' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only booked gigs can be completed';
    END IF;

    SELECT COUNT(*) INTO v_pending FROM payment WHERE gig_id = p_gig_id AND payment_status = 'pending';
    IF v_pending > 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Fund all pending payments before completing the gig';
    END IF;

    UPDATE payment SET payment_status = 'released' WHERE gig_id = p_gig_id AND payment_status = 'held';
    SET v_rows = ROW_COUNT();
    UPDATE gig SET status = 'completed' WHERE gig_id = p_gig_id;

    COMMIT;
    SELECT CONCAT('Gig completed, ', v_rows, ' payment(s) released') AS result;
END$$

-- C4. Any participant raises a dispute (gig becomes 'disputed')
CREATE PROCEDURE sp_raise_dispute(IN p_gig_id INT, IN p_actor_id INT,
                                  IN p_reason VARCHAR(150), IN p_description TEXT)
BEGIN
    DECLARE v_status VARCHAR(20); DECLARE v_is_participant INT;
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET @app_user_id = p_actor_id;
    START TRANSACTION;
    SELECT status INTO v_status FROM gig WHERE gig_id = p_gig_id FOR UPDATE;
    SELECT COUNT(*) INTO v_is_participant FROM gig_participant
     WHERE gig_id = p_gig_id AND user_id = p_actor_id;

    IF v_status IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Gig not found';
    END IF;
    IF v_is_participant = 0 THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only people who took part in the gig can raise a dispute';
    END IF;
    IF v_status NOT IN ('booked','completed') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Disputes can only be raised on booked or completed gigs';
    END IF;

    INSERT INTO dispute (gig_id, raised_by, reason, description)
    VALUES (p_gig_id, p_actor_id, p_reason, p_description);

    UPDATE gig SET status = 'disputed' WHERE gig_id = p_gig_id;

    COMMIT;
    SELECT LAST_INSERT_ID() AS dispute_id;
END$$

-- C5. Admin resolves a dispute: refund the requester OR release money to providers
CREATE PROCEDURE sp_resolve_dispute(IN p_dispute_id INT, IN p_admin_id INT,
                                    IN p_resolution TEXT, IN p_refund BOOLEAN)
BEGIN
    DECLARE v_role VARCHAR(10); DECLARE v_gig INT; DECLARE v_dstatus VARCHAR(20);
    DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
        ROLLBACK;
        RESIGNAL;
    END;

    SET @app_user_id = p_admin_id;
    START TRANSACTION;

    SELECT app_role INTO v_role FROM users WHERE user_id = p_admin_id;
    IF v_role IS NULL OR v_role <> 'admin' THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Only an admin can resolve disputes';
    END IF;

    SELECT gig_id, dispute_status INTO v_gig, v_dstatus
      FROM dispute WHERE dispute_id = p_dispute_id FOR UPDATE;
    IF v_gig IS NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Dispute not found';
    END IF;
    IF v_dstatus NOT IN ('open','under_review') THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'This dispute is already closed';
    END IF;

    UPDATE dispute
       SET dispute_status = 'resolved', resolution = p_resolution,
           resolved_at = GREATEST(NOW(), created_at)
     WHERE dispute_id = p_dispute_id;

    IF p_refund THEN
        UPDATE payment SET payment_status = 'refunded'
         WHERE gig_id = v_gig AND payment_status IN ('pending','held');
        UPDATE gig SET status = 'cancelled' WHERE gig_id = v_gig;
    ELSE
        UPDATE payment SET payment_status = 'released'
         WHERE gig_id = v_gig AND payment_status = 'held';
        UPDATE gig SET status = 'completed' WHERE gig_id = v_gig;
    END IF;

    COMMIT;
    SELECT IF(p_refund, 'Dispute resolved: requester refunded, gig cancelled',
                        'Dispute resolved: providers paid, gig completed') AS result;
END$$

DELIMITER ;

-- =====================================================================
-- D. VIEWS  (reusable queries; the app reads these instead of raw tables)
-- =====================================================================

-- D1. Safe user listing: NO password hash ever leaves the database
CREATE VIEW v_public_users AS
SELECT user_id, name, email, phone, user_type, app_role, created_at
FROM users;

-- D2. Browse page: open gigs with venue, poster and demand
CREATE VIEW v_open_gigs AS
SELECT g.gig_id, g.title, g.gig_type, g.event_date, g.start_time, g.end_time, g.budget,
       v.venue_name, v.location, u.name AS poster_name,
       (SELECT COUNT(*) FROM gig_application a
         WHERE a.gig_id = g.gig_id AND a.application_status = 'pending') AS pending_applications
FROM gig g
JOIN users u ON u.user_id = g.poster_id
LEFT JOIN venue v ON v.venue_id = g.venue_id
WHERE g.status = 'open';

-- D3. Provider leaderboard for the dashboard
CREATE VIEW v_provider_leaderboard AS
SELECT u.user_id, u.name,
       fn_avg_rating(u.user_id) AS avg_rating,
       (SELECT COUNT(*) FROM rating r WHERE r.ratee_id = u.user_id) AS review_count,
       (SELECT COUNT(*) FROM gig_participant gp JOIN gig g ON g.gig_id = gp.gig_id
         WHERE gp.user_id = u.user_id AND gp.role = 'provider' AND g.status = 'completed') AS gigs_completed,
       (SELECT COALESCE(SUM(p.amount), 0) FROM payment p
         WHERE p.payee_id = u.user_id AND p.payment_status = 'released') AS total_earned
FROM users u
WHERE u.user_type IN ('provider','both');

-- D4. Money per gig, split by escrow stage
CREATE VIEW v_gig_finance AS
SELECT g.gig_id, g.title, g.status, g.budget,
       COALESCE(SUM(CASE WHEN p.payment_status = 'pending'  THEN p.amount END), 0) AS pending_amount,
       COALESCE(SUM(CASE WHEN p.payment_status = 'held'     THEN p.amount END), 0) AS held_amount,
       COALESCE(SUM(CASE WHEN p.payment_status = 'released' THEN p.amount END), 0) AS released_amount,
       COALESCE(SUM(CASE WHEN p.payment_status = 'refunded' THEN p.amount END), 0) AS refunded_amount
FROM gig g
LEFT JOIN payment p ON p.gig_id = g.gig_id
GROUP BY g.gig_id, g.title, g.status, g.budget;

-- D5. Admin queue
CREATE VIEW v_open_disputes AS
SELECT d.dispute_id, g.title AS gig_title, u.name AS raised_by, d.reason,
       d.dispute_status, d.created_at, DATEDIFF(NOW(), d.created_at) AS days_open
FROM dispute d
JOIN gig g  ON g.gig_id = d.gig_id
JOIN users u ON u.user_id = d.raised_by
WHERE d.dispute_status IN ('open','under_review');
