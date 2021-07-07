-- Short database description "Ships"

-- Find the names of ships sunk at battles, along with the names of the corresponding battles.

SELECT Outcomes.ship, Outcomes.battle
FROM Outcomes
WHERE Outcomes.result = 'sunk';
