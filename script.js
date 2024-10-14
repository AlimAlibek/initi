const canvas = document.getElementById('canvas_main');
const canvasBack = document.getElementById('canvas_back');
const canvasContainer = document.getElementById('canvas_container');
const containerWidth = canvasContainer.clientWidth;
const containerHeight = canvasContainer.clientHeight;

const startPauseBtn = document.getElementById('start_pause');
const resetBtn = document.getElementById('reset');

const rowsSlider = document.getElementById('rowsSlider');
const colsSlider = document.getElementById('colsSlider');

const rowsInput = document.getElementById('rowsInput');
const colsInput = document.getElementById('colsInput');

const statusVue = document.getElementById('status');

const buttonText = {
    pause: 'Приостановить',
    start: 'Запустить',
    continue: 'Продолжить',
    reset: 'Сбросить'
}

const statuses = {
    stopped: 'STOPPED',
    running: 'RUNNING',
    paused: 'PAUSED',
    finished: 'FINISHED',
}

const results = {
    loop: 'LOOP',
    extinct: 'EXTINCT',
    notChange: 'NOTCHANGE'
}

let rows = 20;
let cols = 20;

const aliveColor = '#2be530'
const diedColor = '#dadada'

const defaultCellSize = 25
let cellSize = defaultCellSize;
const minCellSize = 10;

let fieldWidth,
    fieldHeight,

    fieldLeft,
    fieldTop;

let currentStatus = statuses.stopped // running | paused | finished
let result = null;

let generationCount = 1;

let interval;

let generationMap = {}
let prevGenerationMap = {}

let drawBackTimeout;

canvas.width = document.body.clientWidth;
canvas.height = document.body.clientHeight - 150;
canvasBack.width = document.body.clientWidth;
canvasBack.height = document.body.clientHeight - 150;
rowsInput.value = rows;
colsInput.value = cols;
rowsSlider.value = rows;
colsSlider.value = cols;

startPauseBtn.innerText = buttonText.start;
resetBtn.innerText = buttonText.reset;

const ctx = canvas.getContext("2d");
const ctxStatic = canvasBack.getContext("2d");

initGeneration();

initField();

function initGeneration() {
    generationCount = 0;

    const map = {};

    Object.keys(generationMap).forEach(key => {
        const [row, col] = key.split('.');

        if (row < rows && col < cols) {
            map[key] = true;
        }
    })

    generationMap = map;
}

function resetGeneration() {
    generationMap = {};
    prevGenerationMap = {};
    generationCount = 0;
}

async function initField() {
    await setFieldCellZise();
    initGeneration();
    drawBackground();
    draw();
}


function createNextGeneration() {

    const newGenerationMap = {};

    const diedNeighbors = {}

    Object.keys(generationMap).forEach(key => {

        const row = +key.split('.')[0];
        const col = +key.split('.')[1];

        const prevRow = row > 0 ? row - 1 : rows - 1;
        const prevCol = col > 0 ? col - 1 : cols - 1;
        const nextRow = row < rows - 1 ? row + 1 : 0;
        const nextCol = col < cols - 1 ? col + 1 : 0;

        const neighbors = [
            `${row}.${prevCol}`,
            `${row}.${nextCol}`,
            `${prevRow}.${prevCol}`,
            `${prevRow}.${col}`,
            `${prevRow}.${nextCol}`,
            `${nextRow}.${prevCol}`,
            `${nextRow}.${col}`,
            `${nextRow}.${nextCol}`,
        ]

        let aliveNeighbors = 0;

        neighbors.forEach(neighbor => {
            if (generationMap[neighbor]) {
                aliveNeighbors++
            } else {
                diedNeighbors[neighbor] = diedNeighbors[neighbor] ? diedNeighbors[neighbor] + 1 : 1
            }
        })


        if (aliveNeighbors >= 2 && aliveNeighbors <= 3) {
            newGenerationMap[key] = true;
        }

    })

    Object.keys(diedNeighbors).forEach(key => {
        if (diedNeighbors[key] === 3) {
            newGenerationMap[key] = true;
        }
    });

    const isGameOver = checkIsGameOver(newGenerationMap);

    if (isGameOver) {
        finish(isGameOver)
    }

    prevGenerationMap = generationMap;
    generationMap = newGenerationMap;

    console.log(isGameOver)

}

