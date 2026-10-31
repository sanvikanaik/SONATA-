-- =====================================================================
-- SONATA : Music Gig Booking and Management System
-- File   : 01_schema.sql   (DDL: CREATE / ALTER / DROP, keys, constraints)
-- Engine : MySQL 8.0+
-- Team   : Sanvika M Naik (PES1UG24AM253), Sanika V Patil (PES1UG24AM248)
-- =====================================================================

DROP DATABASE IF EXISTS gig_marketplace;
CREATE DATABASE gig_marketplace CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE gig_marketplace;

-- ---------------------------------------------------------------------
-- 1. USERS  (one table, one person can be requester, provider or both)
--    NEW vs your first draft: password_hash + app_role (for login & RBAC)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    user_id       INT AUTO_INCREMENT PRIMARY KEY,
    name          VARCHAR(100) NOT NULL,
    email         VARCHAR(150) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,                  -- bcrypt hash, never plain text
    phone         VARCHAR(15),
    user_type     ENUM('requester','provider','both') NOT NULL DEFAULT 'both',
    app_role      ENUM('user','admin') NOT NULL DEFAULT 'user',   -- RBAC: 2 roles
    created_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_users_email UNIQUE (email),
    CONSTRAINT chk_users_phone CHECK (phone IS NULL OR phone REGEXP '^[0-9+ -]{7,15}$'),
    CONSTRAINT chk_users_email CHECK (email LIKE '%_@_%._%')
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 2. LOOKUP TABLES
-- ---------------------------------------------------------------------
CREATE TABLE venue (
    venue_id    INT AUTO_INCREMENT PRIMARY KEY,
    venue_name  VARCHAR(150) NOT NULL,
    location    VARCHAR(200) NOT NULL,
    capacity    INT,
    venue_type  VARCHAR(50),
    CONSTRAINT chk_venue_capacity CHECK (capacity IS NULL OR capacity > 0)
) ENGINE = InnoDB;

CREATE TABLE genre (
    genre_id    INT AUTO_INCREMENT PRIMARY KEY,
    genre_name  VARCHAR(80) NOT NULL,
    CONSTRAINT uq_genre_name UNIQUE (genre_name)
) ENGINE = InnoDB;

