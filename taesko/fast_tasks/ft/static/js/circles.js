const circles = [];

function hashCircle(circle) {
    const props = ['x', 'y', 'radius'];
    assert(props.every(prop => prop in circle));

    return props.map(prop => circle[prop])
        .join('');
}

function cleanDuplicates(array, keyFunc = (element) => element) {
    const hashed = array.map(element => [keyFunc(element), element])
        .reduce(
            (hash, [key, element]) => {
                hash[key] = element;
                return hash;
            },
            Object.create(null),
        );
    const clean = Object.values(hashed);

    clean.sort((a, b) => array.indexOf(a) - array.indexOf(b));
    return clean;
}

function intersectionsDepreciated(circles) {
    function are_intersecting(circleA, circleB) {
        const xDiff = circleA.x - circleB.x;
        const yDiff = circleA.y - circleB.y;
        const distance = Math.sqrt(xDiff ** 2 + yDiff ** 2);

        const close_enough = distance < circleA.radius + circleB.radius;
        const too_close = distance <= Math.max(circleA.radius, circleB.radius) / 2;

        return close_enough && !too_close
    }

    const result = [];

    for (const circle_1 of Object.values(circles)) {
        for (const circle_2 of Object.values(circles)) {
            if (circle_1 === circle_2) {
                continue;
            }
        }
    }
}

function CanvasDrawer(canvas) {
    assertSystem(canvas.getContext, "user's browser does not support the canvas element");

    const ctx = canvas.getContext('2d');
    const width = +canvas.getAttribute('width');
    const height = +canvas.getAttribute('height');
    const center = [width / 2, height / 2];

    this.dekartToCanvasCoords = (x, y) => {
        return [x + center[0], center[1] - y]
    };
    this.drawCircle = (x, y, radius) => {
        ctx.beginPath();
        ctx.strokeStyle = '#0000FF';
        ctx.arc(x, y, radius, 0, 360);
        ctx.stroke();
        ctx.closePath();
    };
    this.connectPoints = (x1, y1, x2, y2, style='#00FF00') => {
        ctx.beginPath();
        ctx.strokeStyle = style;
        ctx.lineWidth = 2;
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.closePath();
    };
    this.drawPoint = (x, y, style='#FF0000') => {
        ctx.beginPath();
        ctx.strokeStyle = style;
        ctx.arc(x, y, 5, 0, 360);
        ctx.fill();
        ctx.closePath();
    };
    this.drawPath = path => {
        const orange = '#ffa60e';
        const cyan = '#25ffd0';
        this.drawPoint(...path[0], orange);
        this.drawPoint(...path[path.length - 1], orange);

        for (let i = 0; i < path.length - 1; i++) {
            const [x1, y1] = path[i];
            const [x2, y2] = path[i + 1];

            const style = (i % 2) ? orange : cyan;
            this.connectPoints(x1, y1, x2, y2, style);
        }
    };
    this.drawAxis = () => {
        this.connectPoints(0, center[1], width, center[1], '#000000');
        this.connectPoints(center[0], 0, center[1], height, '#000000');
    }
}

async function fetchLeastJumpsThroughCircles(circles) {
    const response = await fetch(`${API_URI}/tasks/circles`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            'arguments': {'circles': circles}
        }),
    });

    assert(response.status < 400);

    return response.json();
}

function main() {
    const $circleForm = $('#circles-form');
    const $drawBtn = $('#draw-circle-btn');
    const $findPathBtn = $('#find-path-btn');
    const drawer = new CanvasDrawer(document.getElementById('circles-canvas'));

    drawer.drawAxis();

    $circleForm.submit(event => {
        event.preventDefault();
        return false;
    });

    const onDrawBtnClick = () => {
        const x = +$circleForm.find('#x-input').val().trim();
        const y = +$circleForm.find('#y-input').val().trim();
        const radius = +$circleForm.find('#radius-input').val().trim();
        const circle = {x, y, radius};
        const canvasCoords = drawer.dekartToCanvasCoords(x, y);

        assertUser(radius > 0, 'Invalid radius', 'CIRCLES_INVALID_RADIUS');

        drawer.drawCircle(...canvasCoords, radius);
        drawer.drawPoint(...canvasCoords);
        circles.push(circle);
    };

    $drawBtn.click(async (event) => {
        try {
            await onDrawBtnClick(event)
        } catch (e) {
            displayError(e);
        }
    });

    const onFindPathBtnClick = async () => {
        let cleaned = cleanDuplicates(circles, hashCircle);
        let path = await fetchLeastJumpsThroughCircles(cleaned);
        console.log('path is', path);
        path = path.map(point => drawer.dekartToCanvasCoords(...point));
        if (path.length > 1) {
            drawer.drawPath(path);
        } else {
            alert('No path found');
        }
    };

    $findPathBtn.click(async (event) => {
        try {
            await onFindPathBtnClick(event);
        } catch (e) {
            displayError(e);
        }
    });
}

$(document).ready((event) => {
    try {
        main(event);
    } catch (e) {
        displayError(e);
    }
});