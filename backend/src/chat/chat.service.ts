export const MAX_MESSAGE_LENGTH = 200;
const MIN_INTERVAL_MS = 500;
const REPEAT_LIMIT = 3;

const CONTROL_CHAR_PATTERN = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/;

interface ChatState {
  lastSentAt: number;
  lastMessage: string;
  repeatCount: number;
}

const chatState = new Map<string, ChatState>();

export function validateAndRecordMessage(socketId: string, raw: string): string {
  const message = raw.trim();

  if (message.length === 0) throw new Error("빈 메시지는 보낼 수 없습니다.");
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new Error(`메시지는 ${MAX_MESSAGE_LENGTH}자를 넘을 수 없습니다.`);
  }
  if (CONTROL_CHAR_PATTERN.test(message)) {
    throw new Error("허용되지 않는 문자가 포함되어 있습니다.");
  }

  const now = Date.now();
  const state = chatState.get(socketId);

  if (state && now - state.lastSentAt < MIN_INTERVAL_MS) {
    throw new Error("너무 빠르게 보내고 있어요. 잠시 후 다시 시도해주세요.");
  }

  const repeatCount = state && state.lastMessage === message ? state.repeatCount + 1 : 1;
  if (repeatCount >= REPEAT_LIMIT) {
    throw new Error("같은 메시지를 반복해서 보낼 수 없어요.");
  }

  chatState.set(socketId, { lastSentAt: now, lastMessage: message, repeatCount });
  return message;
}

export function clearChatState(socketId: string): void {
  chatState.delete(socketId);
}
