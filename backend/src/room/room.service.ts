import * as alkkagiRound from "../game/alkkagi/alkkagi.round";
import { AlkkagiAim } from "../game/alkkagi/alkkagi.types";
import { GAME_DEFS } from "../game/registry";
import { Hand } from "../game/rps/rps.types";
import { DRAWS_TO_RESET, createEmptyCards, createStartingCards, grantCards } from "../game/rps/rps.cards";
import { roomStore } from "./room.store";
import { Player, Room } from "./room.types";

export const DEFAULT_WINS_TO_MATCH = 3;
export const ALLOWED_WINS_TO_MATCH = [2, 3];

function getRoomOrThrow(roomCode: string): Room {
  const room = roomStore.get(roomCode);
  if (!room) throw new Error("존재하지 않는 방입니다.");
  return room;
}

function getPlayerOrThrow(room: Room, socketId: string): Player {
  const player = room.players.find((p) => p.socketId === socketId);
  if (!player) throw new Error("방에 참가하지 않은 플레이어입니다.");
  return player;
}

function dedupeNickname(existingNicknames: string[], nickname: string): string {
  if (!existingNicknames.includes(nickname)) return nickname;
  let n = 2;
  while (existingNicknames.includes(`${nickname} (${n})`)) {
    n++;
  }
  return `${nickname} (${n})`;
}

export function createRoom(nickname: string, gameType: string, socketId: string): Room {
  const gameDef = GAME_DEFS[gameType];
  if (!gameDef) throw new Error(`지원하지 않는 게임 타입입니다: ${gameType}`);

  const roomCode = roomStore.generateRoomCode();
  const player: Player = {
    socketId,
    nickname,
    ready: false,
    selectedHand: null,
    wins: 0,
    cards: createEmptyCards(),
  };
  const room: Room = {
    roomCode,
    gameType,
    maxPlayers: gameDef.maxPlayers,
    players: [player],
    gameState: "WAITING",
    drawStack: 0,
    winsToMatch: DEFAULT_WINS_TO_MATCH,
  };
  roomStore.set(room);
  return room;
}

export function joinRoom(roomCode: string, nickname: string, socketId: string): Room {
  const room = getRoomOrThrow(roomCode);
  if (room.players.length >= room.maxPlayers) throw new Error("방이 가득 찼습니다.");
  const finalNickname = dedupeNickname(
    room.players.map((p) => p.nickname),
    nickname,
  );
  room.players.push({
    socketId,
    nickname: finalNickname,
    ready: false,
    selectedHand: null,
    wins: 0,
    cards: createEmptyCards(),
  });
  // 인원 구성이 바뀌었으니 기존에 Ready 해뒀던 사람들도 다시 확인하게 함 —
  // 안 그러면 새로 들어온 사람 의사와 무관하게 예전 Ready가 그대로 남아있다가 뜻하지 않게 바로 시작될 수 있음
  room.players.forEach((p) => {
    p.ready = !!p.isAI;
  });
  return room;
}

export function setReady(roomCode: string, socketId: string): Room {
  const room = getRoomOrThrow(roomCode);
  const player = getPlayerOrThrow(room, socketId);
  player.ready = true;
  if (allReady(room)) {
    room.gameState = "PLAYING";
    if (room.gameType === "alkkagi") {
      alkkagiRound.initializeAlkkagiMatch(room);
    } else {
      room.players.forEach((p) => {
        p.cards = createStartingCards();
      });
    }
  } else {
    room.gameState = "READY";
  }
  return room;
}

// 대기실 Ready와 결과 화면 재경기/다음 라운드 동의 둘 다 같은 ready 필드를 쓰므로, 취소도 하나로 처리.
// 게임이 이미 시작된 뒤(PLAYING)엔 되돌릴 ready 상태가 없으므로 막음.
export function setUnready(roomCode: string, socketId: string): Room {
  const room = getRoomOrThrow(roomCode);
  const player = getPlayerOrThrow(room, socketId);
  if (room.gameState === "PLAYING") throw new Error("이미 게임이 진행 중입니다.");
  player.ready = false;
  if (room.gameState !== "RESULT") {
    room.gameState = room.players.some((p) => p.ready) ? "READY" : "WAITING";
  }
  return room;
}

export function submitAlkkagiAim(roomCode: string, socketId: string, aim: AlkkagiAim): Room {
  const room = getRoomOrThrow(roomCode);
  const player = getPlayerOrThrow(room, socketId);
  alkkagiRound.submitAim(room, player, aim);
  return room;
}

export function allAlkkagiAimsSubmitted(room: Room): boolean {
  return alkkagiRound.allAimsSubmitted(room);
}

export interface AlkkagiRoundOutcome extends alkkagiRound.AlkkagiRoundResult {
  room: Room;
}

export function resolveAlkkagiRound(roomCode: string): AlkkagiRoundOutcome {
  const room = getRoomOrThrow(roomCode);
  const result = alkkagiRound.resolveRound(room);
  return { room, ...result };
}

export function selectHand(roomCode: string, socketId: string, hand: Hand): Room {
  const room = getRoomOrThrow(roomCode);
  const player = getPlayerOrThrow(room, socketId);
  if ((player.cards[hand] ?? 0) <= 0) throw new Error("보유하지 않은 카드입니다.");
  player.selectedHand = hand;
  return room;
}

export interface RoundResultOutcome {
  room: Room;
  cardsReset: boolean;
}

