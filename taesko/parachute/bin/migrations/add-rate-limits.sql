BEGIN;

CREATE TYPE api_methods AS ENUM (
  'export_credit_history'
);

CREATE OR REPLACE FUNCTION is_user_rate_limited(
  user_id_          integer,
  api_method_       api_methods,
  allowed_interval interval
)
  RETURNS boolean AS $$
BEGIN
  RETURN now() - allowed_interval < (SELECT MAX(au.requested_on)
                                     FROM api_usage AS au
                                     WHERE user_id_ = au.user_id
                                       AND api_method_ = au.api_method);
END;
$$
LANGUAGE plpgsql;

CREATE TABLE api_usage (
  id           serial PRIMARY KEY,
  user_id      integer     NOT NULL REFERENCES users,
  api_method   api_methods NOT NULL,
  requested_on timestamp DEFAULT now(),
  UNIQUE (user_id, api_method, requested_on),
  CHECK (NOT is_user_rate_limited(
      user_id,
      api_method,
      CASE
      WHEN api_method = 'export_credit_history'
        THEN '1 minute' :: interval
      ELSE '1 millisecond' :: interval
      END
  ))
);
COMMIT;