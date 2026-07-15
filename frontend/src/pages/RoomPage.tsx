import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import type { Player } from "../types";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import PlayerAvatar from "../components/ui/PlayerAvatar";

interface RoomPageProps {
  roomCode: string;
  initialPlayers: Player[];
  initialWinsToMatch: number;
  onGameStart: (players: Player[], winsToMatch: number) => void;
  onExit: () => void;
}

const MATCH_FORMATS = [
  { winsToMatch: 2, label: "3판 2선승" },
  { winsToMatch: 3, label: "5판 3선승" },
];

function RoomPage({ roomCode, initialPlayers, initialWinsToMatch, onGameStart, onExit }: RoomPageProps) {
  const socket = useSocket();
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [winsToMatch, setWinsToMatch] = useState(initialWinsToMatch);
  const [errorMessage, setErrorMessage] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handlePlayersChanged({ players }: { players: Player[] }) {
      setPlayers(players);
    }
    function handleMatchFormatChanged({ winsToMatch }: { winsToMatch: number }) {
      setWinsToMatch(winsToMatch);
    }
    function handleError({ message }: { message: string }) {
      setErrorMessage(message);
    }

    socket.on("playerJoined", handlePlayersChanged);
    socket.on("playersUpdated", handlePlayersChanged);
    socket.on("playerLeft", handlePlayersChanged);
    socket.on("matchFormatUpdated", handleMatchFormatChanged);
    socket.on("error", handleError);

    return () => {
      socket.off("playerJoined", handlePlayersChanged);
      socket.off("playersUpdated", handlePlayersChanged);
      socket.off("playerLeft", handlePlayersChanged);
      socket.off("matchFormatUpdated", handleMatchFormatChanged);
      socket.off("error", handleError);
    };
  }, [socket]);

  useEffect(() => {
    function handleGameStarted({ players, winsToMatch }: { players: Player[]; winsToMatch: number }) {
      onGameStart(players, winsToMatch);
    }

    socket.on("gameStarted", handleGameStarted);
    return () => {
      socket.off("gameStarted", handleGameStarted);
    };
  }, [socket, onGameStart]);

  const self = players.find((p) => p.socketId === socket.id);

  function handleReady() {
    socket.emit("ready", { roomCode });
  }

  function handleSelectFormat(format: number) {
    socket.emit("setMatchFormat", { roomCode, winsToMatch: format });
  }

  function handleLeave() {
    socket.emit("leaveRoom");
    onExit();
  }

  async function handleCopyCode() {
    await navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="flex w-full max-w-md flex-1 flex-col items-center gap-6 px-6 py-10">
      <h1 className="text-2xl font-semibold text-text-h">대기실</h1>

      <Card className="flex w-full flex-col items-center gap-1 bg-primary-bg py-6">
        <span className="text-sm text-text">방 코드</span>
        <button
          type="button"
          onClick={handleCopyCode}
          className="text-4xl font-bold tracking-[0.3em] text-primary"
        >
          {roomCode}
        </button>
        <span className="text-xs text-text">{copied ? "복사됨!" : "탭해서 복사"}</span>
      </Card>

      <Card className="flex w-full flex-col items-center gap-4">
        <span className="text-sm text-text">경기 방식</span>
        <div className="flex gap-3">
          {MATCH_FORMATS.map((format) => (
            <Button
              key={format.winsToMatch}
              variant={winsToMatch === format.winsToMatch ? "primary" : "secondary"}
              onClick={() => handleSelectFormat(format.winsToMatch)}
            >
              {format.label}
            </Button>
          ))}
        </div>
      </Card>

      <Card className="flex w-full flex-col items-center gap-6">
        <div className="flex justify-center gap-10">
          {players.map((p) => (
            <PlayerAvatar
              key={p.socketId}
              nickname={p.nickname}
              isSelf={p.socketId === socket.id}
              status={
                <Badge tone={p.ready ? "secondary" : "neutral"}>
                  {p.ready ? "Ready" : "대기 중"}
                </Badge>
              }
            />
          ))}
        </div>

        {players.length < 2 && <p className="text-sm text-text">상대방을 기다리는 중...</p>}

        <div className="flex gap-3">
          <Button onClick={handleReady} disabled={self?.ready}>
            Ready
          </Button>
          <Button variant="secondary" onClick={handleLeave}>
            나가기
          </Button>
        </div>

        {self?.ready && players.length === 2 && (
          <p className="text-sm text-text">상대방의 Ready를 기다리는 중...</p>
        )}
      </Card>

      {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}
    </div>
  );
}

export default RoomPage;
