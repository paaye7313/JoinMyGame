import { useEffect, useMemo, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import type { AlkkagiArena, AlkkagiRoundResultPayload, ChatMessage, Player } from "../types";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import PlayerAvatar from "../components/ui/PlayerAvatar";
import ChatBox from "../components/Chat/ChatBox";
import PhaserAlkkagiArena from "../game/alkkagi/components/PhaserAlkkagiArena";
import type { AlkkagiPlayerMeta } from "../game/alkkagi/phaser/AlkkagiScene";

interface AlkkagiGamePageProps {
  roomCode: string;
  players: Player[];
  alkkagiArena: AlkkagiArena;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onExit: () => void;
}

type Phase = "aiming" | "resolving" | "matchOver";

function AlkkagiGamePage({
  roomCode,
  players: initialPlayers,
  alkkagiArena,
  messages,
  onSendMessage,
  onExit,
}: AlkkagiGamePageProps) {
  const socket = useSocket();
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [arenaRadius, setArenaRadius] = useState(alkkagiArena.radius);
  const [round, setRound] = useState(alkkagiArena.round);
  const [phase, setPhase] = useState<Phase>("aiming");
  const [mySubmitted, setMySubmitted] = useState(false);
  // 사람이 탈락한 뒤 AI끼리 자동으로 여러 라운드가 연달아 끝나는 경우, alkkagiRoundResult가 한꺼번에
  // 여러 번 도착할 수 있음 — 큐에 쌓아두고 하나씩 순서대로 재생해야 애니메이션이 안 건너뛰어짐.
  const [queue, setQueue] = useState<AlkkagiRoundResultPayload[]>([]);
  const [current, setCurrent] = useState<AlkkagiRoundResultPayload | null>(null);
  const [matchOver, setMatchOver] = useState(false);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    function handlePlayersUpdated({ players }: { players: Player[] }) {
      setPlayers(players);
    }
    function handleRoundResult(payload: AlkkagiRoundResultPayload) {
      setQueue((q) => [...q, payload]);
    }
    function handleRematchStarted({ alkkagiArena }: { alkkagiArena?: AlkkagiArena }) {
      setPhase("aiming");
      setMySubmitted(false);
      setQueue([]);
      setCurrent(null);
      setMatchOver(false);
      setWinnerId(null);
      if (alkkagiArena) {
        setArenaRadius(alkkagiArena.radius);
        setRound(alkkagiArena.round);
      }
    }
    function handleError({ message }: { message: string }) {
      setErrorMessage(message);
    }

    socket.on("playersUpdated", handlePlayersUpdated);
    socket.on("alkkagiRoundResult", handleRoundResult);
    socket.on("rematchStarted", handleRematchStarted);
    socket.on("error", handleError);

    return () => {
      socket.off("playersUpdated", handlePlayersUpdated);
      socket.off("alkkagiRoundResult", handleRoundResult);
      socket.off("rematchStarted", handleRematchStarted);
      socket.off("error", handleError);
    };
  }, [socket]);

  // 큐에 쌓인 라운드 결과를 하나씩 순서대로 재생 — 재생 중(current)이 아니고 큐에 남은 게 있으면 다음 걸 꺼내 재생 시작,
  // 큐도 비고 재생 중인 것도 없으면(=이번 판정 흐름이 완전히 끝남) 다음 단계(조준/매치 종료)로 전환.
  useEffect(() => {
    if (current !== null) return;
    if (queue.length > 0) {
      const [next, ...rest] = queue;
      setPhase("resolving");
      setCurrent(next);
      setQueue(rest);
      return;
    }
    if (phase === "resolving") {
      setPhase(matchOver ? "matchOver" : "aiming");
      if (!matchOver) setMySubmitted(false);
    }
  }, [queue, current, phase, matchOver]);

  function handleAim(dx: number, dy: number, power: number) {
    setMySubmitted(true);
    socket.emit("alkkagiAim", { roomCode, dx, dy, power });
  }

  // 현재 재생 중인 라운드의 애니메이션이 끝났을 때 Phaser 브릿지가 호출 — 그 라운드의 결과를 확정 반영하고 다음 큐 항목으로 넘김
  function handlePlaybackComplete() {
    if (current) {
      setArenaRadius(current.arenaRadius);
      setRound(current.round);
      if (current.matchOver) {
        setMatchOver(true);
        setWinnerId(current.winnerId);
      }
    }
    setCurrent(null);
  }

  function handleRematch() {
    socket.emit("rematch", { roomCode });
  }

  function handleLeave() {
    socket.emit("leaveRoom");
    onExit();
  }

  const self = players.find((p) => p.socketId === socket.id);
  const selfAlive = self?.alkkagi?.alive ?? false;
  const aliveCount = players.filter((p) => p.alkkagi?.alive).length;
  const winnerNickname = winnerId ? (players.find((p) => p.socketId === winnerId)?.nickname ?? null) : null;
  const canAim = phase === "aiming" && selfAlive && !mySubmitted;

  const meta: AlkkagiPlayerMeta[] = useMemo(
    () => players.map((p) => ({ id: p.socketId, nickname: p.nickname, isSelf: p.socketId === socket.id })),
    [players, socket.id],
  );

  const alkkagiPlayers = useMemo(
    () =>
      players
        .filter((p) => p.alkkagi)
        .map((p) => ({ id: p.socketId, x: p.alkkagi!.x, y: p.alkkagi!.y, alive: p.alkkagi!.alive })),
    [players],
  );

  const currentPlayback = useMemo(
    () => (current ? { keyframes: current.keyframes, arenaRadiusAfter: current.arenaRadius } : null),
    [current],
  );

  return (
    <div className="flex w-full max-w-5xl flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text-h">알까기 배틀로얄</h1>
        <p className="text-sm text-text">
          방 코드: <code>{roomCode}</code> · 라운드 {round} · 생존 {aliveCount}명
        </p>
      </div>

      {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

      <div className="flex w-full flex-col items-start justify-center gap-6 lg:flex-row">
        <Card className="flex flex-col items-center gap-6 py-10">
          <PhaserAlkkagiArena
            players={alkkagiPlayers}
            meta={meta}
            arenaRadius={arenaRadius}
            canAim={canAim}
            onAim={handleAim}
            roundResult={currentPlayback}
            onPlaybackComplete={handlePlaybackComplete}
          />

          {phase === "aiming" &&
            (selfAlive ? (
              mySubmitted ? (
                <p className="text-sm text-text">다른 플레이어의 조준을 기다리는 중...</p>
              ) : (
                <p className="text-sm text-text">내 말을 당겨서 방향과 힘을 조준한 뒤 놓으세요</p>
              )
            ) : (
              <p className="text-sm text-text">탈락했습니다. 남은 대결을 지켜보세요.</p>
            ))}
          {phase === "resolving" && <p className="text-sm text-text">발사!</p>}
        </Card>

        <div className="flex w-full flex-col gap-4 lg:w-96">
          <div className="flex flex-col gap-3 rounded-2xl border border-border bg-panel p-4 shadow-panel">
            <div className="flex flex-wrap justify-center gap-6">
              {players.map((p) => (
                <PlayerAvatar
                  key={p.socketId}
                  nickname={p.nickname}
                  isSelf={p.socketId === socket.id}
                  status={
                    phase === "matchOver" ? (
                      <Badge tone={p.ready ? "secondary" : "neutral"}>{p.ready ? "재경기 동의" : "대기 중"}</Badge>
                    ) : (
                      <Badge tone={p.alkkagi?.alive ? "secondary" : "neutral"}>
                        {p.alkkagi?.alive ? "생존" : "탈락"}
                      </Badge>
                    )
                  }
                />
              ))}
            </div>

            {phase === "matchOver" ? (
              <>
                <p className="text-center text-lg font-semibold text-text-h">
                  {winnerId === socket.id ? "우승!" : winnerId ? `${winnerNickname ?? "상대"} 우승` : "무승부 (동시 탈락)"}
                </p>
                <div className="flex justify-center gap-3">
                  <Button onClick={handleRematch} disabled={self?.ready}>
                    재경기
                  </Button>
                  <Button variant="secondary" onClick={handleLeave}>
                    나가기
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex justify-center">
                <Button variant="secondary" onClick={handleLeave}>
                  나가기
                </Button>
              </div>
            )}
          </div>

          <ChatBox
            messages={messages}
            selfSocketId={socket.id ?? ""}
            onSend={onSendMessage}
            messageListClassName="max-h-[360px] min-h-[200px]"
          />
        </div>
      </div>
    </div>
  );
}

export default AlkkagiGamePage;
