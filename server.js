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
    round: 0,
    maxRounds: 0,
    phase: 'lobby',
    players: {},
    scores: {},
    blindId: null,
    activeIndex: 0,
    activeOrder: [],
    word: null,
    votes: {}
  };
  return code;
}

function nextRound(room) {
  room.phase = 'wordEntry';
  room.word = null;
  room.votes = {};

  if (room.activeIndex >= room.activeOrder.length) {
    room.phase = 'end';
    return;
  }

  room.currentActiveId = room.activeOrder[room.activeIndex];

  // Random blind player (not active player)
  const ids = Object.keys(room.players).filter(id => id !== room.currentActiveId);
  room.blindId = ids[Math.floor(Math.random() * ids.length)];

  room.activeIndex++;
}

function calculateScores(room) {
  const votesAgainstBlind = Object.values(room.votes).filter(v => v === room.blindId).length;
  const blindPlayer = room.blindId;

  // Players who voted for blind player get 3 VP
  Object.entries(room.votes).forEach(([playerId, votedId]) => {
    if (votedId === blindPlayer) {
      room.scores[playerId] += 3;
    }
  });

  // Blind player points
  if (votesAgainstBlind <= 1) {
    room.scores[blindPlayer] += 5;
  }
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
    const room = rooms[code];
    if (!room) return;
    room.players[socket.id] = { name };
    if (!room.scores[socket.id]) room.scores[socket.id] = 0;
    socket.join(code);
    socket.emit('roomJoined', { code, state: room });
    io.to(code).emit('stateUpdate', room);
  });

  socket.on('rejoinRoom', ({ code, name }) => {
    const room = rooms[code];
    if (!room) return;
    room.players[socket.id] = { name };
    if (!room.scores[socket.id]) room.scores[socket.id] = 0;
    socket.join(code);
    socket.emit('rejoined', room);
    io.to(code).emit('stateUpdate', room);
  });

  // Start game
  socket.on('startGame', ({ code }) => {
    const room = rooms[code];
    if (!room) return;

    room.activeOrder = Object.keys(room.players).sort(() => Math.random() - 0.5);
    room.maxRounds = room.activeOrder.length;
    room.activeIndex = 0;
    nextRound(room);
    io.to(code).emit('stateUpdate', room);
  });

  // Active player submits word
  socket.on('submitWord', ({ code, word }) => {
    const room = rooms[code];
    if (!room) return;
    if (socket.id !== room.currentActiveId) return;

    room.word = word;
    room.phase = 'voting'; // voting phase starts
    io.to(code).emit('wordSubmitted', { word, blindId: room.blindId });
    io.to(code).emit('stateUpdate', room);
  });

  // Reveal word to blind player
  socket.on('revealWord', ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    if (socket.id !== room.currentActiveId) return;

    io.to(room.blindId).emit('wordRevealed', room.word);
  });

  // Voting
  socket.on('voteBlind', ({ code, votedId }) => {
    const room = rooms[code];
    if (!room) return;
    room.votes[socket.id] = votedId;

    // Check if all players have voted
    if (Object.keys(room.votes).length === Object.keys(room.players).length) {
      calculateScores(room);
      // Next round
      nextRound(room);
    }

    io.to(code).emit('stateUpdate', room);
  });

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
