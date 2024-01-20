window.onload = function () {
    getGameData.gameOver = true;
}

function getGameData() {
    this.canvas;
    this.ctx;

    this.blockSize;
    this.widthInBlocks;
    this.heightInBlocks;

    this.snake;
    this.apple;

    this.wall;
    this.wallCanvas;
    this.wallContext;
    this.zoneSizeToClose;

    this.gameOver;
}

function refreshCanvas() {
    var delay = 50;
    if (getGameData.gameOver) {

    }
    else {
        getGameData.ctx.save();
        getGameData.ctx.beginPath();
        getGameData.ctx.fillStyle = document.getElementById("bgColorPicker").value;

        var x = getGameData.snake.body[getGameData.snake.body.length - 1][0] * getGameData.blockSize;
        var y = getGameData.snake.body[getGameData.snake.body.length - 1][1] * getGameData.blockSize;

        getGameData.ctx.fillRect(x, y, getGameData.blockSize, getGameData.blockSize);

        getGameData.ctx.restore();

        getGameData.apple.draw();
        setTimeout(refreshCanvas, delay);

        getGameData.snake.advance();
    }
}

function drawBlock(ctx, position, color) {
    ctx.fillStyle = color;
    var blockSize = getGameData.blockSize;
    var x = position[0] * blockSize;
    var y = position[1] * blockSize;

    ctx.fillRect(x, y, blockSize, blockSize);
}

async function init() {
    if (!getGameData.gameOver)
        return;

    getGameData.gameOver = false;

    getGameData.canvas = document.getElementById("game");
    getGameData.canvas.style.border = "5px solid";

    document.body.appendChild(getGameData.canvas);

    getGameData.canvas.width = 900;
    getGameData.canvas.height = 500;
    getGameData.blockSize = 10;

    getGameData.widthInBlocks = getGameData.canvas.width / getGameData.blockSize;
    getGameData.heightInBlocks = getGameData.canvas.height / getGameData.blockSize;

    getGameData.ctx = getGameData.canvas.getContext("2d");

    getGameData.wallCanvas = document.getElementById("wallLayer");
    getGameData.wallCanvas.width = getGameData.canvas.width;
    getGameData.wallCanvas.height = getGameData.canvas.height;
    getGameData.wallContext = getGameData.wallCanvas.getContext("2d");

    getGameData.wall = new Obstacles([]);
    getGameData.zoneSizeToClose = 25;

    getGameData.wall.borders(getGameData.canvas.width, getGameData.canvas.height);
    await getGameData.wall.createPerlinNoiseMap(getGameData.widthInBlocks, getGameData.heightInBlocks);

    getGameData.snake = new Snake([[6, 4], [5, 4], [4, 4]], "right", getGameData.ctx);
    getGameData.snake.draw();

    getGameData.apple = new Apple([], getGameData.ctx);
    getGameData.apple.create();

    refreshCanvas();
}

