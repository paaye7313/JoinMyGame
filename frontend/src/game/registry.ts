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
  { id: "alkkagi", label: "알까기 배틀로얄", maxPlayers: 4, icon: "🔴🔵", supportsAI: true },
];
