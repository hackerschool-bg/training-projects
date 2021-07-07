-- Short database description "Ships"

-- Find all ship names beginning with the letter R.

SELECT Ships.name
FROM Ships
WHERE Ships.name LIKE 'R%'
UNION
SELECT Outcomes.ship
FROM Outcomes
WHERE Outcomes.ship LIKE 'R%';
