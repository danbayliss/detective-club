import { useState } from 'react';
import { io } from 'socket.io-client';
import Lobby from './components/Lobby';
import Game from './components/Game';

const socket = io(import.meta.env.VITE_SERVER_URL || 'http://localhost:5000');

function App() {
  const [player, setPlayer] = useState(null);
  const [roomCode, setRoomCode] = useState(null);
  const [gameState, setGameState] = useState(null);

  socket.on('updatePlayers', players => setGameState(prev => ({ ...prev, players })));
  socket.on('gameStarted', state => setGameState(state));
  socket.on('wordShared', state => setGameState(state));
  socket.on('votingStarted', state => setGameState(state));
  socket.on('voteUpdate', state => setGameState(state));
  socket.on('voteEnded', state => setGameState(state));

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      <h1 className="text-4xl font-bold mb-6 text-center">Detective Club</h1>
      {!player ? 
        <Lobby socket={socket} setPlayer={setPlayer} setRoomCode={setRoomCode} /> : 
        <Game socket={socket} player={player} roomCode={roomCode} gameState={gameState} />}
    </div>
  );
}

export default App;
