import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import { GameManager } from './gameManager.js';

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

const gameManager = new GameManager();

io.on('connection', (socket) => {
  console.log('New connection:', socket.id);

  socket.on('createRoom', ({ name }) => {
    const roomCode = gameManager.createRoom(name, socket.id);
    if (roomCode) {
      socket.join(roomCode);
      io.to(socket.id).emit('roomCreated', { roomCode, player: name });
      io.to(roomCode).emit('updatePlayers', gameManager.getPlayers(roomCode));
    }
  });

  socket.on('joinRoom', ({ name, roomCode }) => {
    const result = gameManager.joinRoom(name, roomCode, socket.id);
    if (result.error) {
      io.to(socket.id).emit('errorMessage', result.error);
    } else {
      socket.join(roomCode);
      io.to(roomCode).emit('updatePlayers', gameManager.getPlayers(roomCode));
      io.to(socket.id).emit('joinedRoom', { roomCode, player: name });
    }
  });

  socket.on('startGame', ({ roomCode }) => {
    gameManager.startGame(roomCode);
    io.to(roomCode).emit('gameStarted', gameManager.getGameState(roomCode));
  });

  socket.on('shareWord', ({ roomCode, word }) => {
    gameManager.shareWord(roomCode, word);
    io.to(roomCode).emit('wordShared', gameManager.getGameState(roomCode));
  });

  socket.on('startVoting', ({ roomCode }) => {
    gameManager.startVoting(roomCode);
    io.to(roomCode).emit('votingStarted', gameManager.getGameState(roomCode));
  });

  socket.on('vote', ({ roomCode, voter, target }) => {
    gameManager.submitVote(roomCode, voter, target);
    io.to(roomCode).emit('voteUpdate', gameManager.getGameState(roomCode));
  });

  socket.on('endVote', ({ roomCode }) => {
    gameManager.endVote(roomCode);
    io.to(roomCode).emit('voteEnded', gameManager.getGameState(roomCode));
  });

  socket.on('disconnect', () => {
    gameManager.removePlayer(socket.id);
    io.emit('updateRooms', gameManager.getAllRooms());
  });
});

server.listen(process.env.PORT || 5000, () => console.log('Server running on port 5000'));
