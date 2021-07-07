-- Short database description "Ships"

-- Find the ships that `survived for future battles`; that is, after being damaged in a battle, they participated in another one, which occurred later.

SELECT o1.ship
FROM Outcomes AS o1
JOIN Battles AS b1 ON o1.battle = b1.name
WHERE EXISTS (
SELECT 1
FROM Outcomes AS o2
JOIN Battles b2 ON b2.name = o2.battle
WHERE o2.result = 'damaged'
AND o2.ship = o1.ship
AND b2.date < b1.date
)
GROUP BY o1.ship;
