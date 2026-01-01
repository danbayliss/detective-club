// When starting a game
socket.on('startGame', ({ code, secretWord, pickerId }) => {
  const room = rooms[code];
  if (!room) return;

  room.secretWord = secretWord;
  nextRound(room);

  const playerIds = Object.keys(room.players);

  // Pick a blind player randomly, excluding the secret word picker
  const eligibleIds = playerIds.filter(id => id !== pickerId);
  const blindId = eligibleIds[Math.floor(Math.random() * eligibleIds.length)];
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

// Handle detective revealing the word
socket.on('revealWord', ({ code }) => {
  const room = rooms[code];
  if (!room) return;

  // Only detective can reveal
  if (socket.id !== room.detectiveId) return;

  io.to(code).emit('wordRevealed', room.secretWord);
});

// Allow exit room
socket.on('exitRoom', ({ code }) => {
  const room = rooms[code];
  if (!room) return;

  delete room.players[socket.id];
  delete room.scores[socket.id];
  socket.leave(code);

  io.to(code).emit('stateUpdate', room);
});

// Handle reconnection / persistent session
// Clients will send their name and previous room code if they reload
socket.on('rejoinRoom', ({ code, name }) => {
  const room = rooms[code];
  if (!room) return;

  room.players[socket.id] = { name };
  if (!room.scores[socket.id]) room.scores[socket.id] = 0;
  socket.join(code);

  io.to(code).emit('stateUpdate', room);
  socket.emit('rejoined', room);
});