function checkIsGameOver(newGenerationMap) {

    let sameCurrentKeys = 0;
    let samePrevKeys = 0;

    const newGenerationKeys = Object.keys(newGenerationMap);

    if (!newGenerationKeys.length) {
        return results.extinct
    }

    const currentGenerationKeys = Object.keys(generationMap);
    const prevGenerationKeys = Object.keys(prevGenerationMap);


    if (newGenerationKeys.length !== currentGenerationKeys.length && newGenerationKeys.length !== prevGenerationKeys.length) {
        return false;
    }


    newGenerationKeys.forEach(key => {

        if (!generationMap[key] && !prevGenerationMap[key]) {
            return false;
        };

        if (generationMap[key]) {
            sameCurrentKeys++
        }

        if (prevGenerationMap[key]) {
            samePrevKeys++
        }

    })

    if (sameCurrentKeys > 0 && currentGenerationKeys.length === sameCurrentKeys) {
        return results.notChange;
    }
    if (samePrevKeys > 0 && prevGenerationKeys.length === samePrevKeys ) {
        return results.loop;
    }

    return false;
}

function finish(res) {
    switch(res) {
        case results.notChange:
            result = 'Клетки не могут менять своё состояние';
            break;

        case results.loop:
            result = 'Замкнутый цикл';
            break;

        case results.extinct:
            result = 'Все клетки вымерли';
            break;
    }
    setStatus(statuses.finished)
}

function setStatus(status) {

    switch (status) {
        case statuses.running:
            interval = setInterval(() => {

                createNextGeneration();
                draw()
                generationCount++

            }, 500);

            startPauseBtn.innerText = buttonText.pause;
            disabeInputs(true);

            break;

        case statuses.paused:
            clearInterval(interval);
            startPauseBtn.innerText = buttonText.continue
            break;

        case statuses.stopped:
            clearInterval(interval);
            resetGeneration();
            disabeInputs(false)
            startPauseBtn.innerText = buttonText.start
            draw()
            statusVue.innerText = '';
            break;

        case statuses.finished:
            clearInterval(interval);
            statusVue.innerText = result;

        default:
            break;
    }

    currentStatus = status;
}

async function draw() {

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = aliveColor;

    Object.keys(generationMap).forEach(key => {

        const [row, col] = key.split('.');

        ctx.beginPath();
        ctx.arc(
            Math.ceil(fieldLeft + col * cellSize + cellSize / 2),
            Math.ceil(fieldTop + row * cellSize + cellSize / 2),
            Math.ceil(cellSize / 2),
            0, 2 * Math.PI
        )
        ctx.fill()

    })

}

async function drawBackground() {

    ctxStatic.clearRect(0, 0, canvasBack.width, canvasBack.height);

    let i = 0;

    let piece = cols < 100 ? 50 : cols < 500 ? 20 : cols < 800 ? 5 : 3;
    let peices = Math.ceil(rows / piece);

    clearTimeout(drawBackTimeout)

    function drawPiece() {
        ctxStatic.fillStyle = diedColor

        do {
            for (let j = 0; j < cols; j++) {
                ctxStatic.beginPath();
                ctxStatic.arc(
                    Math.ceil(fieldLeft + j * cellSize + cellSize / 2),
                    Math.ceil(fieldTop + i * cellSize + cellSize / 2),
                    Math.ceil(cellSize / 2),
                    0, 2 * Math.PI
                )
                ctxStatic.fill()

            }

            i++

        } while (peices > 1 ? (i % piece !== 0 && i < rows) : i < rows);

        if (i < rows) {
            drawBackTimeout = setTimeout(() => {
                drawPiece()
            })
        }

    }

    drawPiece()
}


