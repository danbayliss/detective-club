const socket = io();

const nameInput = document.getElementById('nameInput');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const lobby = document.getElementById('lobby');
const roomDiv = document.getElementById('room');
const roomCodeSpan = document.getElementById('roomCode');
const playersList = document.getElementById('playersList');
const scoresList = document.getElementById('scoresList');
const activePlayerPanel = document.getElementById('activePlayerPanel');
const wordInputPanel = document.getElementById('wordInputPanel');
const wordInput = document.getElementById('wordInput');
const submitWordBtn = document.getElementById('submitWordBtn');
const revealWordBtn = document.getElementById('revealWordBtn');
const votePanel = document.getElementById('votePanel');
const voteButtons = document.getElementById('voteButtons');
const finalResults = document.getElementById('finalResults');
const startBtn = document.getElementById('startBtn');

let currentRoom = null;
let myName = '';
let myId = null;

// Confetti library
let confettiRunning = false;
function runConfetti() {
  if (confettiRunning) return;
  confettiRunning = true;
  const duration = 3 * 1000;
  const animationEnd = Date.now() + duration;
  const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 1000 };

  const interval = setInterval(function() {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) return clearInterval(interval);
    const particleCount = 50 * (timeLeft / duration);
    confetti(Object.assign({}, defaults, { particleCount, origin: { x: Math.random(), y: Math.random() - 0.2 } }));
  }, 250);
}

// On connect / reconnect
socket.on('connect', () => {
  myId = socket.id;
  const storedRoom = localStorage.getItem('currentRoom');
  const storedName = localStorage.getItem('playerName');
  if (storedRoom && storedName) {
    myName = storedName;
    socket.emit('rejoinRoom', { code: storedRoom, name: storedName });
  }
});

function savePlayerInfo() {
  localStorage.setItem('currentRoom', currentRoom);
  localStorage.setItem('playerName', myName);
}

// Create / Join
createBtn.onclick = () => {
  const name = nameInput.value.trim();
  if (!name) return alert('Enter name');
  myName = name;
  socket.emit('createRoom', { name });
  savePlayerInfo();
};

joinBtn.onclick = () => {
  const name = nameInput.value.trim();
  const code = roomCodeInput.value.trim();
  if (!name || !code) return alert('Enter name and room code');
  myName = name;
  socket.emit('joinRoom', { name, code });
  savePlayerInfo();
};

// Exit room
const exitBtn = document.createElement('button');
exitBtn.textContent = 'Exit Room';
exitBtn.onclick = () => {
  socket.emit('exitRoom', { code: currentRoom });
  lobby.style.display = 'block';
  roomDiv.style.display = 'none';
  currentRoom = null;
  localStorage.removeItem('currentRoom');
  localStorage.removeItem('playerName');
  activePlayerPanel.style.display = 'none';
};
roomDiv.prepend(exitBtn);

// Start game
startBtn.onclick = () => {
  socket.emit('startGame', { code: currentRoom });
};

// Submit word
submitWordBtn.onclick = () => {
  const word = wordInput.value.trim();
  if (!word) return alert('Enter a word');
  socket.emit('submitWord', { code: currentRoom, word });
  wordInput.value = '';
  wordInputPanel.style.display = 'none';
};

// Reveal word
revealWordBtn.onclick = () => {
  socket.emit('revealWord', { code: currentRoom });
  revealWordBtn.style.display = 'none';
};

// Voting
function createVoteButtons(state) {
  voteButtons.innerHTML = '';
  Object.entries(state.players).forEach(([id, p]) => {
    if (id === myId) return;
    const btn = document.createElement('button');
    btn.textContent = p.name;
    btn.onclick = () => {
      socket.emit('voteBlind', { code: currentRoom, votedId: id });
      votePanel.style.display = 'none';
    };
    voteButtons.appendChild(btn);
  });
}

// Update UI with phase transitions
socket.on('stateUpdate', state => {
  currentRoom = state.code || currentRoom;
  roomCodeSpan.textContent = currentRoom;
  lobby.style.display = 'none';
  roomDiv.style.display = 'block';

  // Players
  playersList.innerHTML = '';
  Object.entries(state.players).forEach(([id, p]) => {
    const div = document.createElement('div');
    div.classList.add('player-card');
    if (id === myId) div.classList.add('self');
    if (id === state.currentActiveId) div.classList.add('active');
    div.textContent = p.name;
    playersList.appendChild(div);
  });

  // Scores
  scoresList.innerHTML = '';
  Object.entries(state.scores).forEach(([id, score]) => {
    const div = document.createElement('div');
    div.textContent = `${state.players[id].name}: ${score} VP`;
    scoresList.appendChild(div);
  });

  // Phases
  wordInputPanel.style.display = 'none';
  revealWordBtn.style.display = 'none';
  votePanel.style.display = 'none';
  finalResults.style.display = 'none';
  activePlayerPanel.style.display = 'block';

  if (state.phase === 'wordEntry') {
    activePlayerPanel.textContent = `Active Player: ${state.players[state.currentActiveId].name}`;
    if (state.currentActiveId === myId) {
      wordInputPanel.style.display = 'block';
      revealWordBtn.style.display = 'inline-block';
    }
  } else if (state.phase === 'voting') {
    activePlayerPanel.textContent = `Active Player: ${state.players[state.currentActiveId].name}`;
    votePanel.style.display = 'block';
    createVoteButtons(state);
  } else if (state.phase === 'end') {
    activePlayerPanel.style.display = 'none';
    finalResults.style.display = 'block';
    runConfetti();

    const maxScore = Math.max(...Object.values(state.scores));
    const winners = Object.entries(state.scores)
      .filter(([id, s]) => s === maxScore)
      .map(([id]) => state.players[id].name);

    finalResults.innerHTML = `🏆 Winner(s): ${winners.join(', ')} 🏆<br>`;
    Object.entries(state.scores).forEach(([id, s]) => {
      finalResults.innerHTML += `${state.players[id].name}: ${s} VP<br>`;
    });
  }
});

// Word revealed to blind
socket.on('wordRevealed', word => {
  activePlayerPanel.textContent += ` | Word revealed to blind player: ${word}`;
});

// Room joined / rejoined
socket.on('roomJoined', ({ code, state }) => {
  currentRoom = code;
  roomCodeSpan.textContent = code;
  lobby.style.display = 'none';
  roomDiv.style.display = 'block';
});

socket.on('rejoined', state => {
  lobby.style.display = 'none';
  roomDiv.style.display = 'block';
});
