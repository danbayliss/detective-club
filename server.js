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

  // Start game - only secret word needed
  socket.on('startGame', ({ code, secretWord }) => {
    const room = rooms[code];
    if (!room) return;

    room.secretWord = secretWord;
    nextRound(room);

    const playerIds = Object.keys(room.players);
    
    // Pick a blind player randomly
    const blindId = playerIds[Math.floor(Math.random() * playerIds.length)];
    room.blindId = blindId;

    playerIds.forEach(id => {
      const isDetective = id === room.detectiveId;
      const isBlind = id === blindId;
      const word = isBlind || isDetective ? null : secretWord;

      io.to(id).emit('yourRole', {
        isDetective,
        isBlind,
        word
      });
    });

    io.to(code).emit('stateUpdate', room);
  });

  socket.on('submitClue', ({ code, clue }) => {
    const room = rooms[code];
    if (!room) return;
    room.clues[socket.id] = clue;
    if (Object.keys(room.clues).length === Object.keys(room.players).length - 1) {
      room.phase = 'vote';
    }
    io.to(code).emit('stateUpdate', room);
  });

  socket.on('vote', ({ code, targetId }) => {
    const room = rooms[code];
    if (!room) return;
    room.votes[socket.id] = targetId;

    if (Object.keys(room.votes).length === Object.keys(room.players).length) {
      const tally = {};
      Object.values(room.votes).forEach(v => tally[v] = (tally[v] || 0) + 1);
      const votedOut = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];

      if (votedOut === room.detectiveId) {
        Object.keys(room.players).forEach(id => {
          if (id !== room.detectiveId) room.scores[id] += 2;
        });
      } else {
        room.scores[room.detectiveId] += 3;
      }

      room.phase = 'reveal';
      room.votedOut = votedOut;
    }

    io.to(code).emit('stateUpdate', room);
  });

  socket.on('nextRound', ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    nextRound(room);
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
