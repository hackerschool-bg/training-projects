const visualizationElement = document.getElementById('visualization');
const nInputElement = document.getElementById('n-input');
const aInputElement = document.getElementById('a-input');
const bInputElement = document.getElementById('b-input');
const cInputElement = document.getElementById('c-input');
const submitElement = document.getElementById('submit');
const resultElement = document.getElementById('result');

const redSegment = '<span class="redsegment"><b>=</b></span>';
const segment = '<span class="segment">_</span>';

function handleSubmitElement () {
  solve(Number(nInputElement.value), Number(aInputElement.value), Number(bInputElement.value), Number(cInputElement.value));
}

function solve (n, a, b, c) {
  let visualization = '';

  if (!(
    Number.isInteger(n) &&
    Number.isInteger(a) &&
    Number.isInteger(b) &&
    Number.isInteger(c) &&
    n > 0 &&
    a > 0 &&
    b > 0 &&
    c > 0 &&
    n < 100000 &&
    a < 100000 &&
    b < 100000 &&
    c < 100000
  )) {

    console.error('Invalid input');
    visualizationElement.innerHTML = 'Error! Please use positive integers (1, 2, 3 ...), but smaller than 100 000!';
    return;
  }

  const points = new Array(n + 1);
  const redSegments = new Array(n);

  points.fill(false);
  redSegments.fill(false);

  for (let i = 0; i < points.length; i++) {
    if (i % a === 0) {
      points[i] = true;
    }

    if (i % b == 0) {
      points[points.length - i - 1] = true;
    }
  }

  for (let i = 0; i < points.length - c; i++) {
    if (points[i] && points[i + c]) {
      redSegments.fill(true, i, i + c);
    }
  }

  // console.log(points);
  // console.log(redSegments);

  let result = 0;

  for (let i = 0; i < redSegments.length; i++) {
    visualization += (points[i]) ? '.' : ' ';

    if (!redSegments[i])  {
      result++;
      visualization += segment;
    } else {
      visualization += redSegment;
    }
  }

  resultElement.innerHTML = `Result: ${result}`;

  visualization += '.';

  visualizationElement.innerHTML = visualization;
}

submitElement.onclick = handleSubmitElement;
