-- Pipeline data: Nexorra Sales pipeline + 8 stages + 337 deals
-- Run in Supabase SQL editor

DO $$
DECLARE
  v_pipeline_id uuid;
  v_stage_new_lead uuid;
  v_stage_booked uuid;
  v_stage_closed uuid;
  v_stage_nurturing uuid;
  v_stage_no_show uuid;
  v_stage_loop_back uuid;
  v_stage_rescheduled uuid;
  v_stage_not_interested uuid;
  v_account_id uuid := 'da99b768-79dd-48f8-af86-abf95e61a69f';
BEGIN

-- 1. Insert pipeline
INSERT INTO pipelines (id, account_id, name, type, is_default, position, created_at, updated_at)
VALUES (gen_random_uuid(), v_account_id, 'Nexorra Sales', 'sales', true, 0, now(), now())
RETURNING id INTO v_pipeline_id;

-- 2. Insert stages
INSERT INTO pipeline_stages (id, pipeline_id, name, position, color, probability, is_closed, is_won, created_at, updated_at)
VALUES (gen_random_uuid(), v_pipeline_id, 'New Lead',            0, '#3b82f6', 10,  false, false, now(), now()) RETURNING id INTO v_stage_new_lead;
INSERT INTO pipeline_stages (id, pipeline_id, name, position, color, probability, is_closed, is_won, created_at, updated_at)
VALUES (gen_random_uuid(), v_pipeline_id, 'Booked Appointment', 1, '#6366f1', 40,  false, false, now(), now()) RETURNING id INTO v_stage_booked;
INSERT INTO pipeline_stages (id, pipeline_id, name, position, color, probability, is_closed, is_won, created_at, updated_at)
VALUES (gen_random_uuid(), v_pipeline_id, 'Deal Closed',         2, '#22c55e', 100, true,  true,  now(), now()) RETURNING id INTO v_stage_closed;
INSERT INTO pipeline_stages (id, pipeline_id, name, position, color, probability, is_closed, is_won, created_at, updated_at)
VALUES (gen_random_uuid(), v_pipeline_id, 'Long Term Nurturing', 3, '#a855f7', 20,  false, false, now(), now()) RETURNING id INTO v_stage_nurturing;
INSERT INTO pipeline_stages (id, pipeline_id, name, position, color, probability, is_closed, is_won, created_at, updated_at)
VALUES (gen_random_uuid(), v_pipeline_id, 'No Show',             4, '#f97316', 15,  false, false, now(), now()) RETURNING id INTO v_stage_no_show;
INSERT INTO pipeline_stages (id, pipeline_id, name, position, color, probability, is_closed, is_won, created_at, updated_at)
VALUES (gen_random_uuid(), v_pipeline_id, 'Loop Back',           5, '#06b6d4', 25,  false, false, now(), now()) RETURNING id INTO v_stage_loop_back;
INSERT INTO pipeline_stages (id, pipeline_id, name, position, color, probability, is_closed, is_won, created_at, updated_at)
VALUES (gen_random_uuid(), v_pipeline_id, 'Rescheduled',         6, '#eab308', 35,  false, false, now(), now()) RETURNING id INTO v_stage_rescheduled;
INSERT INTO pipeline_stages (id, pipeline_id, name, position, color, probability, is_closed, is_won, created_at, updated_at)
VALUES (gen_random_uuid(), v_pipeline_id, 'Not Interested',      7, '#ef4444', 0,   true,  false, now(), now()) RETURNING id INTO v_stage_not_interested;

-- 3. Insert deals
-- NEW LEAD (30 deals, open)
INSERT INTO deals (account_id, pipeline_id, pipeline_stage_id, title, value, stage, status, probability, created_at, updated_at)
SELECT v_account_id, v_pipeline_id, v_stage_new_lead,
  name || ' - Discovery Call',
  (ARRAY[2500,3000,3500,4000,4500,5000,5500,6000,7000,8000])[1 + (row_number() OVER () % 10)],
  'New Lead', 'open', 10,
  now() - (row_number() OVER () * interval '12 hours'),
  now() - (row_number() OVER () * interval '12 hours')
