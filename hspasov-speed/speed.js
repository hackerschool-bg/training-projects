function start () {
  class BaseError extends Error {}

  class AppError extends BaseError {}
  class UserError extends BaseError {}

  function assertApp (condition) {
    if (!condition) {
      throw new AppError();
    }
  }

  function assertUser (condition, userMessage) {
    if (!condition) {
      throw new UserError(userMessage);
    }
  }

  function isObject (param) {
    return typeof param === 'object' && param !== null;
  }

  function parseInput (input) {
    assertApp(typeof input === 'string');

    const NUMBERS_ROW_PATTERN = /[\d ]+(?=\n|$)/g;
    const NUMBER_PATTERN = /\d+/g;

    const numbersRowMatched = input.match(NUMBERS_ROW_PATTERN);

    assertUser(
      Array.isArray(numbersRowMatched),
      'Invalid input! Only digits and spaces allowed on each line of input!'
    );

    const rows = numbersRowMatched.filter((row) => {
      return row.match(NUMBER_PATTERN) !== null;
    }).map((row) => {
      return row.match(NUMBER_PATTERN).map(Number);
    });

    assertUser(
      rows.length >= 2,
      'Invalid input! Expected at least two lines! First line specifies amount of cities (N) and amount of roads (M), next lines describe each road!'
    );

    assertUser(
      rows[0].length === 2,
      'Invalid input! Expected two numbers for first line - specifying amount of cities (N) and amount of roads (M)!'
    );

    const [n, m] = rows[0];

    assertUser(
      Number.isSafeInteger(n),
      'Invalid input! Expected amount of cities (N) to be an integer!'
    );

    assertUser(
      Number.isSafeInteger(m),
      'Invalid input! Expected amount of roads (M) to be integer!'
    );

    assertUser(
      n >= 2 && n <= 1000,
      'Invalid input! Expected 2 <= N <= 1000!'
    );

    assertUser(
      m >= 1 && m <= 10000,
      'Invalid input! Expected 1 <= M <= 10000'
    );

    const paths = rows.filter((row, index) => {
      return index > 0;
    }).map((row) => {
      assertUser(
        row.length === 3,
        'Invalid input! Expected three numbers on each line after the first line!'
      );

      for (const element of row) {
        assertUser(
          Number.isSafeInteger(element),
          'Invalid input! Expected each row to have integers!'
        );
      }

      const [f, t, s] = row;

      assertUser(
        f >= 1 && f <= n,
        'Invalid input! Expected on each row 1 <= F <= N'
      );

      assertUser(
        t >= 1 && t <= n,
        'Invalid input! Expected on each row 1 <= T <= N'
      );

      assertUser(
        s >= 1 && s <= 30000,
        'Invalid input! Expected on each row 1 <= S <= 30000'
      );

      return {
        f: String(f),
        t: String(t),
        s,
      };
    });

    assertUser(
      paths.length === m,
      'Invalid input! Expected amount of rows after first line to be equal to amount of roads (M)!'
    );

    return {
      m,
      n,
      paths,
    };
  }

  function inputToGraph (input) {
    assertApp(isObject(input));
    assertApp(typeof input.n === 'number');
    assertApp(typeof input.m === 'number');
    assertApp(Array.isArray(input.paths));

    const graph = {};

    for (let i = 1; i <= input.n; i++) {
      graph[i] = [];
    }

    for (const path of input.paths) {
      assertApp(typeof path.f === 'string');
      assertApp(typeof path.t === 'string');

      if (!graph[path.f].includes(path.t)) {
        graph[path.f].push(path.t);
      }

      if (!graph[path.t].includes(path.f)) {
        graph[path.t].push(path.f);
      }
    }

    return graph;
  }

  function isPathBetweenTwoPoints (graph, currentPoint, goalPoint) {
    assertApp(typeof currentPoint === 'string');
    assertApp(typeof goalPoint === 'string');

    if (currentPoint === goalPoint) {
      return true;
    }

    const currentPointNeighbours = graph[currentPoint];

    assertApp(Array.isArray(currentPointNeighbours));

    if (currentPointNeighbours.includes(goalPoint)) {
      return true;
    }

    const graphClone = {
      ...graph,
      [currentPoint]: null,
    };

    for (const currentPointNeighbour of currentPointNeighbours) {
      assertApp(typeof currentPointNeighbour === 'string');

      if (!graphClone[currentPointNeighbour]) {
        continue;
      }

      if (
        isPathBetweenTwoPoints(graphClone, currentPointNeighbour, goalPoint)
      ) {
        return true;
      }
    }

    return false;
  }

  function arePathsBetweenAllPoints (graph) {
    const graphEntries = Object.entries(graph);

    for (let i = 0; i < graphEntries.length; i++) {
      for (let k = i + 1; k < graphEntries.length; k++) {
        const [point1, paths1] = graphEntries[i];
        const [point2, paths2] = graphEntries[k];

        if (!paths1 || !paths2) {
          continue;
        }

        if (!(isPathBetweenTwoPoints(graph, point1, point2))) {
          return false;
        }
      }
    }
    return true;
  }

  function getSmallest (values) {
    assertApp(Array.isArray(values));
    assertApp(values.length >= 1);

    let smallest = values[0];

    assertApp(typeof smallest === 'number');

    for (const value of values) {
      assertApp(typeof value === 'number');

      if (value < smallest) {
        smallest = value;
      }
    }

    return smallest;
  }

  function getBiggest (values) {
    assertApp(Array.isArray(values));
    assertApp(values.length >= 1);

    let biggest = values[0];

    assertApp(typeof biggest === 'number');

    for (const value of values) {
      assertApp(typeof value === 'number');

      if (value > biggest) {
        biggest = value;
      }
    }

    return biggest;
  }

  function filterPaths (paths, minSpeed, maxSpeed) {
    assertApp(Array.isArray(paths));
    assertApp(typeof minSpeed === 'number');
    assertApp(typeof maxSpeed === 'number');

    const filteredPaths = [];

    for (const path of paths) {
      assertApp(isObject(path));
      assertApp(typeof path.s === 'number');

      if (path.s >= minSpeed && path.s <= maxSpeed) {
        filteredPaths.push(path);
      }
    }

    return filteredPaths;
  }

  function calculate (input) {
    const calcGen = calculateGenerator(input);

    let result;

    while (true) {
      const { value, done } = calcGen.next();

      if (done) {
        result = value;
        break;
      }
    }

    return result;
  }

  function * calculateGenerator (input) {
    assertApp(isObject(input));
    assertApp(Array.isArray(input.paths));
    assertUser(
      arePathsBetweenAllPoints(inputToGraph(input)),
      'Invalid input! Expected paths between all points!'
    );

    const speeds = input.paths.map(p => p.s);
    const biggestSpeed = getBiggest(speeds);
    const smallestSpeed = getSmallest(speeds);
    const maxSpeedDiff = biggestSpeed - smallestSpeed;

    assertApp(typeof biggestSpeed === 'number');
    assertApp(typeof smallestSpeed === 'number');
    assertApp(typeof maxSpeedDiff === 'number');

    const sortedSpeeds = speeds.slice().sort((a, b) => { // sort ASC
      if (a > b) {
        return 1;
      } else if (a < b) {
        return -1;
      } else {
        return 0;
      }
    });

    for (let speedDiff = 0; speedDiff <= maxSpeedDiff; speedDiff++) {
      // console.log(biggestSpeed - speedDiff);
      for (
        let speedIndex = 0;
        sortedSpeeds[speedIndex] <= biggestSpeed - speedDiff &&
        speedIndex < sortedSpeeds.length;
        speedIndex++
      ) {
        const minSpeed = sortedSpeeds[speedIndex];
        const possiblePaths = filterPaths(
          input.paths,
          minSpeed,
          minSpeed + speedDiff
        );
        const graph = inputToGraph({
          ...input,
          paths: possiblePaths,
        });

        const currentState = {
          speedDiff,
          minSpeed,
          maxSpeed: minSpeed + speedDiff,
          graph,
          paths: possiblePaths,
        };

        if (arePathsBetweenAllPoints(graph)) {
          return currentState;
        } else {
          yield currentState;
        }
      }
    }

    return null;
  }

  function generateRandomCoordinatesForCities (cities) {
    const citiesCoordinates = {};

    for (const city of cities) {
      citiesCoordinates[city] = {
        x: Math.floor(Math.random() * CONFIG.CANVAS_WIDTH),
        y: Math.floor(Math.random() * CONFIG.CANVAS_HEIGHT),
      };
    }

    return citiesCoordinates;
  }

  function renderCitiesAndRoads (graph, pathsSpeeds, citiesCoordinates) {
    ctx.clearRect(0, 0, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    for (const [city, coordinates] of Object.entries(citiesCoordinates)) {
      drawPoint(coordinates, 'red');
      setLabel(city, coordinates, 'red');
    }

    for (const path of pathsSpeeds) {
      const cityFrom = path.f;
      const cityTo = path.t;
      const pathSpeed = path.s;

      drawLine(citiesCoordinates[cityFrom], citiesCoordinates[cityTo]);
      setLabel(pathSpeed, {
        x: (citiesCoordinates[cityFrom].x + citiesCoordinates[cityTo].x) / 2,
        y: (citiesCoordinates[cityFrom].y + citiesCoordinates[cityTo].y) / 2,
      });
    }

    ctx.stroke();
  }

  function drawPoint (point, color) {
    const originalFillStyle = ctx.fillStyle;

    ctx.fillStyle = color || originalFillStyle;

    ctx.beginPath();
    ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = originalFillStyle;
  }

  function setLabel (text, point, color) {
    const originalFillStyle = ctx.fillStyle;

    ctx.fillStyle = color || originalFillStyle;

    ctx.fillText(text, point.x, point.y + CONFIG.LABEL_OFFSET);

    ctx.fillStyle = originalFillStyle;
  }

  function drawLine (point1, point2, color) {
    const originalFillStyle = ctx.fillStyle;

    ctx.fillStyle = color || originalFillStyle;

    ctx.beginPath();
    ctx.moveTo(point1.x, point1.y);
    ctx.lineTo(point2.x, point2.y);
    ctx.stroke();

    ctx.fillStyle = originalFillStyle;
  }

  function displayMessage (message) {
    window.alert(message);
  }

  window.addEventListener('error', (error) => displayMessage(error.error));

  const inputElement = document.getElementById('input');
  const submitBtn = document.getElementById('submit-btn');
  const showStepByStepBtn = document.getElementById('show-step-by-step-btn');
  const nextStepBtn = document.getElementById('next-step-btn');
  const outputElement = document.getElementById('output');
  const sortedSpeedsElement = document.getElementById('road-speeds-sorted');
  const speedDiffElement = document.getElementById('speed-diff');
  const minSpeedElement = document.getElementById('min-speed');
  const maxSpeedElement = document.getElementById('max-speed');
  const stateElement = document.getElementById('state');
  const canvas = document.getElementById('cities-and-roads');
  const ctx = canvas.getContext('2d');
  const CONFIG = {
    CANVAS_WIDTH: 500,
    CANVAS_HEIGHT: 500,
    POINTS_DISTANCE: 100,
    LABEL_OFFSET: 15,
  };

  let calcGen;
  let randomCoordinates;

  canvas.width = CONFIG.CANVAS_WIDTH;
  canvas.height = CONFIG.CANVAS_HEIGHT;

  const onSubmitBtnClick = function (event) {
    assertApp(typeof inputElement.value === 'string');
    const input = parseInput(inputElement.value);

    const sortedSpeeds = input.paths.map((p) => p.s).slice().sort((a, b) => { // sort ASC
      if (a > b) {
        return 1;
      } else if (a < b) {
        return -1;
      } else {
        return 0;
      }
    });

    sortedSpeedsElement.innerHTML = sortedSpeeds.join(', ');

    const result = calculate(input);

    const graph = inputToGraph({
      ...input,
    });
    const randomCoordinates = generateRandomCoordinatesForCities(
      Object.keys(graph)
    );

    renderCitiesAndRoads(result.graph, result.paths, randomCoordinates);

    assertUser(isObject(result), 'No result found.');
    assertApp(typeof result.minSpeed === 'number');
    assertApp(typeof result.maxSpeed === 'number');

    speedDiffElement.innerHTML = '';
    minSpeedElement.innerHTML = '';
    maxSpeedElement.innerHTML = '';
    stateElement.innerHTML = 'All cities are connected with paths!';
    outputElement.innerHTML = `${result.minSpeed} ${result.maxSpeed}`;
    nextStepBtn.hidden = true;
    showStepByStepBtn.hidden = false;
  };

  const onNextStepBtnClick = function (event) {
    const { value, done } = calcGen.next();
    const {
      speedDiff,
      minSpeed,
      maxSpeed,
      graph,
      paths,
    } = value;

    speedDiffElement.innerHTML = speedDiff;
    minSpeedElement.innerHTML = minSpeed;
    maxSpeedElement.innerHTML = maxSpeed;

    renderCitiesAndRoads(graph, paths, randomCoordinates);

    if (done) {
      nextStepBtn.hidden = true;
      showStepByStepBtn.hidden = false;

      stateElement.innerHTML = 'All cities are connected with paths!';
      outputElement.innerHTML = `${minSpeed} ${maxSpeed}`;
    } else {
      nextStepBtn.hidden = false;
      showStepByStepBtn.hidden = true;

      stateElement.innerHTML = 'There are unreachable cities!';
    }
  };

  const onShowStepByStepBtnClick = function (event) {
    assertApp(typeof inputElement.value === 'string');
    const input = parseInput(inputElement.value);

    const sortedSpeeds = input.paths.map((p) => p.s).slice().sort((a, b) => { // sort ASC
      if (a > b) {
        return 1;
      } else if (a < b) {
        return -1;
      } else {
        return 0;
      }
    });

    sortedSpeedsElement.innerHTML = sortedSpeeds.join(', ');

    calcGen = calculateGenerator(input);

    const graph = inputToGraph({
      ...input,
    });
    randomCoordinates = generateRandomCoordinatesForCities(
      Object.keys(graph)
    );

    outputElement.innnerHTML = '';

    nextStepBtn.hidden = false;
    showStepByStepBtn.hidden = true;
  };

  submitBtn.addEventListener('click', onSubmitBtnClick);
  nextStepBtn.addEventListener('click', onNextStepBtnClick);
  showStepByStepBtn.addEventListener('click', onShowStepByStepBtnClick);
  nextStepBtn.hidden = true;
}

start();
