const socket = io();

const nameInput = document.getElementById('nameInput');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const lobby = document.getElementById('lobby');
const roomDiv = document.getElementById('room');
const roomCodeSpan = document.getElementById('roomCode');
const playersList = document.getElementById('playersList');
const startBtn = document.getElementById('startBtn');

let currentRoom = null;
let myName = '';
let myId = null;

// On connect
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

// Exit room button
const exitBtn = document.createElement('button');
exitBtn.textContent = 'Exit Room';
exitBtn.onclick = () => {
  socket.emit('exitRoom', { code: currentRoom });
  lobby.style.display = 'block';
  roomDiv.style.display = 'none';
  currentRoom = null;
  localStorage.removeItem('currentRoom');
  localStorage.removeItem('playerName');
};
roomDiv.prepend(exitBtn);

// Start game (host picks secret word)
startBtn.onclick = () => {
  const secretWord = prompt('Enter the secret word:');
  if (!secretWord) return alert('Secret word is required');
  socket.emit('startGame', { code: currentRoom, secretWord, pickerId: myId });
};

// Reveal word (detective)
function revealWord() {
  socket.emit('revealWord', { code: currentRoom });
}

// Role assignment
socket.on('yourRole', ({ isDetective, isBlind, word }) => {
  if (isDetective) {
    alert('You are the Detective! Click reveal when ready.');
  } else if (isBlind) {
    alert('You are the blind player — you don’t know the word.');
  } else {
    alert(`Your word is: ${word}`);
  }
});

// Word revealed
socket.on('wordRevealed', (word) => {
  alert(`The secret word is: ${word}`);
});

// Room joined / rejoined
socket.on('roomJoined', ({ code, state }) => {
  currentRoom = code;
  roomCodeSpan.textContent = code;
  lobby.style.display = 'none';
  roomDiv.style.display = 'block';
  updatePlayers(state);
});

socket.on('stateUpdate', state => {
  updatePlayers(state);
});

socket.on('rejoined', (state) => {
  lobby.style.display = 'none';
  roomDiv.style.display = 'block';
  updatePlayers(state);
});

// Update player cards
function updatePlayers(state) {
  if (!currentRoom) currentRoom = Object.keys(state.players).includes(myId) ? currentRoom : null;
  playersList.innerHTML = '';
  Object.values(state.players).forEach(p => {
    const div = document.createElement('div');
    div.classList.add('player-card');
    if (p.name === myName) div.classList.add('self');
    div.textContent = p.name;
    playersList.appendChild(div);
  });
}
