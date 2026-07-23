import { Server, Socket } from "socket.io";
import * as chatService from "../chat/chat.service";
import { GameResult, judgeGame } from "../game";
import { chooseAiHand } from "../game/rps/rps.ai";
import { Hand, SPECIAL_HANDS } from "../game/rps/rps.types";
import * as roomService from "../room/room.service";
import { Player, Room } from "../room/room.types";
import { createRateLimiter } from "../security/rateLimiter";

const connectionLimiter = createRateLimiter(20, 60_000);
const roomActionLimiter = createRateLimiter(10, 60_000);

interface PlayerView extends Player {
  specialCardCount: number;
}

function totalSpecialCards(cards: Record<Hand, number>): number {
  return SPECIAL_HANDS.reduce((sum, hand) => sum + cards[hand], 0);
}

// 본인 카드는 정확히, 상대 카드는 기본카드 수량만 그대로 보이고 특수카드는 총 개수만 보이도록 가림
function toWirePlayers(players: Player[], viewerSocketId: string): PlayerView[] {
  return players.map((p) => {
    const specialCardCount = totalSpecialCards(p.cards);
    if (p.socketId === viewerSocketId) {
      return { ...p, specialCardCount };
    }
    return {
      ...p,
      cards: { ...p.cards, gun: 0, middleFinger: 0, mirror: 0 },
      specialCardCount,
    };
  });
}

function broadcastPlayers(
  io: Server,
  room: Room,
  event: string,
  extra: Record<string, unknown> = {},
): void {
  room.players
    .filter((viewer) => !viewer.isAI) // AI는 실제 연결된 소켓이 없어 전송 대상에서 제외
    .forEach((viewer) => {
      io.to(viewer.socketId).emit(event, { players: toWirePlayers(room.players, viewer.socketId), ...extra });
    });
}

// 살아있는 전원의 조준이 다 모이면(사람 제출 또는 접속 끊김으로 인한 탈락 처리) 라운드를 판정.
// AI만 남아 계속 스스로 조준을 채우는 경우(사람 전원 이탈)엔 매치가 끝날 때까지 반복 판정해 방이 멈춰있지 않게 함.
function finishAlkkagiRoundIfReady(io: Server, room: Room): void {
  while (roomService.allAlkkagiAimsSubmitted(room)) {
    const { keyframes, arenaRadius, round, matchOver, winnerId } = roomService.resolveAlkkagiRound(room.roomCode);
    io.to(room.roomCode).emit("alkkagiRoundResult", { keyframes, arenaRadius, round, matchOver, winnerId });
    if (matchOver) break;
  }
  broadcastPlayers(io, room, "playersUpdated");
}

function leaveCurrentRoom(io: Server, socket: Socket): void {
  chatService.clearChatState(socket.id);
  const room = roomService.removePlayer(socket.id);
  if (!room) return;
  socket.leave(room.roomCode);
  if (room.gameType === "alkkagi" && room.gameState === "PLAYING") {
    finishAlkkagiRoundIfReady(io, room);
    return;
  }
  if (room.players.length > 0) {
    broadcastPlayers(io, room, "playerLeft");
  }
}