FROM (VALUES
  ('James Thornton'),('Maria Santos'),('Derek Cole'),('Priya Nair'),('Lucas Bennett'),
  ('Olivia Grant'),('Kevin Park'),('Sara Okafor'),('Tom Whitfield'),('Nina Rhodes'),
  ('Aaron Chase'),('Leila Moradi'),('Bryce Hudson'),('Carmen Reyes'),('Ethan Boyle'),
  ('Jasmine Wu'),('Marcus Webb'),('Fiona Delgado'),('Caleb Marsh'),('Renata Flores'),
  ('Shane O''Brien'),('Ingrid Larsen'),('Devon Mills'),('Nadia Petrov'),('Cody Hart'),
  ('Tamara Brooks'),('Victor Solis'),('Kristin Cho'),('Liam Novak'),('Dana Ferreira')
) AS t(name);

-- BOOKED APPOINTMENT (45 deals, open)
INSERT INTO deals (account_id, pipeline_id, pipeline_stage_id, title, value, stage, status, probability, created_at, updated_at)
SELECT v_account_id, v_pipeline_id, v_stage_booked,
  name || ' - Discovery Call',
  (ARRAY[3000,4000,4500,5000,5500,6000,7000,8000,9000,10000])[1 + (row_number() OVER () % 10)],
  'Booked Appointment', 'open', 40,
  now() - (row_number() OVER () * interval '8 hours'),
  now() - (row_number() OVER () * interval '8 hours')
FROM (VALUES
  ('Rachel Kim'),('Oscar Mendez'),('Tanya Willis'),('Brendan Fox'),('Samira Hassan'),
  ('Patrick Dunn'),('Yuki Tanaka'),('Melissa Torres'),('Chris Patel'),('Amanda Holt'),
  ('Nathan Cruz'),('Sophie Lambert'),('Garrett Shaw'),('Isabel Rocha'),('Dylan Frost'),
  ('Layla Nguyen'),('Miles Cooper'),('Elise Barker'),('Jonah Price'),('Miriam Osei'),
  ('Barrett Lynch'),('Vanessa Reid'),('Kenji Yamamoto'),('Courtney Banks'),('Travis Stone'),
  ('Amara Diallo'),('Evan Porter'),('Cecilia Hunt'),('Rory Flynn'),('Kiara Allen'),
  ('Theo Nakamura'),('Paige Mercer'),('Cameron Ross'),('Fatima Khalil'),('Jared Soto'),
  ('Lydia Chen'),('Marcus Grant'),('Zoe Crawford'),('Darius Moore'),('Nora Fitzgerald'),
  ('Sebastian Hall'),('Alicia Vargas'),('Blake Henderson'),('Priya Reddy'),('Colin Mack')
) AS t(name);

-- DEAL CLOSED (116 deals, won)
INSERT INTO deals (account_id, pipeline_id, pipeline_stage_id, title, value, stage, status, probability, created_at, updated_at)
SELECT v_account_id, v_pipeline_id, v_stage_closed,
  name || ' - Discovery Call',
  (ARRAY[4000,4500,5000,5500,6000,7000,8000,9000,10000,12000,15000])[1 + (row_number() OVER () % 11)],
  'Deal Closed', 'won', 100,
  now() - (row_number() OVER () * interval '6 hours'),
  now() - (row_number() OVER () * interval '6 hours')