function Snake(body, direction, ctx) {
    this.body = body;
    this.direction = direction;
    this.ctx = ctx;

    this.futureDirection;

    this.draw = function () {
        this.ctx.save();
        this.ctx.fillStyle = document.getElementById("snakeColorPicker").value;

        for (var i = 0; i < this.body.length; i++) {
            drawBlock(this.ctx, this.body[i]);
        }
        this.ctx.restore();
    };

    this.advance = function () {
        var nextPosition = this.body[0].slice();
        this.setDirection(this.futureDirection);

        switch (this.direction) {
            case "left":
                nextPosition[0]--;
                break;
            case "right":
                nextPosition[0]++;
                break;
            case "down":
                nextPosition[1]++;
                break;
            case "up":
                nextPosition[1]--;
                break;
            default:
                throw ("Invalid Direction");
        }
        this.body.unshift(nextPosition);

        this.ctx.save();

        this.ctx.fillStyle = document.getElementById("snakeColorPicker").value;

        getGameData.gameOver = this.checkCollision();

        if (!getGameData.gameOver) {
            drawBlock(this.ctx, nextPosition);
            this.ctx.restore();

            if (nextPosition[0] == getGameData.apple.body[0] && nextPosition[1] == getGameData.apple.body[1]) {
                document.getElementById("scoreLabel").textContent = "Score: " + this.body.length.toString();
                getGameData.apple.create();
                return;
            }
            this.body.pop();
        }
    };

    /* Set the given direction if the direction is allowed */
    this.setDirection = function (newDirection) {
        var allowedDirections;
        switch (this.direction) {
            case "left":
            case "right":
                allowedDirections = ["up", "down"];
                break;
            case "down":
            case "up":
                allowedDirections = ["left", "right"];
                break;
            default:
                console.log("Invalid Direction");
        }

        if (allowedDirections.indexOf(newDirection) > -1) {
            this.direction = newDirection;
        }
    };

    this.checkCollision = function () {
        var collided = false;
        var head = this.body[0];
        var rest = this.body.slice(1);
        var snakeX = head[0];
        var snakeY = head[1];
        var minX = 0;
        var minY = 0;
        var maxX = getGameData.widthInBlocks - 1;
        var maxY = getGameData.heightInBlocks - 1;
        var isNotBetweenHorizontalWalls = snakeX < minX || snakeX > maxX;
        var isNotBetweenVerticalWalls = snakeY < minY || snakeY > maxY;

        if (isNotBetweenHorizontalWalls || isNotBetweenVerticalWalls) {
            collided = true;
        }
        else {
            for (var i = 0; i < rest.length; i++) {
                if (snakeX === rest[i][0] && snakeY === rest[i][1]) {
                    collided = true;
                    break;
                }
            }

            if (getGameData.wall.body[snakeY][snakeX] === getGameData.wall.occupiedIndex) {

                collided = true;
            }
        }

        return collided;
    }
}

function Apple(body, ctx) {
    this.body = body;
    this.ctx = ctx;

    this.draw = function () {
        this.ctx.fillStyle = document.getElementById("appleColorPicker").value;
        this.ctx.save();
        this.ctx.beginPath();
        var blockSize = getGameData.blockSize;
        var radius = blockSize / 2;
        var x = this.body[0] * blockSize + radius;
        var y = this.body[1] * blockSize + radius;
        this.ctx.arc(x, y, radius, 0, Math.PI * 2, true);
        this.ctx.fill();
        this.ctx.restore();
    };

    this.create = function () {
        this.body = getValidPos();
    }
}

