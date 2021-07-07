-- Short database description "Ships"

-- Find all ship names consisting of three or more words (e.g., King George V).
-- Consider the words in ship names to be separated by single spaces, and the ship names to have no leading or trailing spaces.

SELECT Ships.name
FROM Ships
WHERE Ships.name LIKE '% % %'
UNION
SELECT Outcomes.ship
FROM Outcomes
WHERE Outcomes.ship LIKE '% % %';
