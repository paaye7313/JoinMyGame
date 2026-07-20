import Phaser from "phaser";
import { useEffect, useRef } from "react";
import type { Hand } from "../../../types";
import type { CardDef } from "../cards";
import PlayZoneScene, { SCENE_HEIGHT, SCENE_WIDTH } from "../phaser/PlayZoneScene";

type Outcome = "win" | "lose" | "draw";

interface PhaserPlayZoneProps {
  availableCards: { card: CardDef; count: number }[];
  onSelectHand: (hand: Hand) => void;
  selfCard: CardDef | null;
  selfOutcome?: Outcome;
  opponentCard: CardDef | null;
  opponentOutcome?: Outcome;
  revealed: boolean;
}

function PhaserPlayZone(props: PhaserPlayZoneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<PlayZoneScene | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;

  useEffect(() => {
    // React StrictMode(dev)는 이 effect를 mount→cleanup→mount로 두 번 실행함. 첫 번째 Phaser.Game이
    // destroy된 뒤에도 그 READY 콜백이 비동기로 나중에 도착할 수 있는데, 이걸 막지 않으면 sceneRef.current가
    // 이미 죽은(첫 번째) 씬으로 덮어써져서, 실제 화면에 남아있는(두 번째) 캔버스가 이후 props 동기화를
    // 전혀 못 받는 경쟁 상태가 생김(카드가 시각적으로는 보이지만 클릭이 하나도 안 먹는 버그로 나타남).
    let cancelled = false;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      width: SCENE_WIDTH,
      height: SCENE_HEIGHT,
      parent: containerRef.current ?? undefined,
      backgroundColor: "#ffffff",
      scene: PlayZoneScene,
    });
    gameRef.current = game;

    game.events.once(Phaser.Core.Events.READY, () => {
      if (cancelled) return;
      const scene = game.scene.keys["PlayZoneScene"] as PlayZoneScene;
      sceneRef.current = scene;
      scene.syncState({ ...propsRef.current, onSelect: (hand) => propsRef.current.onSelectHand(hand) });
    });

    return () => {
      cancelled = true;
      game.destroy(true);
      if (gameRef.current === game) gameRef.current = null;
    };
    // 마운트/언마운트 시 1회만 Phaser.Game을 생성/파괴 — 이후 props 변화는 아래 별도 useEffect가 scene.syncState로 밀어넣음.
  }, []);

  useEffect(() => {
    sceneRef.current?.syncState({
      availableCards: props.availableCards,
      onSelect: (hand) => propsRef.current.onSelectHand(hand),
      selfCard: props.selfCard,
      selfOutcome: props.selfOutcome,
      opponentCard: props.opponentCard,
      opponentOutcome: props.opponentOutcome,
      revealed: props.revealed,
    });
  }, [props.availableCards, props.selfCard, props.selfOutcome, props.opponentCard, props.opponentOutcome, props.revealed]);

  return <div ref={containerRef} className="mx-auto" style={{ width: SCENE_WIDTH, height: SCENE_HEIGHT }} />;
}

export default PhaserPlayZone;