function Obstacles(body) {
    this.body = body;
    this.occupiedIndex = 1;
    this.freeIndex = 2;

    this.createPerlinNoiseMap = async function (xSize, ySize) {
        var wallColor = document.getElementById("wallColorPicker").value;
        var blurryNoiseMap = this.blurryMap(this.createNoiseMap(xSize, ySize));
        var blockSize = getGameData.blockSize;

        var minValue = document.getElementById("toleranceSlider").value;

        var bgColor = document.getElementById("bgColorPicker").value;

        this.body = [...blurryNoiseMap];

        for (let y = 0; y < ySize; y++) {
            for (let x = 0; x < xSize; x++) {
                if (blurryNoiseMap[y][x] >= minValue) {
                    if (this.calculateNeighbors(blurryNoiseMap, x, y, minValue) <= 3) {
                        getGameData.wallContext.fillStyle = bgColor;
                        this.body[y][x] = this.freeIndex;
                    }
                    else {
                        getGameData.wallContext.fillStyle = wallColor;
                        this.body[y][x] = this.occupiedIndex;
                    }
                }
                else {
                    getGameData.wallContext.fillStyle = bgColor;
                    this.body[y][x] = this.freeIndex;
                }

                // getGameData.wallContext.fillStyle = rgbToHex(255 * blurryNoiseMap[y][x], 255 * blurryNoiseMap[y][x], 255 * blurryNoiseMap[y][x])

                getGameData.wallContext.fillRect(x * blockSize, y * blockSize, blockSize, blockSize);
            }
        }

        var allBatches = [];

        for (let y = 0; y < this.body.length; y++) {
            for (let x = 0; x < this.body[y].length; x++) {
                if (this.body[y][x] === this.freeIndex) {
                    this.body[y][x] = 3;

                    // getGameData.wallContext.fillStyle = "red";
                    // getGameData.wallContext.fillRect(x * getGameData.blockSize, y * getGameData.blockSize, getGameData.blockSize, getGameData.blockSize);

                    allBatches.push(await this.enclosureAlgorithm(x, y));
                }
            }
        }

        while (allBatches.length !== 1) {
            var batchToRemove = [];
            if (allBatches[0].length < allBatches[1].length) {
                batchToRemove = allBatches[0];
                allBatches.splice(0, 1);
            }
            else {
                batchToRemove = allBatches[1];
                allBatches.splice(1, 1);
            }

            for (let index = 0; index < batchToRemove.length; index++) {
                getGameData.wallContext.fillStyle = wallColor;
                getGameData.wallContext.fillRect(batchToRemove[index][0] * getGameData.blockSize, batchToRemove[index][1] * getGameData.blockSize, getGameData.blockSize, getGameData.blockSize);

                this.body[batchToRemove[index][1]][batchToRemove[index][0]] = this.occupiedIndex;
            }
        }
    }

    this.enclosureAlgorithm = async function (x, y) {
        var tilesToCheck = this.findFreeNearSpaces(x, y);
        var allTilesOfTheBatch = [[x, y]];

        var temp = [[]];
        var count = 1;

        while (temp.length != 0) {
            temp = [];

            for (let i = 0; i < tilesToCheck.length; i++) {
                //await sleep(1).then(() => {
                    //getGameData.wallContext.fillStyle = "green";
                   // getGameData.wallContext.fillRect(tilesToCheck[i][0] * getGameData.blockSize, tilesToCheck[i][1] * getGameData.blockSize, getGameData.blockSize, getGameData.blockSize);

                    allTilesOfTheBatch.push(tilesToCheck[i]);
                    this.body[tilesToCheck[i][1]][tilesToCheck[i][0]] = 3;

                    count++;

                    var surrondingTiles = this.findFreeNearSpaces(tilesToCheck[i][0], tilesToCheck[i][1]);

                    surrondingTiles.forEach(subElement => {
                        if (!checkIfItemIsInArray(subElement, temp)) {
                            temp.push(subElement);
                        }
                    });
                //});
            }

            tilesToCheck = [...temp];
        }

        return allTilesOfTheBatch;
    }

    function sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    this.createNoiseMap = function (xSize, ySize) {
        var perlinMap = [];

        for (let y = 0; y < ySize; y++) {
            perlinMap.push([]);
            for (let x = 0; x < xSize; x++) {
                perlinMap[y].push([]);

                // First Row First Column
                if (x == 0 && y == 0) {
                    perlinMap[y][x] = Math.random();
                }
                else {
                    var value = 0.25 * (Math.random() - 0.5) / 0.5;

                    // Every other pixels of the first row
                    if (y === 0) {
                        value = perlinMap[y][x - 1] + value;
                    }
                    // Every other pixels of every other rows
                    else {
                        value = perlinMap[y - 1][x] + value;
                    }

                    /* Limit the pixel's value between 0 and 1 */
                    if (value >= 1) {
                        value = 1;
                    }

                    if (value <= 0) {
                        value = 0;
                    }

                    perlinMap[y][x] = value;
                }
            }
        }

        return perlinMap;
    }

    this.blurryMap = function blurryMap(perlinMap) {
        var blurryMap = perlinMap;

        for (let y = 0; y < perlinMap.length; y++) {
            for (let x = 0; x < perlinMap[y].length; x++) {
                var value = 0;
                var count = 0;

                if (x !== 0) {
                    value = value + perlinMap[y][x - 1];
                    count++;
                }

                if (x !== perlinMap[y].length - 1) {
                    value = value + perlinMap[y][x + 1];
                    count++;
                }

                if (y != 0) {
                    value = value + perlinMap[y - 1][x];
                    count++;
                }

                if (y != perlinMap.length - 1) {
                    value = value + perlinMap[y + 1][x];
                    count++;
                }

                blurryMap[y][x] = value / count;
            }
        }

        return blurryMap;
    }

    this.calculateNeighbors = function calculateNeighbors(map, x, y, minValue) {
        var count = 0;

        if (x != 0) {
            if (map[y][x - 1] >= minValue)
                count++;
        }
        else {
            count++;
        }

        if (x != map[y].length - 1) {

            if (map[y][x + 1] >= minValue)
                count++;
        }
        else {
            count++;
        }

        if (y != 0) {
            if (map[y - 1][x] >= minValue)
                count++;
        }
        else {
            count++;
        }

        if (y != map.length - 1) {
            if (map[y + 1][x] >= minValue)
                count++;
        }
        else {
            count++;
        }

        return count;
    }

    this.calculateWallsNeighbors = function (map, x, y) {
        var count = 0;

        // If not next to left border
        if (x !== 0) {
            if (map[y][x - 1] === this.occupiedIndex) {
                count++;
            }
        }

        // If not next to right border
        if (x !== map[y].length - 1) {
            if (map[y][x + 1] === this.occupiedIndex) {
                count++;
            }
        }

        // If not next to up border
        if (y !== 0) {
            if (map[y - 1][x] === this.occupiedIndex) {
                count++;
            }
        }

        if (y !== map.length - 1) {
            if (map[y + 1][x] === this.occupiedIndex) {
                count++;
            }
        }

        return count;
    }

    this.findFreeNearSpaces = function (x, y) {
        var tilesToCheck = [];
        // If the pixel is not next to the left border
        if (x !== 0) {
            if (this.body[y][x - 1] === this.freeIndex) {
                tilesToCheck.push([x - 1, y]);
            }
        }

        // If the pixel is not next to the right border
        if (x !== this.body[y].length - 1) {
            if (this.body[y][x + 1] === this.freeIndex) {
                tilesToCheck.push([x + 1, y]);
            }
        }

        // If the pixel is not next to the top border
        if (y !== 0) {
            if (this.body[y - 1][x] === this.freeIndex) {
                tilesToCheck.push([x, y - 1]);
            }
        }

        // If the pixe is not next to the bottom border
        if (y !== this.body.length - 1) {
            if (this.body[y + 1][x] === this.freeIndex) {
                tilesToCheck.push([x, y + 1]);
            }
        }

        return tilesToCheck;
    }

    this.borders = function borders(width, height) {
        getGameData.wallCanvas.style.border = getGameData.canvas.style.border;

        document.body.appendChild(getGameData.wallCanvas);

        getGameData.wallCanvas.width = width;
        getGameData.wallCanvas.height = height;
    }

    function componentToHex(c) {
        var hex = c.toString(16);
        return hex.length == 1 ? "0" + hex : hex;
    }

    function rgbToHex(r, g, b) {
        return "#" + componentToHex(Math.floor(r)) + componentToHex(Math.floor(g)) + componentToHex(Math.floor(b));
    }
}

