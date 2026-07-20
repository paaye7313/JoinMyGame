import { useEffect, useRef, useState, type FormEvent } from "react";
import type { ChatMessage } from "../../types";

const MAX_MESSAGE_LENGTH = 200;

interface ChatBoxProps {
  messages: ChatMessage[];
  selfSocketId: string;
  onSend: (message: string) => void;
  messageListClassName?: string;
}

function ChatBox({ messages, selfSocketId, onSend, messageListClassName = "max-h-40" }: ChatBoxProps) {
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;
    onSend(trimmed);
    setDraft("");
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-2xl border border-border bg-panel p-4 shadow-panel">
      <div ref={listRef} className={`flex flex-col gap-1.5 overflow-y-auto ${messageListClassName}`}>
        {messages.length === 0 && <p className="text-xs text-text">아직 채팅이 없어요.</p>}
        {messages.map((m) => {
          const isSelf = m.socketId === selfSocketId;
          return (
            <p
              key={`${m.socketId}-${m.timestamp}`}
              className={`text-sm ${isSelf ? "text-right text-primary" : "text-left text-text-h"}`}
            >
              <span className="mr-1.5 text-xs text-text">{isSelf ? "나" : m.nickname}</span>
              {m.message}
            </p>
          );
        })}
      </div>

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          maxLength={MAX_MESSAGE_LENGTH}
          placeholder="메시지를 입력하세요"
          className="flex-1 rounded-full border border-border bg-primary-bg px-4 py-1.5 text-sm text-text-h outline-none"
        />
        <span className="text-xs text-text">
          {draft.length}/{MAX_MESSAGE_LENGTH}
        </span>
        <button
          type="submit"
          disabled={!draft.trim()}
          className="rounded-full bg-primary px-4 py-1.5 text-sm font-medium text-white shadow-panel transition disabled:cursor-not-allowed disabled:opacity-50"
        >
          전송
        </button>
      </form>
    </div>
  );
}

export default ChatBox;