FROM (VALUES
  ('Jordan Whitfield'),('Aisha Johnson'),('Michael O''Connor'),('Sarah Chen'),('Robert Davis'),
  ('Emma Wilson'),('Carlos Martinez'),('Jennifer Lee'),('David Thompson'),('Lisa Anderson'),
  ('James Garcia'),('Patricia Miller'),('Daniel Taylor'),('Mary Jackson'),('Christopher Harris'),
  ('Barbara White'),('Matthew Martin'),('Susan Clark'),('Anthony Robinson'),('Jessica Lewis'),
  ('Andrew Walker'),('Karen Hall'),('Ryan Young'),('Betty Allen'),('Joshua King'),
  ('Dorothy Wright'),('Brandon Scott'),('Sandra Torres'),('Samuel Green'),('Margaret Adams'),
  ('Tyler Baker'),('Helen Nelson'),('Sean Hill'),('Donna Carter'),('Austin Mitchell'),
  ('Carol Perez'),('Justin Roberts'),('Ruth Turner'),('Jonathan Phillips'),('Sharon Campbell'),
  ('Benjamin Parker'),('Michelle Evans'),('Nicholas Edwards'),('Emily Collins'),('Eric Stewart'),
  ('Deborah Sanchez'),('Stephen Morris'),('Pamela Rogers'),('Patrick Reed'),('Carolyn Cook'),
  ('Kyle Bailey'),('Virginia Bell'),('Gary Cooper'),('Judith Murphy'),('Edward Richardson'),
  ('Julia Cox'),('Jerry Howard'),('Evelyn Ward'),('Keith Torres'),('Christine Peterson'),
  ('Terry Gray'),('Katherine Ramirez'),('Gerald James'),('Janet Watson'),('Scott Brooks'),
  ('Maria Kelly'),('Roger Price'),('Alice Bennett'),('Johnny Wood'),('Jean Barnes'),
  ('Jose Ross'),('Diana Henderson'),('Earl Coleman'),('Frances Jenkins'),('Henry Perry'),
  ('Lois Powell'),('Walter Long'),('Martha Patterson'),('Arthur Hughes'),('Tammy Flores'),
  ('Philip Washington'),('Janice Butler'),('Randy Simmons'),('Denise Foster'),('Roy Gonzales'),
  ('Shirley Bryant'),('Joe Alexander'),('Wanda Russell'),('Louis Griffin'),('Brenda Diaz'),
  ('Joe Hayes'),('Christine Myers'),('Bobby Ford'),('Frances Hamilton'),('Harold Graham'),
  ('Judith Sullivan'),('Frederick Wallace'),('Bonnie West'),('Raymond Cole'),('Gloria Jordan'),
  ('Carl Owens'),('Alice Reynolds'),('Albert Fisher'),('Evelyn Ellis'),('Billy Harrison'),
  ('Dorothy Gibson'),('Russell McDonald'),('Frances Cruz'),('Wayne Marshall'),('Theresa Ortiz'),
  ('Gerald Gomez'),('Sandra Murray'),('Lawrence Freeman'),('Melissa Wells'),('Willie Webb'),
  ('Frances Simpson'),('Samuel Stevens'),('Katherine Tucker'),('Ralph Porter'),('Nicole Hunter')
) AS t(name);

-- LONG TERM NURTURING (35 deals, open)
INSERT INTO deals (account_id, pipeline_id, pipeline_stage_id, title, value, stage, status, probability, created_at, updated_at)
SELECT v_account_id, v_pipeline_id, v_stage_nurturing,
  name || ' - Discovery Call',
  (ARRAY[3000,3500,4000,4500,5000,5500,6000])[1 + (row_number() OVER () % 7)],
  'Long Term Nurturing', 'open', 20,
  now() - (row_number() OVER () * interval '10 hours'),
  now() - (row_number() OVER () * interval '10 hours')
FROM (VALUES
  ('Ava Richardson'),('Liam Foster'),('Sofia Nguyen'),('Noah Hamilton'),('Isabella Reed'),
  ('Oliver Turner'),('Mia Collins'),('Elijah Stewart'),('Charlotte Morris'),('James Rogers'),
  ('Amelia Reed'),('Lucas Cook'),('Harper Bailey'),('Mason Bell'),('Evelyn Cooper'),
  ('Ethan Murphy'),('Abigail Richardson'),('Alexander Cox'),('Emily Ward'),('Jacob James'),
  ('Elizabeth Watson'),('Michael Brooks'),('Sofia Kelly'),('Daniel Price'),('Avery Bennett'),
  ('Henry Wood'),('Ella Barnes'),('Sebastian Ross'),('Grace Henderson'),('Jack Coleman'),
  ('Chloe Jenkins'),('Samuel Perry'),('Layla Watson'),('Owen Brooks'),('Hannah Kelly')
) AS t(name);

-- NO SHOW (25 deals, open)
INSERT INTO deals (account_id, pipeline_id, pipeline_stage_id, title, value, stage, status, probability, created_at, updated_at)
SELECT v_account_id, v_pipeline_id, v_stage_no_show,
  name || ' - Discovery Call',
  (ARRAY[3000,4000,4500,5000,5500])[1 + (row_number() OVER () % 5)],
  'No Show', 'open', 15,
  now() - (row_number() OVER () * interval '14 hours'),
  now() - (row_number() OVER () * interval '14 hours')
FROM (VALUES
  ('Aiden Clark'),('Penelope Lewis'),('Jackson Young'),('Luna Walker'),('Wyatt Hall'),
  ('Nora Allen'),('Carter Wright'),('Zoey Scott'),('Julian Green'),('Lily Adams'),
  ('Grayson Baker'),('Hannah Nelson'),('Leo Hill'),('Ellie Carter'),('Lincoln Mitchell'),
  ('Natalie Perez'),('Jayden Roberts'),('Victoria Turner'),('Ryan Phillips'),('Addison Campbell'),
  ('Ian Parker'),('Aubrey Evans'),('Levi Edwards'),('Sadie Collins'),('Connor Stewart')
) AS t(name);

