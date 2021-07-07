-- Short database description "Ships"

-- Find countries that ever had classes of both battleships (‘bb’) and cruisers (‘bc’).

SELECT Classes.country
FROM Classes
WHERE type = 'bb'
INTERSECT
SELECT Classes.country
FROM Classes
WHERE type = 'bc';
