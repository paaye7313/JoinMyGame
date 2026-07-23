import Phaser from "phaser";
import type { AlkkagiKeyframe } from "../../../types";

export interface AlkkagiPlayerMeta {
  id: string;
  nickname: string;
  isSelf: boolean;
}

export interface AlkkagiSyncState {
  players: { id: string; x: number; y: number; alive: boolean }[];
  meta: AlkkagiPlayerMeta[];
  arenaRadius: number;
  canAim: boolean;
  onAim: (dx: number, dy: number, power: number) => void;
}

export const SCENE_WIDTH = 480;
export const SCENE_HEIGHT = 480;

const CENTER = { x: SCENE_WIDTH / 2, y: SCENE_HEIGHT / 2 };
// 서버 물리 단위와 화면 픽셀을 1:1로 사용 — 별도 스케일 변환 없이 그대로 그림
const PIECE_RADIUS_PX = 24;
const MAX_DRAG_PX = 140;
const MIN_POWER = 0.05;
const PLAYBACK_STEP_MS = 16;

const ARENA_FILL = 0xf3f1fa;
const ARENA_BORDER = 0xd8d2e8;
const AIM_LINE_COLOR = 0x7c6fd6;
const SELF_STROKE = 0x3a3450;
const OPPONENT_STROKE = 0xffffff;
const PIECE_COLORS = [0x7c6fd6, 0xf4b183, 0x34d399, 0xf87171];

interface PieceObj {
  circle: Phaser.GameObjects.Arc;
  label: Phaser.GameObjects.Text;
}

export default class AlkkagiScene extends Phaser.Scene {
  private arenaCircle?: Phaser.GameObjects.Arc;
  private aimLine?: Phaser.GameObjects.Graphics;

  private pieceObjs = new Map<string, PieceObj>();
  private pieces = new Map<string, { x: number; y: number; alive: boolean }>();
  private meta = new Map<string, AlkkagiPlayerMeta>();
  private order: string[] = [];

  private arenaRadius = 220;
  private canAim = false;
  private onAim: ((dx: number, dy: number, power: number) => void) | null = null;

  private dragging = false;
  private dragStart = { x: 0, y: 0 };

  private playback: { keyframes: AlkkagiKeyframe[]; startTime: number; onComplete: () => void } | null = null;

  constructor() {
    super("AlkkagiScene");
  }

  create(): void {
    this.arenaCircle = this.add.circle(CENTER.x, CENTER.y, this.arenaRadius, ARENA_FILL, 1);
    this.arenaCircle.setStrokeStyle(3, ARENA_BORDER);
    this.aimLine = this.add.graphics();

    this.input.on("pointerdown", this.handlePointerDown, this);
    this.input.on("pointermove", this.handlePointerMove, this);
    this.input.on("pointerup", this.handlePointerUp, this);
    this.input.on("pointerupoutside", this.handlePointerUp, this);
  }

  syncState(state: AlkkagiSyncState): void {
    state.meta.forEach((m) => this.meta.set(m.id, m));
    if (this.order.length === 0) this.order = state.meta.map((m) => m.id);

    state.players.forEach((p) => {
      this.pieces.set(p.id, { x: p.x, y: p.y, alive: p.alive });
    });

    this.arenaRadius = state.arenaRadius;
    this.canAim = state.canAim;
    this.onAim = state.onAim;

    this.redrawArena();
    this.redrawPieces();
  }

  // 서버가 통째로 보내준 리플레이(keyframes)를 로컬에서 시간 맞춰 재생만 함 — 실시간 동기화 아님
  playResult(keyframes: AlkkagiKeyframe[], arenaRadiusAfter: number, onComplete: () => void): void {
    this.canAim = false;
    this.dragging = false;
    this.aimLine?.clear();
    this.playback = {
      keyframes,
      startTime: this.time.now,
      onComplete: () => {
        this.arenaRadius = arenaRadiusAfter;
        this.redrawArena();
        onComplete();
      },
    };
  }

