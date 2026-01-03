import express from "express";
import http from "http";
import { Server } from "socket.io";
import { nanoid } from "nanoid";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const rooms = {};

// Serve React frontend
app.use(express.static(path.join(__dirname, "client", "build")));
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client", "build", "index.html"));
});

// Socket.io logic (create/join room, share word, voting, scoring)
io.on("connection", (socket) => {
  console.log("User connected", socket.id);

  socket.on("createRoom", ({ name }) => {
    const roomCode = nanoid(6).toUpperCase();
    rooms[roomCode] = {
      players: [{ id: socket.id, name, score: 0 }],
      host: socket.id,
      activePlayerIndex: 0,
      blindPlayer: null,
      votes: {},
      state: "waiting"
    };
    socket.join(roomCode);
    socket.emit("roomJoined", { roomCode, host: true, players: rooms[roomCode].players });
  });

  socket.on("joinRoom", ({ name, roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return socket.emit("errorMessage", "Room does not exist");
    if (room.players.some(p => p.name === name)) return socket.emit("errorMessage", "Name already exists");
    room.players.push({ id: socket.id, name, score: 0 });
    socket.join(roomCode);
    io.to(roomCode).emit("updatePlayers", room.players);
  });

  socket.on("startGame", ({ roomCode }) => {
    const room = rooms[roomCode];
    if (!room) return;
    room.state = "active";
    const activePlayer = room.players[room.activePlayerIndex];
    io.to(roomCode).emit("gameStarted", { activePlayer });
  });

  socket.on("shareWord", ({ roomCode, word }) => {
    const room = rooms[roomCode];
    if (!room) return;
    const activePlayer = room.players[room.activePlayerIndex];
    const blindPlayer = room.players[Math.floor(Math.random() * room.players.length)];
    room.blindPlayer = blindPlayer;
    io.to(roomCode).emit("wordShared", {
      word,
      blindPlayerId: blindPlayer.id,
      activePlayerId: activePlayer.id
    });
  });

  socket.on("startVoting", ({ roomCode }) => {
    const room = rooms[roomCode];
    io.to(roomCode).emit("votingStarted", room.players.filter(p => p.id !== room.players[room.activePlayerIndex].id));
  });

  socket.on("submitVote", ({ roomCode, votedPlayerId }) => {
    const room = rooms[roomCode];
    room.votes[socket.id] = votedPlayerId;
    io.to(roomCode).emit("updateVotes", room.votes);
    if (Object.keys(room.votes).length === room.players.length - 1) {
      io.to(roomCode).emit("allVotesIn");
    }
  });

  socket.on("endVote", ({ roomCode }) => {
    const room = rooms[roomCode];
    const blindId = room.blindPlayer.id;
    const blindVotes = Object.values(room.votes).filter(v => v === blindId).length;

    if (blindVotes <= 1) {
      const blindPlayer = room.players.find(p => p.id === blindId);
      if (blindPlayer) blindPlayer.score += 5;
    }

    for (const [voterId, votedId] of Object.entries(room.votes)) {
      if (votedId === blindId) {
        const player = room.players.find(p => p.id === voterId);
        if (player) player.score += 3;
      }
    }

    room.votes = {};
    room.activePlayerIndex = (room.activePlayerIndex + 1) % room.players.length;
    io.to(roomCode).emit("voteEnded", {
      players: room.players,
      nextActive: room.players[room.activePlayerIndex]
    });
  });

  socket.on("disconnect", () => {
    for (const roomCode in rooms) {
      const room = rooms[roomCode];
      room.players = room.players.filter(p => p.id !== socket.id);
      if (!room.players.length) delete rooms[roomCode];
      else io.to(roomCode).emit("updatePlayers", room.players);
    }
  });
});

server.listen(process.env.PORT || 3000, () => console.log("Server running"));
