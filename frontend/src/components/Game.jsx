import { useState, useEffect } from 'react';
import PlayerList from './PlayerList';
import Scoreboard from './Scoreboard';
import Messages from './Messages';
import Confetti from 'react-confetti';

export default function Game({ socket, player, roomCode, gameState }) {
  const [wordInput, setWordInput] = useState('');
  const [messages, setMessages] = useState([]);
  const [localGameState, setLocalGameState] = useState(gameState);

  useEffect(() => {
    if (gameState) setLocalGameState(gameState);
  }, [gameState]);

  const isHost = localGameState?.players[0]?.name === player;
  const activePlayer = localGameState?.players[localGameState.activePlayerIndex];

  const handleStartGame = () => socket.emit('startGame', { roomCode });
  const handleShareWord = () => {
    socket.emit('shareWord', { roomCode, word: wordInput });
    setMessages(prev => [...prev, 'Word shared']);
  };
  const handleStartVoting = () => socket.emit('startVoting', { roomCode });
  const handleVote = targetId => socket.emit('vote', { roomCode, voter: player, target: targetId });
  const handleEndVote = () => socket.emit('endVote', { roomCode });

  if (!localGameState) return null;

  const blindPlayer = localGameState.players.find(p => p.id === localGameState.blindPlayerId);

  // Messages based on phase
  let phaseMessage = 'Waiting for minimum player count to join';
  if (localGameState.players.length >= 4) {
    if (localGameState.phase === 'waiting') phaseMessage = isHost ? 'Start game when ready' : 'Waiting for host to start the game';
    if (localGameState.phase === 'enterWord') phaseMessage = activePlayer.name === player ? 'Enter a word' : 'Waiting for word';
    if (localGameState.phase === 'discussion') phaseMessage = activePlayer.name === player ? 'Start voting when ready' : (blindPlayer.name === player ? 'You are the blind player' : `Word: ${localGameState.word}`);
    if (localGameState.phase === 'voting') phaseMessage = 'Vote for who you think is the blind player';
  }

  const votingActive = localGameState.phase === 'voting';

  return (
    <div className="w-full max-w-4xl flex flex-col items-center space-y-4">
      <p className="text-xl font-bold">Room Code: {roomCode}</p>

      <div className="flex w-full justify-between space-x-4">
        <div className="w-1/3">
          <PlayerList players={localGameState.players} currentPlayer={player} />
        </div>
        <div className="w-1/3">
          <Scoreboard players={localGameState.players} currentPlayer={player} />
        </div>
      </div>

      <Messages messages={[phaseMessage, ...messages]} />

      <div className="flex flex-col items-center space-y-2">
        {isHost && localGameState.phase === 'waiting' && (
          <button onClick={handleStartGame} className="bg-green-500 text-white px-4 py-2 rounded">Start Game</button>
        )}

        {localGameState.phase === 'enterWord' && activePlayer.name === player && (
          <div className="flex space-x-2">
            <input type="text" value={wordInput} onChange={e => setWordInput(e.target.value)} className="border p-2 rounded" />
            <button onClick={handleShareWord} className="bg-blue-500 text-white px-4 py-2 rounded">Share Word</button>
          </div>
        )}

        {localGameState.phase === 'discussion' && activePlayer.name === player && (
          <button onClick={handleStartVoting} className="bg-purple-500 text-white px-4 py-2 rounded">Start Voting</button>
        )}

        {votingActive && localGameState.players.map(p => {
          if (p.name === player || p.name === activePlayer.name) return null;
          return <button key={p.id} onClick={() => handleVote(p.id)} className="bg-red-500 text-white px-4 py-2 rounded m-1">{p.name}</button>;
        })}

        {activePlayer.name === player && localGameState.phase === 'voting' && (
          <button onClick={handleEndVote} className="bg-yellow-500 text-white px-4 py-2 rounded">End Vote</button>
        )}
      </div>

      {localGameState.phase === 'end' && <Confetti />}
    </div>
  );
}
