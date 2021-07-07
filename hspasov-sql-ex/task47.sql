-- Short database description "Computer firm"

-- Number the rows of the Product table as follows: makers in descending order of number of models produced by them (for manufacturers producing an equal number of models, their names are sorted in ascending alphabetical order); model numbers in ascending order.
-- Result set: row number as described above, manufacturer's name (maker), model.

-- not working

SELECT COUNT(*), p2.maker, p2.model
FROM Product p1
JOIN Product p2 ON p1.model <= p2.model
GROUP BY p2.model
ORDER BY p2.maker ASC, p2.model ASC;
