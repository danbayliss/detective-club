const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static('public'));

const rooms = {}; // roomCode -> state

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('createRoom', ({ name }) => {
    const roomCode = Math.random().toString(36).substring(2, 7).toUpperCase();
    rooms[roomCode] = {
      code: roomCode,
      creatorId: socket.id,
      players: { [socket.id]: { name } },
      scores: { [socket.id]: 0 },
      order: [],
      currentActiveIndex: 0,
      phase: 'lobby',
      votes: {},
      blindId: null,
      word: null
    };
    socket.join(roomCode);
    io.to(socket.id).emit('roomJoined', { code: roomCode, state: rooms[roomCode] });
    io.to(roomCode).emit('stateUpdate', rooms[roomCode]);
  });

  socket.on('joinRoom', ({ name, code }) => {
    const room = rooms[code];
    if (!room) return io.to(socket.id).emit('joinError', 'Room not found');
    // Prevent duplicate names
    if (Object.values(room.players).some(p => p.name === name)) {
      return io.to(socket.id).emit('joinError', 'Name already taken');
    }

    room.players[socket.id] = { name };
    room.scores[socket.id] = 0;
    socket.join(code);
    io.to(socket.id).emit('roomJoined', { code, state: room });
    io.to(code).emit('stateUpdate', room);
  });

  socket.on('startGame', ({ code }) => {
    const room = rooms[code];
    if (!room || room.phase !== 'lobby') return;
    room.phase = 'wordEntry';
    room.order = Object.keys(room.players);
    room.currentActiveIndex = 0;

    // Pick a random blind player (not the first active)
    const blindCandidates = room.order.filter(id => id !== room.order[0]);
    room.blindId = blindCandidates[Math.floor(Math.random() * blindCandidates.length)];
    room.word = null;

    io.to(code).emit('stateUpdate', room);
  });

  // New: Active player submits word
  socket.on('submitWord', ({ code, word }) => {
    const room = rooms[code];
    if (!room) return;
    const activeId = room.order[room.currentActiveIndex];
    if (socket.id !== activeId) return;

    room.word = word;
    room.phase = 'wordEntry'; // stay in wordEntry until reveal
    io.to(code).emit('stateUpdate', room);
  });

  // Reveal word, go to voting
  socket.on('revealWord', ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    const activeId = room.order[room.currentActiveIndex];
    if (socket.id !== activeId) return;

    room.phase = 'voting';
    room.votes = {}; // reset votes
    io.to(code).emit('stateUpdate', room);
  });

  // Voting
  socket.on('vote', ({ code, targetId }) => {
    const room = rooms[code];
    if (!room || room.phase !== 'voting') return;
    const activeId = room.order[room.currentActiveIndex];
    if (targetId === activeId) return; // cannot vote for active

    room.votes[socket.id] = targetId;

    // Check if all non-active players voted
    const nonActivePlayers = Object.keys(room.players).filter(id => id !== activeId);
    if (nonActivePlayers.every(id => room.votes[id])) {
      // Calculate points
      const blindId = room.blindId;
      const votesAgainstBlind = Object.values(room.votes).filter(v => v === blindId).length;

      if (votesAgainstBlind <= 1) {
        room.scores[blindId] += 5;
      }
      Object.entries(room.votes).forEach(([voterId, votedId]) => {
        if (votedId === blindId) room.scores[voterId] += 3;
      });

      // Move to next active player
      room.currentActiveIndex++;
      if (room.currentActiveIndex >= room.order.length) {
        room.phase = 'finished';
      } else {
        room.phase = 'wordEntry';
        // Pick a new blind player (not active)
        const newActive = room.order[room.currentActiveIndex];
        const blindCandidates = room.order.filter(id => id !== newActive);
        room.blindId = blindCandidates[Math.floor(Math.random() * blindCandidates.length)];
        room.word = null;
      }
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
    Object.values(rooms).forEach(room => {
      if (room.players[socket.id]) {
        delete room.players[socket.id];
        delete room.scores[socket.id];
        io.to(room.code).emit('stateUpdate', room);
      }
    });
  });
});

server.listen(3000, () => console.log('Server running on port 3000'));
