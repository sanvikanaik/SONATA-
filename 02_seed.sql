-- =====================================================================
-- SONATA : 02_seed.sql  (sample data, run AFTER 01_schema.sql)
-- Every demo user's password is:  Sonata@123   (stored as a bcrypt hash)
-- Insert order matters: parents first, children after (foreign keys).
-- =====================================================================
USE gig_marketplace;

-- 1. USERS (id 1 = admin; 2-15 = normal users: requesters, providers, both)
INSERT INTO users (name, email, password_hash, phone, user_type, app_role) VALUES
('Sonata Admin',   'admin@sonata.app',   '$2b$10$wMCyunXdhEjtqhM5tmZ4TuAbvlau/03RXnJuqPtaD9aWJRpXZoqHm', '+91 9800000001', 'both',      'admin'),
('Rohan Iyer',     'rohan@sonata.app',   '$2b$10$wMCyunXdhEjtqhM5tmZ4TuAbvlau/03RXnJuqPtaD9aWJRpXZoqHm', '+91 9800000002', 'provider',  'user'),
('Meera Nair',     'meera@sonata.app',   '$2b$10$wMCyunXdhEjtqhM5tmZ4TuAbvlau/03RXnJuqPtaD9aWJRpXZoqHm', '+91 9800000003', 'provider',  'user'),
('Karthik Rao',    'karthik@sonata.app', '$2b$10$wMCyunXdhEjtqhM5tmZ4TuAbvlau/03RXnJuqPtaD9aWJRpXZoqHm', '+91 9800000004', 'both',      'user'),
('Ananya Shetty',  'ananya@sonata.app',  '$2b$10$wMCyunXdhEjtqhM5tmZ4TuAbvlau/03RXnJuqPtaD9aWJRpXZoqHm', '+91 9800000005', 'requester', 'user'),
('Vikram Desai',   'vikram@sonata.app',  '$2b$10$wMCyunXdhEjtqhM5tmZ4TuAbvlau/03RXnJuqPtaD9aWJRpXZoqHm', '+91 9800000006', 'both',      'user'),
('Priya Menon',    'priya@sonata.app',   '$2b$10$wMCyunXdhEjtqhM5tmZ4TuAbvlau/03RXnJuqPtaD9aWJRpXZoqHm', '+91 9800000007', 'provider',  'user'),
('Aditya Kulkarni','aditya@sonata.app',  '$2b$10$wMCyunXdhEjtqhM5tmZ4TuAbvlau/03RXnJuqPtaD9aWJRpXZoqHm', '+91 9800000008', 'requester', 'user'),
('Sneha Reddy',    'sneha@sonata.app',   '$2b$10$wMCyunXdhEjtqhM5tmZ4TuAbvlau/03RXnJuqPtaD9aWJRpXZoqHm', '+91 9800000009', 'both',      'user'),
('Arjun Bhat',     'arjun@sonata.app',   '$2b$10$wMCyunXdhEjtqhM5tmZ4TuAbvlau/03RXnJuqPtaD9aWJRpXZoqHm', '+91 9800000010', 'provider',  'user'),
('Divya Hegde',    'divya@sonata.app',   '$2b$10$wMCyunXdhEjtqhM5tmZ4TuAbvlau/03RXnJuqPtaD9aWJRpXZoqHm', '+91 9800000011', 'requester', 'user'),
('Nikhil Joshi',   'nikhil@sonata.app',  '$2b$10$wMCyunXdhEjtqhM5tmZ4TuAbvlau/03RXnJuqPtaD9aWJRpXZoqHm', '+91 9800000012', 'both',      'user'),
('Isha Kapoor',    'isha@sonata.app',    '$2b$10$wMCyunXdhEjtqhM5tmZ4TuAbvlau/03RXnJuqPtaD9aWJRpXZoqHm', '+91 9800000013', 'provider',  'user'),
('Rahul Gowda',    'rahul@sonata.app',   '$2b$10$wMCyunXdhEjtqhM5tmZ4TuAbvlau/03RXnJuqPtaD9aWJRpXZoqHm', '+91 9800000014', 'requester', 'user'),
('Tanvi Pillai',   'tanvi@sonata.app',   '$2b$10$wMCyunXdhEjtqhM5tmZ4TuAbvlau/03RXnJuqPtaD9aWJRpXZoqHm', '+91 9800000015', 'both',      'user');

