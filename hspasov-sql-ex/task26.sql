-- Short database description "Computer firm"

-- Find out the average price of PCs and laptops produced by maker A.
-- Result set: one overall average price for all items.

SELECT avg(price) AS avg_price
FROM (
SELECT price
FROM PC
JOIN Product ON PC.model = Product.model
WHERE maker = 'A'
UNION ALL
SELECT price
FROM Laptop
JOIN Product ON Laptop.model = Product.model
WHERE maker = 'A'
) AS subquery;