  update(time: number): void {
    if (!this.playback) return;
    const { keyframes, startTime } = this.playback;
    const index = Math.min(keyframes.length - 1, Math.floor((time - startTime) / PLAYBACK_STEP_MS));
    const frame = keyframes[index];
    frame.players.forEach((p) => {
      this.pieces.set(p.id, { x: p.x, y: p.y, alive: p.alive });
    });
    this.redrawPieces();

    if (index >= keyframes.length - 1) {
      const finishing = this.playback;
      this.playback = null;
      finishing.onComplete();
    }
  }

  private redrawArena(): void {
    this.arenaCircle?.setRadius(this.arenaRadius);
  }

  private redrawPieces(): void {
    this.order.forEach((id, i) => {
      const state = this.pieces.get(id);
      const m = this.meta.get(id);
      if (!state || !m) return;

      let obj = this.pieceObjs.get(id);
      if (!obj) {
        const circle = this.add.circle(0, 0, PIECE_RADIUS_PX, PIECE_COLORS[i % PIECE_COLORS.length]);
        circle.setStrokeStyle(m.isSelf ? 4 : 2, m.isSelf ? SELF_STROKE : OPPONENT_STROKE, 1);
        const label = this.add
          .text(0, 0, m.nickname, { fontSize: "13px", color: "#3a3450", padding: { top: 6, bottom: 4 } })
          .setOrigin(0.5);
        obj = { circle, label };
        this.pieceObjs.set(id, obj);
      }

      const px = CENTER.x + state.x;
      const py = CENTER.y + state.y;
      obj.circle.setPosition(px, py);
      obj.label.setPosition(px, py - PIECE_RADIUS_PX - 14);
      obj.circle.setAlpha(state.alive ? 1 : 0.25);
      obj.label.setAlpha(state.alive ? 1 : 0.4);
      obj.label.setText(state.alive ? m.nickname : `${m.nickname} (탈락)`);
    });
  }

  private selfPiecePixelPos(): { x: number; y: number } | null {
    const selfId = [...this.meta.values()].find((m) => m.isSelf)?.id;
    if (!selfId) return null;
    const p = this.pieces.get(selfId);
    if (!p || !p.alive) return null;
    return { x: CENTER.x + p.x, y: CENTER.y + p.y };
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (!this.canAim) return;
    const self = this.selfPiecePixelPos();
    if (!self) return;
    if (Phaser.Math.Distance.Between(pointer.x, pointer.y, self.x, self.y) > PIECE_RADIUS_PX * 2.5) return;
    this.dragging = true;
    this.dragStart = self;
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging) return;
    this.drawAimLine(pointer.x, pointer.y);
  }

  private handlePointerUp(pointer: Phaser.Input.Pointer): void {
    if (!this.dragging) return;
    this.dragging = false;

    const pullX = pointer.x - this.dragStart.x;
    const pullY = pointer.y - this.dragStart.y;
    const pullDist = Math.hypot(pullX, pullY);
    if (pullDist < MAX_DRAG_PX * MIN_POWER) {
      this.aimLine?.clear(); // 너무 약하게 당겨서 취소된 경우엔 남겨둘 조준선도 없음
      return;
    }

    // 확정된 조준선은 지우지 않고 그대로 남겨둠 — 본인이 방금 어떻게 조준했는지 확인할 수 있게.
    // 이 라운드의 발사(playResult)가 시작될 때 지워짐.
    this.drawAimLine(pointer.x, pointer.y);

    const power = Math.min(1, pullDist / MAX_DRAG_PX);
    this.onAim?.(-pullX / pullDist, -pullY / pullDist, power);
  }

  private drawAimLine(pointerX: number, pointerY: number): void {
    if (!this.aimLine) return;
    this.aimLine.clear();

    const pullX = pointerX - this.dragStart.x;
    const pullY = pointerY - this.dragStart.y;
    const pullDist = Math.hypot(pullX, pullY) || 1;
    const power = Math.min(1, pullDist / MAX_DRAG_PX);
    const lineLen = power * MAX_DRAG_PX;
    const launchX = -pullX / pullDist;
    const launchY = -pullY / pullDist;

    this.aimLine.lineStyle(4, AIM_LINE_COLOR, 0.9);
    this.aimLine.beginPath();
    this.aimLine.moveTo(this.dragStart.x, this.dragStart.y);
    this.aimLine.lineTo(this.dragStart.x + launchX * lineLen, this.dragStart.y + launchY * lineLen);
    this.aimLine.strokePath();
  }
}
