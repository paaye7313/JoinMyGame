export interface GameDef {
  maxPlayers: number;
  supportsAI?: boolean;
}

export const GAME_DEFS: Record<string, GameDef> = {
  rps: { maxPlayers: 2, supportsAI: true },
  alkkagi: { maxPlayers: 4, supportsAI: true },
};
