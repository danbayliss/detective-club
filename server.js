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
    fakeWord: null,
    clues: {},
    votes: {},
    scores: {}
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

  socket.on('startGame', ({ code, secretWord, fakeWord }) => {
    const room = rooms[code];
    if (!room) return;

    room.secretWord = secretWord;
    room.fakeWord = fakeWord;
    nextRound(room);

    Object.keys(room.players).forEach(id => {
      const isDetective = id === room.detectiveId;
      const word = isDetective ? null
