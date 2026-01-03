const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { nanoid } = require("nanoid");
const path = require("path");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());

// Serve frontend build
app.use(express.static(path.join(__dirname, "../client/build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../client/build/index.html"));
});

const rooms = {};

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("createRoom", ({ name }, callback) => {
    const roomCode = nanoid(6).toUpperCase();
    rooms[roomCode] = {
      players: [{ id: socket.id, name, score: 0 }],
      activePlayerIndex: 0,
      blindPlayerId: null,
      votes: {}
    };
    socket.join(roomCode);
    socket.emit("roomJoined", { roomCode, players: rooms[roomCode].players });
    io.to(roomCode).emit("updatePlayers", rooms[roomCode].players);
    callback({ roomCode });
  });

  socket.on("joinRoom", ({ name, roomCode }, callback) => {
    const room = rooms[roomCode];
    if (!room) return callback({ error: "Room not found" });
    if (room.players.find((p) => p.name === name)) return callback({ error: "Name already exists" });

    room.players.push({ id: socket.id, name, score: 0 });
    socket.join(roomCode);
    io.to(roomCode).emit("updatePlayers", room.players);
    callback({ roomCode, players: room.players });
  });

  socket.on("startGame", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;
    const activePlayer = room.players[room.activePlayerIndex];
    io.to(roomCode).emit("gameStarted", { activePlayer });
  });

  socket.on("shareWord", ({ roomCode, word }) => {
    const room = rooms[roomCode];
    if (!room) return;
    const activePlayer = room.players[room.activePlayerIndex];
    const blindCandidates = room.players.filter((p) => p.id !== activePlayer.id);
    const blindPlayer = blindCandidates[Math.floor(Math.random() * blindCandidates.length)];
    room.blindPlayerId = blindPlayer.id;
    io.to(roomCode).emit("wordShared", {
      word,
      blindPlayerId: blindPlayer.id,
      activePlayerId: activePlayer.id
    });
  });

  socket.on("startVoting", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;
    room.votes = {};
    io.to(roomCode).emit("votingStarted", room.players);
  });

  socket.on("submitVote", ({ roomCode, votedPlayerId }) => {
    const room = rooms[roomCode];
    if (!room) return;
    room.votes[socket.id] = votedPlayerId;
    io.to(roomCode).emit("updateVotes", room.votes);

    if (Object.keys(room.votes).length === room.players.length - 1) {
      io.to(roomCode).emit("allVotesIn");
    }
  });

  socket.on("endVote", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;
    const blindPlayer = room.players.find((p) => p.id === room.blindPlayerId);
    const activePlayer = room.players[room.activePlayerIndex];
    const voteCounts = Object.values(room.votes).filter((id) => id === blindPlayer.id).length;

    if (voteCounts <= 1) blindPlayer.score += 5;
    if (voteCounts > 0 && Object.values(room.votes).includes(room.blindPlayerId)) activePlayer.score += 3;

    room.activePlayerIndex = (room.activePlayerIndex + 1) % room.players.length;
    const nextActive = room.players[room.activePlayerIndex];

    io.to(roomCode).emit("voteEnded", { players: room.players, nextActive });
  });

  socket.on("disconnect", () => {
    Object.keys(rooms).forEach((code) => {
      const room = rooms[code];
      if (!room) return;
      room.players = room.players.filter((p) => p.id !== socket.id);
      io.to(code).emit("updatePlayers", room.players);
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
