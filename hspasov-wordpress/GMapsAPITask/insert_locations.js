const fetch = require("node-fetch");
const mysql = require("promise-mysql");
const read = require("read");

if (!process.env.WP_HOST ||
    !process.env.WP_USER ||
    !process.env.WP_DB ||
    !process.env.CDO_TOKEN) { // CDO - Climate Data Online
    console.error(
        "ERROR: Environmental variable(s) " +
        (process.env.WP_HOST ? "" : "WP_HOST ") +
        (process.env.WP_USER ? "" : "WP_USER ") +
        (process.env.WP_DB ? "" : "WP_DB ") +
        (process.env.CDO_TOKEN ? "" : "CDO_TOKEN ") +
        "not set"
    );
    process.exit();
}

function getTargetURI(limit, offset) {
    return `https://www.ncdc.noaa.gov/cdo-web/api/v2/stations?limit=${limit}&offset=${offset}`;
}

read({
    prompt: `Password for '${process.env.WP_USER}': `,
    silent: true
}, (error, input) => {

    if (error) {
        console.error(error);
        process.exit();
    }

    const limit = 1000;
    const targetCount = 11000;

    let connection;
    mysql.createConnection({
        host: process.env.WP_HOST,
        user: process.env.WP_USER,
        password: input,
        database: process.env.WP_DB
    }).then(conn => {
        connection = conn;
        return getDataAndSaveToDB(targetCount, limit, 0);
    }).catch(error => {
        console.error(error);
        process.exit();
    }).finally(() => {
        connection.end();
    });

    function getDataAndSaveToDB(targetCount, limit, offset) {
        console.log(`Request ${getTargetURI(limit, offset)}`);

        return fetch(getTargetURI(limit, offset), {
            method: "GET",
            headers: new fetch.Headers({
                token: process.env.CDO_TOKEN
            })
        }).then(response => {
            console.log(`Parsing response...`)
            return response.json();
        }).then(parsed => {
            console.log("Saving to database...");
            // API only has information for columns 'address', 'lat' and 'lng'
            // but table 'wp_wpgmza' has 10 other columns with NOT NULL constraint
            // so setting empty strings as values
            return connection.query(`INSERT INTO locations
                (address, elevation, elevation_unit, data_coverage, min_date, max_date, lat, lng)
            VALUES ?;`,
                [parsed.results.map(r => [r.name, r.elevation, r.elevationUnit, r.datacoverage, r.mindate, r.maxdate, r.latitude, r.longitude])]
            );
        }).then(() => {
            if (offset + limit < targetCount) {
                return getDataAndSaveToDB(targetCount, limit, offset + limit);
            } else {
                console.log("Successfully finished");
            }
        }).catch(error => {
            console.error(error);
            process.exit();
        });
    }
});