import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import type { GameResult, Hand, Player } from "../types";

interface GamePageProps {
  roomCode: string;
  players: Player[];
  onExit: () => void;
}

const HANDS: { value: Hand; label: string }[] = [
  { value: "rock", label: "바위" },
  { value: "scissors", label: "가위" },
  { value: "paper", label: "보" },
];

function GamePage({ roomCode, players, onExit }: GamePageProps) {
  const socket = useSocket();
  const [selectedHand, setSelectedHand] = useState<Hand | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [rematchWaiting, setRematchWaiting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    function handleResult(payload: GameResult) {
      setResult(payload);
    }
    function handleRematchStarted() {
      setSelectedHand(null);
      setResult(null);
      setRematchWaiting(false);
    }
    function handleError({ message }: { message: string }) {
      setErrorMessage(message);
    }

    socket.on("result", handleResult);
    socket.on("rematchStarted", handleRematchStarted);
    socket.on("error", handleError);

    return () => {
      socket.off("result", handleResult);
      socket.off("rematchStarted", handleRematchStarted);
      socket.off("error", handleError);
    };
  }, [socket]);

  function handleSelectHand(hand: Hand) {
    setSelectedHand(hand);
    socket.emit("selectHand", { roomCode, hand });
  }

  function handleRematch() {
    setRematchWaiting(true);
    socket.emit("rematch", { roomCode });
  }

  function nicknameOf(socketId: string): string {
    return players.find((p) => p.socketId === socketId)?.nickname ?? socketId;
  }

  if (result) {
    const isDraw = result.winner === "draw";
    const isWinner = result.winner === socket.id;

    return (
      <div>
        <h1>결과</h1>
        <p>{isDraw ? "무승부!" : isWinner ? "승리!" : "패배..."}</p>
        <ul>
          {Object.entries(result.hands).map(([socketId, hand]) => (
            <li key={socketId}>
              {nicknameOf(socketId)}: {hand}
            </li>
          ))}
        </ul>
        <button onClick={handleRematch} disabled={rematchWaiting}>
          재경기
        </button>
        {rematchWaiting && <p>상대방의 재경기 동의를 기다리는 중...</p>}
        <button onClick={onExit}>나가기</button>
        {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
      </div>
    );
  }

  return (
    <div>
      <h1>가위바위보!</h1>
      <p>방 코드: {roomCode}</p>
      {selectedHand ? (
        <p>상대방의 선택을 기다리는 중...</p>
      ) : (
        <div>
          {HANDS.map(({ value, label }) => (
            <button key={value} onClick={() => handleSelectHand(value)}>
              {label}
            </button>
          ))}
        </div>
      )}
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
    </div>
  );
}

export default GamePage;
