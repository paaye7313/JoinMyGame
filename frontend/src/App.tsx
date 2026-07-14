import { useState } from "react";
import GamePage from "./pages/GamePage";
import MainPage from "./pages/MainPage";
import RoomPage from "./pages/RoomPage";
import type { Player } from "./types";

type Screen =
  | { name: "main" }
  | { name: "room"; roomCode: string; players: Player[] }
  | { name: "game"; roomCode: string; players: Player[] };

function App() {
  const [screen, setScreen] = useState<Screen>({ name: "main" });

  switch (screen.name) {
    case "main":
      return (
        <MainPage
          onEnterRoom={(roomCode, players) => setScreen({ name: "room", roomCode, players })}
        />
      );
    case "room":
      return (
        <RoomPage
          roomCode={screen.roomCode}
          initialPlayers={screen.players}
          onGameStart={(players) => setScreen({ name: "game", roomCode: screen.roomCode, players })}
        />
      );
    case "game":
      return (
        <GamePage
          roomCode={screen.roomCode}
          players={screen.players}
          onExit={() => setScreen({ name: "main" })}
        />
      );
  }
}

export default App;
