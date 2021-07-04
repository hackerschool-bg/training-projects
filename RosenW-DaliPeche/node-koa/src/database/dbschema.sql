CREATE DOMAIN email AS text CHECK ( value ~ '^[a-zA-Z0-9.!#$%&''*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$' );

CREATE TABLE requests (
  id serial PRIMARY KEY,
  iata_code text unique,
  city text unique,
  call_count integer DEFAULT 1 NOT NULL
);

CREATE TABLE cities (
  id serial PRIMARY KEY,
  name text NOT NULL unique,
  country_code text,
  lng numeric,
  lat numeric,
  observed_at timestamp
);

CREATE TABLE countries (
  id serial PRIMARY KEY,
  name text NOT NULL unique,
  country_code text NOT NULL unique
);

CREATE TABLE weather_conditions (
  id serial PRIMARY KEY,
  city_id integer NOT NULL REFERENCES cities(id),
  weather text,
  weather_description text,
  cloudiness numeric,
  humidity numeric,
  max_temperature numeric,
  min_temperature numeric,
  sea_pressure numeric,
  ground_pressure numeric,
  wind_direction numeric,
  wind_speed numeric,
  forecast_time timestamp NOT NULL,
  unique (city_id, forecast_time)
);

CREATE TABLE users (
  id serial PRIMARY KEY,
  username text NOT NULL unique,
  email email NOT NULL,
  credits numeric DEFAULT 0 NOT NULL CHECK (credits >= 0),
  failed_requests integer DEFAULT 0 NOT NULL,
  successful_requests integer DEFAULT 0 NOT NULL,
  password text NOT NULL,
  salt text NOT NULL,
  date_registered timestamp NOT NULL
);

CREATE TABLE api_keys (
  id serial PRIMARY KEY,
  key text NOT NULL,
  user_id integer NOT NULL REFERENCES users(id),
  use_count integer DEFAULT 0 NOT NULL
);

CREATE TABLE credit_transfers (
  id serial PRIMARY KEY,
  user_id integer NOT NULL REFERENCES users(id),
  credits_received numeric,
  credits_spent numeric,
  event text NOT NULL,
  transfer_date timestamp NOT NULL,
  approved boolean DEFAULT true NOT NULL
);

CREATE TABLE backoffice_users (
  id serial PRIMARY KEY,
  username text NOT NULL unique,
  password text NOT NULL,
  salt text NOT NULL
);

CREATE TABLE roles (
  id serial PRIMARY KEY,
  role text NOT NULL,
  can_see_users boolean NOT NULL DEFAULT false,
  can_add_credits boolean NOT NULL DEFAULT false,
  can_see_transfers boolean NOT NULL DEFAULT false,
  can_see_cities boolean NOT NULL DEFAULT false,
  can_see_requests boolean NOT NULL DEFAULT false,
  can_see_credit_balance boolean NOT NULL DEFAULT false,
  can_see_credits_for_approval boolean NOT NULL DEFAULT false,
  can_approve_credits boolean NOT NULL DEFAULT false,
  can_see_roles boolean NOT NULL DEFAULT false,
  can_change_role_permissions boolean NOT NULL DEFAULT false,
  can_see_backoffice_users boolean NOT NULL DEFAULT false,
  can_edit_backoffice_users boolean NOT NULL DEFAULT false
);

CREATE TABLE backoffice_users_roles (
  backoffice_user_id integer NOT NULL REFERENCES backoffice_users(id),
  role_id integer NOT NULL REFERENCES roles(id),
  PRIMARY KEY(backoffice_user_id, role_id)
);

CREATE INDEX requests_iata_code_index ON requests (iata_code);
CREATE INDEX requests_city_index ON requests (city);
CREATE INDEX requests_call_count_index ON requests (call_count);

CREATE INDEX cities_name_index ON cities (name);
CREATE INDEX cities_country_code_index ON cities (country_code);
CREATE INDEX cities_lng_index ON cities (lng);
CREATE INDEX cities_lat_index ON cities (lat);
CREATE INDEX cities_observed_at_index ON cities (observed_at);

