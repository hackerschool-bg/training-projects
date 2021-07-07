-- $ sudo su - postgres
-- $ psql
-- connect to database 'postgres' with user 'postgres'. Query:
-- DROP DATABASE IF EXISTS ekatte;
-- DROP USER IF EXISTS ekatte;
-- CREATE USER ekatte WITH ENCRYPTED PASSWORD 'ekatte';
-- CREATE DATABASE ekatte WITH OWNER ekatte;
--
--  connect user 'ekatte' to database 'ekatte':
-- $ \q
-- $ psql --username=ekatte --password
-- \i create-database.sql

CREATE TYPE document_kind AS ENUM (
  'election_code',
  'protocol',
  'order',
  'decree',
  'ruling',
  'official_document'
);

CREATE TABLE documents (
  id TEXT NOT NULL PRIMARY KEY,
  kind document_kind NOT NULL,
  name TEXT NOT NULL,
  institution TEXT NOT NULL,
  doc_num TEXT NOT NULL,
  doc_date DATE NOT NULL,
  doc_act DATE NOT NULL,
  state_gazette TEXT NOT NULL,
  state_gazette_date DATE NOT NULL
);

CREATE TABLE regions (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  document_id TEXT NOT NULL,
  abc INTEGER NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents (id)
);

CREATE TABLE regions_lvl_1 (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  document_id TEXT NOT NULL,
  abc INTEGER NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents (id)
);

CREATE TABLE regions_lvl_2 (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL,
  document_id TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents (id)
);

CREATE TABLE tsbs (
  id TEXT NOT NULL PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE ekattes (
  id TEXT NOT NULL PRIMARY KEY,
  kind INTEGER NOT NULL,
  name TEXT NOT NULL,
  province_id INTEGER, -- can be null if ekatte record is province
  municipality_id INTEGER, -- can be null if ekatte record is municipality
  municipal_gov_id INTEGER, -- can be null if ekatte record is municipality government
  category INTEGER NOT NULL,
  altitude_code INTEGER NOT NULL,
  document_id TEXT NOT NULL,
  tsb_id TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents (id),
  FOREIGN KEY (tsb_id) REFERENCES tsbs (id)
);

CREATE TABLE sofia_settlements (
  id TEXT NOT NULL PRIMARY KEY,
  ekatte_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  FOREIGN KEY (ekatte_id) REFERENCES ekattes (id),
  FOREIGN KEY (document_id) REFERENCES documents (id)
);

CREATE TABLE municipalities (
  id INTEGER NOT NULL PRIMARY KEY,
  ekatte_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  category INTEGER NOT NULL,
  FOREIGN KEY (ekatte_id) REFERENCES ekattes (id),
  FOREIGN KEY (document_id) REFERENCES documents (id)
);

CREATE TABLE municipality_governments (
  id INTEGER NOT NULL PRIMARY KEY,
  ekatte_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  category TEXT, -- do not exist yet
  FOREIGN KEY (ekatte_id) REFERENCES ekattes (id),
  FOREIGN KEY (document_id) REFERENCES documents (id)
);

CREATE TABLE provinces (
  id INTEGER NOT NULL PRIMARY KEY,
  ekatte_id TEXT NOT NULL,
  document_id TEXT NOT NULL,
  region_id TEXT NOT NULL,
  FOREIGN KEY (ekatte_id) REFERENCES ekattes (id),
  FOREIGN KEY (document_id) REFERENCES documents (id),
  FOREIGN KEY (region_id) REFERENCES regions_lvl_2(id)
);

CREATE TABLE settlement_formations (
  ekatte_id TEXT NOT NULL PRIMARY KEY,
  kind INTEGER NOT NULL,
  name TEXT NOT NULL,
  area_1 TEXT NOT NULL,
  area_2 TEXT, -- only some settlement formations have two areas
  document_id TEXT NOT NULL,
  FOREIGN KEY (document_id) REFERENCES documents(id)
);

ALTER TABLE ekattes
ADD FOREIGN KEY (province_id) REFERENCES provinces(id),
ADD FOREIGN KEY (municipality_id) REFERENCES municipalities(id),
ADD FOREIGN KEY (municipal_gov_id) REFERENCES municipality_governments(id);