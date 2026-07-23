import Phaser from "phaser";
import { useEffect, useRef, useState } from "react";
import type { AlkkagiKeyframe } from "../../../types";
import AlkkagiScene, { SCENE_HEIGHT, SCENE_WIDTH, type AlkkagiPlayerMeta } from "../phaser/AlkkagiScene";

interface PhaserAlkkagiArenaProps {
  players: { id: string; x: number; y: number; alive: boolean }[];
  meta: AlkkagiPlayerMeta[];
  arenaRadius: number;
  canAim: boolean;
  onAim: (dx: number, dy: number, power: number) => void;
  // 새 라운드 결과가 도착할 때마다 새 객체(참조가 바뀜)로 전달 — 재생이 끝나면 onPlaybackComplete 호출
  roundResult: { keyframes: AlkkagiKeyframe[]; arenaRadiusAfter: number } | null;
  onPlaybackComplete: () => void;
}

function PhaserAlkkagiArena(props: PhaserAlkkagiArenaProps) {
  // RPS의 PhaserPlayZone과 동일한 wrapper/mount 분리 — Phaser의 Scale Manager가 부모 엘리먼트
  // 크기를 직접 건드리는 걸 막기 위함(자세한 배경은 PhaserPlayZone.tsx 주석 참고).
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<AlkkagiScene | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: mountRef.current ?? undefined,
      backgroundColor: "#ffffff",
      scene: AlkkagiScene,
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: SCENE_WIDTH,
        height: SCENE_HEIGHT,
      },
    });
    gameRef.current = game;

    game.events.once(Phaser.Core.Events.READY, () => {
      if (cancelled) return;
      const scene = game.scene.keys["AlkkagiScene"] as AlkkagiScene;
      sceneRef.current = scene;
      scene.syncState({
        players: propsRef.current.players,
        meta: propsRef.current.meta,
        arenaRadius: propsRef.current.arenaRadius,
        canAim: propsRef.current.canAim,
        onAim: (dx, dy, power) => propsRef.current.onAim(dx, dy, power),
      });
      setReady(true);
    });

    return () => {
      cancelled = true;
      game.destroy(true);
      if (gameRef.current === game) gameRef.current = null;
    };
  }, []);

  useEffect(() => {
    sceneRef.current?.syncState({
      players: props.players,
      meta: props.meta,
      arenaRadius: props.arenaRadius,
      canAim: props.canAim,
      onAim: (dx, dy, power) => propsRef.current.onAim(dx, dy, power),
    });
  }, [props.players, props.meta, props.arenaRadius, props.canAim]);

  // roundResult는 새 라운드마다 항상 새 객체(참조)로 오므로 이 의존성 하나로 충분함 — onPlaybackComplete는
  // propsRef를 통해 항상 최신 값을 참조하므로 의존성 배열에 넣지 않아도 됨(위 syncState용 useEffect와 동일 패턴).
  useEffect(() => {
    if (!props.roundResult) return;
    sceneRef.current?.playResult(props.roundResult.keyframes, props.roundResult.arenaRadiusAfter, () =>
      propsRef.current.onPlaybackComplete(),
    );
  }, [props.roundResult]);

  return (
    <div
      ref={wrapperRef}
      className="mx-auto overflow-hidden"
      style={{
        width: `min(${SCENE_WIDTH}px, calc(100vw - 7rem))`,
        aspectRatio: `${SCENE_WIDTH} / ${SCENE_HEIGHT}`,
        opacity: ready ? 1 : 0,
        transition: "opacity 120ms ease-out",
      }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default PhaserAlkkagiArena;
