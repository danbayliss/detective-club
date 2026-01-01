const socket = io();

// --- Elements ---
const lobby = document.getElementById('lobby');
const roomDiv = document.getElementById('room');
const nameInput = document.getElementById('nameInput');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinError = document.getElementById('joinError');
const roomCodeSpan = document.getElementById('roomCode');
const exitBtn = document.getElementById('exitBtn');

const startGamePanel = document.getElementById('startGamePanel');
const startBtn = document.getElementById('startBtn');
const waitingMsg = document.getElementById('waitingMsg');

const playersListDiv = document.getElementById('playersList');
const scoresListDiv = document.getElementById('scoresList');

const wordCard = document.getElementById('wordCard');
const wordInput = document.getElementById('wordInput');
const shareWordBtn = document.getElementById('shareWordBtn');
const wordDisplay = document.getElementById('wordDisplay');
const startVotingBtn = document.getElementById('startVotingBtn');

const votePanel = document.getElementById('votePanel');
const voteButtonsDiv = document.getElementById('voteButtons');
const voteConfirm = document.getElementById('voteConfirm');
const votedForSpan = document.getElementById('votedFor');

const newGamePanel = document.getElementById('newGamePanel');
const newGameBtn = document.getElementById('newGameBtn');

const confettiCanvas = document.getElementById('confettiCanvas');

let currentRoom = null;
let myId = null;

// --- Lobby buttons ---
createBtn.onclick = () => {
    if (!nameInput.value) return alert('Enter a name');
    socket.emit('createRoom', { name: nameInput.value });
};

joinBtn.onclick = () => {
    if (!nameInput.value || !roomCodeInput.value) return alert('Enter name and room code');
    socket.emit('joinRoom', { name: nameInput.value, code: roomCodeInput.value.toUpperCase() });
};

// --- Exit room ---
exitBtn.onclick = () => {
    if (currentRoom) socket.emit('exitRoom', { code: currentRoom });
};

// --- Socket events ---
socket.on('roomJoined', ({ code, state }) => {
    currentRoom = code;
    myId = socket.id;
    lobby.style.display = 'none';
    roomDiv.style.display = 'flex';
    roomCodeSpan.innerText = code;
    renderRoom(state);
});

socket.on('joinError', msg => {
    joinError.innerText = msg;
});

socket.on('stateUpdate', state => {
    renderRoom(state);
});

// --- Game buttons ---
startBtn.onclick = () => socket.emit('startGame', { code: currentRoom });

shareWordBtn.onclick = () => {
    if (!wordInput.value) return alert('Enter a word');
    socket.emit('submitWord', { code: currentRoom, word: wordInput.value });
};

startVotingBtn.onclick = () => {
    socket.emit('startVoting', { code: currentRoom });
};

newGameBtn.onclick = () => {
    // reset is handled server-side via stateUpdate
    socket.emit('startGame', { code: currentRoom });
};

// --- Render Room ---
function renderRoom(state) {
    // --- Hide/show exit ---
    exitBtn.classList.toggle('hidden', ['wordEntry','voting'].includes(state.phase));

    // --- Start game panel ---
    if (state.phase === 'lobby') {
        startGamePanel.style.display = 'flex';
        const playerCount = Object.keys(state.players).length;
        if (myId === state.creatorId) {
            if (playerCount >= 4) {
                startBtn.style.display = 'inline-block';
                waitingMsg.style.display = 'none';
            } else {
                startBtn.style.display = 'none';
                waitingMsg.style.display = 'block';
                waitingMsg.innerText = `Waiting for minimum number of players (4). Current: ${playerCount}`;
            }
        } else {
            startBtn.style.display = 'none';
            waitingMsg.style.display = 'block';
            waitingMsg.innerText = 'Waiting for game to start...';
        }
    } else startGamePanel.style.display = 'none';

    // --- Players List ---
    playersListDiv.innerHTML = '';
    Object.entries(state.players).forEach(([id, p]) => {
        const div = document.createElement('div');
        div.innerText = p.name;
        if (id === myId) div.classList.add('player-self');
        if (id === state.order[state.currentActiveIndex]) div.classList.add('player-active');
        playersListDiv.appendChild(div);
    });

    // --- Scores ---
    scoresListDiv.innerHTML = '';
    const maxScore = Math.max(...Object.values(state.scores || {0:0}));
    Object.entries(state.scores || {}).forEach(([id, score]) => {
        const div = document.createElement('div');
        div.innerText = `${state.players[id]?.name || 'Unknown'}: ${score} VP`;
        if (id === myId) div.classList.add('self-score');
        if (score === maxScore && state.phase === 'finished') div.classList.add('winner');
        scoresListDiv.appendChild(div);
    });

    // --- Word Card ---
    if (state.phase === 'wordEntry') {
        wordCard.style.display = 'flex';
        wordInput.style.display = (myId === state.order[state.currentActiveIndex]) ? 'inline-block' : 'none';
        shareWordBtn.style.display = (myId === state.order[state.currentActiveIndex] && !state.word) ? 'inline-block' : 'none';
        startVotingBtn.style.display = 'none';
        if (state.word) {
            wordDisplay.innerText = (myId === state.blindId) ? 'You are the blind player' : 'Word: ' + state.word;
        } else wordDisplay.innerText = '';
        votePanel.style.display = 'none';
        voteConfirm.style.display = 'none';
        votedForSpan.innerText = '';
    } else if (state.phase === 'voting') {
        wordCard.style.display = 'flex';
        wordInput.style.display = 'none';
        shareWordBtn.style.display = 'none';
        startVotingBtn.style.display = (myId === state.order[state.currentActiveIndex]) ? 'inline-block' : 'none';
        wordDisplay.innerText = (myId === state.blindId) ? 'You are the blind player' : 'Word: ' + state.word;

        // Voting
        votePanel.style.display = 'flex';
        voteButtonsDiv.innerHTML = '';
        voteConfirm.style.display = 'none';
        votedForSpan.innerText = '';
        if (!state.votes[myId]) {
            Object.entries(state.players).forEach(([id, p]) => {
                if (id !== myId && id !== state.order[state.currentActiveIndex]) {
                    const btn = document.createElement('button');
                    btn.innerText = p.name;
                    btn.onclick = () => {
                        socket.emit('vote', { code: currentRoom, targetId: id });
                        voteButtonsDiv.innerHTML = '';
                        voteConfirm.style.display = 'block';
                        votedForSpan.innerText = p.name;
                    };
                    voteButtonsDiv.appendChild(btn);
                }
            });
        } else {
            voteConfirm.style.display = 'block';
            votedForSpan.innerText = state.players[state.votes[myId]].name;
        }
    } else if (state.phase === 'finished') {
        wordCard.style.display = 'none';
        votePanel.style.display = 'none';
        confetti.start = true;
        launchConfetti();
        newGamePanel.style.display = 'block';
    } else {
        wordCard.style.display = 'none';
        votePanel.style.display = 'none';
        newGamePanel.style.display = 'none';
    }
}

// --- Confetti ---
function launchConfetti() {
    confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
    });
}
