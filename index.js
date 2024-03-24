"use strict";

//globals
let board = [
    [undefined, undefined, undefined],
    [undefined, undefined, undefined],
    [undefined, undefined, undefined]
];

let currentPlayer = undefined;
let chosenPlayer = undefined;

let rewardForAI = 0;
let decayFactor = 0.6;

let difficultyLevels = {
    ez: 2,
    med: 4,
    hd: 6,
    imp: Infinity
};

let difficultyChosen = undefined;
let moveRewards = {};

const OUTCOME_WIN = "WIN";
const OUTCOME_LOSS = "LOSS";

function updateMoveRewards(row, col, outcome) {
    const move = `${row}-${col}`;
    if (!moveRewards[move]) {
        moveRewards[move] = 0;
    }

    // Update move reward based on game outcome
    if (outcome === OUTCOME_WIN) {
        moveRewards[move] += 1;
    } else if (outcome === OUTCOME_LOSS) {
        moveRewards[move] -= 1;
    }
}

async function showMessage(message) {
    var messageBox = document.getElementById("message");
    setTimeout(() => {
        messageBox.textContent = message;
        messageBox.classList.toggle("hidden"); 
    }, 10);
    setTimeout(() => {
        messageBox.classList.toggle("hidden");
    }, 1500);
}

async function isGameOver(OnlyCheckState = false) {
    let filled = 0;
    let message = undefined;
    let winner = undefined;

    //check rows & cols
    for(var i = 0; i < 3; ++i) {
        if(board[i][0] !== undefined && board[i][0] == board[i][1] && board[i][1] == board[i][2]) {
            message = board[i][0] + " won!!";
            winner = board[i][0];
            break;
        }

        if(board[0][i] !== undefined && board[0][i] === board[1][i] && board[1][i] === board[2][i]) {
            message = board[0][i] + " won!!";
            winner = board[0][i];
            break;
        }

        if(board[i][0] !== undefined) filled++;
        if(board[i][1] !== undefined) filled++;
        if(board[i][2] !== undefined) filled++;
    }

    //check diag
    if(winner === undefined && board[0][0] !== undefined && board[0][0] == board[1][1] && board[1][1] == board[2][2]) {
        message = board[0][0] + " won!!";
        winner = board[0][0];
    }

    if(winner === undefined && board[0][2] !== undefined && board[0][2] == board[1][1] && board[1][1] == board[2][0]) {
        message = board[0][2] + " won!!";
        winner = board[0][2];
    }
    
    if(filled === 9) {
        message = "Match drawn!";
        winner = 0; 
    }

    if(!OnlyCheckState && winner === 0 || winner === chosenPlayer) {
        rewardForAI++;
        rewardForAI *= decayFactor;
    }
    else if(!OnlyCheckState && winner === getAIPlayer()) {
        rewardForAI--;
        rewardForAI *= decayFactor;
    }

    if(!OnlyCheckState && winner !== undefined) {
        await showMessage(message);
    }

    return winner;
}

async function startNewGame() {
    for(var i = 0; i < 3; ++i) {
        for(var j = 0; j < 3; ++j) {
            board[i][j] = undefined;
            await updateMove(undefined, undefined, i, j);
        }
    }
    currentPlayer = chosenPlayer;
}

async function updateMove(player, cellId, ROW = undefined, COL = undefined) { 
    let row = ROW === undefined ? Math.floor((cellId - 1) / 3) : ROW;
    let col = COL === undefined ? (cellId - 1) % 3 : COL;

    if(board[row][col] !== undefined) {
        return false;
    }

    board[row][col] = player;
    if(cellId === undefined) {
        cellId = row * 3 + col + 1;
    }
    var update = async () => {
        document.getElementById(cellId).textContent = player;
    };

    await update();
    return true;
}

async function getAIPlayer() {
    if(chosenPlayer === undefined) await startNewGame();
    else {
        return chosenPlayer === "X" ? "O" : "X";
    }
}

