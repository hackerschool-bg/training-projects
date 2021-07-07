-- Short database description "Computer firm"

-- Using Product table, find out the number of makers who produce only one model.

SELECT COUNT(*)
FROM (
SELECT 1
FROM Product
GROUP BY maker
HAVING COUNT(model) = 1
) AS subquery;
