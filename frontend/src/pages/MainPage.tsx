import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import type { Player } from "../types";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import { loadNickname, saveNickname } from "../nickname";
import { GAME_OPTIONS } from "../game/registry";

interface MainPageProps {
  onEnterRoom: (
    roomCode: string,
    players: Player[],
    gameType: string,
    maxPlayers: number,
    winsToMatch: number,
  ) => void;
}

const INPUT_CLASS =
  "w-full rounded-full border border-border bg-bg px-5 py-2.5 text-center text-text-h outline-none transition focus:border-primary";

function MainPage({ onEnterRoom }: MainPageProps) {
  const socket = useSocket();
  const [nickname, setNickname] = useState(loadNickname);
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [gameType, setGameType] = useState("rps");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    function handleRoomCreated({
      roomCode,
      gameType,
      maxPlayers,
      winsToMatch,
    }: {
      roomCode: string;
      gameType: string;
      maxPlayers: number;
      winsToMatch: number;
    }) {
      onEnterRoom(
        roomCode,
        [
          {
            socketId: socket.id ?? "",
            nickname,
            ready: false,
            selectedHand: null,
            wins: 0,
            cards: { rock: 0, paper: 0, scissors: 0, gun: 0, middleFinger: 0, mirror: 0 },
            specialCardCount: 0,
          },
        ],
        gameType,
        maxPlayers,
        winsToMatch,
      );
    }
    function handlePlayerJoined({
      players,
      gameType,
      maxPlayers,
      winsToMatch,
    }: {
      players: Player[];
      gameType: string;
      maxPlayers: number;
      winsToMatch: number;
    }) {
      onEnterRoom(roomCodeInput.trim(), players, gameType, maxPlayers, winsToMatch);
    }
    function handleError({ message }: { message: string }) {
      setErrorMessage(message);
    }

    socket.on("roomCreated", handleRoomCreated);
    socket.on("playerJoined", handlePlayerJoined);
    socket.on("error", handleError);

    return () => {
      socket.off("roomCreated", handleRoomCreated);
      socket.off("playerJoined", handlePlayerJoined);
      socket.off("error", handleError);
    };
  }, [socket, nickname, roomCodeInput, onEnterRoom]);

  function handleCreateRoom() {
    if (!nickname.trim()) {
      setErrorMessage("닉네임을 입력해주세요.");
      return;
    }
    setErrorMessage("");
    saveNickname(nickname.trim());
    socket.emit("createRoom", { nickname, gameType });
  }

  function handleJoinRoom() {
    if (!nickname.trim() || !roomCodeInput.trim()) {
      setErrorMessage("닉네임과 방 코드를 입력해주세요.");
      return;
    }
    setErrorMessage("");
    saveNickname(nickname.trim());
    socket.emit("joinRoom", { roomCode: roomCodeInput.trim(), nickname });
  }

  return (
    <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-text-h">JoinMyGame</h1>
      </div>

      <Card className="flex w-full flex-col gap-4">
        <input
          className={INPUT_CLASS}
          placeholder="닉네임"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          onCompositionEnd={(e) => setNickname(e.currentTarget.value)}
          onBlur={(e) => setNickname(e.currentTarget.value)}
        />

        <div className="flex flex-col gap-2">
          <span className="text-sm text-text">게임 선택</span>
          <div className="flex gap-2">
            {GAME_OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                disabled={option.comingSoon}
                onClick={() => setGameType(option.id)}
                className={`flex flex-1 flex-col items-center gap-1 rounded-2xl border px-3 py-2.5 text-sm font-medium transition ${
                  option.comingSoon
                    ? "cursor-not-allowed border-border text-text opacity-50"
                    : gameType === option.id
                      ? "border-primary bg-primary-bg text-primary"
                      : "border-border text-text-h hover:border-primary"
                }`}
              >
                {option.label}
                {option.icon && <span className="text-2xl">{option.icon}</span>}
                {option.comingSoon && <Badge tone="neutral">준비 중</Badge>}
              </button>
            ))}
          </div>
        </div>

        <Button onClick={handleCreateRoom}>방 만들기</Button>

        <div className="flex items-center gap-3 text-xs text-text">
          <span className="h-px flex-1 bg-border" />
          또는
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="flex gap-2">
          <input
            className={INPUT_CLASS}
            placeholder="방 코드 입력"
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value)}
          />
          <Button variant="secondary" onClick={handleJoinRoom}>
            참가
          </Button>
        </div>
      </Card>

      {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}
    </div>
  );
}

export default MainPage;
