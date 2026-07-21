import Phaser from "phaser";
import type { CardDef } from "../cards";
import type { Hand } from "../../../types";

type Outcome = "win" | "lose" | "draw";

export interface PlayZoneSyncState {
  availableCards: { card: CardDef; count: number }[];
  // 탭은 확정이 아니라 "하이라이트"만 함 — 실제 확정은 별도 확인 버튼(React)에서 처리.
  // 스크롤 제스처가 카드 위에서 시작돼도 여기선 하이라이트만 바뀔 뿐 서버로 아무것도 안 나가서 안전함.
  onHighlight: (hand: Hand) => void;
  highlightedHand: Hand | null;
  selfCard: CardDef | null;
  selfOutcome?: Outcome;
  opponentCard: CardDef | null;
  opponentOutcome?: Outcome;
  revealed: boolean;
}

export const SCENE_WIDTH = 480;
export const SCENE_HEIGHT = 750;

const CARD_BG = 0xffffff;
const CARD_BORDER = 0xd8d2e8;
const SPECIAL_BORDER = 0xf4b183;
const OUTCOME_COLORS: Record<Outcome, number> = {
  win: 0x34d399,
  lose: 0x9ca3af,
  draw: 0xf4b183,
};
const BACK_PATTERN_BG = 0xe6e1f7;
const HIGHLIGHT_BORDER = 0x7c6fd6;

// Phaser Text는 폰트 메트릭으로 캔버스 텍스처 크기를 추정하는데, 이모지 등 일부 글리프의
// 실제 렌더링 높이가 그 추정치보다 커서 위쪽이 잘리는 경우가 있음 — 여유 패딩으로 방지.
const TEXT_PADDING = { top: 10, bottom: 6 };

const SLOT_CARD_W = 130;
const SLOT_CARD_H = 190;
const SELECTION_CARD_W = 100;
const SELECTION_CARD_H = 145;
const SELECTION_GAP = 18;

// 위에서부터 상대 슬롯 → 상대 라벨 → VS → 내 슬롯 → 내 라벨 → 선택 그리드 순으로 여백을 계산.
// 라벨은 항상 자기 카드 "바로 아래"에 오도록 좌표를 맞춰서(기존 HandCard/PlayZone과 같은 배치) 어느 카드가 누구 것인지 헷갈리지 않게 함.
const OPPONENT_SLOT_Y = 30 + SLOT_CARD_H / 2;
const OPPONENT_LABEL_Y = OPPONENT_SLOT_Y + SLOT_CARD_H / 2 + 18;
const VS_Y = OPPONENT_LABEL_Y + 45;
const SELF_SLOT_Y = VS_Y + 45 + SLOT_CARD_H / 2;
const SELF_LABEL_Y = SELF_SLOT_Y + SLOT_CARD_H / 2 + 18;
const SELECTION_ROW_Y = SELF_LABEL_Y + 35 + SELECTION_CARD_H / 2;

function drawCardBox(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  borderColor: number,
  faceDown: boolean,
): Phaser.GameObjects.Container {
  const container = scene.add.container(x, y);
  const bg = scene.add.rectangle(0, 0, w, h, faceDown ? BACK_PATTERN_BG : CARD_BG, 1);
  bg.setStrokeStyle(3, borderColor);
  container.add(bg);

  if (faceDown) {
    const back = scene.add
      .text(0, 0, "🎴", { fontSize: "40px", padding: TEXT_PADDING })
      .setOrigin(0.5);
    container.add(back);
  }

  return container;
}

export default class PlayZoneScene extends Phaser.Scene {
  private opponentSlot?: Phaser.GameObjects.Container;
  private selfSlot?: Phaser.GameObjects.Container;
  private selectionRow?: Phaser.GameObjects.Container;
  private opponentLabel?: Phaser.GameObjects.Text;
  private selfLabel?: Phaser.GameObjects.Text;
  // 선택 카드의 클릭 영역은 Container 안에 넣지 않고 씬 최상위에 별도로 관리함 —
  // Container 자식으로 넣으면 히트테스트 좌표가 어긋나 대부분의 클릭이 안 먹는 문제가 있었음.
  private selectionHitZones: Phaser.GameObjects.Rectangle[] = [];
  // syncState는 카드 값이 안 바뀐 채로도(예: 채팅 수신 등 무관한 리렌더) 다시 호출될 수 있어,
  // "공개 안 됨 → 공개됨"으로 실제로 전환되는 순간에만 뒤집기 연출을 재생하도록 이전 상태를 기억.
  private wasRevealed = false;

  constructor() {
    super("PlayZoneScene");
  }

  create(): void {
    this.add
      .text(SCENE_WIDTH / 2, VS_Y, "VS", {
        fontSize: "24px",
        color: "#7c6fd6",
        fontStyle: "bold",
        padding: TEXT_PADDING,
      })
      .setOrigin(0.5);

    this.opponentLabel = this.add
      .text(SCENE_WIDTH / 2, OPPONENT_LABEL_Y, "상대", {
        fontSize: "16px",
        color: "#6b6478",
        padding: TEXT_PADDING,
      })
      .setOrigin(0.5);
    this.selfLabel = this.add
      .text(SCENE_WIDTH / 2, SELF_LABEL_Y, "나", {
        fontSize: "16px",
        color: "#6b6478",
        padding: TEXT_PADDING,
      })
      .setOrigin(0.5);

    this.opponentSlot = this.add.container(SCENE_WIDTH / 2, OPPONENT_SLOT_Y);
    this.selfSlot = this.add.container(SCENE_WIDTH / 2, SELF_SLOT_Y);
    this.selectionRow = this.add.container(0, 0);
  }

