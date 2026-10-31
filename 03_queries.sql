-- =====================================================================
-- SONATA : 03_queries.sql   (SELECT queries + DML, run AFTER 01 and 02)
-- =====================================================================
USE gig_marketplace;

-- ---------- SELECT QUERIES ----------

-- Q1 JOIN: open gigs with who posted them and where
SELECT g.gig_id, g.title, g.event_date, g.budget, u.name AS posted_by, v.venue_name
FROM gig g
JOIN users u ON u.user_id = g.poster_id
LEFT JOIN venue v ON v.venue_id = g.venue_id
WHERE g.status = 'open'
ORDER BY g.event_date;

-- Q2 GROUP BY + HAVING: top rated users with 2+ reviews
SELECT u.name, COUNT(*) AS reviews, ROUND(AVG(r.rating), 2) AS avg_rating
FROM rating r
JOIN users u ON u.user_id = r.ratee_id
GROUP BY u.user_id, u.name
HAVING COUNT(*) >= 2
ORDER BY avg_rating DESC, reviews DESC;

-- Q3 Aggregate: total earned per provider (released payments only)
SELECT u.name AS provider, SUM(p.amount) AS total_earned
FROM payment p
JOIN users u ON u.user_id = p.payee_id
WHERE p.payment_status = 'released'
GROUP BY u.user_id, u.name
ORDER BY total_earned DESC;

-- Q4 Subquery: gigs paying above the average budget
SELECT title, budget FROM gig
WHERE budget > (SELECT AVG(budget) FROM gig)
ORDER BY budget DESC;

-- Q5 Subquery with IN: users who both post gigs and apply to gigs
SELECT name, user_type FROM users
WHERE user_id IN (SELECT poster_id FROM gig)
  AND user_id IN (SELECT provider_id FROM gig_application);

-- ---------- DML ----------

-- INSERT: post a new gig (status defaults to 'open')
INSERT INTO gig (poster_id, venue_id, title, description, gig_type, event_date, start_time, end_time, budget)
VALUES (14, 1, 'Jazz Brunch Sunday', 'Light jazz for a Sunday brunch.', 'cafe gig', '2026-12-20', '11:00:00', '14:00:00', 18000);

-- UPDATE: reject one application, and raise a gig's budget by 10 percent
UPDATE gig_application SET application_status = 'rejected' WHERE gig_id = 8 AND provider_id = 15;
UPDATE gig SET budget = budget * 1.10 WHERE gig_id = 9;

-- DELETE: remove a withdrawn application
DELETE FROM gig_application WHERE application_status = 'withdrawn' AND gig_id = 12;

-- Check the DML results
SELECT gig_id, title, status, budget FROM gig WHERE gig_id IN (9, 13);
