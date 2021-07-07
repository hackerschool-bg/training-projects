-- Short database description "Computer firm"

-- Find models in the Product table consisting either of digits only or Latin letters (A-Z, case insensitive) only.

SELECT Product.model, Product.type
FROM Product
WHERE Product.model SIMILAR TO '[A-Za-z]+|[0-9]+';
