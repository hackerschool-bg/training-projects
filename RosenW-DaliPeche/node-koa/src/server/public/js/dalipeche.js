const API_LINK = 'http://127.0.0.1:3001/api/forecast';
const ICON_WIDTH = 64;
const ICON_HEIGHT = 64;

$.fn.getForecast = async function ({city, iataCode, APIKey}) {
  const data = { key: APIKey };
  if (typeof city === 'string') {
    data.city = city;
  } else if (typeof iataCode === 'string') {
    data.iataCode = iataCode;
  } else {
    this[0].innerHTML = 'Error no city or IATA code present';
    return;
  }

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(data),
  };

  try {
    await displayImage(options, this[0]);
  } catch (err) {
    this[0].innerHTML = err.message;
  }
}

async function displayImage(options, parent) {
  const response = await fetch(API_LINK, options);
  const forecast = await response.json();
  const weatherTypes = {};

  if(!Array.isArray(forecast.conditions)) {
    if (forecast.message == null) {
      throw new Error('Could not display image');
    }
    throw new Error(forecast.message);
  }

  for (const condition of forecast.conditions) {
    if (condition.weather in weatherTypes) {
      weatherTypes[condition.weather] += 1;
      continue;
    }

    weatherTypes[condition.weather] = 1;
  }

  const mainWeather = Object.keys(weatherTypes).reduce((a, b) => weatherTypes[a] > weatherTypes[b] ? a : b);

  const image = document.createElement('img');
  image.setAttribute('src', getWeatherImage(mainWeather));
  image.setAttribute('height', ICON_HEIGHT);
  image.setAttribute('width', ICON_WIDTH);
  parent.appendChild(image);
}

function getWeatherImage (weather) {
  if (weather === 'Clouds') return 'http://www.myiconfinder.com/uploads/iconsets/256-256-d559b1d54a6141514622627a70b7c4d9-cloud.png';
  if (weather === 'Rain') return 'https://cdn4.iconfinder.com/data/icons/sunnyday-simple/142/sun_rain-512.png';
  if (weather === 'Snow') return 'https://cdn4.iconfinder.com/data/icons/iconsimple-weather/512/snow-512.png';
  if (weather === 'Clear') return 'https://image.flaticon.com/icons/png/512/63/63366.png';
  return 'https://cdn3.iconfinder.com/data/icons/weather-pack-3/512/rainbow-512.png';
}