function setFieldCellZise() {

    return new Promise(res => {

        const availableCellSize = Math.min(containerWidth / cols, containerHeight / rows);

        let canvasWidth = canvas.width;
        let canvasHeight = canvas.height;

        if (availableCellSize <= minCellSize) {
            canvasWidth = Math.max(minCellSize * cols, containerWidth)
            canvasHeight = Math.max(minCellSize * rows, containerHeight)
            cellSize = minCellSize;

        }

        if (availableCellSize > minCellSize && availableCellSize <= defaultCellSize) {
            canvasWidth = containerWidth;
            canvasHeight = containerHeight;
            cellSize = availableCellSize;
        }

        if (availableCellSize > defaultCellSize) {
            canvasWidth = containerWidth;
            canvasHeight = containerHeight;
            cellSize = defaultCellSize;
        }

        canvas.width = canvasWidth;
        canvas.height = canvasHeight;

        canvasBack.width = canvasWidth;
        canvasBack.height = canvasHeight;


        fieldWidth = Math.ceil(cellSize * cols);
        fieldHeight = Math.ceil(cellSize * rows);

        fieldLeft = Math.ceil(canvasWidth / 2 - fieldWidth / 2)
        fieldTop = Math.ceil(canvasHeight / 2 - fieldHeight / 2);

        cellSize = Math.ceil(cellSize)

        setTimeout(() => res())
    })

}

function disabeInputs(disabled) {

    rowsSlider.disabled = disabled
    colsSlider.disabled = disabled
    rowsInput.disabled = disabled
    colsInput.disabled = disabled

}

const debounceRowsColsChange = debounce(initField, 100)

rowsInput.addEventListener('input', event => {
    let value = event.target.value;
    if (value > 1000) {
        value = 1000
    }
    if (value < 10) {
        value = 10
    }
    rows = value;
    rowsSlider.value = value;

    debounceRowsColsChange()

})

colsInput.addEventListener('input', event => {
    let value = event.target.value;
    if (value > 1000) {
        value = 1000
    }
    if (value < 10) {
        value = 10
    }
    cols = value;
    // colsSlider.value = value;

    debounceRowsColsChange()
})

rowsSlider.addEventListener('input', event => {
    rows = +event.target.value;
    rowsInput.value = rows;

    debounceRowsColsChange()

})

colsSlider.addEventListener('input', event => {
    cols = +event.target.value;
    colsInput.value = cols;

    debounceRowsColsChange()
})

rowsInput.addEventListener('change', event => {
    let value = event.target.value;
    if (value > 1000) {
        value = 1000
    }
    if (value < 10) {
        value = 10
    }
    event.target.value = value

})

colsInput.addEventListener('change', event => {
    let value = event.target.value;
    if (value > 1000) {
        value = 1000
    }
    if (value < 10) {
        value = 10
    }
    event.target.value = value
})

startPauseBtn.addEventListener('click', () => {

    if (currentStatus === statuses.stopped || currentStatus === statuses.paused) {
        setStatus(statuses.running);
    } else if (currentStatus === statuses.running) {
        setStatus(statuses.paused)
    }
})

resetBtn.addEventListener('click', () => {
    setStatus(statuses.stopped);
})

canvas.addEventListener('click', event => {
    if (currentStatus !== statuses.stopped) {
        return;
    }

    const rect = event.target.getBoundingClientRect();

    const canvasY = event.clientY - rect.y;
    const canvasX = event.clientX - rect.x;

    const fieldRightX = fieldLeft + fieldWidth;
    const fieldBottomY = fieldTop + fieldHeight;

    if (
        canvasX < fieldLeft || canvasX > fieldRightX ||
        canvasY < fieldTop || canvasY > fieldBottomY
    ) {
        return;
    }

    const rowIndex = Math.floor((canvasY - fieldTop) / cellSize);
    const colIndex = Math.floor((canvasX - fieldLeft) / cellSize);


    if (generationMap[`${rowIndex}.${colIndex}`]) {
        delete generationMap[`${rowIndex}.${colIndex}`]
    } else {
        generationMap[`${rowIndex}.${colIndex}`] = true;
    }

    draw();

}, )

function debounce(callback, ms) {

    let timeout

    return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => {
            callback(...args)
        }, ms)
    }
}
