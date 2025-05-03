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
    const playerId = playerRoles.shift(); // Takes 'player' first, then 'opponent'
    players[socket.id] = playerId;
    socket.emit('playerAssignment', playerId);

    // Notify all clients of current player count
    io.emit('playerCount', Object.keys(players).length);

    // Start game if both players are in
    if (Object.keys(players).length === 2) {
        gameState = createInitialBoard();
        io.emit('gameStateUpdate', gameState);
    }

    // socket.on('sowSequence', ({ pitIndexes, nextPlayer }) => {
    //     if (!players[socket.id] || !gameState) return;

    //     gameState.currentPlayer = nextPlayer;

    //     // Broadcast to all clients
    //     io.emit('sowSequence', {
    //         pitIndexes,
    //         player: players[socket.id],
    //         nextPlayer
    //     });
    // });

    // // Client sends full board + nextPlayer at end of turn
    // socket.on('endTurn', ({ pits, nextPlayer }) => {
    //     const player = players[socket.id];
    //     if (!player || !gameState) return;

    //     // Optional: basic validation (could be expanded)
    //     if (gameState.currentPlayer !== player) {
    //         socket.emit('invalidMove', 'Not your turn!');
    //         return;
    //     }

    //     // Apply received state
    //     gameState.pits = pits;
    //     gameState.currentPlayer = nextPlayer;

    //     io.emit('gameStateUpdate', gameState);
    // });
    socket.on('sowSequence', ({ pitIndexes, nextPlayer }) => {
        if (!players[socket.id] || !gameState) return;

        // Validate it's the current player's turn
        if (gameState.currentPlayer !== players[socket.id]) {
            socket.emit('invalidMove', 'Not your turn!');
            return;
        }

        // Update the game state with the new player turn
        gameState.currentPlayer = nextPlayer;

        // Broadcast to all clients
        io.emit('sowSequence', {
            pitIndexes,
            player: players[socket.id],
            nextPlayer
        });

        // Also send a full game state update
        io.emit('gameStateUpdate', gameState);
    });

    socket.on('endTurn', ({ pits, nextPlayer }) => {
    const player = players[socket.id];
    if (!player || !gameState) return;

    // Validate it's the current player's turn
    if (gameState.currentPlayer !== player) {
        socket.emit('invalidMove', 'Not your turn!');
        return;
    }

    // Apply received state
    gameState.pits = pits;
    gameState.currentPlayer = nextPlayer; // This is the key change

    // Broadcast to all clients
    io.emit('gameStateUpdate', gameState);
});

    socket.on('disconnect', () => {
        console.log('Disconnected:', socket.id);

        const disconnectedRole = players[socket.id];
        if (disconnectedRole) {
            playerRoles.unshift(disconnectedRole); // Re-queue the role
        }

        delete players[socket.id];
        gameState = null; // reset game

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
        currentPlayer: 'player'
    };
}

server.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});


// const express = require('express');
// const http = require('http');
// const { Server } = require('socket.io');

// const app = express();
// const server = http.createServer(app);
// const io = new Server(server);

// app.use(express.static('public'));

// let players = {};
// let gameState = null;
// const playerRoles = ['player', 'opponent']; // Available roles
// const availableRoles = [...playerRoles]; // Clone to track available roles

// io.on('connection', (socket) => {
//     console.log('New connection:', socket.id);

//     if (Object.keys(players).length >= 2) {
//         socket.emit('full');
//         return;
//     }

//     // Assign the next available role immediately
//     const assignedRole = availableRoles.shift();
//     players[socket.id] = assignedRole;
//     socket.emit('playerAssignment', assignedRole);

//     // Notify all clients of current player count
//     io.emit('playerCount', Object.keys(players).length);

//     // Start game if both players are in
//     if (Object.keys(players).length === 2) {
//         gameState = createInitialBoard();
//         io.emit('gameStateUpdate', gameState);
//     }

//     socket.on('sowSequence', ({ pitIndexes, nextPlayer }) => {
//         if (!players[socket.id] || !gameState) return;

//         gameState.currentPlayer = nextPlayer;

//         // Broadcast to all clients
//         io.emit('sowSequence', {
//             pitIndexes,
//             player: players[socket.id],
//             nextPlayer
//         });
//     });

//     socket.on('endTurn', ({ pits, nextPlayer }) => {
//         const player = players[socket.id];
//         if (!player || !gameState) return;

//         if (gameState.currentPlayer !== player) {
//             socket.emit('invalidMove', 'Not your turn!');
//             return;
//         }

//         gameState.pits = pits;
//         gameState.currentPlayer = nextPlayer;

//         io.emit('gameStateUpdate', gameState);
//     });

//     socket.on('disconnect', () => {
//         console.log('Disconnected:', socket.id);

//         const disconnectedRole = players[socket.id];
//         if (disconnectedRole) {
//             // Return the role to availableRoles if it's not already there
//             if (!availableRoles.includes(disconnectedRole)) {
//                 availableRoles.push(disconnectedRole);
//                 availableRoles.sort(); // Keep consistent order
//             }
//             delete players[socket.id];
//         }

//         // Reset game if someone disconnects
//         if (Object.keys(players).length < 2) {
//             gameState = null;
//             io.emit('playerLeft');
//         }

//         io.emit('playerCount', Object.keys(players).length);
//     });
// });

// function createInitialBoard() {
//     const pits = [];
//     for (let i = 0; i < 32; i++) {
//         pits.push({
//             seedCount: 2,
//             owner: i < 16 ? 'opponent' : 'player',
//         });
//     }
//     return {
//         pits,
//         currentPlayer: 'player'
//     };
// }

// server.listen(3000, () => {
//     console.log('Server running on http://localhost:3000');
// });