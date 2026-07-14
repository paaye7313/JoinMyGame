import { Hand } from "../game/rps/rps.types";
import { roomStore } from "./room.store";
import { Player, Room } from "./room.types";

const MAX_PLAYERS = 2;

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

export function createRoom(nickname: string, socketId: string): Room {
  const roomCode = roomStore.generateRoomCode();
  const player: Player = { socketId, nickname, ready: false, selectedHand: null };
  const room: Room = { roomCode, gameType: "rps", players: [player], gameState: "WAITING" };
  roomStore.set(room);
  return room;
}

export function joinRoom(roomCode: string, nickname: string, socketId: string): Room {
  const room = getRoomOrThrow(roomCode);
  if (room.players.length >= MAX_PLAYERS) throw new Error("방이 가득 찼습니다.");
  room.players.push({ socketId, nickname, ready: false, selectedHand: null });
  return room;
}

export function setReady(roomCode: string, socketId: string): Room {
  const room = getRoomOrThrow(roomCode);
  const player = getPlayerOrThrow(room, socketId);
  player.ready = true;
  room.gameState = allReady(room) ? "PLAYING" : "READY";
  return room;
}

export function selectHand(roomCode: string, socketId: string, hand: Hand): Room {
  const room = getRoomOrThrow(roomCode);
  const player = getPlayerOrThrow(room, socketId);
  player.selectedHand = hand;
  return room;
}

export function finishRound(roomCode: string): Room {
  const room = getRoomOrThrow(roomCode);
  room.players.forEach((p) => {
    p.ready = false;
  });
  room.gameState = "RESULT";
  return room;
}

export function markRematchReady(roomCode: string, socketId: string): Room {
  const room = getRoomOrThrow(roomCode);
  const player = getPlayerOrThrow(room, socketId);
  player.ready = true;
  if (allReady(room)) {
    room.players.forEach((p) => {
      p.ready = false;
      p.selectedHand = null;
    });
    room.gameState = "PLAYING";
  }
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
      room.players.forEach((p) => {
        p.ready = false;
        p.selectedHand = null;
      });
    }
    return room;
  }
  return undefined;
}

export function allReady(room: Room): boolean {
  return room.players.length === MAX_PLAYERS && room.players.every((p) => p.ready);
}

export function allHandsSelected(room: Room): boolean {
  return room.players.length === MAX_PLAYERS && room.players.every((p) => p.selectedHand !== null);
}