function getValidPos() {
    var validPlace = false;

    document.getElementById("scoreLabel").textContent = document.getElementById("scoreLabel").textContent + "   Searching for a valid apple spot...";

    while (!validPlace) {
        var pos = [Math.floor((Math.random() * getGameData.widthInBlocks)), Math.floor((Math.random() * getGameData.heightInBlocks))];

        if (getGameData.wall.body[pos[1]][pos[0]] !== getGameData.wall.occupiedIndex && !checkIfItemIsInArray(pos, getGameData.wall.body)) {
            validPlace = true;
        }
    }

    document.getElementById("scoreLabel").textContent = "Score: " + getGameData.snake.body.length;

    return pos;
}

function checkIfItemIsInArray(item, array) {
    var isIn = false;

    for (let i = 0; i < array.length; i++) {
        if (array[i][0] === item[0] && array[i][1] === item[1]) {
            isIn = true;
            i = array.length;
        }

    }

    return isIn;
}

/* Read the input of the user */
document.onkeydown = function handleKeyDown(e) {
    var newDirection = "Invalid Direction";
    var key = e.key;
    switch (key) {
        case "ArrowLeft":
            newDirection = "left";
            break;
        case "ArrowUp":
            newDirection = "up";
            break;
        case "ArrowRight":
            newDirection = "right";
            break;
        case "ArrowDown":
            newDirection = "down";
            break;
        case "Enter":
            init();
            return;
        default:
            return;
    }

    getGameData.snake.futureDirection = newDirection;
}