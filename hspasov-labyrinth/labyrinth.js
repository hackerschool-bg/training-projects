const PATH_SYMBOL = '/';
const END_POINT_SYMBOL = 'e';
const WALL_SYMBOL = '*';

function findLabyrinthExits (matrix, position) {
  let solutions = [];
  // console.log(matrix);
  // console.log(position);

  if (matrix[position.row][position.col] === END_POINT_SYMBOL) {
    solutions.push(matrix);
    return solutions;
  } else if (matrix[position.row][position.col] === WALL_SYMBOL || matrix[position.row][position.col] === PATH_SYMBOL) {
    return solutions;
  }

  matrix[position.row][position.col] = PATH_SYMBOL;

  if (position.row > 0) {
    const result = findLabyrinthExits(getMatrixCopy(matrix), {
      col: position.col,
      row: position.row - 1,
    });
    solutions = solutions.concat(result);
  }

  if (position.col > 0) {
    const result = findLabyrinthExits(getMatrixCopy(matrix), {
      col: position.col - 1,
      row: position.row,
    });
    solutions = solutions.concat(result);
  }

  if (position.row < matrix.length - 1) {
    const result = findLabyrinthExits(getMatrixCopy(matrix), {
      col: position.col,
      row: position.row + 1,
    });
    solutions = solutions.concat(result);
  }

  if (position.col < matrix[0].length - 1) {
    const result = findLabyrinthExits(getMatrixCopy(matrix), {
      col: position.col + 1,
      row: position.row,
    });
    solutions = solutions.concat(result);
  }

  return solutions;
}

function getMatrixCopy (matrix) {
  const matrixCopy = [];

  for (const matrixRow of matrix) {
    const matrixRowCopy = [];

    for (const matrixCell of matrixRow) {
      matrixRowCopy.push(matrixCell);
    }

    matrixCopy.push(matrixRowCopy);
  }

  return matrixCopy;
}

function countPathLength (solution) {
  let pathLength = 0;

  for (const matrixRow of solution) {
    for (const matrixCell of matrixRow) {
      if (matrixCell === PATH_SYMBOL || matrixCell === END_POINT_SYMBOL) {
        pathLength++;
      }
    }
  }

  return pathLength;
}

function main () {
  const matrix = [
    [' ', ' ', ' ', '*', ' ', ' ', ' '],
    ['*', '*', ' ', '*', ' ', '*', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', ' '],
    [' ', '*', '*', '*', '*', '*', ' '],
    [' ', ' ', ' ', ' ', ' ', ' ', 'e'],
  ];

  const solutions = findLabyrinthExits(getMatrixCopy(matrix), {
    col: 0,
    row: 0,
  });

  if (solutions.length === 0) {
    console.log('No solution.');
    return;
  }

  let shortestPath = solutions[0];
  let shortestPathLength = countPathLength(solutions[0]);

  for (const solution of solutions) {
    const pathLength = countPathLength(solution);

    if (pathLength < shortestPathLength) {
      shortestPathLength = pathLength;
      shortestPath = solution;
    }
  }

  console.log('Shortest path:');
  console.log(shortestPath);
  console.log('Length: ', shortestPathLength);
}

main();