CREATE INDEX weather_conditions_city_id_index ON weather_conditions (city_id);
CREATE INDEX weather_conditions_weather_index ON weather_conditions (weather);
CREATE INDEX weather_conditions_weather_description_index ON weather_conditions (weather_description);
CREATE INDEX weather_conditions_cloudiness_index ON weather_conditions (cloudiness);
CREATE INDEX weather_conditions_humidity_index ON weather_conditions (humidity);
CREATE INDEX weather_conditions_max_temp_index ON weather_conditions (max_temperature);
CREATE INDEX weather_conditions_min_temp_index ON weather_conditions (min_temperature);
CREATE INDEX weather_conditions_sea_pressure_index ON weather_conditions (sea_pressure);
CREATE INDEX weather_conditions_ground_pressure_index ON weather_conditions (ground_pressure);
CREATE INDEX weather_conditions_wind_direction_index ON weather_conditions (wind_direction);
CREATE INDEX weather_conditions_wind_speed_index ON weather_conditions (wind_speed);
CREATE INDEX weather_conditions_forecast_time_index ON weather_conditions (forecast_time);

CREATE INDEX users_username_index ON users (username);
CREATE INDEX users_email_index ON users (email);
CREATE INDEX users_credits_index ON users (credits);
CREATE INDEX users_failed_requests_index ON users (failed_requests);
CREATE INDEX users_successful_requests_index ON users (successful_requests);
CREATE INDEX users_password_index ON users (password);
CREATE INDEX users_salt_index ON users (salt);
CREATE INDEX users_date_registered_index ON users (date_registered);

CREATE INDEX api_keys_key_index ON api_keys (key);
CREATE INDEX api_keys_user_id_index ON api_keys (user_id);
CREATE INDEX api_keys_use_count_index ON api_keys (use_count);

CREATE INDEX credit_transfers_user_id_index ON credit_transfers (user_id);
CREATE INDEX credit_transfers_credits_bought_index ON credit_transfers (credits_received);
CREATE INDEX credit_transfers_credits_spent_index ON credit_transfers (credits_spent);
CREATE INDEX credit_transfers_event_index ON credit_transfers (event);
CREATE INDEX credit_transfers_transfer_date_index ON credit_transfers (transfer_date);
CREATE INDEX credit_transfers_approved_index ON credit_transfers (approved);

-- dropping indexes
DROP INDEX requests_iata_code_index;
DROP INDEX requests_city_index;
DROP INDEX requests_call_count_index;

DROP INDEX cities_name_index;
DROP INDEX cities_country_code_index;
DROP INDEX cities_lng_index;
DROP INDEX cities_lat_index;
DROP INDEX cities_observed_at_index;

DROP INDEX weather_conditions_city_id_index;
DROP INDEX weather_conditions_weather_index;
DROP INDEX weather_conditions_weather_description_index;
DROP INDEX weather_conditions_cloudiness_index;
DROP INDEX weather_conditions_humidity_index;
DROP INDEX weather_conditions_max_temp_index;
DROP INDEX weather_conditions_min_temp_index;
DROP INDEX weather_conditions_sea_pressure_index;
DROP INDEX weather_conditions_ground_pressure_index;
DROP INDEX weather_conditions_wind_direction_index;
DROP INDEX weather_conditions_wind_speed_index;
DROP INDEX weather_conditions_forecast_time_index;

DROP INDEX users_username_index;
DROP INDEX users_email_index;
DROP INDEX users_credits_index;
DROP INDEX users_failed_requests_index;
DROP INDEX users_successful_requests_index;
DROP INDEX users_password_index;
DROP INDEX users_salt_index;
DROP INDEX users_date_registered_index;

DROP INDEX api_keys_key_index;
DROP INDEX api_keys_user_id_index;
DROP INDEX api_keys_use_count_index;

DROP INDEX credit_transfers_user_id_index;
DROP INDEX credit_transfers_credits_bought_index;
DROP INDEX credit_transfers_credits_spent_index;
DROP INDEX credit_transfers_event_index;
DROP INDEX credit_transfers_transfer_date_index;
