-- Short database description "Ships"

-- Get the ships sunk in the North Atlantic battle. 
-- Result set: ship.

SELECT Outcomes.ship
FROM Outcomes
WHERE battle = 'North Atlantic'
AND result = 'sunk';
