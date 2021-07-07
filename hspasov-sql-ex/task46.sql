-- Short database description "Ships"

-- For each ship that participated in the Battle of Guadalcanal, get its name, displacement, and the number of guns.

-- not working

SELECT Outcomes.ship, Classes.displacement, Classes.numGuns
FROM Outcomes
JOIN Ships ON Ships.name = Outcomes.ship
JOIN Classes ON Classes.class = Ships.class
WHERE Outcomes.battle = 'Guadalcanal'
UNION
SELECT DISTINCT Outcomes.ship, Classes.displacement, Classes.numGuns
FROM Outcomes
LEFT JOIN Classes ON Outcomes.ship = Classes.class
WHERE Outcomes.battle = 'Guadalcanal'
AND Outcomes.ship NOT IN (
SELECT Ships.name
FROM Ships
);
