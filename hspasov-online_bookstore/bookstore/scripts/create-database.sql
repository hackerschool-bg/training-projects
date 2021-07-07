-- $ sudo su - postgres
-- $ psql
-- connect to database 'postgres' with user 'postgres'. Query:
-- DROP DATABASE IF EXISTS bookstore;
-- DROP USER IF EXISTS bookstore;
-- CREATE USER bookstore WITH ENCRYPTED PASSWORD 'bookstore';
-- CREATE DATABASE bookstore WITH OWNER bookstore;
--
--  connect user 'postgres' to database 'bookstore':
-- $ \c bookstore
--
-- Query:
-- CREATE EXTENSION IF NOT EXISTS pgcrypto;
--
--  connect user 'bookstore' to database 'bookstore':
-- $ \q
-- $ psql --username=bookstore --password
-- \i create-database.sql
CREATE TYPE country AS ENUM (
    'Bulgaria',
    'United Kingdom',
    'United States'
);
CREATE TYPE currency AS ENUM (
    'BGN',
    'GBP',
    'USD'
);
CREATE TYPE rating AS ENUM (
    'terrible',
    'bad',
    'average',
    'good',
    'excellent'
);
CREATE TABLE users (
    id SERIAL PRIMARY KEY NOT NULL,
    username TEXT NOT NULL,
    email TEXT NOT NULL,
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    password TEXT NOT NULL,
    country country NOT NULL,
    address TEXT NOT NULL,
    phone_number TEXT NOT NULL,
    balance NUMERIC(16, 2) NOT NULL DEFAULT 0,
    currency currency NOT NULL DEFAULT 'USD',
    date_of_birth DATE NOT NULL,
    image TEXT,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE TABLE categories (
    id SERIAL PRIMARY KEY NOT NULL,
    label TEXT NOT NULL
);
CREATE TABLE genres (
    id SERIAL PRIMARY KEY NOT NULL,
    label TEXT NOT NULL
);
CREATE TABLE items (
    id SERIAL PRIMARY KEY NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    thumbnail TEXT NOT NULL,
    price NUMERIC(16, 2) NOT NULL,
    currency currency NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE TABLE comments (
    id SERIAL PRIMARY KEY NOT NULL,
    item_id INTEGER NOT NULL REFERENCES items ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE TABLE payment_methods (
    id SERIAL PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
    card_number TEXT NOT NULL,
    name_on_card TEXT NOT NULL,
    expired_on DATE NOT NULL
);
CREATE TABLE orders (
    id SERIAL PRIMARY KEY NOT NULL,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
    payment_method_id INTEGER REFERENCES payment_methods,
    delivery_address TEXT,
    ordered_at TIMESTAMP,
    created_at TIMESTAMP NOT NULL
);
CREATE TABLE order_items (
    id SERIAL PRIMARY KEY NOT NULL,
    item_id INTEGER NOT NULL REFERENCES items ON DELETE SET NULL ON UPDATE SET NULL,
    order_id INTEGER NOT NULL REFERENCES orders ON DELETE CASCADE,
    count INTEGER NOT NULL,
    item_title TEXT NOT NULL,
    item_description TEXT,
    item_price NUMERIC(16, 2) NOT NULL,
    item_thumbnail TEXT NOT NULL,
    item_currency currency NOT NULL,
    arrived_at TIMESTAMP
);
CREATE TABLE ratings (
    id SERIAL PRIMARY KEY NOT NULL,
    item_id INTEGER NOT NULL REFERENCES items ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users ON DELETE CASCADE,
    rating rating NOT NULL,
    created_at TIMESTAMP NOT NULL,
    updated_at TIMESTAMP NOT NULL
);
CREATE TABLE book_genres (
    item_id INTEGER NOT NULL REFERENCES items ON DELETE CASCADE,
    genre_id INTEGER NOT NULL REFERENCES genres,
    PRIMARY KEY(item_id, genre_id)
);
CREATE TABLE item_images (
    id SERIAL PRIMARY KEY NOT NULL,
    item_id INTEGER NOT NULL REFERENCES items ON DELETE CASCADE,
    file_name TEXT NOT NULL
);
CREATE OR REPLACE FUNCTION register (
    _username TEXT,
    _email TEXT,
    _first_name TEXT,
    _last_name TEXT,
    _password TEXT,
    _country country,
    _address TEXT,
    _phone_number TEXT,
    _balance NUMERIC(16, 2),
    _currency currency,
    _date_of_birth DATE,
    _image TEXT
  ) RETURNS RECORD AS $$
    DECLARE
      user RECORD;
    BEGIN
      SELECT INTO user username, created_at, FALSE from users
      WHERE users.username = _username;
      IF FOUND THEN
        RETURN user;
      ELSE
        INSERT INTO users (
          username,
          email,
          first_name,
          last_name,
          password,
          country,
          address,
          phone_number,
          balance,
          currency,
          date_of_birth,
          image,
          created_at,
          updated_at
        ) VALUES (
          _username,
          _email,
          _first_name,
          _last_name,
          crypt(_password, gen_salt('bf', 8)),
          _country,
          _address,
          _phone_number,
          _balance,
          _currency,
          _date_of_birth,
          _image,
          now(),
          now()
        ) RETURNING username, created_at, TRUE INTO user;
        RETURN user;
      END IF;
    END$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION login (
    _username TEXT,
    _password TEXT
  ) RETURNS RECORD AS $$
    DECLARE
      user RECORD;
    BEGIN
      SELECT INTO user username, TRUE from users
      WHERE users.username = _username AND
      users.password = crypt(_password, users.password);
      IF FOUND THEN
        RETURN user;
      ELSE
        RETURN (''::TEXT, FALSE);
      END IF;
    END$$ LANGUAGE plpgsql;