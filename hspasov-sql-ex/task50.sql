-- Short database description "Ships"

-- Find the battles in which Kongo-class ships from the Ships table were engaged.

SELECT DISTINCT Battles.name
FROM Outcomes
JOIN Battles ON Outcomes.battle = Battles.name
JOIN Ships ON Outcomes.ship = Ships.name
WHERE Ships.class = 'Kongo';
