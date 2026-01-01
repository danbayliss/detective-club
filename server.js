const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

let rooms = {};

function createRoom(hostId) {
  const code = Math.random().toString(36).substring(2, 6).toUpperCase();
  rooms[code] = {
    hostId,
    round: 1,
    maxRounds: 5,
    phase: 'lobby',
    players: {},
    detectiveId: null,
    secretWord: null,
    clues: {},
    votes: {},
    scores: {},
    blindId: null
  };
  return code;
}

function nextRound(room) {
  room.round++;
  room.phase = room.round > room.maxRounds ? 'end' : 'clues';
  room.clues = {};
  room.votes = {};
  const ids = Object.keys(room.players);
  room.detectiveId = ids[Math.floor(Math.random() * ids.length)];
}

io.on('connection', socket => {

  socket.on('createRoom', ({ name }) => {
    const code = createRoom(socket.id);
    rooms[code].players[socket.id] = { name };
    rooms[code].scores[socket.id] = 0;
    socket.join(code);
    socket.emit('roomJoined', { code, state: rooms[code] });
  });

  socket.on('joinRoom', ({ code, name }) => {
    if (!rooms[code]) return;
    rooms[code].players[socket.id] = { name };
    rooms[code].scores[socket.id] = 0;
    socket.join(code);
    io.to(code).emit('stateUpdate', rooms[code]);
  });

  // Rejoin after refresh
  socket.on('rejoinRoom', ({ code, name }) => {
    const room = rooms[code];
    if (!room) return;
    room.players[socket.id] = { name };
    if (!room.scores[socket.id]) room.scores[socket.id] = 0;
    socket.join(code);
    io.to(code).emit('stateUpdate', room);
    socket.emit('rejoined', room);
  });

  // Start game - blind player never picks word
  socket.on('startGame', ({ code, secretWord, pickerId }) => {
    const room = rooms[code];
    if (!room) return;

    room.secretWord = secretWord;
    nextRound(room);

    const playerIds = Object.keys(room.players);

    const eligibleIds = playerIds.filter(id => id !== pickerId);
    const blindId = eligibleIds[Math.floor(Math.random() * eligibleIds.length)];
    room.blindId = blindId;

    playerIds.forEach(id => {
      const isDetective = id === room.detectiveId;
      const isBlind = id === blindId;
      const word = isBlind || isDetective ? null : secretWord;

      io.to(id).emit('yourRole', { isDetective, isBlind, word });
    });

    io.to(code).emit('stateUpdate', room);
  });

  // Detective reveals word
  socket.on('revealWord', ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    if (socket.id !== room.detectiveId) return;
    io.to(code).emit('wordRevealed', room.secretWord);
  });

  // Exit room
  socket.on('exitRoom', ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    delete room.players[socket.id];
    delete room.scores[socket.id];
    socket.leave(code);
    io.to(code).emit('stateUpdate', room);
  });

  socket.on('disconnect', () => {
    for (const code in rooms) {
      if (rooms[code].players[socket.id]) {
        delete rooms[code].players[socket.id];
        delete rooms[code].scores[socket.id];
        io.to(code).emit('stateUpdate', rooms[code]);
      }
    }
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
