import { useState } from 'react';

export default function Lobby({ socket, setPlayer, setRoomCode }) {
  const [name, setName] = useState('');
  const [roomInput, setRoomInput] = useState('');
  const [error, setError] = useState('');

  const createRoom = () => {
    if (!name) return setError('Enter your name');
    socket.emit('createRoom', { name });
    socket.once('roomCreated', ({ roomCode, player }) => {
      setPlayer(player);
      setRoomCode(roomCode);
    });
  };

  const joinRoom = () => {
    if (!name || !roomInput) return setError('Enter name and room code');
    socket.emit('joinRoom', { name, roomCode: roomInput });
    socket.once('joinedRoom', ({ roomCode, player }) => {
      setPlayer(player);
      setRoomCode(roomCode);
    });
    socket.once('errorMessage', msg => setError(msg));
  };

  return (
    <div className="flex flex-col items-center space-y-4">
      <input
        type="text"
        placeholder="Your Name"
        value={name}
        onChange={e => setName(e.target.value)}
        className="border p-2 rounded w-64"
      />
      <div className="flex space-x-2">
        <input
          type="text"
          placeholder="Room Code"
          value={roomInput}
          onChange={e => setRoomInput(e.target.value)}
          className="border p-2 rounded w-32"
        />
        <button onClick={joinRoom} className="bg-blue-500 text-white px-4 py-2 rounded">Join Room</button>
      </div>
      <button onClick={createRoom} className="bg-green-500 text-white px-6 py-2 rounded">Create Room</button>
      {error && <p className="text-red-500">{error}</p>}
    </div>
  );
}
