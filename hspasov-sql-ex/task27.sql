-- Short database description "Computer firm"

-- Find out the average hard disk drive capacity of PCs produced by makers who also manufacture printers.
-- Result set: maker, average HDD capacity.

SELECT maker, AVG(hd) AS avr_capacity
FROM Product
JOIN PC ON Product.model = PC.model
WHERE maker IN (
SELECT maker
FROM Product
WHERE type = 'Printer'
)
GROUP BY maker;
