-- with user 'wordpress':
-- \. [path to file]\create_locations_table.sql
USE wordpress;
CREATE TABLE locations (
    id INTEGER NOT NULL AUTO_INCREMENT PRIMARY KEY,
    address TEXT,
    elevation DECIMAL(5, 1),
    elevation_unit TEXT,
    data_coverage DECIMAL(5, 4),
    min_date DATE,
    max_date DATE,
    lat DECIMAL(8, 5),
    lng DECIMAL(8, 5)
);