  syncState(state: PlayZoneSyncState): void {
    this.renderSlot(this.selfSlot!, state.selfCard, state.selfOutcome, state.revealed, false);
    this.renderSlot(this.opponentSlot!, state.opponentCard, state.opponentOutcome, state.revealed, true);
    this.selfLabel?.setText("나");
    this.opponentLabel?.setText("상대");

    this.renderSelection(state);

    if (state.revealed && state.opponentCard && !this.wasRevealed) {
      this.playFlip(this.opponentSlot!);
    }
    this.wasRevealed = state.revealed;
  }

  private renderSlot(
    slot: Phaser.GameObjects.Container,
    card: CardDef | null,
    outcome: Outcome | undefined,
    revealed: boolean,
    isOpponent: boolean,
  ): void {
    slot.removeAll(true);

    const w = SLOT_CARD_W;
    const h = SLOT_CARD_H;

    if (!card) {
      const box = this.add.rectangle(0, 0, w, h, 0xffffff, 0);
      box.setStrokeStyle(2, CARD_BORDER, 0.6);
      const q = this.add
        .text(0, 0, "?", { fontSize: "28px", color: "#c9c2da", padding: TEXT_PADDING })
        .setOrigin(0.5);
      slot.add([box, q]);
      return;
    }

    const faceDown = isOpponent && !revealed;
    const borderColor =
      revealed && outcome
        ? OUTCOME_COLORS[outcome]
        : card.category === "special"
          ? SPECIAL_BORDER
          : CARD_BORDER;

    const box = drawCardBox(this, 0, 0, w, h, borderColor, faceDown);

    if (!faceDown) {
      const icon = this.add
        .text(0, -28, card.icon, { fontSize: "52px", padding: TEXT_PADDING })
        .setOrigin(0.5);
      const label = this.add
        .text(0, 46, card.label, {
          fontSize: "17px",
          color: "#3a3450",
          fontStyle: "bold",
          padding: TEXT_PADDING,
        })
        .setOrigin(0.5);
      box.add([icon, label]);
    }

    if (revealed && outcome === "lose") {
      box.setAlpha(0.5);
    }

    slot.add(box);
  }

  private renderSelection(state: PlayZoneSyncState): void {
    this.selectionHitZones.forEach((zone) => zone.destroy());
    this.selectionHitZones = [];
    this.selectionRow!.removeAll(true);
    if (state.selfCard) return; // 이미 선택했으면 그리드 숨김

    const cards = state.availableCards;
    if (cards.length === 0) return;

    const w = SELECTION_CARD_W;
    const h = SELECTION_CARD_H;
    const gap = SELECTION_GAP;
    const totalWidth = cards.length * w + (cards.length - 1) * gap;
    const startX = SCENE_WIDTH / 2 - totalWidth / 2 + w / 2;
    const y = SELECTION_ROW_Y;

    cards.forEach(({ card, count }, i) => {
      const x = startX + i * (w + gap);
      const isHighlighted = card.id === state.highlightedHand;
      const borderColor = isHighlighted
        ? HIGHLIGHT_BORDER
        : card.category === "special"
          ? SPECIAL_BORDER
          : CARD_BORDER;
      const box = drawCardBox(this, x, y, w, h, borderColor, false);
      if (isHighlighted) box.setScale(1.05);
      const icon = this.add
        .text(0, -20, card.icon, { fontSize: "36px", padding: TEXT_PADDING })
        .setOrigin(0.5);
      const label = this.add
        .text(0, 34, card.label, { fontSize: "15px", color: "#3a3450", padding: TEXT_PADDING })
        .setOrigin(0.5);

      const badge = this.add.circle(w / 2 - 10, -h / 2 + 10, 14, 0x7c6fd6);
      const badgeText = this.add
        .text(w / 2 - 10, -h / 2 + 10, String(count), {
          fontSize: "13px",
          color: "#ffffff",
          padding: TEXT_PADDING,
        })
        .setOrigin(0.5);
      box.add([icon, label, badge, badgeText]);

      // 클릭 판정용 히트 영역은 Container 안에 넣지 않고 씬 최상위에 독립적으로 둠(위 selectionHitZones 주석 참고).
      const hit = this.add.rectangle(x, y, w, h, 0xffffff, 0).setInteractive({ useHandCursor: true });
      hit.on("pointerdown", () => state.onHighlight(card.id));
      hit.on("pointerover", () => box.setScale(1.05));
      hit.on("pointerout", () => box.setScale(isHighlighted ? 1.05 : 1));
      this.selectionHitZones.push(hit);

      this.selectionRow!.add(box);
    });
  }

  private playFlip(slot: Phaser.GameObjects.Container): void {
    slot.setScale(1, 1);
    this.tweens.add({
      targets: slot,
      scaleX: 0,
      duration: 150,
      yoyo: true,
      ease: "Sine.easeInOut",
    });
  }
}
