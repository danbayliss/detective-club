import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import Confetti from "react-confetti";
import { motion } from "framer-motion";

const socket = io();

export default function GameRoom({ user, roomCode }) {
  const [players, setPlayers] = useState([]);
  const [activePlayer, setActivePlayer] = useState(null);
  const [blindPlayerId, setBlindPlayerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [word, setWord] = useState("");
  const [gameState, setGameState] = useState("waiting"); // waiting, active, voting, end
  const [votes, setVotes] = useState({});
  const [voteSubmitted, setVoteSubmitted] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [winnerIds, setWinnerIds] = useState([]);

  // --- Socket Events ---
  useEffect(() => {
    socket.on("updatePlayers", setPlayers);
    socket.on("gameStarted", ({ activePlayer }) => {
      setActivePlayer(activePlayer);
      setGameState("active");
      setMessages([`Game started. ${activePlayer.name} is active player.`]);
      setBlindPlayerId(null);
    });

    socket.on("wordShared", ({ word, blindPlayerId, activePlayerId }) => {
      setWord(word);
      setBlindPlayerId(blindPlayerId);
      if (socket.id === activePlayerId) {
        setMessages(["Word shared. Start voting when ready."]);
      } else if (socket.id === blindPlayerId) {
        setMessages(["You are the blind player"]);
      } else {
        setMessages([`Word: ${word}`]);
      }
    });

    socket.on("votingStarted", (playersToVote) => {
      setGameState("voting");
      setVoteSubmitted(false);
      setMessages(["Vote for the blind player"]);
    });

    socket.on("updateVotes", setVotes);

    socket.on("allVotesIn", () => {
      setMessages(["All votes submitted. Active player can end voting."]);
    });

    socket.on("voteEnded", ({ players: updatedPlayers, nextActive }) => {
      setPlayers(updatedPlayers);
      setActivePlayer(nextActive);
      setVotes({});
      setVoteSubmitted(false);
      if (updatedPlayers.every(p => p.id === nextActive.id)) {
        setGameState("end");
        const maxScore = Math.max(...updatedPlayers.map(p => p.score));
        const winners = updatedPlayers.filter(p => p.score === maxScore).map(p => p.id);
        setWinnerIds(winners);
        setShowConfetti(true);
        setMessages(["Game over!"]);
      } else {
        setGameState("active");
        setBlindPlayerId(null);
        setMessages([`${nextActive.name} is now the active player.`]);
      }
    });

    return () => socket.off();
  }, []);

  // --- Event Handlers ---
  const startGame = () => socket.emit("startGame", { roomCode });
  const shareWord = () => socket.emit("shareWord", { roomCode, word });
  const startVoting = () => socket.emit("startVoting", { roomCode });
  const submitVote = (votedId) => {
    socket.emit("submitVote", { roomCode, votedPlayerId: votedId });
    setVoteSubmitted(true);
  };
  const endVote = () => socket.emit("endVote", { roomCode });

  const isHost = players[0]?.id === socket.id;
  const isActive = activePlayer?.id === socket.id;

  return (
    <div className="min-h-screen bg-gradient-to-r from-purple-200 to-pink-200 p-4">
      {showConfetti && <Confetti />}
      <h1 className="text-4xl font-bold text-center mb-4">Detective Club</h1>
      <h2 className="text-center text-lg mb-4">Room Code: {roomCode}</h2>

      <div className="flex gap-4 mb-4">
        {/* Player List */}
        <motion.div className="flex-1 bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Players</h3>
          {players.map(p => (
            <motion.div
              key={p.id}
              className={`p-2 rounded mb-1 ${p.id === socket.id ? "bg-blue-200" : "bg-gray-100"} 
                          ${p.id === activePlayer?.id ? "border-2 border-green-500" : ""}`}
            >
              {p.name}
            </motion.div>
          ))}
        </motion.div>

        {/* Scoreboard */}
        <motion.div className="flex-1 bg-white p-4 rounded shadow">
          <h3 className="font-bold mb-2">Scoreboard</h3>
          {players.map(p => (
            <motion.div
              key={p.id}
              className={`p-2 rounded mb-1 flex justify-between
                        ${p.id === socket.id ? "bg-blue-200" : "bg-gray-100"}
                        ${voteSubmitted && votes[p.id] ? "opacity-50" : ""} 
                        ${winnerIds.includes(p.id) ? "bg-yellow-300 font-bold" : ""}`}
            >
              <span>{p.name}</span>
              <span>{p.score}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>

      {/* Messages & Controls */}
      <motion.div className="bg-white p-4 rounded shadow">
        <div className="mb-2">
          {messages.map((msg, i) => (
            <p key={i}>{msg}</p>
          ))}
        </div>

        {gameState === "waiting" && players.length >= 4 && isHost && (
          <button
            onClick={startGame}
            className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
          >
            Start Game
          </button>
        )}

        {gameState === "active" && isActive && (
          <div className="flex gap-2 items-center">
            <input
              type="text"
              placeholder="Enter word"
              value={word}
              onChange={e => setWord(e.target.value)}
              className="border p-2 rounded flex-1"
            />
            <button
              onClick={shareWord}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded"
            >
              Share Word
            </button>
          </div>
        )}

        {gameState === "active" && isActive && blindPlayerId && (
          <button
            onClick={startVoting}
            className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded mt-2"
          >
            Start Voting
          </button>
        )}

        {gameState === "voting" && !isActive && !voteSubmitted && (
          <div className="flex flex-wrap gap-2">
            {players
              .filter(p => p.id !== activePlayer.id && p.id !== socket.id)
              .map(p => (
                <button
                  key={p.id}
                  onClick={() => submitVote(p.id)}
                  className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded"
                >
                  {p.name}
                </button>
              ))}
          </div>
        )}

        {voteSubmitted && <p className="mt-2 text-green-700 font-bold">Vote submitted</p>}

        {gameState === "voting" && isActive && Object.keys(votes).length === players.length - 1 && (
          <button
            onClick={endVote}
            className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded mt-2"
          >
            End Vote
          </button>
        )}
      </motion.div>
    </div>
  );
}
