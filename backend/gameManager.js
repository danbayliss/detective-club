export class GameManager {
  constructor() {
    this.rooms = {};
  }

  generateRoomCode() {
    return Math.floor(100 + Math.random() * 900).toString();
  }

  createRoom(hostName, socketId) {
    const roomCode = this.generateRoomCode();
    this.rooms[roomCode] = {
      host: socketId,
      players: [{ id: socketId, name: hostName, score: 0, voted: false }],
      activePlayerIndex: 0,
      blindPlayerId: null,
      word: null,
      phase: 'waiting',
    };
    return roomCode;
  }

  joinRoom(name, roomCode, socketId) {
    const room = this.rooms[roomCode];
    if (!room) return { error: 'Room not found' };
    if (room.players.find(p => p.name === name)) return { error: 'Name already exists' };
    room.players.push({ id: socketId, name, score: 0, voted: false });
    return { success: true };
  }

  getPlayers(roomCode) {
    const room = this.rooms[roomCode];
    return room ? room.players : [];
  }

  startGame(roomCode) {
    const room = this.rooms[roomCode];
    if (!room) return;
    room.phase = 'enterWord';
    room.activePlayerIndex = 0;
    room.blindPlayerId = room.players[Math.floor(Math.random() * room.players.length)].id;
  }

  shareWord(roomCode, word) {
    const room = this.rooms[roomCode];
    if (!room) return;
    room.word = word;
    room.phase = 'discussion';
  }

  startVoting(roomCode) {
    const room = this.rooms[roomCode];
    if (!room) return;
    room.phase = 'voting';
    room.players.forEach(p => p.voted = false);
  }

  submitVote(roomCode, voterId, targetId) {
    const room = this.rooms[roomCode];
    if (!room) return;
    const voter = room.players.find(p => p.id === voterId);
    if (voter) voter.voted = true;
    voter.vote = targetId;
  }

  endVote(roomCode) {
    const room = this.rooms[roomCode];
    if (!room) return;

    const blind = room.players.find(p => p.id === room.blindPlayerId);
    const voteCounts = room.players.reduce((acc, p) => {
      if (p.vote === blind.id) acc++;
      return acc;
    }, 0);

    const activePlayer = room.players[room.activePlayerIndex];
    if (voteCounts === 1 || voteCounts === 0) blind.score += 5;
    if (activePlayer.vote === blind.id) activePlayer.score += 3;

    // reset for next round
    room.phase = 'waiting';
    room.word = null;
    room.players.forEach(p => delete p.vote);
    room.activePlayerIndex = (room.activePlayerIndex + 1) % room.players.length;
  }

  getGameState(roomCode) {
    return this.rooms[roomCode];
  }

  removePlayer(socketId) {
    for (const roomCode in this.rooms) {
      const room = this.rooms[roomCode];
      const index = room.players.findIndex(p => p.id === socketId);
      if (index !== -1) room.players.splice(index, 1);
      if (room.players.length === 0) delete this.rooms[roomCode];
    }
  }

  getAllRooms() {
    return Object.keys(this.rooms);
  }
}
