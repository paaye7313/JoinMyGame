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
      const scene = game.scene.keys["PlayZoneScene"] as PlayZoneScene;
      sceneRef.current = scene;
      scene.syncState({ ...propsRef.current, onSelect: (hand) => propsRef.current.onSelectHand(hand) });
    });

    return () => {
      game.destroy(true);
      gameRef.current = null;
      sceneRef.current = null;
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
