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

// Reveal word to blind player
revealWordBtn.onclick = () => {
  socket.emit('revealWord', { code: currentRoom });
  revealWordBtn.style.display = 'none';
};

// Voting
function createVoteButtons(state) {
  voteButtons.innerHTML = '';
  Object.entries(state.players).forEach(([id, p]) => {
    if (id === myId) return; // skip voting for self
    const btn = document.createElement('button');
    btn.textContent = p.name;
    btn.onclick = () => {
      socket.emit('voteBlind', { code: currentRoom, votedId: id });
      votePanel.style.display = 'none';
    };
    voteButtons.appendChild(btn);
  });
}

// Update UI
socket.on('stateUpdate', state => {
  currentRoom = state.code || currentRoom;
  roomCodeSpan.textContent = currentRoom;
  lobby.style.display = 'none';
  roomDiv.style.display = 'block';
  finalResults.style.display = 'none';

  // Update players
  playersList.innerHTML = '';
  Object.values(
