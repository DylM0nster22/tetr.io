const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');

context.scale(20, 20);

const history = [];
let linesCleared = 0;
let mirrorMode = false;

function saveState() {
    history.push({
        arena: arena.map(row => row.slice()),
        matrix: player.matrix.map(row => row.slice()),
        pos: { ...player.pos },
        score: player.score,
        linesCleared: linesCleared,
        mirrorMode: mirrorMode,
    });
}

function undoState() {
    if (history.length > 0) {
        const previousState = history.pop();
        arena = previousState.arena;
        player.matrix = previousState.matrix;
        player.pos = previousState.pos;
        player.score = previousState.score;
        linesCleared = previousState.linesCleared;
        mirrorMode = previousState.mirrorMode;
        updateScore();
        draw();
    }
}

function toggleMirrorMode() {
    mirrorMode = !mirrorMode;
    player.pos.y = mirrorMode ? arena.length - 1 : 0;
}

function arenaSweep() {
    let rowCount = 1;
    outer: for (let y = arena.length - 1; y >= 0; --y) {
        for (let x = 0; x < arena[y].length; ++x) {
            if (arena[y][x] === 0) {
                continue outer;
            }
        }

        const row = arena.splice(y, 1)[0].fill(0);
        if (mirrorMode) {
            arena.push(row);
        } else {
            arena.unshift(row);
        }
        ++y;

        player.score += rowCount * 10;
        linesCleared++;
        rowCount *= 2;

        if (linesCleared % 10 === 0) {
            toggleMirrorMode();
        }
    }
}

function collide(arena, player) {
    const [m, o] = [player.matrix, player.pos];
    for (let y = 0; y < m.length; ++y) {
        for (let x = 0; x < m[y].length; ++x) {
            if (m[y][x] !== 0 &&
               (arena[y + o.y] &&
                arena[y + o.y][x + o.x]) !== 0) {
                return true;
            }
        }
    }
    return false;
}

function createMatrix(w, h) {
    const matrix = [];
    while (h--) {
        matrix.push(new Array(w).fill(0));
    }
    return matrix;
}

function createPiece(type) {
    if (type === 'T') {
        return [
            [0, 0, 0],
            [1, 1, 1],
            [0, 1, 0],
        ];
    } else if (type === 'O') {
        return [
            [2, 2],
            [2, 2],
        ];
    } else if (type === 'L') {
        return [
            [0, 3, 0],
            [0, 3, 0],
            [0, 3, 3],
        ];
    } else if (type === 'J') {
        return [
            [0, 4, 0],
            [0, 4, 0],
            [4, 4, 0],
        ];
    } else if (type === 'I') {
        return [
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
            [0, 5, 0, 0],
        ];
    } else if (type === 'S') {
        return [
            [0, 6, 6],
            [6, 6, 0],
            [0, 0, 0],
        ];
    } else if (type === 'Z') {
        return [
            [7, 7, 0],
            [0, 7, 7],
            [0, 0, 0],
        ];
    }
}

function drawMatrix(matrix, offset, color = null) {
    matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                context.fillStyle = color || colors[value];
                context.fillRect(x + offset.x,
                                 y + offset.y,
                                 1, 1);
            }
        });
    });
}

function draw() {
    context.fillStyle = '#000';
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawMatrix(arena, {x: 0, y: 0});
    drawGhostPiece();
    drawMatrix(player.matrix, player.pos);
}

function drawGhostPiece() {
    const ghostPos = { ...player.pos };
    while (!collide(arena, { matrix: player.matrix, pos: ghostPos })) {
        ghostPos.y += mirrorMode ? -1 : 1;
    }
    ghostPos.y += mirrorMode ? 1 : -1;
    drawMatrix(player.matrix, ghostPos, 'rgba(255, 255, 255, 0.3)');
}

function merge(arena, player) {
    player.matrix.forEach((row, y) => {
        row.forEach((value, x) => {
            if (value !== 0) {
                const posY = mirrorMode ? (arena.length - 1) - (player.pos.y - y) : player.pos.y + y;
                arena[posY][player.pos.x + x] = value;
            }
        });
    });
}

function rotate(matrix, dir) {
    for (let y = 0; y < matrix.length; ++y) {
        for (let x = 0; x < y; ++x) {
            [
                matrix[x][y],
                matrix[y][x],
            ] = [
                matrix[y][x],
                matrix[x][y],
            ];
        }
    }

    if (dir > 0) {
        matrix.forEach(row => row.reverse());
    } else {
        matrix.reverse();
    }
}

function playerDrop() {
    saveState();
    player.pos.y += mirrorMode ? -1 : 1;
    if (collide(arena, player)) {
        player.pos.y += mirrorMode ? 1 : -1;
        merge(arena, player);
        playerReset();
        arenaSweep();
        updateScore();
    }
    dropCounter = 0;
}

function playerMove(dir) {
    saveState();
    player.pos.x += dir;
    if (collide(arena, player)) {
        player.pos.x -= dir;
    }
}

function playerReset() {
    const pieces = 'ILJOTSZ';
    player.matrix = createPiece(pieces[pieces.length * Math.random() | 0]);
    player.pos.y = mirrorMode ? arena.length - 1 : 0;
    player.pos.x = (arena[0].length / 2 | 0) -
                   (player.matrix[0].length / 2 | 0);
    if (collide(arena, player)) {
        arena.forEach(row => row.fill(0));
        player.score = 0;
        linesCleared = 0;
        mirrorMode = false;
        updateScore();
    }
}

function playerRotate(dir) {
    saveState();
    const pos = player.pos.x;
    let offset = 1;
    rotate(player.matrix, dir);
    while (collide(arena, player)) {
        player.pos.x += offset;
        offset = -(offset + (offset > 0 ? 1 : -1));
        if (offset > player.matrix[0].length) {
            rotate(player.matrix, -dir);
            player.pos.x = pos;
            return;
        }
    }
}

function playerDropToBottom() {
    saveState();
    while (!collide(arena, player)) {
        player.pos.y += mirrorMode ? -1 : 1;
    }
    player.pos.y += mirrorMode ? 1 : -1;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
    dropCounter = 0;
}

let dropCounter = 0;
let dropInterval = 1000;

let lastTime = 0;

function update(time = 0) {
    const deltaTime = time - lastTime;

    dropCounter += deltaTime;
    if (dropCounter > dropInterval) {
        playerDrop();
    }

    lastTime = time;

    draw();
    requestAnimationFrame(update);
}

function updateScore() {
    document.getElementById('score').innerText = player.score;
}

const colors = [
    null,
    'red',
    'blue',
    'violet',
    'green',
    'purple',
    'orange',
    'pink',
];

let arena = createMatrix(12, 20);

const player = {
    pos: {x: 0, y: 0},
    matrix: null,
    score: 0,
};

document.addEventListener('keydown', event => {
    if (event.keyCode === 37) {
        playerMove(-1);
    } else if (event.keyCode === 39) {
        playerMove(1);
    } else if (event.keyCode === 40) {
        playerDrop();
    } else if (event.keyCode === 38) {
        playerRotate(1);  // Rotate clockwise on up arrow key
    } else if (event.keyCode === 32) {
        playerDropToBottom();  // Drop to the bottom on space bar
    } else if (event.ctrlKey && event.keyCode === 90) {
        undoState();  // Undo the last move on Ctrl + Z
    }
});

playerReset();
updateScore();
update();
