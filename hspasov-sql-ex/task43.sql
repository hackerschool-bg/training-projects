-- Short database description "Ships"

-- Get the battles that occurred in years when no ships were launched into water.

SELECT Battles.name
FROM Battles
WHERE DATE_PART('year', Battles.date)
NOT IN (
SELECT Ships.launched
FROM Ships WHERE Ships.launched IS NOT NULL
);
