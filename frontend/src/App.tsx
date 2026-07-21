import { useEffect, useState } from "react";
import { useSocket } from "./hooks/useSocket";
import GamePage from "./pages/GamePage";
import JoinInvitePage from "./pages/JoinInvitePage";
import MainPage from "./pages/MainPage";
import RoomPage from "./pages/RoomPage";
import type { ChatMessage, Player } from "./types";

type Screen =
  | { name: "main" }
  | { name: "invite"; roomCode: string }
  | {
      name: "room";
      roomCode: string;
      players: Player[];
      gameType: string;
      maxPlayers: number;
      winsToMatch: number;
    }
  | {
      name: "game";
      roomCode: string;
      players: Player[];
      gameType: string;
      maxPlayers: number;
      winsToMatch: number;
    };

function matchInviteRoomCode(pathname: string): string | null {
  const match = pathname.match(/^\/room\/(\d{6})$/);
  return match ? match[1] : null;
}

function initialScreen(): Screen {
  const inviteRoomCode = matchInviteRoomCode(window.location.pathname);
  return inviteRoomCode ? { name: "invite", roomCode: inviteRoomCode } : { name: "main" };
}

function App() {
  const socket = useSocket();
  const [screen, setScreen] = useState<Screen>(initialScreen);
  const [toast, setToast] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);

  useEffect(() => {
    function handleChatMessage(message: ChatMessage) {
      setMessages((prev) => [...prev, message]);
    }

    socket.on("chatMessage", handleChatMessage);
    return () => {
      socket.off("chatMessage", handleChatMessage);
    };
  }, [socket]);

  function handleExit() {
    setMessages([]);
    setScreen({ name: "main" });
    history.pushState(null, "", "/");
  }

  function enterRoom(
    roomCode: string,
    players: Player[],
    gameType: string,
    maxPlayers: number,
    winsToMatch: number,
  ) {
    setScreen({ name: "room", roomCode, players, gameType, maxPlayers, winsToMatch });
    history.pushState(null, "", `/room/${roomCode}`);
  }

  function handleSendMessage(roomCode: string, message: string) {
    socket.emit("chatMessage", { roomCode, message });
  }

  useEffect(() => {
    function handlePlayerLeft({ players }: { players: Player[] }) {
      if (screen.name === "game") {
        setToast("상대방이 나가서 대기실로 돌아왔습니다.");
        setScreen({
          name: "room",
          roomCode: screen.roomCode,
          players,
          gameType: screen.gameType,
          maxPlayers: screen.maxPlayers,
          winsToMatch: screen.winsToMatch,
        });
      } else if (screen.name === "room") {
        setToast("상대방이 퇴장하였습니다.");
      }
    }

    socket.on("playerLeft", handlePlayerLeft);
    return () => {
      socket.off("playerLeft", handlePlayerLeft);
    };
  }, [socket, screen]);

  useEffect(() => {
    function handleConnectError(err: Error) {
      setToast(err.message || "서버에 연결할 수 없습니다. 잠시 후 다시 시도해주세요.");
    }

    socket.on("connect_error", handleConnectError);
    return () => {
      socket.off("connect_error", handleConnectError);
    };
  }, [socket]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(timer);
  }, [toast]);

  return (
    <>
      {toast && (
        <div className="fixed top-4 left-1/2 z-10 -translate-x-1/2 rounded-full bg-peach-bg px-5 py-2 text-sm font-medium text-peach shadow-panel">
          {toast}
        </div>
      )}
      {screen.name === "main" && <MainPage onEnterRoom={enterRoom} />}
      {screen.name === "invite" && (
        <JoinInvitePage
          roomCode={screen.roomCode}
          onJoined={enterRoom}
          onCancel={() => {
            setScreen({ name: "main" });
            history.pushState(null, "", "/");
          }}
        />
      )}
      {screen.name === "room" && (
        <RoomPage
          roomCode={screen.roomCode}
          initialPlayers={screen.players}
          gameType={screen.gameType}
          maxPlayers={screen.maxPlayers}
          initialWinsToMatch={screen.winsToMatch}
          messages={messages}
          onSendMessage={(message) => handleSendMessage(screen.roomCode, message)}
          onGameStart={(players, winsToMatch) =>
            setScreen({
              name: "game",
              roomCode: screen.roomCode,
              players,
              gameType: screen.gameType,
              maxPlayers: screen.maxPlayers,
              winsToMatch,
            })
          }
          onExit={handleExit}
        />
      )}
      {screen.name === "game" && (
        <GamePage
          roomCode={screen.roomCode}
          players={screen.players}
          winsToMatch={screen.winsToMatch}
          messages={messages}
          onSendMessage={(message) => handleSendMessage(screen.roomCode, message)}
          onExit={handleExit}
        />
      )}
    </>
  );
}

export default App;
