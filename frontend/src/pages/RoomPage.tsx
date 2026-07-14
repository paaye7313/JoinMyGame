import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import type { Player } from "../types";

interface RoomPageProps {
  roomCode: string;
  initialPlayers: Player[];
  onGameStart: (players: Player[]) => void;
}

function RoomPage({ roomCode, initialPlayers, onGameStart }: RoomPageProps) {
  const socket = useSocket();
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [selfReady, setSelfReady] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    function handlePlayerJoined({ players }: { players: Player[] }) {
      setPlayers(players);
    }
    function handleError({ message }: { message: string }) {
      setErrorMessage(message);
    }

    socket.on("playerJoined", handlePlayerJoined);
    socket.on("error", handleError);

    return () => {
      socket.off("playerJoined", handlePlayerJoined);
      socket.off("error", handleError);
    };
  }, [socket]);

  useEffect(() => {
    function handleGameStarted() {
      onGameStart(players);
    }

    socket.on("gameStarted", handleGameStarted);
    return () => {
      socket.off("gameStarted", handleGameStarted);
    };
  }, [socket, players, onGameStart]);

  function handleReady() {
    setSelfReady(true);
    socket.emit("ready", { roomCode });
  }

  return (
    <div>
      <h1>대기실</h1>
      <p>방 코드: {roomCode}</p>
      <ul>
        {players.map((p) => (
          <li key={p.socketId}>
            {p.nickname} {p.socketId === socket.id ? "(나)" : ""}
          </li>
        ))}
      </ul>
      {players.length < 2 && <p>상대방을 기다리는 중...</p>}
      <button onClick={handleReady} disabled={selfReady}>
        Ready
      </button>
      {selfReady && players.length === 2 && <p>상대방의 Ready를 기다리는 중...</p>}
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
    </div>
  );
}

export default RoomPage;
