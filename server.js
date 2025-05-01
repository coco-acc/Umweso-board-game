const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let players = {};
let gameState = null;
let playerRoles = ['player', 'opponent']; // Available roles

io.on('connection', (socket) => {
    console.log('New connection:', socket.id);

    if (Object.keys(players).length >= 2) {
        socket.emit('full');
        return;
    }

    // Assign the next available role
    const playerId = playerRoles.shift(); // Takes first role, then next
    players[socket.id] = playerId;
    socket.emit('playerAssignment', playerId);

    // Notify all players about current player count
    io.emit('playerCount', Object.keys(players).length);

    if (Object.keys(players).length === 2) {
        gameState = createInitialBoard();
        io.emit('gameStateUpdate', gameState);
    }

//     socket.on('playerAction', ({ pitIndex, action }) => {
//     const player = players[socket.id];
//     if (!gameState || !player) return;

//     if (player !== gameState.currentPlayer) return;

//     const pit = gameState.pits[pitIndex];

//     // Rule: only pick from own pits with at least 2 seeds
//     if (pit.owner !== player || pit.seedCount < 2) return;

//     let seeds = pit.seedCount;
//     pit.seedCount = 0;

//     let lastIndex = pitIndex;

//     while (seeds > 0) {
//         lastIndex = (lastIndex + 1) % gameState.pits.length;
//         gameState.pits[lastIndex].seedCount++;
//         seeds--;
//     }

//     // Check if the last pit is owned by current player and has >1 seed → re-pickup
//     const lastPit = gameState.pits[lastIndex];
//     if (lastPit.owner === player && lastPit.seedCount > 1) {
//         // Auto pickup and continue turn
//         gameState.pits[lastIndex].seedCount = 0;
//         seeds = lastPit.seedCount;
//         while (seeds > 0) {
//             lastIndex = (lastIndex + 1) % gameState.pits.length;
//             gameState.pits[lastIndex].seedCount++;
//             seeds--;
//         }

//         // Check again if another re-pickup is needed
//         // If you want recursive pickup, you can wrap this in a loop
//     }

//     // If final pit does not qualify for another pickup → switch turns
//     const finalPit = gameState.pits[lastIndex];
//     if (!(finalPit.owner === player && finalPit.seedCount > 1)) {
//         gameState.currentPlayer = (gameState.currentPlayer === 'player') ? 'opponent' : 'player';
//     }

//     io.emit("gameStateUpdate", gameState);
// });
    socket.on('playerAction', ({ pitIndex, action }) => {
    const player = players[socket.id];
    if (!gameState || !player) return;

    // Only allow actions from the current player
    if (player !== gameState.currentPlayer) {
        socket.emit('invalidMove', 'Not your turn!');
        return;
    }

    const pit = gameState.pits[pitIndex];

    // Basic rule: can only pick from your own pits with at least 2 seeds
    if (pit.owner !== player || pit.seedCount < 2) {
        socket.emit('invalidMove', 'Invalid pit selection!');
        return;
    }

    // Simplified sowing logic
    let seeds = pit.seedCount;
    pit.seedCount = 0;
    let lastIndex = pitIndex;

    // Distribute seeds
    while (seeds > 0) {
        lastIndex = (lastIndex + 1) % gameState.pits.length;
        gameState.pits[lastIndex].seedCount++;
        seeds--;
    }

    // Check for re-pickup
    const lastPit = gameState.pits[lastIndex];
    if (lastPit.owner === player && lastPit.seedCount > 1) {
        // Auto pickup and continue turn
        gameState.pits[lastIndex].seedCount = 0;
        seeds = lastPit.seedCount;
        while (seeds > 0) {
            lastIndex = (lastIndex + 1) % gameState.pits.length;
            gameState.pits[lastIndex].seedCount++;
            seeds--;
        }
    }

    // Switch turns if no re-pickup
    const finalPit = gameState.pits[lastIndex];
    if (!(finalPit.owner === player && finalPit.seedCount > 1)) {
        gameState.currentPlayer = gameState.currentPlayer === 'player' ? 'opponent' : 'player';
    }

        io.emit("gameStateUpdate", gameState);
    });

    socket.on('disconnect', () => {
        console.log('Disconnected:', socket.id);
        const disconnectedPlayerRole = players[socket.id];
        if (disconnectedPlayerRole) {
            // Make the role available again
            playerRoles.unshift(disconnectedPlayerRole);
        }
        delete players[socket.id];
        gameState = null;
        io.emit('playerLeft');
        io.emit('playerCount', Object.keys(players).length);
    });
});

function createInitialBoard() {
    const pits = [];
    for (let i = 0; i < 32; i++) {
        pits.push({
            seedCount: 2,
            owner: i < 16 ? 'opponent' : 'player',
        });
    }
    return { 
        pits,
        currentPlayer: 'player' // Player always starts first
    };
}

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});