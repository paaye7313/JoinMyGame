import { Player, Room } from "../../room/room.types";
import { chooseAiAim } from "./alkkagi.ai";
import { ARENA_START_RADIUS, createStartingPositions, nextArenaRadius, simulateRound } from "./alkkagi.physics";
import { AlkkagiAim, AlkkagiKeyframe, AlkkagiPieceInput } from "./alkkagi.types";

export function initializeAlkkagiMatch(room: Room): void {
  const positions = createStartingPositions(room.players.length, ARENA_START_RADIUS);
  room.alkkagiArena = { radius: ARENA_START_RADIUS, round: 1 };
  room.players.forEach((p, i) => {
    p.alkkagi = { x: positions[i].x, y: positions[i].y, alive: true, aim: null };
  });
  fillAiAims(room);
}

// AI는 라운드가 시작되는 즉시 조준을 채워둠 — 사람이 낼 때까지 기다릴 필요가 없음
export function fillAiAims(room: Room): void {
  const alivePlayers = room.players.filter((p) => p.alkkagi?.alive);
  alivePlayers
    .filter((p) => p.isAI && p.alkkagi!.aim === null)
    .forEach((p) => {
      const others = alivePlayers.filter((o) => o.socketId !== p.socketId).map((o) => o.alkkagi!);
      p.alkkagi!.aim = chooseAiAim(p.alkkagi!, others);
    });
}

export function allAimsSubmitted(room: Room): boolean {
  const alivePlayers = room.players.filter((p) => p.alkkagi?.alive);
  return alivePlayers.length > 0 && alivePlayers.every((p) => p.alkkagi!.aim !== null);
}

export function submitAim(room: Room, player: Player, aim: AlkkagiAim): void {
  if (!player.alkkagi?.alive) throw new Error("이미 탈락했거나 아직 게임에 참가하지 않았습니다.");
  player.alkkagi.aim = { dx: aim.dx, dy: aim.dy, power: Math.max(0, Math.min(1, aim.power)) };
}

export interface AlkkagiRoundResult {
  keyframes: AlkkagiKeyframe[];
  arenaRadius: number;
  round: number;
  matchOver: boolean;
  winnerId: string | null;
}

// 살아있는 전원의 조준을 동시에 발사 → 결과 반영 → 다음 라운드 무대 축소/AI 조준 미리 채우기까지 한 번에 처리
export function resolveRound(room: Room): AlkkagiRoundResult {
  const arena = room.alkkagiArena!;
  const alivePlayers = room.players.filter((p) => p.alkkagi?.alive);
  const inputs: AlkkagiPieceInput[] = alivePlayers.map((p) => ({
    id: p.socketId,
    x: p.alkkagi!.x,
    y: p.alkkagi!.y,
    aim: p.alkkagi!.aim!,
  }));

  const { keyframes } = simulateRound(inputs, arena.radius);
  const finalSnapshot = keyframes[keyframes.length - 1];
  finalSnapshot.players.forEach((snap) => {
    const player = room.players.find((p) => p.socketId === snap.id)!;
    player.alkkagi!.x = snap.x;
    player.alkkagi!.y = snap.y;
    player.alkkagi!.alive = snap.alive;
    player.alkkagi!.aim = null;
  });

  arena.radius = nextArenaRadius(arena.radius);
  arena.round += 1;

  const stillAlive = room.players.filter((p) => p.alkkagi?.alive);
  const matchOver = stillAlive.length <= 1;
  const winnerId = matchOver && stillAlive.length === 1 ? stillAlive[0].socketId : null;

  room.gameState = matchOver ? "RESULT" : "PLAYING";
  // matchOver가 되면 "재경기" 버튼이 눌러야만 활성화되도록 ready를 리셋 — 그 전엔 매치 시작(setReady) 때
  // 걸어둔 ready=true가 그대로 남아있어서, 리셋하지 않으면 매치가 끝나자마자 재경기 버튼이 바로 비활성 상태로
  // 보임(사람이 다시 누를 방법이 없어짐). 알까기는 rematch 이벤트가 "다음 라운드"에는 안 쓰이므로
  // matchOver가 아닐 때는 굳이 리셋할 필요 없지만, 다음 매치 판정과의 일관성을 위해 항상 리셋해둠.
  room.players.forEach((p) => {
    p.ready = !!p.isAI;
  });
  if (!matchOver) fillAiAims(room);

  return { keyframes, arenaRadius: arena.radius, round: arena.round, matchOver, winnerId };
}
