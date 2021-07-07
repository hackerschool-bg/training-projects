window.addEventListener('error', onError);

function onError (event) {
  window.alert(event.error.message);
}

function parseInput (input) {
  const NUMBERS_ROW_PATTERN = /[\d ]+(?=\n|$)/g;
  const FIRST_ROW_PATTERN = /\d+ \d+/g;

  if (typeof input !== 'string') {
    throw new Error('Invalid input. Expected string.');
  }

  const numbersRowMatched = input.match(NUMBERS_ROW_PATTERN);

  if (!Array.isArray(numbersRowMatched)) {
    throw new Error('Invalid input. Expected rows with space separated numbers!');
  }

  if (numbersRowMatched.length !== 2) {
    throw new Error('Expected only two rows of numbers!');
  }

  const firstRowNumbers = numbersRowMatched[0].match(/\d+/g);
  
  if (firstRowNumbers.length !== 2) {
    throw new Error('Expected two numbers on first line!');
  }

  const n = Number(firstRowNumbers[0]);
  const k = Number(firstRowNumbers[1]);

  if (n < 1 || n > 1000) {
    throw new Error('Expected n to be 1 <= n <= 1000');
  }

  if (k < 1 || k > 1000) {
    throw new Error('Expected k to be 1 <= k <= 1000');
  }

  const secondRowNumbers = numbersRowMatched[1].match(/\d+/g);

  if (secondRowNumbers.length !== n) {
    throw new Error('Expected the amount of weights given to be equal to n!');
  }

  const weights = secondRowNumbers.map(Number);

  for (const weight of weights) {
    if (!Number.isInteger(weight)) {
      throw new Error('Expected weights to be integers!');
    }

    if (weight < 1 || weight > 100000) {
      throw new Error('Expected weight to be 1 <= weight <= 100000');
    }
  }

  return {
    n,
    k,
    weights,
  };
}


function start () {
  const parsedInput = parseInput(document.getElementById('input').value);
  const n = parsedInput.n;
  const k = parsedInput.k;
  const weights = parsedInput.weights; // later, the same array is sorted!!
  const goatsWeightsOriginal = weights.slice();

  weights.sort((a, b) => { // desc
    if (a < b) {
      return 1;
    } else if (a > b) {
      return -1;
    } else {
      return 0;
    }
  });

  const minResult = weights[0];
  const weightsSum = weights.reduce((sum, goatWeight) => sum + goatWeight);

  if (k === 1) {
    // min boat size must be equal to the sum of the goats
    // in order to transfer all of them
    showResult({
      boatSize: weightsSum,
      goatWeightsOriginal,
      riverCrossings: goatWeightsOriginal,
    });
    return;
  }

  for (let boatSize = minResult; boatSize < weightsSum; boatSize++) {
    let boatCarry = 0;
    let trips = 0;
    let index = 0;
    const sortedGoatsIsTransfered = [];
    const riverCrossings = [];

    for (let i = 0; i < weights.length; i++) {
      sortedGoatsIsTransfered.push(false);
    }

    while (sortedGoatsIsTransfered.findIndex(e => e === false) !== -1) {
      if (index === 0) {
        // initialize for a new trip
        riverCrossings.push([]);
      }

      if (sortedGoatsIsTransfered[index]) {
        if (index === sortedGoatsIsTransfered.length - 1) {
          // at the end of the array, and current goat is transfered
          // so the boat can go across the river
          trips++;
          boatCarry = 0;

          // at the end of the array, but while loop did not finish,
          // so there must still be a goat that is not transfered at previous index
          index = 0;
        } else {
          // not at the end of the array,
          // goat is transfered,
          // nothing else to do except check next array element
          index++;
        }
      } else {
        if (boatCarry + weights[index] <= boatSize) {
          // goat not transfered,
          // goat's weight allows the goat to be on boat
          // so adding goat to boat, marking goat as transfered
          boatCarry += weights[index];
          sortedGoatsIsTransfered[index] = true;
          riverCrossings[trips].push(weights[index]);
        }

        if (
          // if at the end of the array
          index === sortedGoatsIsTransfered.length - 1 ||
          // or if not at the end, but all goats are either transfered or on the boat
          sortedGoatsIsTransfered.findIndex(e => e === false) === -1
        ) {
          // the boat can go across the river
          trips++;
          boatCarry = 0;

          // setting index to 0, because at the end of the array or
          // with all goats transfered there is nothing to do at higher indexes.
          // On the next iteration of the while loop,
          // the program will either keep checking for more goats to transfer, or exit the loop
          index = 0;
        } else {
          // not at the end of the array and there are more goats to transfer:
          // check the next elements in the array.
          // If among them there are goats that can be transfered, they will be transfered,
          // otherwise the program will enter the if part of this logical construction and
          // index will be reset to 0 in order to check the goats that are at lower index
          index++;
        }
      }
    }

    if (trips <= k) {
      showResult({
        riverCrossings,
        boatSize,
        goatsWeightsOriginal,
      });
      break;
    }
  }
}

function showResult (props) {
  document.getElementById('goats-weights').innerHTML = props.goatsWeightsOriginal.join(', ');
  document.getElementById('result').innerHTML = props.boatSize;

  const riverCrossings = props.riverCrossings;
  const riverCrossingsListElement = document.getElementById('river-crossings');

  while (riverCrossingsListElement.firstChild) {
    riverCrossingsListElement.removeChild(riverCrossingsListElement.firstChild);
  }

  for (const crossing of riverCrossings) {
    const listItem = document.createElement('li');
    listItem.innerHTML = `${crossing.join(', ')} (sum: ${crossing.reduce((sum, weight) => sum + weight)})`;
    riverCrossingsListElement.appendChild(listItem);
  }
}

document.getElementById('submit-input').addEventListener('click', start);

