-- Short database description "Ships"

-- Find the names of the ships having a gun caliber of 16 inches (including ships in the Outcomes table).

SELECT Ships.name
FROM Classes
JOIN Ships ON Classes.class = Ships.class
WHERE Classes.bore = 16
UNION
SELECT DISTINCT Outcomes.Ship
FROM Outcomes JOIN Classes ON Outcomes.Ship = Classes.class
WHERE Classes.bore = 16;
