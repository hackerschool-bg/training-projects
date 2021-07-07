-- Short database description "Ships"

-- For ship classes with a gun caliber of 16 in. or more, display the class and the country.

SELECT class, country
FROM Classes
WHERE bore >= 16;