-- 2. LOOKUPS
INSERT INTO venue (venue_name, location, capacity, venue_type) VALUES
('Blue Note Lounge',        'Indiranagar, Bengaluru',  150, 'indoor'),
('Grand Orchid Banquet',    'Whitefield, Bengaluru',   600, 'indoor'),
('Lakeview Amphitheatre',   'Ulsoor, Bengaluru',      1200, 'outdoor'),
('Sunset Rooftop Cafe',     'Koramangala, Bengaluru',  120, 'outdoor'),
('Studio 9 Recording Space','HSR Layout, Bengaluru',    25, 'studio'),
('Sonata Virtual Stage',    'Online',                 NULL, 'online');

INSERT INTO genre (genre_name) VALUES
('Rock'),('Pop'),('Classical'),('Jazz'),('Folk'),('Hip-Hop'),('Carnatic'),('Electronic');

INSERT INTO instrument (instrument_name, instrument_type) VALUES
('Guitar','String'),('Bass Guitar','String'),('Violin','String'),('Keyboard','Keys'),
('Drums','Percussion'),('Tabla','Percussion'),('Flute','Wind'),('Saxophone','Wind'),
('Vocals','Voice'),('DJ Console','Electronic');

-- 3. MUSICIAN PROFILES (only for providers / both)
INSERT INTO musician_profile (user_id, bio, experience_level, years_experience) VALUES
(2,  'Lead guitarist specialising in rock and acoustic sets for weddings and cafes.', 'advanced', 8),
(3,  'Trained Carnatic and playback vocalist, performs pop, folk and fusion.', 'professional', 10),
(4,  'Session drummer and tabla player, loves jazz fusion and high energy live bands.', 'advanced', 7),
(6,  'Keyboardist and arranger for jazz evenings, corporate events and weddings.', 'professional', 12),
(7,  'Classical and Carnatic violinist, available for concerts, weddings and recordings.', 'professional', 11),
(9,  'Singer-songwriter who plays acoustic guitar, folk and pop covers for intimate venues.', 'advanced', 6),
(10, 'Bassist for rock and hip-hop bands, studio and live experience.', 'advanced', 6),
(12, 'Tabla artist and DJ, blends electronic beats with Indian percussion.', 'advanced', 9),
(13, 'Saxophonist playing smooth jazz for lounges, dinners and corporate events.', 'advanced', 7),
(15, 'Flautist for folk and classical sets, also hosts open mic nights.', 'advanced', 8);

-- 4. PLAYS (user_instrument) and PREFERS (user_genre)
INSERT INTO user_instrument (user_id, instrument_id, skill_level, years_played) VALUES
(2,1,'advanced',8), (3,9,'professional',10), (4,5,'advanced',7), (4,6,'intermediate',3),
(6,4,'professional',12), (7,3,'professional',11), (9,9,'advanced',6), (9,1,'intermediate',5),
(10,2,'advanced',6), (12,6,'advanced',9), (12,10,'intermediate',4), (13,8,'advanced',7),
(15,7,'advanced',8), (15,9,'beginner',1);

INSERT INTO user_genre (user_id, genre_id) VALUES
(2,1),(2,2), (3,2),(3,7),(3,5), (4,1),(4,4), (6,4),(6,3),(6,2), (7,3),(7,7),(7,5),
(9,2),(9,5),(9,1), (10,1),(10,6), (12,8),(12,6),(12,7), (13,4), (15,3),(15,5),
(5,2),(5,1), (8,1),(8,8), (11,4),(11,3),(11,7), (14,5),(14,2);

