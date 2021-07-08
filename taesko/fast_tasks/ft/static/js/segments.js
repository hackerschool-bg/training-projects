const DEFAULT_X_OFFSET = 50;
const DEFAULT_IVAN_Y = 80;
const DEFAULT_SEGMENT_Y = 100;
const DEFAULT_PENKA_Y = 120;
const SCALE = 50;
const LEGEND = {
    LINE_COLOR: '#000',
    IVAN_COLOR: '#9acaff',
    PENKA_COLOR: '#ff7279',
    SEGMENT_SEPERATOR_COLOR: '#b7ff47',
    RED_SEGMENT_COLOR: '#FF0000',
};

async function fetchSolution(argsObj, endpoint) {
    assert(argsObj);
    assert(endpoint);

    console.log('arguments are', argsObj);

    const response = await window.fetch(endpoint, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            arguments: argsObj,
        }),
    });

    assertPeer(response.ok, 'Remote service is not working. Please try again later.', 'SERVICE_NOT_OK_RESPONSE');

    return response.json();
}


function drawPoint(ctx, x, y, options) {
    const {pointWidth = 5, color = '#0000FF'} = options;

    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x + DEFAULT_X_OFFSET, y, pointWidth, 0, 360);
    ctx.fill();
    ctx.closePath();
}

function drawSegment(ctx, from, to, y, options) {
    const {lineWidth = 5, color = '#FFa60e'} = options;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 5;
    ctx.moveTo(from + DEFAULT_X_OFFSET, y);
    ctx.lineTo(to + DEFAULT_X_OFFSET, y);
    ctx.stroke();
    ctx.closePath();
}

function scale(segmentCoordinate) {
    return segmentCoordinate * SCALE;
}

function clear(ctx) {
    let canvas;
    if (ctx instanceof HTMLCanvasElement) {
        canvas = ctx;

        assertSystem(canvas.getContext, "user's browser does not support the canvas element");

        ctx = canvas.getContext('2d');
    } else if (ctx.canvas) {
        canvas = ctx.canvas
    } else {
        return;
    }
    ctx.clearRect(0, 0, canvas.getAttribute('width'), canvas.getAttribute('height'));
}

function visualizeInputSegments(canvas, {line_length, a_step, b_step}) {
    assertSystem(canvas.getContext, "user's browser does not support the canvas element");

    const ctx = canvas.getContext('2d');

    drawSegment(ctx, 0, scale(line_length), DEFAULT_SEGMENT_Y, {color: LEGEND.LINE_COLOR});

    for (let i = 0; i <= line_length; i++) {
        drawPoint(ctx, scale(i), DEFAULT_SEGMENT_Y, {color: LEGEND.SEGMENT_SEPERATOR_COLOR});
    }
    for (let i = 0; i <= line_length; i += a_step) {
        drawPoint(ctx, scale(i), DEFAULT_IVAN_Y, {color: LEGEND.IVAN_COLOR})
    }
    for (let i = line_length; i >= 0; i -= b_step) {
        drawPoint(ctx, scale(i), DEFAULT_PENKA_Y, {color: LEGEND.PENKA_COLOR})
    }
}

function visualizeSolution(
    canvas,
    {line_length, a_step, b_step},
    {answer, red_segments},
) {
    assertSystem(canvas.getContext, "user's browser does not support the canvas element");

    const ctx = canvas.getContext('2d');

    for (const segment of red_segments) {
        const [from, to] = segment.map(scale);
        drawSegment(ctx, from, to, DEFAULT_SEGMENT_Y, {color: LEGEND.RED_SEGMENT_COLOR})
    }
}

async function onFormSubmit(event) {
    event.preventDefault();
    const $form = $(event.target);
    const canvasElement = document.getElementById('segments-canvas');
    const args = $form.serializeArray()
        .reduce(
            (hash, {name, value}) => {
                hash[name] = +value;
                return hash;
            },
            {}
        );
    clear(canvasElement);
    visualizeInputSegments(canvasElement, args);

    const solution = await fetchSolution(args, $form.attr('action'));

    console.log(solution);

    visualizeSolution(canvasElement, args, solution);

    return false;
}

$(document).ready(() => {
    $('#input-form').submit(async (event) => {
        try {
            await onFormSubmit(event)
        } catch (e) {
            displayError(e);
        }
    });
});