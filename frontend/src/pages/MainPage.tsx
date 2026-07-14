import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import type { Player } from "../types";

interface MainPageProps {
  onEnterRoom: (roomCode: string, players: Player[]) => void;
}

function MainPage({ onEnterRoom }: MainPageProps) {
  const socket = useSocket();
  const [nickname, setNickname] = useState("");
  const [roomCodeInput, setRoomCodeInput] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    function handleRoomCreated({ roomCode }: { roomCode: string }) {
      onEnterRoom(roomCode, [
        { socketId: socket.id ?? "", nickname, ready: false, selectedHand: null },
      ]);
    }
    function handlePlayerJoined({ players }: { players: Player[] }) {
      onEnterRoom(roomCodeInput.trim(), players);
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
    socket.emit("createRoom", { nickname });
  }

  function handleJoinRoom() {
    if (!nickname.trim() || !roomCodeInput.trim()) {
      setErrorMessage("닉네임과 방 코드를 입력해주세요.");
      return;
    }
    setErrorMessage("");
    socket.emit("joinRoom", { roomCode: roomCodeInput.trim(), nickname });
  }

  return (
    <div>
      <h1>가위바위보 온라인</h1>
      <input
        placeholder="닉네임"
        value={nickname}
        onChange={(e) => setNickname(e.target.value)}
      />
      <div>
        <button onClick={handleCreateRoom}>방 만들기</button>
      </div>
      <div>
        <input
          placeholder="방 코드 입력"
          value={roomCodeInput}
          onChange={(e) => setRoomCodeInput(e.target.value)}
        />
        <button onClick={handleJoinRoom}>방 참가</button>
      </div>
      {errorMessage && <p style={{ color: "red" }}>{errorMessage}</p>}
    </div>
  );
}

export default MainPage;
