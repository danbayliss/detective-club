const socket = io();

const nameInput = document.getElementById('nameInput');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const lobby = document.getElementById('lobby');
const roomDiv = document.getElementById('room');
const roomCodeSpan = document.getElementById('roomCode');
const playersDiv = document.getElementById('players');
const startBtn = document.getElementById('startBtn');

let currentRoom = null;

createBtn.onclick = () => {
  const name = nameInput.value.trim();
  if (!name) return alert('Enter name');
  socket.emit('createRoom', { name });
};

joinBtn.onclick = () => {
  const name = nameInput.value.trim();
  const code = roomCodeInput.value.trim();
  if (!name || !code) return alert('Enter name and code');
  socket.emit('joinRoom', { name, code });
};

startBtn.onclick = () => {
  const secretWord = prompt('Enter the secret word:');
  const fakeWord = prompt('Enter the fake word:');
  socket.emit('startGame', { code: currentRoom, secretWord, fakeWord });
};

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

function updatePlayers(state) {
  playersDiv.innerHTML = '<strong>Players:</strong><br>' + Object.values(state.players).map(p => p.name).join('<br>');
}