-- 5. GIGS (12 gigs, one for each situation we want to demo)
INSERT INTO gig (poster_id, venue_id, title, description, gig_type, event_date, start_time, end_time, budget, status, created_at) VALUES
(5,  2, 'Wedding Sangeet Night',        'Live band for a 400-guest sangeet. Bollywood and rock mix, 5 hour set.',          'wedding',   '2026-08-15','18:00:00','23:00:00', 45000,'completed','2026-07-20 10:00:00'),
(8,  3, 'College Fest Headliner Set',   'Headline act for the annual college fest. High energy rock and pop for 1000 students.', 'college fest','2026-09-12','19:00:00','22:00:00', 60000,'completed','2026-08-10 11:00:00'),
(11, 1, 'Corporate Anniversary Jazz Evening','Smooth jazz for a 10th anniversary dinner, background plus two featured sets.', 'corporate', '2026-10-03','19:00:00','22:30:00', 35000,'completed','2026-09-05 09:30:00'),
(14, 4, 'Acoustic Cafe Weekend',        'Relaxed acoustic folk and pop sets at a rooftop cafe.',                           'cafe gig',  '2026-10-18','17:00:00','20:00:00', 12000,'completed','2026-10-01 12:00:00'),
(5,  1, 'Birthday Bash Live Band',      'Live band for a 30th birthday party, rock covers and dance floor hits.',          'birthday',  '2026-10-10','20:00:00','23:00:00', 28000,'disputed', '2026-09-20 15:00:00'),
(11, 2, 'Carnatic Fusion Concert',      'Carnatic and western fusion concert with violin, vocals and percussion.',        'concert',   '2026-11-14','18:30:00','21:30:00', 50000,'booked',   '2026-10-01 10:00:00'),
(8,  4, 'New Year Eve Rooftop Party',   'Countdown party with live band and DJ, outdoor rooftop, 120 guests.',            'party',     '2026-12-31','21:00:00','23:59:00', 80000,'booked',   '2026-10-05 18:00:00'),
(14, 6, 'Online Lo-fi Studio Session',  'Live streamed lo-fi and chill session, two instrumentalists wanted.',             'studio session','2026-11-20','15:00:00','17:00:00', 8000,'open',    '2026-10-24 14:00:00'),
(12, 4, 'Open Mic Night Host Band',     'House band needed to back performers at a monthly open mic night.',              'open mic',  '2026-11-28','18:00:00','21:00:00', 15000,'open',    '2026-10-25 16:00:00'),
(5,  1, 'Product Launch Background Music','Soft instrumental background music for a morning product launch.',             'corporate', '2026-12-05','10:00:00','13:00:00', 22000,'open',    '2026-10-26 09:00:00'),
(6,  3, 'Folk Evening at the Lake',     'Folk music evening by the lake, cancelled due to venue unavailability.',          'concert',   '2026-11-08','17:00:00','20:00:00', 20000,'cancelled','2026-10-10 10:00:00'),
(15, 2, 'Wedding Reception Band',       'Live band for a wedding reception, mix of English and Hindi, 4 hour set.',        'wedding',   '2026-12-12','19:00:00','23:00:00', 55000,'open',    '2026-10-27 11:00:00');

