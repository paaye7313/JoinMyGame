import type { ReactNode } from "react";

interface PlayerAvatarProps {
  nickname: string;
  isSelf?: boolean;
  status?: ReactNode;
}

function PlayerAvatar({ nickname, isSelf = false, status }: PlayerAvatarProps) {
  const initial = nickname.trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary-bg text-2xl font-semibold text-primary ring-2 ring-primary-border">
        {initial}
      </div>
      <div className="flex items-center gap-1 text-sm font-medium text-text-h">
        {nickname}
        {isSelf && <span className="text-text">(나)</span>}
      </div>
      {status}
    </div>
  );
}

export default PlayerAvatar;
