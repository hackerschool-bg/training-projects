const submitBtn = document.getElementById('submit');
const input = document.getElementById('input');
const result = document.getElementById('result');
const canvas = document.getElementById('coordinate-system');

function handleError (error) {
  displayMessage(error.error);
}

window.addEventListener('error', handleError);

function displayMessage (message) {
  window.alert(message);
}

function parseInput (input) {
  const NUMBERS_ROW_PATTERN = /[-\d ]+(?=\n|$)/g;
  const NUMBER_PATTERN = /-?\d+/g;

  if (typeof input !== 'string') {
    throw new Error('Invalid input. Expected string.');
  }

  const numbersRowMatched = input.match(NUMBERS_ROW_PATTERN);

  if (!Array.isArray(numbersRowMatched)) {
    throw new Error('Invalid input. Expected rows with space separated numbers!');
  }

  const rows = numbersRowMatched.map(row => {
    return row.match(NUMBER_PATTERN).map(Number);
  });

  if (
    rows.length <= 0 ||
    !(rows[0] instanceof Array) ||
    rows[0].length !== 1
  ) {
    throw new Error('Invalid input. Expected one number on first row.');
  }

  const n = rows[0][0];

  if (rows.length - 1 !== n) {
    throw new Error(`Invalid input. Expected ${n} rows with numbers.`);
  }

  for (let i = 1; i < rows.length; i++) {
    if (
      !(rows[i] instanceof Array) ||
      rows[i].length !== 3
    ) {
      throw new Error('Invalid input. Expected three numbers on each row after the first one');
    }

    for (const number of rows[i]) {
      if (typeof number !== 'number') {
        throw new Error('Invalid input');
      }
    }
  }

  const circles = rows
    .filter((element, index) => index > 0)
    .map(element => ({
      x: element[0],
      y: element[1],
      r: element[2],
    }));

  return {
    n,
    circles,
  };
}

function getPaths (circles) {
  const pathsHash = {};

  for (let i = 0; i < circles.length; i++) {
    pathsHash[i + 1] = [];

    for (let k = 0; k < circles.length; k++) {
      if (k === i) {
        continue;
      }

      if (countTwoCirclesIntersections(circles[i], circles[k]) === 2) {
        pathsHash[i + 1].push(k + 1);
      }
    }
  }

  return pathsHash;
}

function calcShortestPath (pathsHash, endPoint) {
  if (Object.keys(pathsHash).length === 0 || pathsHash[1].length === 0) {
    return {
      statusCode: 1001,
      msg: 'Result: -1',
      pathLength: -1,
    };
  }

  const queue = [{
    id: 1,
    neighbours: pathsHash[1],
    pathHistory: [],
    depth: 0,
  }];
  const checked = [1];

  while (queue.length !== 0) {
    const element = queue.pop();

    for (const neighbour of element.neighbours) {
      if (neighbour === endPoint) {
        const pathLength = element.depth + 1;

        return {
          statusCode: 1000,
          msg: `Result: ${pathLength}`,
          pathHistory: [...element.pathHistory, element.id, endPoint],
          pathLength,
        };
      }

      if (!checked.includes(neighbour)) {
        queue.unshift({
          id: neighbour,
          neighbours: pathsHash[neighbour],
          pathHistory: [...element.pathHistory, element.id],
          depth: element.depth + 1,
        });
        checked.push(neighbour);
      }
    }
  }

  return {
    statusCode: 1001,
    msg: 'Result: -1',
    pathLength: -1,
  };
}

function countTwoCirclesIntersections (circle1, circle2) {
  const circlesCentersDistance = calcCircleCentersDistance(circle1, circle2);
  const biggerRadius = (circle1.r >= circle2.r) ? circle1.r : circle2.r;
  const smallerRadius = (circle1.r <= circle2.r) ? circle1.r : circle2.r;

  if (
    circle1.r + circle2.r > circlesCentersDistance &&
    biggerRadius - smallerRadius < circlesCentersDistance) {
    return 2;
  } else if (
    circle1.r + circle2.r === circlesCentersDistance ||
    biggerRadius - smallerRadius === circlesCentersDistance
  ) {
    return 1;
  } else if (
    circle1.x === circle2.x &&
    circle1.y === circle2.y &&
    circle1.r === circle2.r
  ) {
    return Infinity;
  } else {
    return 0;
  }
}

function calcCircleCentersDistance (circle1, circle2) {
  const xDiff = Math.abs(circle1.x - circle2.x);
  const yDiff = Math.abs(circle1.y - circle2.y);

  return calcHypotenuse(xDiff, yDiff);
}

function calcHypotenuse (catethus1, catethus2) {
  return Math.sqrt((catethus1 ** 2) + (catethus2 ** 2));
}

