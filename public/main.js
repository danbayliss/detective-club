document.addEventListener('DOMContentLoaded', () => {
  const socket = io();
  let currentRoom = localStorage.getItem('room') || null;
  let playerName = localStorage.getItem('name') || '';

  // DOM elements
  const lobby = document.getElementById('lobby');
  const roomDiv = document.getElementById('room');
  const startGamePanel = document.getElementById('startGamePanel');
  const startBtn = document.getElementById('startBtn');
  const waitingMsg = document.getElementById('waitingMsg');
  const exitBtn = document.getElementById('exitBtn');
  const createBtn = document.getElementById('createBtn');
  const joinBtn = document.getElementById('joinBtn');
  const nameInput = document.getElementById('nameInput');
  const roomInput = document.getElementById('roomCodeInput');
  const joinError = document.getElementById('joinError');
  const roomCodeSpan = document.getElementById('roomCode');
  const playersList = document.getElementById('playersList');
  const scoresList = document.getElementById('scoresList');

  const wordCard = document.getElementById('wordCard');
  const wordDisplay = document.getElementById('wordDisplay');
  const wordInput = document.getElementById('wordInput');
  const shareWordBtn = document.getElementById('shareWordBtn');
  const revealWordBtn = document.getElementById('revealWordBtn');

  const votePanel = document.getElementById('votePanel');
  const voteButtons = document.getElementById('voteButtons');
  const votePrompt = document.getElementById('votePrompt');
  const voteConfirm = document.getElementById('voteConfirm');
  const votedForSpan = document.getElementById('votedFor');

  const confettiCanvas = document.getElementById('confettiCanvas');

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

  startBtn.addEventListener('click', () => {
    if (currentRoom) socket.emit('startGame', { code: currentRoom });
  });

  shareWordBtn.addEventListener('click', () => {
    const word = wordInput.value.trim();
    if (!word) return;
    socket.emit('submitWord', { code: currentRoom, word });
    wordDisplay.textContent = `Word shared: ${word}`;
    wordInput.disabled = true;
    shareWordBtn.style.display = 'none';
  });

  revealWordBtn.addEventListener('click', () => {
    if (currentRoom) socket.emit('revealWord', { code: currentRoom });
  });

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

  function renderRoom(state) {
    const selfId = Object.keys(state.players).find(k => state.players[k].name === playerName);
    const activeId = state.order[state.currentActiveIndex];

    // --- Players list ---
    playersList.innerHTML = '';
    Object.entries(state.players).forEach(([id, player]) => {
      const div = document.createElement('div');
      div.textContent = player.name;
      if (id === selfId) div.classList.add('player-self');
      if (id === activeId) div.classList.add('player-active');
      playersList.appendChild(div);
    });

    // --- Scores ---
    scoresList.innerHTML = '';
    Object.entries(state.scores).forEach(([id, score]) => {
      const div = document.createElement('div');
      div.textContent = `${state.players[id]?.name || id}: ${score} VP`;
      scoresList.appendChild(div);
    });

    // Start game button & waiting messages
    if (playerName === state.players[state.creatorId]?.name) {
      if (Object.keys(state.players).length >= 4 && state.phase === 'lobby') {
        startGamePanel.style.display = 'flex';
        waitingMsg.style.display = 'none';
      } else {
        startGamePanel.style.display = 'flex';
        startBtn.style.display = 'none';
        waitingMsg.style.display = 'block';
        waitingMsg.textContent = 'Waiting for minimum number of players...';
      }
    } else {
      startGamePanel.style.display = 'none';
    }

    if (state.phase === 'lobby' && playerName !== state.players[state.creatorId]?.name) {
      waitingMsg.style.display = 'block';
      waitingMsg.textContent = 'Waiting for the game to start...';
    }

    // --- Word card ---
    if (state.phase === 'wordEntry') {
      wordCard.style.display = 'block';
      voteConfirm.style.display = 'none';
      votePanel.style.display = 'none';

      if (activeId === selfId) {
        wordInput.style.display = 'block';
        shareWordBtn.style.display = 'block';
        revealWordBtn.style.display = 'block';
        wordInput.disabled = !!state.word;
        wordInput.value = state.word || '';
        wordDisplay.style.display = state.word ? 'block' : 'none';
      } else if (state.blindId === selfId) {
        wordInput.style.display = 'none';
        shareWordBtn.style.display = 'none';
        revealWordBtn.style.display = 'none';
        wordDisplay.style.display = 'block';
        wordDisplay.textContent = 'You are the blind player';
      } else {
        wordInput.style.display = 'none';
        shareWordBtn.style.display = 'none';
        revealWordBtn.style.display = 'none';
        wordDisplay.style.display = 'block';
        wordDisplay.textContent = state.word ? `Word: ${state.word}` : 'Waiting for word...';
      }
    } else wordCard.style.display = 'none';
  }
});
