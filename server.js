const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

// Serve public folder
app.use(express.static(path.join(__dirname, 'public')));

// Serve index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Catch-all for SPA routing
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Game Logic ---
const rooms = {};

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

// Choose a random player excluding given ids
function chooseRandom(players, exclude=[]) {
  const keys = Object.keys(players).filter(k => !exclude.includes(k));
  if (keys.length === 0) return null;
  return keys[Math.floor(Math.random() * keys.length)];
}

io.on('connection', socket => {
  console.log('New connection:', socket.id);

  socket.on('createRoom', ({ name }) => {
    const code = generateRoomCode();
    rooms[code] = {
      players: { [socket.id]: { name } },
      scores: { [socket.id]: 0 },
      creatorId: socket.id,
      phase: 'lobby',
      order: [socket.id], // keeps track of active order
      currentActiveIndex: 0,
      blindId: null,
      word: '',
      votes: {}
    };
    socket.join(code);
    socket.emit('roomJoined', { code, state: rooms[code] });
  });

  socket.on('joinRoom', ({ name, code }) => {
    if (!rooms[code]) {
      socket.emit('joinError', 'Room not found');
      return;
    }
    const nameExists = Object.values(rooms[code].players).some(p => p.name === name);
    if (nameExists) {
      socket.emit('joinError', 'Name already taken');
      return;
    }
    rooms[code].players[socket.id] = { name };
    rooms[code].scores[socket.id] = 0;
    rooms[code].order.push(socket.id);
    socket.join(code);
    io.to(code).emit('stateUpdate', rooms[code]);
    socket.emit('roomJoined', { code, state: rooms[code] });
  });

  socket.on('exitRoom', ({ code }) => {
    if (!rooms[code]) return;
    delete rooms[code].players[socket.id];
    delete rooms[code].scores[socket.id];
    const idx = rooms[code].order.indexOf(socket.id);
    if (idx !== -1) rooms[code].order.splice(idx,1);
    io.to(code).emit('stateUpdate', rooms[code]);
  });

  socket.on('startGame', ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    room.currentActiveIndex = 0;
    room.phase = 'wordEntry';
    room.word = '';
    room.blindId = chooseRandom(room.players, [room.order[room.currentActiveIndex]]);
    room.votes = {};
    io.to(code).emit('stateUpdate', room);
  });

  socket.on('submitWord', ({ code, word }) => {
    const room = rooms[code];
    if (!room) return;
    room.word = word;
    room.phase = 'voting';
    room.votes = {};
    io.to(code).emit('stateUpdate', room);
  });

  socket.on('revealWord', ({ code }) => {
    const room = rooms[code];
    if (!room) return;
    room.revealed = true;
    io.to(code).emit('stateUpdate', room);
  });

  socket.on('vote', ({ code, targetId }) => {
    const room = rooms[code];
    if (!room) return;
    room.votes[socket.id] = targetId;

    // Check if all votes are in
    if (Object.keys(room.votes).length === Object.keys(room.players).length) {
      // Calculate scores
      const voteCounts = {};
      Object.values(room.votes).forEach(v => voteCounts[v] = (voteCounts[v]||0)+1);
      const blindVotes = voteCounts[room.blindId]||0;
      Object.entries(room.votes).forEach(([playerId, votedId]) => {
        if(votedId === room.blindId) room.scores[playerId] += 3;
      });
      if(blindVotes<=1) room.scores[room.blindId] +=5;

      // Move to next active
      room.currentActiveIndex++;
      if(room.currentActiveIndex >= room.order.length){
        room.phase = 'finished';
      } else {
        room.phase = 'wordEntry';
        room.word = '';
        room.blindId = chooseRandom(room.players, [room.order[room.currentActiveIndex]]);
        room.votes = {};
      }
    }
    io.to(code).emit('stateUpdate', room);
  });

  socket.on('disconnect', () => {
    console.log('Disconnected:', socket.id);
  });
});

http.listen(PORT, () => console.log(`Server running on port ${PORT}`));
