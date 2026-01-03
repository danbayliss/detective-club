import { useState } from "react";
import Lobby from "./components/Lobby";
import GameRoom from "./components/GameRoom";

export default function App() {
  const [user, setUser] = useState(null);
  const [roomCode, setRoomCode] = useState(null);

  if (!user || !roomCode) return <Lobby setUser={setUser} setRoomCode={setRoomCode} />;
  return <GameRoom user={user} roomCode={roomCode} />;
}
