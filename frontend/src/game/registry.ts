export interface GameOption {
  id: string;
  label: string;
  maxPlayers: number;
  icon?: string;
  comingSoon?: boolean;
  supportsAI?: boolean;
}

export const GAME_OPTIONS: GameOption[] = [
  { id: "rps", label: "가위바위보", maxPlayers: 2, icon: "✌️✊✋", supportsAI: true },
  { id: "coming-soon-4p", label: "4인 게임", maxPlayers: 4, comingSoon: true },
];