async function minimax(player, isMaximizing, depth, alpha, beta) {
    // Use rewardForNextGame to influence the AI's decision-making
    let targetScore = rewardForAI > 0 ? 1 : (rewardForAI < 0 ? -1 : 0);

    //check if game is over
    let winner = await isGameOver(true);
    let AI = await getAIPlayer();

    if (player !== AI) {
        targetScore *= -1; // Invert target score for the opponent's moves
    }

    if (winner !== undefined || depth === difficultyLevels[difficultyChosen]) {
        if(depth === difficultyLevels[difficultyChosen]) return 0;
        if (winner === AI) return 1 / depth;
        if (winner === chosenPlayer) return -1 / depth;
        return 0;
    }

    if(isMaximizing) {
        let maxScore = -Infinity;
        for(var i = 0; i < 3; ++i) {
            for(var j = 0 ;j < 3; ++j) {
                if(board[i][j] === undefined) {
                    board[i][j] = player;
                    let score = await minimax(player === "X" ? "O" : "X", false, depth + 1, alpha, beta);
                    maxScore = Math.max(maxScore,score);
                    board[i][j] = undefined;

                    alpha = Math.max(alpha, score);
                    if(alpha >= beta) break;
                }
            }
        }
        return maxScore;
    }
    else {
        let minScore = Infinity;
        for(var i = 0; i < 3; ++i) {
            for(var j = 0; j < 3; ++j) {
                if(board[i][j] === undefined) {
                    board[i][j] = player;
                    let score = await minimax(player === "X" ? "O" : "X", true, depth + 1, alpha, beta);
                    minScore = Math.min(minScore, score);
                    board[i][j] = undefined;

                    beta = Math.min(beta, score);
                    if(alpha >= beta) break;
                }
            }
        }

        return minScore;
    }
}

async function pickRandonMove(player) {
    let move = [-1, -1];

    let emptyCells = [];
    for(var i = 0; i < 3; ++i) {
        for(var j = 0; j < 3; ++j) {
            if(board[i][j] === undefined) emptyCells.push({row: i, col: j});
        }
    }

    if(emptyCells.length > 0) {
        let randomIndex = Math.floor(Math.random() * emptyCells.length);

        return [emptyCells[randomIndex].row, emptyCells[randomIndex].col];
    }

    return [-1, -1];
}

async function pickNextMove(player) {
    let move = [-1, -1];
    let maxScore = -Infinity;
    for(var i = 0; i < 3; ++i) {
        for(var j = 0 ;j < 3; ++j) {
            if(board[i][j] === undefined) {
                board[i][j] = player;
                let score = await minimax(player === "X" ? "O" : "X", false, 1, -Infinity, Infinity);
                if(score > maxScore) {
                    maxScore = score;
                    move[0] = i;
                    move[1] = j;
                }

                board[i][j] = undefined;
            }
        }
    }

    if(move[0] > -1 && move[1] > -1) {
        await updateMove(player, undefined, move[0], move[1]);
    }
    let winner = await isGameOver();
    if(winner === 0 || winner === "X" || winner === "O") {
        currentPlayer = undefined;
        updateMoveRewards(move[0], move[1], winner === 0 ? "DRAW" : winner === chosenPlayer ? OUTCOME_WIN : OUTCOME_LOSS);

        await setTimeout(async () => {
            await startNewGame();
        }, 1500);
    }
}

document.addEventListener("DOMContentLoaded", function() {
    document.querySelectorAll(".cell").forEach((x) => x.addEventListener("click", async function () {
        if(currentPlayer !== "X" && currentPlayer !== "O") {
            await showMessage("Please select a player first");
            return;
        }
        if(difficultyChosen === undefined) {
            await showMessage("Please select a difficulty first");
            return;
        }


        if(await updateMove(currentPlayer, this.id)) {
            let winner = await isGameOver();

            if (winner !== 0 && winner !== "X" && winner !== "O") {
                await pickNextMove(currentPlayer === "X" ? "O" : "X");
            }
            else {
                currentPlayer = undefined;
                setTimeout(async () => {
                    await startNewGame();
                }, 1000);
            }
        }
    }))

    document.getElementById("new-game-btn").addEventListener("click", async function () {
        setTimeout(() => {
            this.classList.add("btn-selected");
        }, 0);
        setTimeout(() => {
            this.classList.remove("btn-selected");
        }, 300);
        
        await startNewGame();
    });

    document.querySelectorAll("#options .btn").forEach((x) => {
        x.addEventListener("click", async function(){
            var difficulty = this.id;
            if(difficultyLevels[difficulty] === undefined) return;

            if(difficultyChosen !== undefined) {
                document.getElementById(difficultyChosen).classList.remove("btn-selected");
            }

            difficultyChosen = difficulty;
            document.getElementById(difficultyChosen).classList.add("btn-selected");
            await startNewGame();
        });
    });

    document.querySelectorAll("#choose-player .btn").forEach(x => {
        var player = x.id;
        if(player === undefined) return;

        player = player.toLocaleLowerCase().trim();
        if(player === "player_x" || player === "player_o") {
            x.addEventListener("click", function () {
                var id = this.id.toLocaleLowerCase().trim();
                var choice = id === "player_x" ? "X" : "O";

                if(chosenPlayer !== undefined) {
                    document.getElementById(chosenPlayer === "X" ? "player_x" : "player_o").classList.toggle("btn-selected");
                }

                chosenPlayer = choice;
                document.getElementById(id).classList.toggle("btn-selected");

                startNewGame();
            });
        }
    });
});