function drawCoordinateSys (coordSysSize) {
  // http://usefulangle.com/post/19/html5-canvas-tutorial-how-to-draw-graphical-coordinate-system-with-grids-and-axis
  const font = '9px Arial';
  const axisLineStyle = '#000000';
  const gridLineStyle = '#e9e9e9';
  const xAxisStartingPoint = { number: 1, suffix: '' };
  const yAxisStartingPoint = { number: 1, suffix: '' };
  const ctx = canvas.getContext('2d');
  canvas.width = (
    coordSysSize.leftGridLines +
    coordSysSize.rightGridLines
  ) * coordSysSize.gridSize;
  canvas.height = (
    coordSysSize.topGridLines +
    coordSysSize.bottomGridLines
  ) * coordSysSize.gridSize;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const numLinesX = Math.floor(canvasHeight / coordSysSize.gridSize);
  const numLinesY = Math.floor(canvasWidth / coordSysSize.gridSize);
  const xAxisDistanceGridLines = coordSysSize.topGridLines;
  const yAxisDistanceGridLines = coordSysSize.leftGridLines;

  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  // Draw grid lines along X-axis
  for (let i = 0; i <= numLinesX; i++) {
    ctx.beginPath();
    ctx.lineWidth = 1;

    if (i === xAxisDistanceGridLines) {
      ctx.strokeStyle = axisLineStyle;
    } else {
      ctx.strokeStyle = gridLineStyle;
    }

    if (i === numLinesX) {
      ctx.moveTo(0, coordSysSize.gridSize * i);
      ctx.lineTo(canvasWidth, coordSysSize.gridSize * i);
    } else {
      ctx.moveTo(0, coordSysSize.gridSize * i);
      ctx.lineTo(canvasWidth, coordSysSize.gridSize * i);
    }
    ctx.stroke();
  }

  // Draw grid lines along Y-axis
  for (let i = 0; i < numLinesY; i++) {
    ctx.beginPath();
    ctx.lineWidth = 1;

    if (i === yAxisDistanceGridLines) {
      ctx.strokeStyle = axisLineStyle;
    } else {
      ctx.strokeStyle = gridLineStyle;
    }

    if (i === numLinesY) {
      ctx.moveTo(coordSysSize.gridSize * i, 0);
      ctx.lineTo(coordSysSize.gridSize * i, canvasHeight);
    } else {
      ctx.moveTo(coordSysSize.gridSize * i, 0);
      ctx.lineTo(coordSysSize.gridSize * i, canvasHeight);
    }
    ctx.stroke();
  }

  translateToCoordSysCenter(ctx, coordSysSize);

  // Draw tick marks along positive X-axis
  for (let i = 1; i < numLinesY - yAxisDistanceGridLines; i++) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = axisLineStyle;

    ctx.moveTo(coordSysSize.gridSize * i, -3);
    ctx.lineTo(coordSysSize.gridSize * i, 3);
    ctx.stroke();

    ctx.font = font;
    ctx.textAlign = 'start';
    ctx.fillText(
      xAxisStartingPoint.number * i + xAxisStartingPoint.suffix,
      coordSysSize.gridSize * i - 2,
      15,
    );
  }

  // Draw tick marks along negative X-axis
  for (let i = 1; i < yAxisDistanceGridLines; i++) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = axisLineStyle;

    ctx.moveTo(-coordSysSize.gridSize * i, -3);
    ctx.lineTo(-coordSysSize.gridSize * i, 3);
    ctx.stroke();

    ctx.font = font;
    ctx.textAlign = 'end';
    ctx.fillText(
      -xAxisStartingPoint.number * i + xAxisStartingPoint.suffix,
      -coordSysSize.gridSize * i + 3,
      15,
    );
  }

  // Draw tick marks along positive Y-axis
  for (let i = 1; i < numLinesX - xAxisDistanceGridLines; i++) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = axisLineStyle;

    ctx.moveTo(-3, coordSysSize.gridSize * i);
    ctx.lineTo(3, coordSysSize.gridSize * i);
    ctx.stroke();

    ctx.font = font;
    ctx.textAlign = 'start';
    ctx.fillText(
      -yAxisStartingPoint.number * i + yAxisStartingPoint.suffix,
      8,
      coordSysSize.gridSize * i + 3,
    );
  }

  // Draw tick marks along negative Y-axis
  for (let i = 1; i < xAxisDistanceGridLines; i++) {
    ctx.beginPath();
    ctx.lineWidth = 1;
    ctx.strokeStyle = axisLineStyle;

    ctx.moveTo(-3, -coordSysSize.gridSize * i);
    ctx.lineTo(3, -coordSysSize.gridSize * i);
    ctx.stroke();

    ctx.font = font;
    ctx.textAlign = 'start';
    ctx.fillText(yAxisStartingPoint.number * i + yAxisStartingPoint.suffix,
      8,
      -coordSysSize.gridSize * i + 3,
    );
  }

  resetTranslation(ctx, coordSysSize);
}

