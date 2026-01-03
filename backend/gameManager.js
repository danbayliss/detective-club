export class GameManager {
  constructor() { this.rooms = {}; }

  generateRoomCode() { return Math.floor(100 + Math.random() * 900).toString(); }

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

  getPlayers(roomCode) { return this.rooms[roomCode]?.players || []; }

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

  submitVote(roomCode, voterName, targetId) {
    const room = this.rooms[roomCode];
    if (!room) return;
    const voter = room.players.find(p => p.name === voterName);
    if (voter) { voter.voted = true; voter.vote = targetId; }
  }

  endVote(roomCode) {
    const room = this.rooms[roomCode];
    if (!room) return;

    const blind = room.players.find(p => p.id === room.blindPlayerId);
    const active = room.players[room.activePlayerIndex];
    const votesForBlind = room.players.filter(p => p.vote === blind.id).length;

    if (active.vote === blind.id) active.score += 3;
    if (votesForBlind <= 1) blind.score += 5;

    // Prepare next round
    room.phase = 'waiting';
    room.word = null;
    room.players.forEach(p => delete p.vote);
    room.activePlayerIndex = (room.activePlayerIndex + 1) % room.players.length;

    if (room.activePlayerIndex === 0) room.phase = 'end';
  }

  removePlayer(socketId) {
    for (const roomCode in this.rooms) {
      const room = this.rooms[roomCode];
      const idx = room.players.findIndex(p => p.id === socketId);
      if (idx !== -1) room.players.splice(idx, 1);
      if (!room.players.length) delete this.rooms[roomCode];
    }
  }

  getGameState(roomCode) { return this.rooms[roomCode]; }
}
