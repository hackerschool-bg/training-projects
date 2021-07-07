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

CREATE TABLE provinces (
  id TEXT NOT NULL PRIMARY KEY,
  region TEXT NOT NULL,
  document TEXT NOT NULL
);

CREATE TABLE municipalities (
  id TEXT NOT NULL PRIMARY KEY,
  category INTEGER NOT NULL,
  document TEXT NOT NULL,
  province_id TEXT NOT NULL,
  FOREIGN KEY (province_id) REFERENCES provinces (id)
);

CREATE TABLE ekattes (
  id TEXT NOT NULL PRIMARY KEY,
  kind INTEGER NOT NULL,
  name TEXT NOT NULL,
  category INTEGER NOT NULL,
  altitude_code INTEGER NOT NULL,
  document TEXT NOT NULL,
  municipality_id TEXT NOT NULL,
  FOREIGN KEY (municipality_id) REFERENCES municipalities (id)
);
