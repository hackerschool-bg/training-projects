-- Short database description "Ships"

-- List the names of lead ships in the database (including the Outcomes table).

SELECT Ships.name
FROM Classes
JOIN Ships ON Ships.class = Classes.class
WHERE Classes.class = Ships.name
UNION
SELECT Classes.class
FROM Outcomes
JOIN Classes
ON Outcomes.ship = Classes.class;
