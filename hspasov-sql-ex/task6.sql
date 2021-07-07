-- Short database description "Computer firm"

-- For each maker producing laptops with a hard drive capacity of 10 Gb or higher, find the speed of such laptops. Result set: maker, speed.

SELECT DISTINCT maker, speed
FROM Laptop
JOIN Product
ON Laptop.model = Product.model
WHERE hd >= 10;