-- LOOP BACK (28 deals, open)
INSERT INTO deals (account_id, pipeline_id, pipeline_stage_id, title, value, stage, status, probability, created_at, updated_at)
SELECT v_account_id, v_pipeline_id, v_stage_loop_back,
  name || ' - Discovery Call',
  (ARRAY[3500,4000,4500,5000,5500,6000,7000])[1 + (row_number() OVER () % 7)],
  'Loop Back', 'open', 25,
  now() - (row_number() OVER () * interval '9 hours'),
  now() - (row_number() OVER () * interval '9 hours')
FROM (VALUES
  ('Maverick Sanchez'),('Stella Morris'),('Dominic Rogers'),('Aria Reed'),('Roman Cook'),
  ('Aurora Bailey'),('Ezra Bell'),('Claire Cooper'),('Miles Murphy'),('Savannah Richardson'),
  ('Kai Cox'),('Violet James'),('Knox Watson'),('Bella Brooks'),('Brooks Kelly'),
  ('Paisley Price'),('Jaxon Bennett'),('Naomi Wood'),('Atlas Barnes'),('Lillian Ross'),
  ('Zion Henderson'),('Elena Coleman'),('Cash Jenkins'),('Emilia Perry'),('Memphis Watson'),
  ('Ivy Brooks'),('Boston Kelly'),('Jade Price')
) AS t(name);

-- RESCHEDULED (21 deals, open)
INSERT INTO deals (account_id, pipeline_id, pipeline_stage_id, title, value, stage, status, probability, created_at, updated_at)
SELECT v_account_id, v_pipeline_id, v_stage_rescheduled,
  name || ' - Discovery Call',
  (ARRAY[4000,4500,5000,5500,6000,7000])[1 + (row_number() OVER () % 6)],
  'Rescheduled', 'open', 35,
  now() - (row_number() OVER () * interval '11 hours'),
  now() - (row_number() OVER () * interval '11 hours')
FROM (VALUES
  ('Theo Sanders'),('Freya Griffin'),('Felix Diaz'),('Iris Hayes'),('August Myers'),
  ('Cecelia Ford'),('Jasper Hamilton'),('Ruby Graham'),('Atticus Sullivan'),('Margot Wallace'),
  ('Silas West'),('Pearl Cole'),('Beckett Jordan'),('Opal Owens'),('Remy Reynolds'),
  ('Coral Fisher'),('Soren Ellis'),('Sage Harrison'),('Flynn Gibson'),('Wren McDonald'),
  ('Dax Cruz')
) AS t(name);

-- NOT INTERESTED (37 deals, lost)
INSERT INTO deals (account_id, pipeline_id, pipeline_stage_id, title, value, stage, status, probability, created_at, updated_at)
SELECT v_account_id, v_pipeline_id, v_stage_not_interested,
  name || ' - Discovery Call',
  (ARRAY[2000,2500,3000,3500,4000])[1 + (row_number() OVER () % 5)],
  'Not Interested', 'lost', 0,
  now() - (row_number() OVER () * interval '13 hours'),
  now() - (row_number() OVER () * interval '13 hours')
FROM (VALUES
  ('Glen Marsh'),('Hazel Hunt'),('Cliff Stone'),('Scarlett Allen'),('Beau Crawford'),
  ('Tatum Moore'),('Ryder Fitzgerald'),('Ember Hall'),('Colt Henderson'),('Nova Vargas'),
  ('Buck Mack'),('Skye Kim'),('Wade Nakamura'),('Faye Mercer'),('Brent Ross'),
  ('Willow Flynn'),('Chad Khalil'),('Briar Soto'),('Clint Chen'),('Lyric Grant'),
  ('Rex Crawford'),('Willa Moore'),('Rod Fitzgerald'),('Mabel Hall'),('Chad Henderson'),
  ('Dot Vargas'),('Earl Mack'),('Joy Kim'),('Gil Nakamura'),('Fern Mercer'),
  ('Kirk Ross'),('Blossom Flynn'),('Les Khalil'),('Poppy Soto'),('Vern Chen'),
  ('Fleur Grant'),('Otis Crawford')
) AS t(name);

RAISE NOTICE 'Pipeline created: %', v_pipeline_id;
RAISE NOTICE 'Stages: New Lead=%, Booked=%, Closed=%, Nurturing=%, NoShow=%, LoopBack=%, Rescheduled=%, NotInterested=%',
  v_stage_new_lead, v_stage_booked, v_stage_closed, v_stage_nurturing,
  v_stage_no_show, v_stage_loop_back, v_stage_rescheduled, v_stage_not_interested;

END $$;
