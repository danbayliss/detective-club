const socket = io();

let currentRoom = null;
let playerName = localStorage.getItem('name') || '';
let savedRoom = localStorage.getItem('room');

const lobby = document.getElementById('lobby');
const roomDiv = document.getElementById('room');
const nameInput = document.getElementById('nameInput');
const roomInput = document.getElementById('roomCodeInput');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const joinError = document.getElementById('joinError');
const roomCodeSpan = document.getElementById('roomCode');
const playersList = document.getElementById('playersList');
const scoresList = document.getElementById('scoresList');
const startBtn = document.getElementById('startBtn');
const exitBtn = document.getElementById('exitBtn');
const activePlayerSpan = document.getElementById('activePlayer');
const wordPanel = document.getElementById('wordInputPanel');
const wordInput = document.getElementById('wordInput');
const submitWordBtn = document.getElementById('submitWordBtn');
const revealWordBtn = document.getElementById('revealWordBtn');
const votePanel = document.getElementById('votePanel');
const voteButtons = document.getElementById('voteButtons');
const finalResults = document.getElementById('finalResults');

// --- Lobby buttons ---
createBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  if (!name) return alert('Enter your name');
  playerName = name;
  localStorage.setItem('name', playerName);
  socket.emit('createRoom', { name });
});

joinBtn.addEventListener('click', () => {
  const name = nameInput.value.trim();
  const code = roomInput.value.trim().toUpperCase();
  if (!name || !code) return alert('Enter name and room code');
  playerName = name;
  localStorage.setItem('name', playerName);
  localStorage.setItem('room', code);
  socket.emit('joinRoom', { name, code });
});

// Exit room
exitBtn.addEventListener('click', () => {
  if(currentRoom) socket.emit('exitRoom', { code: currentRoom });
  localStorage.removeItem('room');
  lobby.style.display = 'block';
  roomDiv.style.display = 'none';
});

// Start game
startBtn.addEventListener('click', () => {
  if(currentRoom) socket.emit('startGame', { code: currentRoom });
});

// Submit word
submitWordBtn.addEventListener('click', () => {
  if(currentRoom && wordInput.value.trim()) {
    socket.emit('submitWord', { code: currentRoom, word: wordInput.value.trim() });
    wordInput.value = '';
  }
});

// Reveal word
revealWordBtn.addEventListener('click', () => {
  if(currentRoom) socket.emit('revealWord', { code: currentRoom });
});

// Voting
votePanel.addEventListener('click', e => {
  if(e.target.dataset.id && currentRoom){
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
  
  // **Fix: Show the room code immediately**
  roomCodeSpan.textContent = code;

  renderRoom(state);
});

socket.on('stateUpdate', state => {
  currentRoom = state.code || currentRoom;
  roomCodeSpan.textContent = currentRoom;
  renderRoom(state);
});

// --- Rendering ---
function renderRoom(state){
  // Players
  playersList.innerHTML = '';
  Object.entries(state.players).forEach(([id, player])=>{
    const div = document.createElement('div');
    div.textContent = player.name + (id===state.blindId?' (Blind)':'');
    playersList.appendChild(div);
  });

  // Scores
  scoresList.innerHTML = '';
  Object.entries(state.scores).forEach(([id, score])=>{
    const div = document.createElement('div');
    div.textContent = `${state.players[id]?.name || id}: ${score} VP`;
    scoresList.appendChild(div);
  });

  // Start button
  startBtn.style.display = (playerName===state.players[state.creatorId]?.name && state.phase==='lobby')?'block':'none';

  // Active player
  const activeId = state.order[state.currentActiveIndex];
  activePlayerSpan.textContent = state.players[activeId]?.name || '';

  // Word panel
  if(activeId===Object.keys(state.players).find(k=>state.players[k].name===playerName) && state.phase==='wordEntry'){
    wordPanel.style.display='block';
    revealWordBtn.style.display='block';
  } else {
    wordPanel.style.display='none';
  }

  // Voting panel
  if(state.phase==='voting'){
    votePanel.style.display='block';
    voteButtons.innerHTML='';
    Object.entries(state.players).forEach(([id, player])=>{
      const btn = document.createElement('button');
      btn.textContent = player.name;
      btn.dataset.id = id;
      voteButtons.appendChild(btn);
    });
  } else {
    votePanel.style.display='none';
  }

  // Final results
  if(state.phase==='finished'){
    finalResults.style.display='block';
    finalResults.innerHTML='<h2>Final Scores</h2>';
    Object.entries(state.scores).forEach(([id, score])=>{
      const div = document.createElement('div');
      div.textContent = `${state.players[id]?.name || id}: ${score} VP`;
      finalResults.appendChild(div);
    });
    confetti();
  } else {
    finalResults.style.display='none';
  }
}

// --- Confetti ---
function confetti(){
  const duration = 5 * 1000;
  const end = Date.now() + duration;
  (function frame(){
    confettiLib({
      particleCount: 3,
      angle: 60,
      spread: 55,
      origin: { x: 0 }
    });
    confettiLib({
      particleCount: 3,
      angle: 120,
      spread: 55,
      origin: { x: 1 }
    });
    if(Date.now()<end){
      requestAnimationFrame(frame);
    }
  })();
}
const confettiLib = window.confetti;
