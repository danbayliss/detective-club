const express = require('express');
const path = require('path');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const PORT = process.env.PORT || 3000;

// Serve static files (CSS, JS)
app.use(express.static(__dirname));

// Serve index.html on root
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

function generateRoomCode() {
  return Math.random().toString(36).substring(2, 7).toUpperCase();
}

const rooms = {};

io.on('connection', socket => {
  socket.on('createRoom', ({ name }) => {
    const code = generateRoomCode();
    rooms[code] = {
      players: { [socket.id]: { name } },
      creatorId: socket.id,
      phase: 'lobby',
      scores: { [socket.id]: 0 }
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
      socket.emit('joinError', 'Name already taken in this room.');
      return;
    }
    rooms[code].players[socket.id] = { name };
    rooms[code].scores[socket.id] = 0;
    socket.join(code);
    io.to(code).emit('stateUpdate', rooms[code]);
    socket.emit('roomJoined', { code, state: rooms[code] });
  });

  socket.on('exitRoom', ({ code }) => {
    if (rooms[code]) {
      delete rooms[code].players[socket.id];
      delete rooms[code].scores[socket.id];
      io.to(code).emit('stateUpdate', rooms[code]);
    }
  });

  // Minimal placeholder for start game / submit word / reveal / voting
  socket.on('startGame', ({ code }) => {
    if (!rooms[code]) return;
    rooms[code].phase = 'wordEntry';
    rooms[code].currentActiveId = Object.keys(rooms[code].players)[0]; // first player active
    io.to(code).emit('stateUpdate', rooms[code]);
  });
});

http.listen(PORT, () => console.log(`Server running on port ${PORT}`));