export function applyRoundResult(
  roomCode: string,
  winnerSocketId: string | "draw",
  winsDelta: number,
): RoundResultOutcome {
  const room = getRoomOrThrow(roomCode);
  let cardsReset = false;

  room.players.forEach((p) => {
    if (p.selectedHand) p.cards[p.selectedHand] -= 1;
  });

  if (winnerSocketId === "draw") {
    room.drawStack += 1;
    if (room.drawStack >= DRAWS_TO_RESET) {
      room.players.forEach((p) => {
        p.cards = createStartingCards();
      });
      room.drawStack = 0;
      cardsReset = true;
    }
  } else {
    const winner = getPlayerOrThrow(room, winnerSocketId);
    const loser = room.players.find((p) => p.socketId !== winnerSocketId);
    winner.wins += winsDelta;
    if (loser) grantCards(loser.cards, 1);
  }

  room.players.forEach((p) => {
    p.ready = !!p.isAI; // AI는 항상 다음 라운드에 동의한 상태
  });
  room.gameState = "RESULT";
  return { room, cardsReset };
}

export function markRematchReady(roomCode: string, socketId: string): Room {
  const room = getRoomOrThrow(roomCode);
  const player = getPlayerOrThrow(room, socketId);
  player.ready = true;
  if (allReady(room)) {
    // 알까기는 "다음 라운드"가 rematch 없이 자동 진행되므로, rematch가 호출되는 시점은 항상 매치가 끝난 뒤의 진짜 재경기
    const startNewMatch = room.gameType === "alkkagi" ? true : isMatchOver(room);
    room.players.forEach((p) => {
      p.ready = !!p.isAI; // AI는 항상 다음 라운드에 동의한 상태
      p.selectedHand = null;
      if (startNewMatch && room.gameType !== "alkkagi") {
        p.wins = 0;
        p.cards = createStartingCards();
      }
    });
    if (startNewMatch) {
      room.drawStack = 0;
      if (room.gameType === "alkkagi") alkkagiRound.initializeAlkkagiMatch(room);
    }
    room.gameState = "PLAYING";
  }
  return room;
}

export function isMatchOver(room: Room): boolean {
  return room.players.some((p) => p.wins >= room.winsToMatch);
}

export function setMatchFormat(roomCode: string, winsToMatch: number): Room {
  const room = getRoomOrThrow(roomCode);
  if (!ALLOWED_WINS_TO_MATCH.includes(winsToMatch)) {
    throw new Error("지원하지 않는 경기 방식입니다.");
  }
  room.winsToMatch = winsToMatch;
  room.players.forEach((p) => {
    p.ready = !!p.isAI; // AI는 항상 다음 라운드에 동의한 상태
  });
  return room;
}

export function addAiPlayer(roomCode: string): Room {
  const room = getRoomOrThrow(roomCode);
  const gameDef = GAME_DEFS[room.gameType];
  if (!gameDef?.supportsAI) throw new Error("이 게임은 AI 대전을 지원하지 않습니다.");
  if (room.players.length >= room.maxPlayers) throw new Error("방이 가득 찼습니다.");

  let seq = room.players.length;
  while (room.players.length < room.maxPlayers) {
    seq += 1;
    room.players.push({
      socketId: `ai:${roomCode}:${seq}`,
      nickname: room.maxPlayers > 2 ? `AI 상대 ${seq}` : "AI 상대",
      ready: true,
      selectedHand: null,
      wins: 0,
      cards: createEmptyCards(),
      isAI: true,
    });
  }
  // 인원 구성이 바뀌었으니 사람들의 Ready도 다시 확인하게 함(AI는 항상 ready) —
  // 이미 Ready 해뒀던 사람이 AI로 자리가 다 채워지자마자 본인 의사 확인 없이 바로 게임이 시작되는 걸 방지
  room.players.forEach((p) => {
    p.ready = !!p.isAI;
  });
  return room;
}

export function removeAiPlayer(roomCode: string): Room {
  const room = getRoomOrThrow(roomCode);
  room.players = room.players.filter((p) => !p.isAI);
  room.players.forEach((p) => {
    p.ready = false;
  });
  return room;
}

export function removePlayer(socketId: string): Room | undefined {
  for (const room of roomStore.values()) {
    const index = room.players.findIndex((p) => p.socketId === socketId);
    if (index === -1) continue;

    // 알까기는 매치 진행 중엔 방을 나가지 않고(자리 유지) 그 자리에서 탈락 처리만 함 —
    // 4인용이라 RPS처럼 남은 인원을 대기실로 되돌리면 나머지 플레이어들의 진행 중인 매치가 날아가버림
    if (room.gameType === "alkkagi" && room.gameState === "PLAYING") {
      const player = room.players[index];
      if (player.alkkagi) player.alkkagi.alive = false;
      return room;
    }

    room.players.splice(index, 1);
    room.players = room.players.filter((p) => !p.isAI); // 사람이 나가면 상대할 사람이 없는 AI도 같이 정리
    if (room.players.length === 0) {
      roomStore.delete(room.roomCode);
    } else {
      room.gameState = "WAITING";
      room.drawStack = 0;
      room.players.forEach((p) => {
        p.ready = false;
        p.selectedHand = null;
        p.wins = 0;
        p.cards = createEmptyCards();
      });
    }
    return room;
  }
  return undefined;
}

export function findPlayerInRoom(roomCode: string, socketId: string): Player {
  const room = getRoomOrThrow(roomCode);
  return getPlayerOrThrow(room, socketId);
}

export function allReady(room: Room): boolean {
  return room.players.length === room.maxPlayers && room.players.every((p) => p.ready);
}

export function allHandsSelected(room: Room): boolean {
  return room.players.length === room.maxPlayers && room.players.every((p) => p.selectedHand !== null);
}
