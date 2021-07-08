CREATE TABLE municipalities (
    id CHAR(3) PRIMARY KEY,
    name VARCHAR(25) NOT NULL
);

CREATE TABLE provinces (
    id CHAR(5) PRIMARY KEY,
    municipal_id CHAR(3) NOT NULL REFERENCES municipalities(id),
    name VARCHAR(25) NOT NULL
);

CREATE TABLE ekatte (
    id CHAR(5) PRIMARY KEY,
    province_id CHAR(5) NOT NULL REFERENCES provinces(id),
    name VARCHAR(25) NOT NULL,
    kind CHAR(1) NOT NULL,
    altitude SMALLINT NOT NULL
);

