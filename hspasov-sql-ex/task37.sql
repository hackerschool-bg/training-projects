-- Short database description "Ships"

-- Find classes for which only one ship exists in the database (including the Outcomes table).

-- not working

SELECT class
FROM Ships
WHERE class NOT IN (
SELECT class
FROM Classes
INNER JOIN Outcomes ON Classes.class = Outcomes.ship
)
GROUP BY class
HAVING Count(name) = 1
UNION
SELECT class
FROM Classes
INNER JOIN Outcomes ON Classes.class = Outcomes.ship
WHERE Classes.class NOT IN (
SELECT class
FROM Ships
);
