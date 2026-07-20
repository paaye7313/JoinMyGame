import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import type { Player } from "../types";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import { loadNickname, saveNickname } from "../nickname";

interface JoinInvitePageProps {
  roomCode: string;
  onJoined: (roomCode: string, players: Player[], winsToMatch: number) => void;
  onCancel: () => void;
}

const INPUT_CLASS =
  "w-full rounded-full border border-border bg-bg px-5 py-2.5 text-center text-text-h outline-none transition focus:border-primary";

function JoinInvitePage({ roomCode, onJoined, onCancel }: JoinInvitePageProps) {
  const socket = useSocket();
  const [nickname, setNickname] = useState(loadNickname);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    function handlePlayerJoined({ players, winsToMatch }: { players: Player[]; winsToMatch: number }) {
      onJoined(roomCode, players, winsToMatch);
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
  }, [socket, roomCode, onJoined]);

  function handleJoin() {
    if (!nickname.trim()) {
      setErrorMessage("닉네임을 입력해주세요.");
      return;
    }
    setErrorMessage("");
    saveNickname(nickname.trim());
    socket.emit("joinRoom", { roomCode, nickname: nickname.trim() });
  }

  return (
    <div className="flex w-full max-w-sm flex-1 flex-col items-center justify-center gap-6 px-6 py-10">
      <div className="text-center">
        <div className="mb-2 text-5xl">✌️✊✋</div>
        <h1 className="text-2xl font-semibold text-text-h">초대받은 방에 입장</h1>
        <p className="mt-1 text-sm text-text">
          방 코드: <code>{roomCode}</code>
        </p>
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
        <Button onClick={handleJoin}>입장하기</Button>
        <Button variant="secondary" onClick={onCancel}>
          메인으로
        </Button>
      </Card>

      {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}
    </div>
  );
}

export default JoinInvitePage;
