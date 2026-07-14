import { Room } from "./room.types";

const rooms = new Map<string, Room>();

function generateRoomCode(): string {
  let code: string;
  do {
    code = Math.floor(100000 + Math.random() * 900000).toString();
  } while (rooms.has(code));
  return code;
}

export const roomStore = {
  get(roomCode: string): Room | undefined {
    return rooms.get(roomCode);
  },
  set(room: Room): void {
    rooms.set(room.roomCode, room);
  },
  delete(roomCode: string): void {
    rooms.delete(roomCode);
  },
  values(): IterableIterator<Room> {
    return rooms.values();
  },
  generateRoomCode,
};
