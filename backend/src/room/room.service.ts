import { Hand } from "../game/rps/rps.types";
import { DRAWS_TO_RESET, createEmptyCards, createStartingCards, grantCards } from "../game/rps/rps.cards";
import { roomStore } from "./room.store";
import { Player, Room } from "./room.types";

const MAX_PLAYERS = 2;
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

export function createRoom(nickname: string, socketId: string): Room {
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
    gameType: "rps",
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
  if (room.players.length >= MAX_PLAYERS) throw new Error("방이 가득 찼습니다.");
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
  return room;
}

export function setReady(roomCode: string, socketId: string): Room {
  const room = getRoomOrThrow(roomCode);
  const player = getPlayerOrThrow(room, socketId);
  player.ready = true;
  if (allReady(room)) {
    room.gameState = "PLAYING";
    room.players.forEach((p) => {
      p.cards = createStartingCards();
    });
  } else {
    room.gameState = "READY";
  }
  return room;
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
    p.ready = false;
  });
  room.gameState = "RESULT";
  return { room, cardsReset };
}

export function markRematchReady(roomCode: string, socketId: string): Room {
  const room = getRoomOrThrow(roomCode);
  const player = getPlayerOrThrow(room, socketId);
  player.ready = true;
  if (allReady(room)) {
    const startNewMatch = isMatchOver(room);
    room.players.forEach((p) => {
      p.ready = false;
      p.selectedHand = null;
      if (startNewMatch) {
        p.wins = 0;
        p.cards = createStartingCards();
      }
    });
    if (startNewMatch) room.drawStack = 0;
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
    p.ready = false;
  });
  return room;
}

export function removePlayer(socketId: string): Room | undefined {
  for (const room of roomStore.values()) {
    const index = room.players.findIndex((p) => p.socketId === socketId);
    if (index === -1) continue;

    room.players.splice(index, 1);
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
  return room.players.length === MAX_PLAYERS && room.players.every((p) => p.ready);
}

export function allHandsSelected(room: Room): boolean {
  return room.players.length === MAX_PLAYERS && room.players.every((p) => p.selectedHand !== null);
}
