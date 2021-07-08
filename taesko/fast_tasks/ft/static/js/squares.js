function generateSudokuGrid($grid, $squareTempl, $cellTempl, squareSideLength) {
    assertUser(squareSideLength === 2 || squareSideLength === 3, 'Invalid square side length.');

    $grid.find('*:not(#sudoku-cell)').remove();
    $grid.find('*:not(#sudoku-square)').remove();

    const squareCount = squareSideLength * squareSideLength;
    const widthCls = (squareSideLength === 2) ? 'sudoku-2n' : 'sudoku-3n';

    for (let squareIndex = 0; squareIndex < squareCount; squareIndex++) {
        const $square = $squareTempl.clone()
            .removeAttr('id')
            .removeClass('d-none')
            .addClass(widthCls);
        const squareStartRow = Math.floor(squareIndex / squareSideLength) * squareSideLength;
        const squareStartCol = (squareIndex % squareSideLength) * squareSideLength;

        for (let cellIndex = 0; cellIndex < squareCount; cellIndex++) {
            const row = squareStartRow + Math.floor(cellIndex / squareSideLength);
            const col = squareStartCol + (cellIndex % squareSideLength);

            const $cell = $cellTempl.clone()
                .removeClass('d-none')
                .addClass(widthCls)
                .attr('id', `cell-${row}-${col}`)
                .attr('name', `${row}-${col}`);

            $square.append($cell);
        }
        $grid.append($square);
    }
}


function fillSudokuGrid(solution) {
    for (const [rowCount, row] of Object.entries(solution)) {
        for (const [colCount, symbol] of Object.entries(row)) {
            $(`#cell-${rowCount}-${colCount}`)
                .val(symbol);
        }
    }
}

async function fetchSolution(miniSquareSideLength, markedLocations) {
    const response = await fetch(`${API_URI}/tasks/squares`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            arguments: {
                mini_square_side_length: miniSquareSideLength,
                marked_locations: markedLocations,
            },
        })
    });

    assert(response.status < 400);

    return response.json();
}

function main() {
    const $squareLengthInput = $('#small-square-length');
    const $grid = $('#sudoku-grid');
    const $square = $('#sudoku-square');
    const $cell = $('#sudoku-cell');

    const drawGrid = () => {
        console.log('Draw grid called');
        let length = $squareLengthInput.val();
        if (length === '') {
            return;
        }
        length = +length;

        if (length < 2 || length > 3) {
            throw new UserError('Square length must be either 2 or 3.')
        }

        console.info('Square length input changed to', length);
        generateSudokuGrid($grid, $square, $cell, length);
    };

    drawGrid();
    $squareLengthInput.change(drawGrid);

    let $sudokuForm = $('#sudoku-form');

    async function onSubmit(event) {
        event.preventDefault();

        const length = +$squareLengthInput.val().trim();
        const markedLocations = $sudokuForm.serializeArray()
            .map(cell => {
                const [row, col] = cell.name.split('-');

                return [+row.trim(), +col.trim(), cell.value.trim()]
            })
            .filter(arr => {
                return arr[2] !== '';
            });

        assertUser(markedLocations.length >= length * length, 'Not enough objects entered', 'SUDOKU_FEW_OBJECTS');
        const solution = await fetchSolution(length, markedLocations);

        fillSudokuGrid(solution);

        return false;
    }

    $sudokuForm.submit(async (event) => {
        try {
            await onSubmit(event);
        } catch (e) {
            displayError(e);
        }
    })
}

$(document).ready(() => {
    try {
        main();
    } catch (e) {
        displayError(e);
    }
});


