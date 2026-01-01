const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

const PORT = process.env.PORT || 3000;

// --- Game State ---
let rooms = {}; // { roomCode: { players: {}, creatorId, order: [], currentActiveIndex, phase, word, blindId, scores, votes } }

function generateRoomCode() {
    return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function pickBlindPlayer(room) {
    const playerIds = Object.keys(room.players).filter(id => id !== room.order[room.currentActiveIndex]);
    const randomIndex = Math.floor(Math.random() * playerIds.length);
    return playerIds[randomIndex];
}

// --- Socket.io ---
io.on('connection', socket => {
    console.log('User connected:', socket.id);

    socket.on('createRoom', ({ name }) => {
        const roomCode = generateRoomCode();
        rooms[roomCode] = {
            code: roomCode,
            players: { [socket.id]: { name } },
            creatorId: socket.id,
            order: [],
            currentActiveIndex: 0,
            phase: 'lobby',
            word: null,
            blindId: null,
            scores: { [socket.id]: 0 },
            votes: {}
        };
        socket.join(roomCode);
        io.to(socket.id).emit('roomJoined', { code: roomCode, state: rooms[roomCode] });
    });

    socket.on('joinRoom', ({ name, code }) => {
        const room = rooms[code];
        if (!room) return socket.emit('joinError', 'Room not found');
        if (Object.values(room.players).some(p => p.name.toLowerCase() === name.toLowerCase()))
            return socket.emit('joinError', 'Name already taken');
        room.players[socket.id] = { name };
        room.scores[socket.id] = 0;
        socket.join(code);
        io.to(code).emit('stateUpdate', room);
        io.to(socket.id).emit('roomJoined', { code, state: room });
    });

    socket.on('exitRoom', ({ code }) => {
        const room = rooms[code];
        if (!room) return;
        delete room.players[socket.id];
        delete room.scores[socket.id];
        if (room.creatorId === socket.id) {
            // End game for everyone
            io.to(code).emit('stateUpdate', { ...room, phase: 'finished' });
            delete rooms[code];
        } else io.to(code).emit('stateUpdate', room);
    });

    socket.on('startGame', ({ code }) => {
        const room = rooms[code];
        if (!room) return;
        room.phase = 'wordEntry';
        room.order = Object.keys(room.players);
        room.currentActiveIndex = 0;
        room.word = null;
        room.blindId = pickBlindPlayer(room);
        room.votes = {};
        io.to(code).emit('stateUpdate', room);
    });

    socket.on('submitWord', ({ code, word }) => {
        const room = rooms[code];
        if (!room) return;
        room.word = word;
        io.to(code).emit('stateUpdate', room);
    });

    socket.on('startVoting', ({ code }) => {
        const room = rooms[code];
        if (!room) return;
        room.phase = 'voting';
        room.votes = {};
        io.to(code).emit('stateUpdate', room);
    });

    socket.on('vote', ({ code, targetId }) => {
        const room = rooms[code];
        if (!room) return;
        if (socket.id === targetId) return; // Cannot vote for self
        room.votes[socket.id] = targetId;

        // Check if all votes are in
        if (Object.keys(room.votes).length === Object.keys(room.players).length) {
            const blindVotes = Object.values(room.votes).filter(v => v === room.blindId).length;
            Object.keys(room.players).forEach(id => {
                if (id === room.blindId) {
                    if (blindVotes <= 1) room.scores[id] += 5;
                } else {
                    if (room.votes[id] === room.blindId) room.scores[room.votes[id]] += 3;
                }
            });

            // Move to next round or end game
            room.currentActiveIndex++;
            if (room.currentActiveIndex >= room.order.length) {
                room.phase = 'finished';
            } else {
                room.phase = 'wordEntry';
                room.word = null;
                room.blindId = pickBlindPlayer(room);
                room.votes = {};
            }
        }
        io.to(code).emit('stateUpdate', room);
    });

    socket.on('disconnect', () => {
        // Remove from all rooms
        Object.values(rooms).forEach(room => {
            if (socket.id in room.players) {
                delete room.players[socket.id];
                delete room.scores[socket.id];
                if (socket.id === room.creatorId) {
                    io.to(room.code).emit('stateUpdate', { ...room, phase: 'finished' });
                    delete rooms[room.code];
                } else io.to(room.code).emit('stateUpdate', room);
            }
        });
    });
});

http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
