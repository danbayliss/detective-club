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
  const wordInput = document.getElementById('wordInput');
  const shareWordBtn = document.getElementById('shareWordBtn');
  const revealWordBtn = document.getElementById('revealWordBtn');

  const votePanel = document.getElementById('votePanel');
  const voteButtons = document.getElementById('voteButtons');
  const voteConfirm = document.getElementById('voteConfirm');
  const votedForSpan = document.getElementById('votedFor');

  // --- Lobby buttons ---
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

    // --- Players ---
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

    startGamePanel.style.display = (playerName === state.players[state.creatorId]?.name && state.phase === 'lobby') ? 'flex' : 'none';
    exitBtn.style.display = (state.phase === 'lobby') ? 'block' : 'none';
    activePlayerSpan.textContent = state.players[activeId]?.name || '';

    // --- Reset voted box at new round ---
    voteConfirm.style.display = 'none';

    // --- Word card ---
    if (state.phase === 'wordEntry') {
      wordCard.style.display = 'block';

      if (activeId === selfId) {
        wordInput.style.display = 'block';
        shareWordBtn.style.display = 'block';
        wordDisplay.style.display = 'none';
        revealWordBtn.style.display = 'block';
        wordInput.disabled = !!state.word;
        wordInput.value = state.word || '';
      } else if (state.blindId === selfId) {
        wordInput.style.display = 'none';
        shareWordBtn.style.display = 'none';
        wordDisplay.style.display = 'block';
        wordDisplay.textContent = 'You are the blind player';
        revealWordBtn.style.display = 'none';
      } else {
        wordInput.style.display = 'none';
        shareWordBtn.style.display = 'none';
        wordDisplay.style.display = 'block';
        wordDisplay.textContent = state.word ? `Word: ${state.word}` : 'Waiting for word...';
        revealWordBtn.style.display = 'none';
      }
    } else {
      wordCard.style.display = 'none';
    }

    // --- Voting ---
    if (state.phase === 'voting') {
      votePanel.style.display = 'block';
      voteButtons.innerHTML = '';
      Object.entries(state.players).forEach(([id, player]) => {
        if (id !== activeId && id !== selfId) {
          const btn = document.createElement('button');
          btn.textContent = player.name;
          btn.dataset.id = id;
          voteButtons.appendChild(btn);
        } else if (id !== activeId && id === selfId) {
          // Self vote button
          const btn = document.createElement('button');
          btn.textContent = player.name;
          btn.disabled = true; // prevent voting for self
          voteButtons.appendChild(btn);
        }
      });
    } else votePanel.style.display = 'none';

    // Vote confirm
    if (selfId in state.votes) {
      voteConfirm.style.display = 'block';
      votedForSpan.textContent = state.players[state.votes[selfId]]?.name || '';
      voteButtons.innerHTML = ''; // remove vote buttons after voting
    }

    // --- Final Scores ---
    if (state.phase === 'finished') {
      document.querySelector('#scoresContainer strong').textContent = 'Final Scores';
      // Highlight winners
      const maxScore = Math.max(...Object.values(state.scores));
      scoresList.childNodes.forEach((child, index) => {
        const playerId = Object.keys(state.scores)[index];
        if (state.scores[playerId] === maxScore) {
          child.classList.add('winner');
        }
      });
    }
  }
});
