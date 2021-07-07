const submitBtn = document.getElementById('submit');
const input = document.getElementById('input');
const output = document.getElementById('output');
const visualization = document.getElementById('visualization');
const dayByDayBtn = document.getElementById('day-by-day-btn');
const nextDayBtn = document.getElementById('next-day-btn');
const dayCountElement = document.getElementById('day-count');
let strawberryCalculation;
let dayCounter = 0;

function * calculateStrawberries (input) {
  function parseInput (input) {
    const numbersRowPattern = /[\d ]+(?=\n|$)/g;
    const numberPattern = /\d+/g;

    if (typeof input !== 'string') {
      throw new Error('Invalid input');
    }

    const numbersRowMatched = input.match(numbersRowPattern);
    const structured = numbersRowMatched.map(row => row.match(numberPattern).map(numberString => Number(numberString)));

    if (
      structured.length <= 0 ||
      !(structured[0] instanceof Array) ||
      structured[0].length !== 3
    ) {
      throw new Error('Invalid input');
    }

    for (let i = 1; i < structured.length; i++) {
      if (
        !(structured[i] instanceof Array) ||
        structured[i].length !== 2
      ) {
        throw new Error('Invalid input');
      }

      for (let number of structured[i]) {
        if (typeof number !== 'number') {
          throw new Error('Invalid input');
        }
      }
    }

    return {
      k: structured[0][0],
      l: structured[0][1],
      r: structured[0][2],
      initRottenStrawberries: structured
        .filter((element, index) => index > 0)
        .map(element => {
          return { row: element[0], col: element[1] };
        })
    };
  }

  let strawberries = parseInput(input);

  let k, l, r;

  let goodStrawberries = 0;

  // get k, l, r
  k = strawberries.k;
  l = strawberries.l;
  r = strawberries.r;

  let isRottenCurrentDay = [];
  let isRottenNextDay = [];

  for (let row = 0; row < k; row++) {
    isRottenCurrentDay.push(new Array(l).fill(false));
    isRottenNextDay.push(new Array(l).fill(false));
  }

  // get rotten strawberries
  const initRottenStrawberries = strawberries.initRottenStrawberries;

  for (let initRottenStrawberry of initRottenStrawberries) {
    isRottenCurrentDay[initRottenStrawberry.row - 1][initRottenStrawberry.col - 1] = true;
  }

  for (let day = 0; day < r; day++) {
    for (let row = 0; row < k; row++) {
      for (let col = 0; col < l; col++) {
        if (isRottenCurrentDay[row][col] === true) {
          isRottenNextDay[row][col] = true;

          if (row > 0) {
            isRottenNextDay[row - 1][col] = true;
          }
          if (row < k - 1) {
            isRottenNextDay[row + 1][col] = true;
          }
          if (col > 0) {
            isRottenNextDay[row][col - 1] = true;
          }
          if (col < l - 1) {
            isRottenNextDay[row][col + 1] = true;
          }
        }
      }
    }

    for (let row = 0; row < k; row++) {
      for (let col = 0; col < l; col++) {
        isRottenCurrentDay[row][col] = isRottenNextDay[row][col];
      }
    }

    visualize(isRottenCurrentDay);
    yield isRottenCurrentDay;
  }

  for (let row = 0; row < k; row++) {
    for (let col = 0; col < l; col++) {
      if (isRottenCurrentDay[row][col] === false) {
        goodStrawberries++;
      }
    }
  }

  return goodStrawberries;
}

function visualize (strawberries) {
  let visualized = '';

  for (let row = strawberries.length - 1; row >= 0; row--) {
    for (let col = 0; col < strawberries[row].length; col++) {
      visualized += (strawberries[row][col]) ? 'X' : 'O';
    }
    visualized += '\n';
  }
  visualization.innerHTML = visualized;
}

submitBtn.addEventListener('click', (event) => {
  strawberryCalculation = calculateStrawberries(input.value);
  let strawberryData = strawberryCalculation.next();
  while (!strawberryData.done) {
    strawberryData = strawberryCalculation.next();
  }
  dayCountElement.style.visibility = 'hidden';
  output.innerHTML = `Good strawberries: ${strawberryData.value}`;
});

dayByDayBtn.addEventListener('click', (event) => {
  strawberryCalculation = calculateStrawberries(input.value);
  dayByDayBtn.style.visibility = 'hidden';
  nextDayBtn.style.visibility = 'visible';
  dayCountElement.style.visibility = 'visible';
  dayCounter = 0;
  dayCountElement.innerHTML = `Day ${dayCounter}`;
  visualization.innerHTML = '';
  output.innerHTML = '';
});

nextDayBtn.addEventListener('click', (event) => {
  const strawberryData = strawberryCalculation.next();
  const strawberries = strawberryData.value;

  if (strawberryData.done) {
    dayByDayBtn.style.visibility = 'visible';
    nextDayBtn.style.visibility = 'hidden';
    dayCountElement.style.visibility = 'hidden';
    return;
  }

  dayCounter++;

  let goodStrawberries = 0;
  for (let row = 0; row < strawberries.length; row++) {
    for (let col = 0; col < strawberries[row].length; col++) {
      if (strawberries[row][col] === false) {
        goodStrawberries++;
      }
    }
  }
  dayCountElement.innerHTML = `Day ${dayCounter}`;
  output.innerHTML = `Good strawberries: ${goodStrawberries}`;
});

nextDayBtn.style.visibility = 'hidden';
dayCountElement.style.visibility = 'hidden';