function drawCircle (circle, label, coordSysSize) {
  const ctx = canvas.getContext('2d');

  translateToCoordSysCenter(ctx, coordSysSize);

  drawPoint(circle.x, circle.y, coordSysSize);

  const c = new window.Path2D();
  c.arc(
    circle.x * coordSysSize.gridSize,
    circle.y * -coordSysSize.gridSize,
    circle.r * coordSysSize.gridSize,
    0,
    2 * Math.PI,
  );
  ctx.stroke(c);

  ctx.fillText(
    label,
    circle.x * coordSysSize.gridSize,
    circle.y * -coordSysSize.gridSize
  );

  resetTranslation(ctx, coordSysSize);
}

function drawPoint (x, y, coordSysSize) {
  const ctx = canvas.getContext('2d');

  const c = new window.Path2D();
  c.rect(x * coordSysSize.gridSize, y * -coordSysSize.gridSize, 1, 1);

  ctx.stroke(c);
}

function drawLine (point1, point2, coordSysSize) {
  const ctx = canvas.getContext('2d');
  const pathStyle = '#FF0000';

  translateToCoordSysCenter(ctx, coordSysSize);

  ctx.beginPath();
  ctx.lineWidth = 1;
  ctx.strokeStyle = pathStyle;

  ctx.moveTo(
    point1.x * coordSysSize.gridSize,
    point1.y * -coordSysSize.gridSize
  );
  ctx.lineTo(
    point2.x * coordSysSize.gridSize,
    point2.y * -coordSysSize.gridSize
  );
  ctx.stroke();

  resetTranslation(ctx, coordSysSize);
}

function translateToCoordSysCenter (ctx, coordSysSize) {
  ctx.translate(
    coordSysSize.leftGridLines * coordSysSize.gridSize,
    coordSysSize.topGridLines * coordSysSize.gridSize,
  );
}

function resetTranslation (ctx, coordSysSize) {
  ctx.translate(
    -coordSysSize.leftGridLines * coordSysSize.gridSize,
    -coordSysSize.topGridLines * coordSysSize.gridSize,
  );
}

function onSubmit () {
  const parsedInput = parseInput(input.value);

  const n = parsedInput.n;
  const circles = parsedInput.circles;

  if (n < 2 || n > 1000) {
    throw new Error(`n must be >= 2 and <= 1000, but n=${n}`);
  }

  for (const circle of circles) {
    if (circle.x <= -10000 || circle.x >= 10000) {
      throw new Error(`x must be > -10000 and < 10000, but x=${circle.x}`);
    }

    if (circle.y <= -10000 || circle.y >= 10000) {
      throw new Error(`y must be > -10000 and < 10000, but y=${circle.y}`);
    }

    if (circle.r <= 0 || circle.r >= 10000) {
      throw new Error(`r must be > 0 and < 10000, but r=${circle.r}`);
    }
  }

  const leftmostPoint = Math.min(
    ...circles.map((circle) => circle.x - circle.r)
  );
  const rightmostPoint = Math.max(
    ...circles.map((circle) => circle.x + circle.r)
  );
  const bottommostPoint = Math.min(
    ...circles.map((circle) => circle.y - circle.r)
  );
  const topmostPoint = Math.max(
    ...circles.map((circle) => circle.y + circle.r)
  );

  const coordSysSize = {
    leftGridLines: (leftmostPoint < 0) ? Math.abs(leftmostPoint) : 1,
    rightGridLines: (rightmostPoint > 0) ? Math.abs(rightmostPoint) : 1,
    bottomGridLines: (bottommostPoint < 0) ? Math.abs(bottommostPoint) : 1,
    topGridLines: (topmostPoint > 0) ? Math.abs(topmostPoint) : 1,
    gridSize: 25,
  };

  drawCoordinateSys(coordSysSize);

  for (let i = 0; i < circles.length; i++) {
    drawCircle(circles[i], `A${i + 1}`, coordSysSize);
  }

  const pathsHash = getPaths(circles);
  const shortestPath = calcShortestPath(pathsHash, n);

  result.innerHTML = shortestPath.msg;

  if (shortestPath.statusCode !== 1000) {
    return;
  }

  const shortestPathNodesFilter = (shortestPath) => (circle, index) => {
    return shortestPath.pathHistory.includes(index + 1);
  };

  const shortestPathNodes = circles.filter(
    shortestPathNodesFilter(shortestPath)
  );

  for (let i = 0; i < shortestPathNodes.length - 1; i++) {
    const point1 = {
      x: shortestPathNodes[i].x,
      y: shortestPathNodes[i].y,
    };
    const point2 = {
      x: shortestPathNodes[i + 1].x,
      y: shortestPathNodes[i + 1].y,
    };
    drawLine(point1, point2, coordSysSize);
  }
}

submitBtn.addEventListener('click', onSubmit);