CREATE TABLE instrument (
    instrument_id    INT AUTO_INCREMENT PRIMARY KEY,
    instrument_name  VARCHAR(80) NOT NULL,
    instrument_type  VARCHAR(50),
    CONSTRAINT uq_instrument_name UNIQUE (instrument_name)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 3. MUSICIAN PROFILE  (1:1 with users)
-- ---------------------------------------------------------------------
CREATE TABLE musician_profile (
    profile_id        INT AUTO_INCREMENT PRIMARY KEY,
    user_id           INT NOT NULL,
    bio               TEXT,
    experience_level  ENUM('beginner','intermediate','advanced','professional')
                      NOT NULL DEFAULT 'beginner',
    years_experience  DECIMAL(4,1) DEFAULT 0,
    CONSTRAINT uq_musician_profile_user UNIQUE (user_id),
    CONSTRAINT fk_profile_user FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_profile_years CHECK (years_experience >= 0)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 4. GIG  (status column was in your ERD; added here)
-- ---------------------------------------------------------------------
CREATE TABLE gig (
    gig_id       INT AUTO_INCREMENT PRIMARY KEY,
    poster_id    INT NOT NULL,                     -- the requester who posted it
    venue_id     INT,
    title        VARCHAR(150) NOT NULL,
    description  TEXT,
    gig_type     VARCHAR(60) NOT NULL,
    event_date   DATE NOT NULL,
    start_time   TIME NOT NULL,
    end_time     TIME NOT NULL,
    budget       DECIMAL(10,2) NOT NULL,
    status       ENUM('open','booked','completed','cancelled','disputed')
                 NOT NULL DEFAULT 'open',
    created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_gig_poster FOREIGN KEY (poster_id)
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_gig_venue FOREIGN KEY (venue_id)
        REFERENCES venue(venue_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_gig_budget CHECK (budget > 0),
    CONSTRAINT chk_gig_times CHECK (end_time > start_time)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 5. GIG APPLICATION  (provider applies to a gig with a quoted price)
-- ---------------------------------------------------------------------
CREATE TABLE gig_application (
    application_id      INT AUTO_INCREMENT PRIMARY KEY,
    gig_id              INT NOT NULL,
    provider_id         INT NOT NULL,
    proposal            TEXT,
    quoted_price        DECIMAL(10,2) NOT NULL,
    application_status  ENUM('pending','accepted','rejected','withdrawn')
                        NOT NULL DEFAULT 'pending',
    applied_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_application_gig FOREIGN KEY (gig_id)
        REFERENCES gig(gig_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_application_provider FOREIGN KEY (provider_id)
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_application_price CHECK (quoted_price > 0),
    CONSTRAINT uq_application_gig_provider UNIQUE (gig_id, provider_id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 6. GIG PARTICIPANT  (who is actually on the gig, and in what role)
-- ---------------------------------------------------------------------
CREATE TABLE gig_participant (
    gig_id          INT NOT NULL,
    user_id         INT NOT NULL,
    role            ENUM('requester','provider') NOT NULL,
    agreed_amount   DECIMAL(10,2) NOT NULL,
    application_id  INT,
    PRIMARY KEY (gig_id, user_id),
    CONSTRAINT fk_participant_gig FOREIGN KEY (gig_id)
        REFERENCES gig(gig_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_participant_user FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_participant_application FOREIGN KEY (application_id)
        REFERENCES gig_application(application_id) ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT chk_participant_amount CHECK (agreed_amount > 0)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 7. GIG STATUS HISTORY  (audit trail, filled by a trigger later)
-- ---------------------------------------------------------------------
CREATE TABLE gig_status_history (
    history_id  INT AUTO_INCREMENT PRIMARY KEY,
    gig_id      INT NOT NULL,
    old_status  VARCHAR(30),
    new_status  VARCHAR(30) NOT NULL,
    changed_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    remarks     VARCHAR(255),
    changed_by  INT,                                 -- NULL allowed: system/trigger changes
    CONSTRAINT fk_history_gig FOREIGN KEY (gig_id)
        REFERENCES gig(gig_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_history_user FOREIGN KEY (changed_by)
        REFERENCES users(user_id) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 8. DISPUTE
-- ---------------------------------------------------------------------
CREATE TABLE dispute (
    dispute_id      INT AUTO_INCREMENT PRIMARY KEY,
    gig_id          INT NOT NULL,
    raised_by       INT NOT NULL,
    reason          VARCHAR(150) NOT NULL,
    description     TEXT,
    dispute_status  ENUM('open','under_review','resolved','rejected')
                    NOT NULL DEFAULT 'open',
    resolution      TEXT,
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    resolved_at     DATETIME,
    CONSTRAINT fk_dispute_gig FOREIGN KEY (gig_id)
        REFERENCES gig(gig_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_dispute_user FOREIGN KEY (raised_by)
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_dispute_resolved_after_created
        CHECK (resolved_at IS NULL OR resolved_at >= created_at)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 9. PLAYS  (M:N users <-> instrument, with skill_level & years_played)
--    Your first draft's user_instrument had no attributes; the ERD does.
-- ---------------------------------------------------------------------
CREATE TABLE user_instrument (
    user_id        INT NOT NULL,
    instrument_id  INT NOT NULL,
    skill_level    ENUM('beginner','intermediate','advanced','professional')
                   NOT NULL DEFAULT 'beginner',
    years_played   DECIMAL(4,1) NOT NULL DEFAULT 0,
    PRIMARY KEY (user_id, instrument_id),
    CONSTRAINT fk_ui_user FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ui_instrument FOREIGN KEY (instrument_id)
        REFERENCES instrument(instrument_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT chk_ui_years CHECK (years_played >= 0)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 10. PREFERS  (M:N users <-> genre)  -- was in ERD, missing from DDL
-- ---------------------------------------------------------------------
CREATE TABLE user_genre (
    user_id   INT NOT NULL,
    genre_id  INT NOT NULL,
    PRIMARY KEY (user_id, genre_id),
    CONSTRAINT fk_ug_user FOREIGN KEY (user_id)
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_ug_genre FOREIGN KEY (genre_id)
        REFERENCES genre(genre_id) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 11. PAYMENT  (escrow-style: pending -> held -> released / refunded)
--     -- was in ERD, missing from DDL
-- ---------------------------------------------------------------------
CREATE TABLE payment (
    payment_id      INT AUTO_INCREMENT PRIMARY KEY,
    gig_id          INT NOT NULL,
    payer_id        INT NOT NULL,                  -- the requester
    payee_id        INT NOT NULL,                  -- the provider
    amount          DECIMAL(10,2) NOT NULL,
    payment_status  ENUM('pending','held','released','refunded')
                    NOT NULL DEFAULT 'pending',
    created_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_payment_gig FOREIGN KEY (gig_id)
        REFERENCES gig(gig_id) ON DELETE CASCADE ON UPDATE CASCADE,
    -- ON UPDATE RESTRICT because MySQL forbids a CHECK on a column whose FK has ON UPDATE CASCADE
    CONSTRAINT fk_payment_payer FOREIGN KEY (payer_id)
        REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT fk_payment_payee FOREIGN KEY (payee_id)
        REFERENCES users(user_id) ON DELETE RESTRICT ON UPDATE RESTRICT,
    CONSTRAINT chk_payment_amount CHECK (amount > 0),
    CONSTRAINT chk_payment_diff_users CHECK (payer_id <> payee_id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 12. RATING  -- was in ERD, missing from DDL
-- ---------------------------------------------------------------------
CREATE TABLE rating (
    rating_id   INT AUTO_INCREMENT PRIMARY KEY,
    gig_id      INT NOT NULL,
    rater_id    INT NOT NULL,
    ratee_id    INT NOT NULL,
    rating      TINYINT NOT NULL,
    review      TEXT,
    created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_rating_gig FOREIGN KEY (gig_id)
        REFERENCES gig(gig_id) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT fk_rating_rater FOREIGN KEY (rater_id)
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT fk_rating_ratee FOREIGN KEY (ratee_id)
        REFERENCES users(user_id) ON DELETE CASCADE ON UPDATE RESTRICT,
    CONSTRAINT chk_rating_range CHECK (rating BETWEEN 1 AND 5),
    CONSTRAINT chk_rating_not_self CHECK (rater_id <> ratee_id),
    CONSTRAINT uq_rating_once UNIQUE (gig_id, rater_id, ratee_id)
) ENGINE = InnoDB;

-- ---------------------------------------------------------------------
-- 13. ALTER / DROP demos (the requirements ask for CREATE, ALTER, DROP)
-- ---------------------------------------------------------------------
ALTER TABLE users ADD COLUMN profile_picture_url VARCHAR(255) DEFAULT NULL AFTER phone;
ALTER TABLE gig   MODIFY COLUMN gig_type VARCHAR(80) NOT NULL;
ALTER TABLE venue ADD CONSTRAINT chk_venue_type
    CHECK (venue_type IS NULL OR venue_type IN ('indoor','outdoor','studio','online','other'));

CREATE TABLE staging_import (temp_id INT, raw_data TEXT);
DROP TABLE staging_import;

-- ---------------------------------------------------------------------
-- 14. INDEXES (FKs already get one; these serve real query patterns)
-- ---------------------------------------------------------------------
CREATE INDEX idx_gig_status_date   ON gig (status, event_date);
CREATE INDEX idx_gig_venue         ON gig (venue_id);
CREATE INDEX idx_app_provider      ON gig_application (provider_id, application_status);
CREATE INDEX idx_payment_gig       ON payment (gig_id, payment_status);
CREATE INDEX idx_rating_ratee      ON rating (ratee_id);
CREATE INDEX idx_history_gig_time  ON gig_status_history (gig_id, changed_at);
CREATE FULLTEXT INDEX ft_gig_search ON gig (title, description);
CREATE FULLTEXT INDEX ft_profile_bio ON musician_profile (bio);
