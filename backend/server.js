import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { fileURLToPath } from 'url';
import path from 'path';
import cors from 'cors';
import { GameManager } from './gameManager.js';

// Fix __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Express
const app = express();
app.use(cors());

// Serve React frontend build
const frontendPath = path.join(__dirname, '../frontend/dist');
app.use(express.static(frontendPath));

// Catch-all route for React Router SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(frontendPath, 'index.html'));
});

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
  cors: { origin: '*' },
});

const gameManager = new GameManager();

// Handle Socket.io connections
io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  // Create room
  socket.on('createRoom', ({ name }) => {
    const roomCode = gameManager.createRoom(name, socket.id);
    if (roomCode) {
      socket.join(roomCode);
      io.to(socket.id).emit('roomCreated', { roomCode, player: name });
      io.to(roomCode).emit('updatePlayers', gameManager.getPlayers(roomCode));
    }
  });

  // Join room
  socket.on('joinRoom', ({ name, roomCode }) => {
    const result = gameManager.joinRoom(name, roomCode, socket.id);
    if (result.error) io.to(socket.id).emit('errorMessage', result.error);
    else {
      socket.join(roomCode);
      io.to(roomCode).emit('updatePlayers', gameManager.getPlayers(roomCode));
      io.to(socket.id).emit('joinedRoom', { roomCode, player: name });
    }
  });

  // Start game
  socket.on('startGame', ({ roomCode }) => {
    gameManager.startGame(roomCode);
    io.to(roomCode).emit('gameStarted', gameManager.getGameState(roomCode));
  });

  // Share word
  socket.on('shareWord', ({ roomCode, word }) => {
    gameManager.shareWord(roomCode, word);
    io.to(roomCode).emit('wordShared', gameManager.getGameState(roomCode));
  });

  // Start voting
  socket.on('startVoting', ({ roomCode }) => {
    gameManager.startVoting(roomCode);
    io.to(roomCode).emit('votingStarted', gameManager.getGameState(roomCode));
  });

  // Submit vote
  socket.on('vote', ({ roomCode, voter, target }) => {
    gameManager.submitVote(roomCode, voter, target);
    io.to(roomCode).emit('voteUpdate', gameManager.getGameState(roomCode));
  });

  // End vote
  socket.on('endVote', ({ roomCode }) => {
    gameManager.endVote(roomCode);
    io.to(roomCode).emit('voteEnded', gameManager.getGameState(roomCode));
  });

  // Disconnect
  socket.on('disconnect', () => gameManager.removePlayer(socket.id));
});

// Start server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
