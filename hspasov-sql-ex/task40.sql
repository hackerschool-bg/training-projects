-- Short database description "Ships"

-- For the ships in the Ships table that have at least 10 guns, get the class, name, and country.

SELECT Ships.class, Ships.name, Classes.country
FROM Ships
JOIN Classes ON Ships.class = Classes.class
WHERE Classes.numGuns >= 10;