export function registerSocketHandlers(io: Server): void {
  io.use((socket, next) => {
    if (!connectionLimiter.check(socket.handshake.address)) {
      next(new Error("너무 많은 연결 시도입니다. 잠시 후 다시 시도해주세요."));
      return;
    }
    next();
  });

  io.on("connection", (socket: Socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on("createRoom", ({ nickname, gameType }: { nickname: string; gameType: string }) => {
      if (!roomActionLimiter.check(socket.handshake.address)) {
        socket.emit("error", { message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요." });
        return;
      }
      try {
        const room = roomService.createRoom(nickname, gameType, socket.id);
        socket.join(room.roomCode);
        socket.emit("roomCreated", {
          roomCode: room.roomCode,
          gameType: room.gameType,
          maxPlayers: room.maxPlayers,
          winsToMatch: room.winsToMatch,
        });
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("joinRoom", ({ roomCode, nickname }: { roomCode: string; nickname: string }) => {
      if (!roomActionLimiter.check(socket.handshake.address)) {
        socket.emit("error", { message: "너무 많은 요청입니다. 잠시 후 다시 시도해주세요." });
        return;
      }
      try {
        const room = roomService.joinRoom(roomCode, nickname, socket.id);
        socket.join(roomCode);
        broadcastPlayers(io, room, "playerJoined", {
          gameType: room.gameType,
          maxPlayers: room.maxPlayers,
          winsToMatch: room.winsToMatch,
        });
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("setMatchFormat", ({ roomCode, winsToMatch }: { roomCode: string; winsToMatch: number }) => {
      try {
        const room = roomService.setMatchFormat(roomCode, winsToMatch);
        io.to(roomCode).emit("matchFormatUpdated", { winsToMatch: room.winsToMatch });
        broadcastPlayers(io, room, "playersUpdated");
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("addAiPlayer", ({ roomCode }: { roomCode: string }) => {
      try {
        const room = roomService.addAiPlayer(roomCode);
        broadcastPlayers(io, room, "playersUpdated");
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("removeAiPlayer", ({ roomCode }: { roomCode: string }) => {
      try {
        const room = roomService.removeAiPlayer(roomCode);
        broadcastPlayers(io, room, "playersUpdated");
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("ready", ({ roomCode }: { roomCode: string }) => {
      try {
        const room = roomService.setReady(roomCode, socket.id);
        broadcastPlayers(io, room, "playersUpdated");
        if (room.gameState === "PLAYING") {
          broadcastPlayers(io, room, "gameStarted", {
            gameType: room.gameType,
            maxPlayers: room.maxPlayers,
            winsToMatch: room.winsToMatch,
            drawStack: room.drawStack,
            alkkagiArena: room.alkkagiArena,
          });
        }
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on(
      "alkkagiAim",
      ({ roomCode, dx, dy, power }: { roomCode: string; dx: number; dy: number; power: number }) => {
        try {
          const room = roomService.submitAlkkagiAim(roomCode, socket.id, { dx, dy, power });
          finishAlkkagiRoundIfReady(io, room);
        } catch (err) {
          socket.emit("error", { message: (err as Error).message });
        }
      },
    );

    socket.on("selectHand", ({ roomCode, hand }: { roomCode: string; hand: Hand }) => {
      try {
        let room = roomService.selectHand(roomCode, socket.id, hand);
        const aiPlayer = room.players.find((p) => p.isAI && p.selectedHand === null);
        if (aiPlayer) {
          room = roomService.selectHand(roomCode, aiPlayer.socketId, chooseAiHand(aiPlayer.cards));
        }
        if (roomService.allHandsSelected(room)) {
          const judged = judgeGame(room);
          const { room: updatedRoom, cardsReset } = roomService.applyRoundResult(
            roomCode,
            judged.winner,
            judged.winsDelta,
          );
          const scores: Record<string, number> = {};
          updatedRoom.players.forEach((p) => {
            scores[p.socketId] = p.wins;
          });
          const result: GameResult = {
            ...judged,
            scores,
            matchOver: roomService.isMatchOver(updatedRoom),
            cardsReset,
            drawStack: updatedRoom.drawStack,
          };
          broadcastPlayers(io, updatedRoom, "playersUpdated");
          io.to(roomCode).emit("result", result);
        }
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("rematch", ({ roomCode }: { roomCode: string }) => {
      try {
        const room = roomService.markRematchReady(roomCode, socket.id);
        broadcastPlayers(io, room, "playersUpdated");
        if (room.gameState === "PLAYING") {
          io.to(roomCode).emit("rematchStarted", { drawStack: room.drawStack, alkkagiArena: room.alkkagiArena });
        }
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("chatMessage", ({ roomCode, message }: { roomCode: string; message: string }) => {
      try {
        const player = roomService.findPlayerInRoom(roomCode, socket.id);
        const clean = chatService.validateAndRecordMessage(socket.id, message);
        io.to(roomCode).emit("chatMessage", {
          socketId: socket.id,
          nickname: player.nickname,
          message: clean,
          timestamp: Date.now(),
        });
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("leaveRoom", () => {
      leaveCurrentRoom(io, socket);
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
      leaveCurrentRoom(io, socket);
    });
  });
}
