-- Short database description "Recycling firm"

-- Under the assumption that receipts of money (inc) and payouts (out) are registered not more than once a day for each collection point [i.e. the primary key consists of (point, date)], write a query displaying cash flow data (point, date, income, expense).
-- Use Income_o and Outcome_o tables.

SELECT point, date, sum(income), sum(expense)
FROM (
SELECT point, date, inc AS income, NULL AS expense
FROM Income_o
UNION
SELECT point, date, NULL AS income, out AS expense
FROM Outcome_o
) AS subquery
GROUP BY point, date;
