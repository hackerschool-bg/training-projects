const { assertPeer } = require('./../asserts/asserts.js');
const { isObject } = require('./../utils/utils.js');
const Database = require('./../database/db.js');
const db = Database('pg');
const requester = require('request-promise');
const {
  FORECAST_API_LINK,
  FORECAST_API_KEY,
} = require('./../utils/consts.js');

updateDB();

async function updateDB () {
  const cities = await db.sql(`SELECT * FROM cities`);
  const timePerRequest = cities.length > 60 ? 1000 : 0;
  for (const [index, city] of cities.entries()) {
    setTimeout(async () => {
      let forecast;

      try {
        forecast = await getWeatherAPIData(city.name);
      } catch (err) {
        console.error(`Getting data for city ${city.name} failed`);
      }

      assertPeer(
        isObject(forecast.city) &&
          isObject(forecast.city.coord),
        'API responded with wrong data',
        36
      );

      db.sql(
        `UPDATE cities
          SET country_code = $1, lat = $2, lng = $3, observed_at = $4
          WHERE name = $5`,
        forecast.city.country,
        forecast.city.coord.lat,
        forecast.city.coord.lon,
        new Date(),
        city.name
      );

      const dbCity = (await db.sql(`SELECT * FROM cities WHERE name = $1`, city.name))[0];

      db.sql(`DELETE FROM weather_conditions WHERE city_id = $1`, dbCity.id);

      for (const city of forecast.list) {
        assertPeer(
          Array.isArray(city.weather) &&
            isObject(city.clouds) &&
            isObject(city.main) &&
            isObject(city.wind),
          'API responded with wrong data',
          37
        );

        db.sql(
          `INSERT INTO weather_conditions (
            city_id,
            weather,
            weather_description,
            cloudiness,
            humidity,
            max_temperature,
            min_temperature,
            sea_pressure,
            ground_pressure,
            wind_direction,
            wind_speed,
            forecast_time
          )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
          dbCity.id,
          city.weather[0].main,
          city.weather[0].description,
          city.clouds.all,
          city.main.humidity,
          city.main.temp_max,
          city.main.temp_min,
          city.main.sea_level,
          city.main.grnd_level,
          city.wind.deg,
          city.wind.speed,
          new Date(city.dt_txt)
        );
      }
    }, timePerRequest * index);
  }
}

async function getWeatherAPIData (city) {
  const options = {
    uri: FORECAST_API_LINK,
    qs: {
      q: city,
      units: 'metric',
      appid: FORECAST_API_KEY,
    },
    headers: {
      'User-Agent': 'Request-Promise',
    },
    json: true, // parses the JSON string in the response
  };

  return requester(options);
}
