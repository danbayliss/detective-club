document.addEventListener('DOMContentLoaded', () => {

  const socket = io();
  let currentRoom = localStorage.getItem('room') || null;
  let playerName = localStorage.getItem('name') || '';

  const lobby = document.getElementById('lobby');
  const roomDiv = document.getElementById('room');
  const startGamePanel = document.getElementById('startGamePanel');
  const startBtn = document.getElementById('startBtn');
  const exitBtn = document.getElementById('exitBtn');
  const createBtn = document.getElementById('createBtn');
  const joinBtn = document.getElementById('joinBtn');
  const nameInput = document.getElementById('nameInput');
  const roomInput = document.getElementById('roomCodeInput');
  const joinError = document.getElementById('joinError');
  const roomCodeSpan = document.getElementById('roomCode');
  const playersList = document.getElementById('playersList');
  const scoresList = document.getElementById('scoresList');
  const activePlayerSpan = document.getElementById('activePlayer');
  const wordCard = document.getElementById('wordCard');
  const wordDisplay = document.getElementById('wordDisplay');
  const revealWordBtn = document.getElementById('revealWordBtn');
  const votePanel = document.getElementById('votePanel');
  const voteButtons = document.getElementById('voteButtons');
  const voteConfirm = document.getElementById('voteConfirm');
  const votedForSpan = document.getElementById('votedFor');
  const finalResults = document.getElementById('finalResults');

  // --- Lobby ---
  createBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return alert('Enter your name');
    playerName = name;
    localStorage.setItem('name', name);
    socket.emit('createRoom', { name });
  });

  joinBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    const code = roomInput.value.trim().toUpperCase();
    if (!name || !code) return alert('Enter name + room code');
    playerName = name;
    localStorage.setItem('name', name);
    localStorage.setItem('room', code);
    socket.emit('joinRoom', { name, code });
  });

  exitBtn.addEventListener('click', () => {
    if (currentRoom) socket.emit('exitRoom', { code: currentRoom });
    localStorage.removeItem('room');
    lobby.style.display = 'block';
    roomDiv.style.display = 'none';
  });

  // Start game
  startBtn.addEventListener('click', () => {
    if (currentRoom) socket.emit('startGame', { code: currentRoom });
  });

  // Reveal word
  revealWordBtn.addEventListener('click', () => {
    if (currentRoom) socket.emit('revealWord', { code: currentRoom });
  });

  // Voting
  votePanel.addEventListener('click', e => {
    if (e.target.dataset.id && currentRoom) {
      socket.emit('vote', { code: currentRoom, targetId: e.target.dataset.id });
    }
  });

  // --- Socket events ---
  socket.on('joinError', msg => joinError.textContent = msg);

  socket.on('roomJoined', ({ code, state }) => {
    currentRoom = code;
    localStorage.setItem('room', code);
    lobby.style.display = 'none';
    roomDiv.style.display = 'block';
    roomCodeSpan.textContent = code;
    renderRoom(state);
  });

  socket.on('stateUpdate', state => {
    currentRoom = state.code || currentRoom;
    roomCodeSpan.textContent = state.code;
    renderRoom(state);
  });

  // --- Render Room Function (same as before) ---
  function renderRoom(state) {
    // your existing renderRoom code here
  }

  function confetti() {
    const duration = 5 * 1000;
    const end = Date.now() + duration;
    (function frame() {
      confettiLib({ particleCount: 3, angle: 60, spread: 55, origin: { x: 0 } });
      confettiLib({ particleCount: 3, angle: 120, spread: 55, origin: { x: 1 } });
      if (Date.now() < end) requestAnimationFrame(frame);
    })();
  }
  const confettiLib = window.confetti;

});
