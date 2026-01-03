import { useState } from "react";
import { io } from "socket.io-client";
const socket = io();

export default function Lobby({ setUser, setRoomCode }) {
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");

  const createRoom = () => {
    if (!name) return setError("Enter a name");
    socket.emit("createRoom", { name });
    socket.on("roomJoined", ({ roomCode }) => {
      setUser(name);
      setRoomCode(roomCode);
    });
  };

  const joinRoom = () => {
    if (!name || !code) return setError("Enter name & room code");
    socket.emit("joinRoom", { name, roomCode: code.toUpperCase() });
    socket.on("updatePlayers", () => {
      setUser(name);
      setRoomCode(code.toUpperCase());
    });
    socket.on("errorMessage", msg => setError(msg));
  };

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-gradient-to-r from-purple-200 to-pink-200">
      <h1 className="text-4xl font-bold mb-4">Detective Club</h1>
      <input className="border p-2 rounded mb-2" placeholder="Your name" value={name} onChange={e => setName(e.target.value)} />
      <input className="border p-2 rounded mb-2" placeholder="Room code (to join)" value={code} onChange={e => setCode(e.target.value)} />
      <button className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded mb-2" onClick={createRoom}>Create Room</button>
      <button className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded" onClick={joinRoom}>Join Room</button>
      {error && <p className="text-red-600 mt-2">{error}</p>}
    </div>
  );
}
