const socket = io();

// DOM elements
const lobby = document.getElementById('lobby');
const nameInput = document.getElementById('nameInput');
const createBtn = document.getElementById('createBtn');
const joinBtn = document.getElementById('joinBtn');
const roomCodeInput = document.getElementById('roomCodeInput');
const joinError = document.getElementById('joinError');

const roomDiv = document.getElementById('room');
const roomCodeSpan = document.getElementById('roomCode');
const exitBtn = document.getElementById('exitBtn');

const playersTable = document.getElementById('playersTable');
const startGamePanel = document.getElementById('startGamePanel');
const startBtn = document.getElementById('startBtn');
const waitingMsg = document.getElementById('waitingMsg');

const wordCard = document.getElementById('wordCard');
const wordInput = document.getElementById('wordInput');
const shareWordBtn = document.getElementById('shareWordBtn');
const wordDisplay = document.getElementById('wordDisplay');
const startVotingBtn = document.getElementById('startVotingBtn');

const votePanel = document.getElementById('votePanel');
const voteButtons = document.getElementById('voteButtons');
const votedForSpan = document.getElementById('votedFor');

const newGamePanel = document.getElementById('newGamePanel');
const newGameBtn = document.getElementById('newGameBtn');

const confettiCanvas = document.getElementById('confettiCanvas');

// Local state
let playerName = '';
let roomCode = '';
let gameStarted = false;

// ------------------- Lobby -------------------

createBtn.onclick = () => {
    const name = nameInput.value.trim();
    if (!name) return joinError.innerText = 'Enter a name';
    playerName = name;
    socket.emit('createRoom', name);
};

joinBtn.onclick = () => {
    const name = nameInput.value.trim();
    const code = roomCodeInput.value.trim();
    if (!name || !code) return joinError.innerText = 'Enter name and room code';
    playerName = name;
    roomCode = code;
    socket.emit('joinRoom', { name, code });
};

exitBtn.onclick = () => {
    socket.emit('exitRoom');
    resetUI();
};

// ------------------- Socket Events -------------------

socket.on('roomCreated', code => {
    roomCode = code;
    lobby.style.display = 'none';
    roomDiv.style.display = 'block';
    roomCodeSpan.innerText = code;
    waitingMsg.innerText = 'Waiting for minimum number of players...';
});

socket.on('roomJoined', code => {
    roomCode = code;
    lobby.style.display = 'none';
    roomDiv.style.display = 'block';
    roomCodeSpan.innerText = code;
    waitingMsg.innerText = 'Waiting for game to start...';
});

socket.on('updatePlayers', players => {
    updatePlayersTable(players);
    // Show start button to room creator if min 4 players
    const creator = players.find(p => p.creator);
    if (playerName === creator?.name && players.length >= 4 && !gameStarted) {
        startBtn.style.display = 'block';
        waitingMsg.innerText = '';
    } else if (!gameStarted) {
        startBtn.style.display = 'none';
        waitingMsg.innerText = 'Waiting for game to start...';
    }
});

socket.on('gameStarted', () => {
    gameStarted = true;
    startGamePanel.style.display = 'none';
    wordCard.style.display = 'block';
    exitBtn.classList.add('hidden');
});

socket.on('wordShared', data => {
    if (data.blindPlayer === playerName) {
        wordDisplay.innerText = 'You are the blind player';
    } else {
        wordDisplay.innerText = 'Word: ' + data.word;
    }
    wordInput.style.display = 'none';
    shareWordBtn.style.display = 'none';
    if (data.activePlayer === playerName) {
        startVotingBtn.style.display = 'block';
    }
});

socket.on('startVoting', players => {
    votePanel.style.display = 'block';
    voteButtons.innerHTML = '';
    votedForSpan.innerText = '';
    players.forEach(p => {
        if (p.name !== playerName) {
            const btn = document.createElement('button');
            btn.innerText = p.name;
            btn.onclick = () => {
                socket.emit('vote', p.name);
                voteButtons.innerHTML = '';
                votedForSpan.innerText = p.name;
            };
            voteButtons.appendChild(btn);
        }
    });
});

socket.on('updateScores', players => {
    updatePlayersTable(players);
});

socket.on('gameEnded', winners => {
    // Highlight winners and show confetti
    updatePlayersTable(winners);
    confettiBrowser();
    newGamePanel.style.display = 'block';
    wordCard.style.display = 'none';
    votePanel.style.display = 'none';
});

// ------------------- UI Updates -------------------

startBtn.onclick = () => socket.emit('startGame');

shareWordBtn.onclick = () => {
    const word = wordInput.value.trim();
    if (!word) return;
    socket.emit('shareWord', word);
};

startVotingBtn.onclick = () => {
    socket.emit('startVoting');
    startVotingBtn.style.display = 'none';
};

newGameBtn.onclick = () => {
    socket.emit('newGame');
    resetUI();
};

// ------------------- Helper Functions -------------------

function updatePlayersTable(players) {
    playersTable.innerHTML = '';
    players.forEach(p => {
        const row = document.createElement('div');
        row.classList.add('playerRow');
        if (p.name === playerName) row.classList.add('player-self');
        if (p.active) row.classList.add('player-active');
        if (p.winner) row.classList.add('winner');

        const nameDiv = document.createElement('div');
        nameDiv.classList.add('playerName');
        nameDiv.innerText = p.name;

        const scoreDiv = document.createElement('div');
        scoreDiv.classList.add('playerScore');
        if (p.name === playerName) scoreDiv.classList.add('self-score');
        scoreDiv.innerText = p.score + ' VP';

        row.appendChild(nameDiv);
        row.appendChild(scoreDiv);
        playersTable.appendChild(row);
    });
}

function resetUI() {
    lobby.style.display = 'block';
    roomDiv.style.display = 'none';
    startGamePanel.style.display = 'block';
    waitingMsg.innerText = '';
    wordCard.style.display = 'none';
    wordInput.style.display = 'block';
    shareWordBtn.style.display = 'inline-block';
    startVotingBtn.style.display = 'none';
    votePanel.style.display = 'none';
    newGamePanel.style.display = 'none';
    exitBtn.classList.remove('hidden');
    playerName = '';
    roomCode = '';
    gameStarted = false;
    playersTable.innerHTML = '';
    wordDisplay.innerText = '';
    votedForSpan.innerText = '';
}

// ------------------- Confetti -------------------
function confettiBrowser() {
    const confettiSettings = { particleCount: 150, spread: 70, origin: { y: 0.6 } };
    confetti.create(confettiCanvas, { resize: true })({...confettiSettings});
}
