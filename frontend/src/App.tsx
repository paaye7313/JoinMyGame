import { useEffect, useState } from "react";
import { useSocket } from "./hooks/useSocket";
import GamePage from "./pages/GamePage";
import MainPage from "./pages/MainPage";
import RoomPage from "./pages/RoomPage";
import type { Player } from "./types";

type Screen =
  | { name: "main" }
  | { name: "room"; roomCode: string; players: Player[]; winsToMatch: number }
  | { name: "game"; roomCode: string; players: Player[]; winsToMatch: number };

function App() {
  const socket = useSocket();
  const [screen, setScreen] = useState<Screen>({ name: "main" });
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    function handlePlayerLeft({ players }: { players: Player[] }) {
      if (screen.name === "game") {
        setToast("상대방이 나가서 대기실로 돌아왔습니다.");
        setScreen({ name: "room", roomCode: screen.roomCode, players, winsToMatch: screen.winsToMatch });
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
      {screen.name === "main" && (
        <MainPage
          onEnterRoom={(roomCode, players, winsToMatch) =>
            setScreen({ name: "room", roomCode, players, winsToMatch })
          }
        />
      )}
      {screen.name === "room" && (
        <RoomPage
          roomCode={screen.roomCode}
          initialPlayers={screen.players}
          initialWinsToMatch={screen.winsToMatch}
          onGameStart={(players, winsToMatch) =>
            setScreen({ name: "game", roomCode: screen.roomCode, players, winsToMatch })
          }
          onExit={() => setScreen({ name: "main" })}
        />
      )}
      {screen.name === "game" && (
        <GamePage
          roomCode={screen.roomCode}
          players={screen.players}
          winsToMatch={screen.winsToMatch}
          onExit={() => setScreen({ name: "main" })}
        />
      )}
    </>
  );
}

export default App;
