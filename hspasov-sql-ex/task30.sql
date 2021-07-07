-- Short database description "Recycling firm"

-- Under the assumption that receipts of money (inc) and payouts (out) can be registered any number of times a day for each collection point [i.e. the code column is the primary key], display a table with one corresponding row for each operating date of each collection point.
-- Result set: point, date, total payout per day (out), total money intake per day (inc). 
-- Missing values are considered to be NULL.

SELECT point, date, sum(CAST(out AS NUMERIC)), sum(CAST(inc AS NUMERIC))
FROM (
SELECT point, date, NULL AS out, CAST(inc AS TEXT)
FROM Income
UNION ALL
SELECT point, date, CAST(out AS TEXT), NULL AS inc
FROM Outcome
) as subquery
GROUP BY point, date;
