-- Short database description "Computer firm"

-- For the PC in the PC table with the maximum code value, obtain all its characteristics (except for the code) and display them in two columns:
-- - name of the characteristic (title of the corresponding column in the PC table);
-- - its respective value.

SELECT 'price' AS chr, CAST(PC.price AS TEXT) AS value
FROM PC
WHERE PC.code = (
SELECT MAX(PC.code) FROM PC
)
UNION
SELECT 'ram' AS chr, CAST(PC.ram AS TEXT) AS value
FROM PC
WHERE PC.code = (
SELECT MAX(PC.code) FROM PC
)
UNION
SELECT 'speed' AS chr, CAST(PC.speed AS TEXT) AS value
FROM PC
WHERE PC.code = (
SELECT MAX(PC.code) FROM PC
)
UNION
SELECT 'hd' AS chr, CAST(PC.hd AS TEXT) AS value
FROM PC
WHERE PC.code = (
SELECT MAX(PC.code) FROM PC
)
UNION
SELECT 'model' AS chr, CAST(PC.model AS TEXT) AS value
FROM PC
WHERE PC.code = (
SELECT MAX(PC.code) FROM PC
)
UNION
SELECT 'cd' AS chr, CAST(PC.cd AS TEXT) AS value
FROM PC
WHERE PC.code = (
SELECT MAX(PC.code) FROM PC
);
