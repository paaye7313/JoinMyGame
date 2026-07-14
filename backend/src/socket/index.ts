import { Server, Socket } from "socket.io";
import { judgeGame } from "../game";
import { Hand } from "../game/rps/rps.types";
import * as roomService from "../room/room.service";

export function registerSocketHandlers(io: Server): void {
  io.on("connection", (socket: Socket) => {
    console.log(`[socket] connected: ${socket.id}`);

    socket.on("createRoom", ({ nickname }: { nickname: string }) => {
      const room = roomService.createRoom(nickname, socket.id);
      socket.join(room.roomCode);
      socket.emit("roomCreated", { roomCode: room.roomCode });
    });

    socket.on("joinRoom", ({ roomCode, nickname }: { roomCode: string; nickname: string }) => {
      try {
        const room = roomService.joinRoom(roomCode, nickname, socket.id);
        socket.join(roomCode);
        io.to(roomCode).emit("playerJoined", { players: room.players });
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("ready", ({ roomCode }: { roomCode: string }) => {
      try {
        const room = roomService.setReady(roomCode, socket.id);
        if (room.gameState === "PLAYING") {
          io.to(roomCode).emit("gameStarted");
        }
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("selectHand", ({ roomCode, hand }: { roomCode: string; hand: Hand }) => {
      try {
        const room = roomService.selectHand(roomCode, socket.id, hand);
        if (roomService.allHandsSelected(room)) {
          roomService.finishRound(roomCode);
          const result = judgeGame(room);
          io.to(roomCode).emit("result", result);
        }
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("rematch", ({ roomCode }: { roomCode: string }) => {
      try {
        const room = roomService.markRematchReady(roomCode, socket.id);
        if (room.gameState === "PLAYING") {
          io.to(roomCode).emit("rematchStarted");
        }
      } catch (err) {
        socket.emit("error", { message: (err as Error).message });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`[socket] disconnected: ${socket.id} (${reason})`);
      roomService.removePlayer(socket.id);
    });
  });
}
