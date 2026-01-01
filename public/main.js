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
createBtn.onclick = ()=>{
  const name=nameInput.value.trim(); if(!name) return alert('Enter name'); playerName=name; localStorage.setItem('name',name); socket.emit('createRoom',{name});
};
joinBtn.onclick = ()=>{
  const name=nameInput.value.trim(); const code=roomInput.value.trim().toUpperCase(); if(!name||!code) return alert('Enter name+code'); playerName=name; localStorage.setItem('name',name); localStorage.setItem('room',code); socket.emit('joinRoom',{name,code});
};
exitBtn.onclick = ()=>{
  if(currentRoom) socket.emit('exitRoom',{code:currentRoom});
  localStorage.removeItem('room');
  lobby.style.display='block';
  roomDiv.style.display='none';
};

// Start game
startBtn.onclick = ()=>{ if(currentRoom) socket.emit('startGame',{code:currentRoom}); };

// Reveal word
revealWordBtn.onclick = ()=>{ if(currentRoom) socket.emit('revealWord',{code:currentRoom}); };

// Voting
votePanel.onclick = e=>{
  if(e.target.dataset.id && currentRoom){
    socket.emit('vote',{code:currentRoom,targetId:e.target.dataset.id});
  }
};

// --- Socket ---
socket.on('joinError', msg=>joinError.textContent=msg);
socket.on('roomJoined', ({code,state})=>{
  currentRoom=code;
  localStorage.setItem('room',code);
  lobby.style.display='none';
  roomDiv.style.display='block';
  roomCodeSpan.textContent=code;
  renderRoom(state);
});
socket.on('stateUpdate', state=>{
  currentRoom=state.code||currentRoom;
  roomCodeSpan.textContent=state.code;
  renderRoom(state);
});

// --- Render ---
function renderRoom(state){
  const selfId=Object.keys(state.players).find(k=>state.players[k].name===playerName);
  const activeId=state.order[state.currentActiveIndex];

  // Players
  playersList.innerHTML='';
  Object.entries(state.players).forEach(([id,player])=>{
    const div=document.createElement('div');
    div.textContent=player.name;
    if(id===selfId) div.classList.add('player-self');
    if(id===activeId) div.classList.add('player-active');
    playersList.appendChild(div);
  });

  // Scores
  scoresList.innerHTML='';
  Object.entries(state.scores).forEach(([id,score])=>{
    const div=document.createElement('div');
    div.textContent=`${state.players[id]?.name||id}: ${score} VP`;
    if(id===selfId) div.classList.add('player-self');
    scoresList.appendChild(div);
  });

  // Start button panel
  startGamePanel.style.display=(playerName===state.players[state.creatorId]?.name && state.phase==='lobby')?'flex':'none';

  // Exit button
  exitBtn.style.display=(state.phase==='lobby')?'block':'none';

  // Active player
  activePlayerSpan.textContent=state.players[activeId]?.name||'';

  // Word card
  if(state.phase==='wordEntry'){
    if(activeId===selfId){
      wordCard.style.display='block';
      wordDisplay.textContent=state.word || 'Enter your word';
      revealWordBtn.style.display='block';
    } else if(state.blindId===selfId){
      wordCard.style.display='block';
      wordDisplay.textContent='You are the blind player';
      revealWordBtn.style.display='none';
    } else {
      wordCard.style.display='block';
      wordDisplay.textContent=state.word || '';
      revealWordBtn.style.display='none';
    }
  } else wordCard.style.display='none';

  // Voting
  if(state.phase==='voting'){
    votePanel.style.display='block';
    voteButtons.innerHTML='';
    Object.entries(state.players).forEach(([id,player])=>{
      if(id!==activeId){
        const btn=document.createElement('button');
        btn.textContent=player.name;
        btn.dataset.id=id;
        voteButtons.appendChild(btn);
      }
    });
  } else votePanel.style.display='none';

  // Vote confirm
  if(selfId in state.votes){
    voteConfirm.style.display='block';
    votedForSpan.textContent=state.players[state.votes[selfId]]?.name||'';
  } else voteConfirm.style.display='none';

  // Final results
  if(state.phase==='finished'){
    finalResults.style.display='block';
    finalResults.innerHTML='<h2>Final Scores</h2>';
    Object.entries(state.scores).forEach(([id,score])=>{
      const div=document.createElement('div');
      div.textContent=`${state.players[id]?.name||id}: ${score} VP`;
      finalResults.appendChild(div);
    });
    confetti();
  } else finalResults.style.display='none';
}

// Confetti
function confetti(){
