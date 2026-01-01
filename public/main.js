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

// Create Room
createBtn.onclick = () => {
  const name = nameInput.value.trim();
  if (!name) return alert('Enter name');
  myName = name;
  socket.emit('createRoom', { name });
};

// Join Room
joinBtn.onclick = () => {
  const name = nameInput.value.trim();
  const code = roomCodeInput.value.trim();
  if (!name || !code) return alert('Enter name and room code');
  myName = name;
  socket.emit('joinRoom', { name, code });
};

// Start Game (only ask for secret word)
startBtn.onclick = () => {
  const secretWord = prompt('Enter the secret word:');
  if (!secretWord) return alert('Secret word is required');
  socket.emit('startGame', { code: currentRoom, secretWord });
};

// Server confirms join
socket.on('roomJoined', ({ code, state }) => {
  currentRoom = code;
  roomCodeSpan.textContent = code;
  lobby.style.display = 'none';
  roomDiv.style.display = 'block';
  updatePlayers(state);
});

// Update room state
socket.on('stateUpdate', state => {
  updatePlayers(state);
});

// Show roles
socket.on('yourRole', ({ isDetective, isBlind, word }) => {
  let msg = '';
  if (isDetective) {
    msg = 'You are the Detective!';
  } else if (isBlind) {
    msg = 'You are the blind player — you don’t know the word.';
  } else {
    msg = `Your word is: ${word}`;
  }
  alert(msg);
});

// Update player cards
function updatePlayers(state) {
  if (roomDiv.style.display === 'none') {
    lobby.style.display = 'none';
    roomDiv.style.display = 'block';
    roomCodeSpan.textContent = currentRoom;
  }

  playersList.innerHTML = '';
  Object.values(state.players).forEach(p => {
    const div = document.createElement('div');
    div.classList.add('player-card');
    if (p.name === myName) div.classList.add('self');
    div.textContent = p.name;
    playersList.appendChild(div);
  });
}