-- 6. GIG APPLICATIONS (ids follow insert order)
INSERT INTO gig_application (gig_id, provider_id, proposal, quoted_price, application_status) VALUES
(1, 2, 'Lead guitar with a full rock and Bollywood setlist.',                      15000,'accepted'),
(1, 3, 'Vocals for the full 5 hour set, can sing Hindi, English and Kannada.',       15000,'accepted'),
(1, 4, 'Drums and tabla, can bring my own kit.',                                    12000,'accepted'),
(1, 10,'Bass guitar, happy to rehearse twice.',                                     14000,'rejected'),
(2, 4, 'High energy drums for a festival crowd.',                                   20000,'accepted'),
(2, 6, 'Keys and arrangement support.',                                             18000,'accepted'),
(2, 9, 'Lead vocals and rhythm guitar.',                                            20000,'accepted'),
(2, 13,'Sax for a few crowd pleasing breaks.',                                      17000,'rejected'),
(3, 13,'Smooth jazz sax, two featured sets.',                                       15000,'accepted'),
(3, 6, 'Jazz piano and keys.',                                                      14000,'accepted'),
(3, 7, 'Violin for the welcome set.',                                                5000,'accepted'),
(4, 9, 'Acoustic guitar and vocals, folk and pop covers.',                           6000,'accepted'),
(4, 3, 'Vocals, unplugged set.',                                                     6000,'accepted'),
(5, 4, 'Drums for the party band.',                                                 10000,'accepted'),
(5, 9, 'Vocals and guitar.',                                                         9000,'accepted'),
(5, 10,'Bass guitar.',                                                               8000,'accepted'),
(6, 7, 'Carnatic violin lead.',                                                     15000,'accepted'),
(6, 3, 'Carnatic and fusion vocals.',                                               18000,'accepted'),
(6, 12,'Tabla and electronic percussion.',                                          12000,'accepted'),
(6, 2, 'Guitar for the fusion portion.',                                            16000,'rejected'),
(7, 4, 'Drums for the live band.',                                                  25000,'accepted'),
(7, 2, 'Lead guitar.',                                                              20000,'accepted'),
(7, 12,'DJ set after midnight countdown plus tabla.',                               25000,'accepted'),
(7, 15,'Flute interludes.',                                                         22000,'rejected'),
(8, 7, 'Violin for ambient layers.',                                                 7000,'pending'),
(8, 15,'Flute for lo-fi melodies.',                                                  6500,'pending'),
(9, 2, 'Guitar for the house band.',                                                 5000,'pending'),
(9, 9, 'Vocals and guitar for the house band.',                                      5500,'pending'),
(9, 10,'Bass for the house band.',                                                   4500,'pending'),
(10,6, 'Soft piano and keys.',                                                      20000,'pending'),
(10,13,'Smooth sax in the background.',                                             18000,'pending'),
(11,3, 'Folk vocals.',                                                               9000,'withdrawn'),
(11,7, 'Folk violin.',                                                               8000,'withdrawn'),
(12,4, 'Drums for the wedding band.',                                               25000,'pending'),
(12,9, 'Vocals and guitar.',                                                        26000,'pending'),
(12,13,'Saxophone for the reception.',                                              24000,'withdrawn');

-- 7. GIG PARTICIPANTS (requester row = total, provider rows = their agreed share)
INSERT INTO gig_participant (gig_id, user_id, role, agreed_amount, application_id) VALUES
(1,5,'requester',42000,NULL),(1,2,'provider',15000,1),(1,3,'provider',15000,2),(1,4,'provider',12000,3),
(2,8,'requester',58000,NULL),(2,4,'provider',20000,5),(2,6,'provider',18000,6),(2,9,'provider',20000,7),
(3,11,'requester',34000,NULL),(3,13,'provider',15000,9),(3,6,'provider',14000,10),(3,7,'provider',5000,11),
(4,14,'requester',12000,NULL),(4,9,'provider',6000,12),(4,3,'provider',6000,13),
(5,5,'requester',27000,NULL),(5,4,'provider',10000,14),(5,9,'provider',9000,15),(5,10,'provider',8000,16),
(6,11,'requester',45000,NULL),(6,7,'provider',15000,17),(6,3,'provider',18000,18),(6,12,'provider',12000,19),
(7,8,'requester',70000,NULL),(7,4,'provider',25000,21),(7,2,'provider',20000,22),(7,12,'provider',25000,23);

-- 8. PAYMENTS (escrow flow: pending -> held -> released, or refunded)
INSERT INTO payment (gig_id, payer_id, payee_id, amount, payment_status) VALUES
(1,5,2,15000,'released'),(1,5,3,15000,'released'),(1,5,4,12000,'released'),
(2,8,4,20000,'released'),(2,8,6,18000,'released'),(2,8,9,20000,'released'),
(3,11,13,15000,'released'),(3,11,6,14000,'released'),(3,11,7,5000,'released'),
(4,14,9,6000,'released'),(4,14,3,6000,'released'),
(5,5,4,10000,'held'),(5,5,9,9000,'held'),(5,5,10,8000,'held'),
(6,11,7,15000,'held'),(6,11,3,18000,'held'),(6,11,12,12000,'pending'),
(7,8,4,25000,'held'),(7,8,2,20000,'held'),(7,8,12,25000,'held'),
(11,6,3,9000,'refunded');

