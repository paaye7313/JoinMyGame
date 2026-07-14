import { io, Socket } from "socket.io-client";

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "http://localhost:3000";

const socket: Socket = io(BACKEND_URL, { autoConnect: true });

export function useSocket(): Socket {
  return socket;
}
