import { useEffect, useState } from "react";
import { useSocket } from "../hooks/useSocket";
import type { ChatMessage, GameResult, Hand, Player } from "../types";
import Button from "../components/ui/Button";
import Card from "../components/ui/Card";
import Badge from "../components/ui/Badge";
import PlayerAvatar from "../components/ui/PlayerAvatar";
import ChatBox from "../components/Chat/ChatBox";
import { HAND_CARDS, getCardDef, type CardDef } from "../game/rps/cards";
import PhaserPlayZone from "../game/rps/components/PhaserPlayZone";

interface PhaserGamePageProps {
  roomCode: string;
  players: Player[];
  winsToMatch: number;
  messages: ChatMessage[];
  onSendMessage: (message: string) => void;
  onExit: () => void;
}

type Outcome = "win" | "lose" | "draw";

const DRAWS_TO_RESET = 3;

function formatMatchLabel(winsToMatch: number): string {
  return `${winsToMatch * 2 - 1}판 ${winsToMatch}선승`;
}

function PhaserGamePage({
  roomCode,
  players: initialPlayers,
  winsToMatch,
  messages,
  onSendMessage,
  onExit,
}: PhaserGamePageProps) {
  const socket = useSocket();
  const [players, setPlayers] = useState<Player[]>(initialPlayers);
  const [selectedHand, setSelectedHand] = useState<Hand | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [drawStack, setDrawStack] = useState(0);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    function handleResult(payload: GameResult) {
      setResult(payload);
      setDrawStack(payload.drawStack);
    }
    function handlePlayersUpdated({ players }: { players: Player[] }) {
      setPlayers(players);
    }
    function handleRematchStarted({ drawStack }: { drawStack: number }) {
      setSelectedHand(null);
      setResult(null);
      setDrawStack(drawStack);
    }
    function handleError({ message }: { message: string }) {
      setErrorMessage(message);
    }

    socket.on("result", handleResult);
    socket.on("playersUpdated", handlePlayersUpdated);
    socket.on("rematchStarted", handleRematchStarted);
    socket.on("error", handleError);

    return () => {
      socket.off("result", handleResult);
      socket.off("playersUpdated", handlePlayersUpdated);
      socket.off("rematchStarted", handleRematchStarted);
      socket.off("error", handleError);
    };
  }, [socket]);

  function handleSelectHand(hand: Hand) {
    setSelectedHand(hand);
    socket.emit("selectHand", { roomCode, hand });
  }

  function handleRematch() {
    socket.emit("rematch", { roomCode });
  }

  function handleLeave() {
    socket.emit("leaveRoom");
    onExit();
  }

  function nicknameOf(socketId: string): string {
    return players.find((p) => p.socketId === socketId)?.nickname ?? socketId;
  }

  const self = players.find((p) => p.socketId === socket.id);
  const opponent = players.find((p) => p.socketId !== socket.id);
  const selfCard = selectedHand ? getCardDef(selectedHand) : null;

  let opponentCard: CardDef | null = null;
  let selfOutcome: Outcome | undefined;
  let opponentOutcome: Outcome | undefined;

  if (result && opponent) {
    opponentCard = getCardDef(result.hands[opponent.socketId]);
    if (result.winner === "draw") {
      selfOutcome = "draw";
      opponentOutcome = "draw";
    } else if (result.winner === socket.id) {
      selfOutcome = "win";
      opponentOutcome = "lose";
    } else {
      selfOutcome = "lose";
      opponentOutcome = "win";
    }
  }

  const continueLabel = result?.matchOver ? "재경기" : "다음 라운드";
  const availableCards = HAND_CARDS.filter((card) => (self?.cards[card.id] ?? 0) > 0).map((card) => ({
    card,
    count: self?.cards[card.id] ?? 0,
  }));

  return (
    <div className="flex w-full max-w-5xl flex-1 flex-col items-center gap-6 px-6 py-10">
      <div className="text-center">
        <h1 className="text-2xl font-semibold text-text-h">가위바위보! (Phaser 테스트)</h1>
        <p className="text-sm text-text">
          방 코드: <code>{roomCode}</code> · {formatMatchLabel(winsToMatch)}
        </p>
        <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-primary-bg px-4 py-1.5 text-sm font-semibold text-primary">
          <span>나 {self?.wins ?? 0}</span>
          <span className="text-text">:</span>
          <span>{opponent?.wins ?? 0} 상대</span>
        </div>
        <div className="mt-2 flex items-center justify-center gap-3 text-xs text-text">
          <span className="font-medium text-text-h">
            {opponent ? nicknameOf(opponent.socketId) : "상대"} 카드
          </span>
          <span>✌️{opponent?.cards.scissors ?? 0}</span>
          <span>✊{opponent?.cards.rock ?? 0}</span>
          <span>✋{opponent?.cards.paper ?? 0}</span>
          <span>🎴×{opponent?.specialCardCount ?? 0}</span>
        </div>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs text-text">
          <span>무승부 스택</span>
          {Array.from({ length: DRAWS_TO_RESET }).map((_, i) => (
            <span
              key={i}
              className={`h-2.5 w-2.5 rounded-full ${i < drawStack ? "bg-peach" : "bg-border"}`}
            />
          ))}
        </div>
      </div>

      {errorMessage && <p className="text-sm text-danger">{errorMessage}</p>}

      <div className="flex w-full flex-col items-start justify-center gap-6 lg:flex-row">
        <Card className="flex flex-col items-center gap-8 py-10">
          <PhaserPlayZone
            availableCards={availableCards}
            onSelectHand={handleSelectHand}
            selfCard={selfCard}
            selfOutcome={selfOutcome}
            opponentCard={opponentCard}
            opponentOutcome={opponentOutcome}
            revealed={!!result}
          />

          {result ? (
            <div className="flex flex-col items-center gap-4">
              <p className="text-lg font-semibold text-text-h">
                {result.matchOver
                  ? result.winner === socket.id
                    ? "게임 승리!"
                    : "게임 패배..."
                  : result.winner === "draw"
                    ? "무승부!"
                    : result.winner === socket.id
                      ? "라운드 승리!"
                      : "라운드 패배..."}
                {result.winner !== "draw" && result.winsDelta === 2 && (
                  <span className="ml-2 text-sm font-medium text-peach">특수카드! 2승 획득</span>
                )}
              </p>

              {result.cardsReset && (
                <p className="rounded-full bg-peach-bg px-4 py-1.5 text-sm font-medium text-peach">
                  무승부 {DRAWS_TO_RESET}회 누적! 양쪽 카드가 모두 초기화되었어요
                </p>
              )}

              <div className="flex justify-center gap-8">
                {players.map((p) => (
                  <PlayerAvatar
                    key={p.socketId}
                    nickname={p.nickname}
                    isSelf={p.socketId === socket.id}
                    status={
                      <Badge tone={p.ready ? "secondary" : "neutral"}>
                        {p.ready ? `${continueLabel} 동의` : "대기 중"}
                      </Badge>
                    }
                  />
                ))}
              </div>

              <div className="flex gap-3">
                <Button onClick={handleRematch} disabled={self?.ready}>
                  {continueLabel}
                </Button>
                <Button variant="secondary" onClick={handleLeave}>
                  나가기
                </Button>
              </div>
            </div>
          ) : selectedHand ? (
            <p className="text-sm text-text">상대방의 선택을 기다리는 중...</p>
          ) : (
            <details className="w-full rounded-2xl border border-peach-bg bg-peach-bg/40 px-4 py-2 text-text">
              <summary className="cursor-pointer select-none text-sm font-medium text-text-h">
                🔫🖕🪞 특수카드가 처음이신가요? 눌러서 규칙 보기
              </summary>
              <div className="mt-2 space-y-1 text-xs leading-relaxed text-text">
                <p>총·중지·거울은 각각 가위·바위·보의 강화판이에요.</p>
                <p>
                  일반 카드 상대로 <b className="text-text-h">이기면 2승</b>,{" "}
                  <b className="text-text-h">비기면 1승</b>(원래 무승부 → 승리로 전환),{" "}
                  <b className="text-text-h">지면 상대가 2승</b>을 가져가요.
                </p>
                <p>특수카드끼리 맞붙으면 원래 가위바위보 규칙(1승/무승부) 그대로예요.</p>
                <p>
                  카드는 낼 때마다 소모돼요(무승부도 예외 없이 소모). 대신 무승부가{" "}
                  <b className="text-text-h">{DRAWS_TO_RESET}번 쌓이면</b> 양쪽 카드가 전부 초기화돼요.
                </p>
              </div>
            </details>
          )}
        </Card>

        <div className="w-full lg:w-96">
          <ChatBox
            messages={messages}
            selfSocketId={socket.id ?? ""}
            onSend={onSendMessage}
            messageListClassName="max-h-[520px] min-h-[300px]"
          />
        </div>
      </div>
    </div>
  );
}

export default PhaserGamePage;