-- 9. RATINGS (only on completed gigs, both directions)
INSERT INTO rating (gig_id, rater_id, ratee_id, rating, review) VALUES
(1,5,2,5,'Rohan''s guitar solos made the sangeet unforgettable.'),
(1,5,3,5,'Meera sang beautifully in three languages, guests loved it.'),
(1,5,4,4,'Great energy on drums, started a little late.'),
(1,2,5,5,'Well organised event and paid on time.'),
(1,3,5,4,'Smooth coordination, sound check could have been longer.'),
(2,8,4,5,'Karthik drove the whole festival crowd wild.'),
(2,8,6,4,'Solid keys and great arrangements.'),
(2,8,9,5,'Sneha was the star of the night.'),
(2,4,8,4,'Good event, stage setup was slightly delayed.'),
(2,9,8,5,'Very supportive organiser.'),
(3,11,13,5,'Isha''s sax set was perfect for the dinner.'),
(3,11,6,4,'Professional and punctual.'),
(3,11,7,5,'Priya''s violin welcome set was lovely.'),
(3,13,11,5,'Excellent client, clear brief.'),
(3,7,11,4,'Great venue and hospitality.'),
(4,14,9,4,'Nice relaxed folk set.'),
(4,14,3,5,'Meera''s unplugged vocals suited the cafe perfectly.'),
(4,9,14,4,'Friendly and easy to work with.');

-- 10. DISPUTES
INSERT INTO dispute (gig_id, raised_by, reason, description, dispute_status, resolution, created_at, resolved_at) VALUES
(5, 5, 'Band arrived late', 'The band arrived 75 minutes after the agreed start time and the party started without music.', 'under_review', NULL, '2026-10-11 09:00:00', NULL),
(2, 6, 'Sound equipment issue', 'Promised monitors were not provided on stage, which affected the keys performance.', 'resolved', 'Organiser agreed to a 10 percent goodwill adjustment on the next booking.', '2026-09-13 10:00:00', '2026-09-15 16:30:00');

-- 11. GIG STATUS HISTORY (manual audit trail; triggers will add new rows later)
INSERT INTO gig_status_history (gig_id, old_status, new_status, changed_at, remarks, changed_by) VALUES
(1,NULL,'open','2026-07-20 10:00:00','Gig posted',5),(1,'open','booked','2026-07-28 12:00:00','Providers confirmed',5),(1,'booked','completed','2026-08-16 09:00:00','Event completed',5),
(2,NULL,'open','2026-08-10 11:00:00','Gig posted',8),(2,'open','booked','2026-08-25 12:00:00','Providers confirmed',8),(2,'booked','completed','2026-09-13 09:00:00','Event completed',8),
(3,NULL,'open','2026-09-05 09:30:00','Gig posted',11),(3,'open','booked','2026-09-15 12:00:00','Providers confirmed',11),(3,'booked','completed','2026-10-04 09:00:00','Event completed',11),
(4,NULL,'open','2026-10-01 12:00:00','Gig posted',14),(4,'open','booked','2026-10-08 12:00:00','Providers confirmed',14),(4,'booked','completed','2026-10-19 09:00:00','Event completed',14),
(5,NULL,'open','2026-09-20 15:00:00','Gig posted',5),(5,'open','booked','2026-09-30 12:00:00','Providers confirmed',5),(5,'booked','disputed','2026-10-11 09:00:00','Dispute raised: band arrived late',5),
(6,NULL,'open','2026-10-01 10:00:00','Gig posted',11),(6,'open','booked','2026-10-20 12:00:00','Providers confirmed',11),
(7,NULL,'open','2026-10-05 18:00:00','Gig posted',8),(7,'open','booked','2026-10-22 12:00:00','Providers confirmed',8),
(8,NULL,'open','2026-10-24 14:00:00','Gig posted',14),
(9,NULL,'open','2026-10-25 16:00:00','Gig posted',12),
(10,NULL,'open','2026-10-26 09:00:00','Gig posted',5),
(11,NULL,'open','2026-10-10 10:00:00','Gig posted',6),(11,'open','cancelled','2026-10-18 10:00:00','Venue unavailable due to weather',6),
(12,NULL,'open','2026-10-27 11:00:00','Gig posted',15);
