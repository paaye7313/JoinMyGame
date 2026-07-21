import Phaser from "phaser";
import { useEffect, useRef, useState } from "react";
import type { Hand } from "../../../types";
import type { CardDef } from "../cards";
import PlayZoneScene, { SCENE_HEIGHT, SCENE_WIDTH } from "../phaser/PlayZoneScene";

type Outcome = "win" | "lose" | "draw";

interface PhaserPlayZoneProps {
  availableCards: { card: CardDef; count: number }[];
  onHighlight: (hand: Hand) => void;
  highlightedHand: Hand | null;
  selfCard: CardDef | null;
  selfOutcome?: Outcome;
  opponentCard: CardDef | null;
  opponentOutcome?: Outcome;
  revealed: boolean;
}

function PhaserPlayZone(props: PhaserPlayZoneProps) {
  // wrapperRef: 우리가 크기를 전적으로 통제하는 바깥 박스(width/aspectRatio 고정).
  // mountRef: Phaser에게 그대로 넘겨서 Phaser가 자유롭게 스타일을 써도 되는 안쪽 엘리먼트 — 이 둘을
  // 분리하지 않으면 Phaser의 Scale Manager가 parent 엘리먼트에 직접 height를 써버려서(FIT/CENTER_BOTH
  // 보정 과정에서 몇 초에 걸쳐 값이 바뀜) 우리 aspectRatio가 무력화되고 바깥 레이아웃이 계속
  // 리사이즈되는 원인이 됐었음(진단 로그로 확인: canvas 자체는 처음부터 안정적이었는데 parent로 넘긴
  // 엘리먼트의 실제 높이만 2초에 걸쳐 계속 줄어들었음).
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);
  const sceneRef = useRef<PlayZoneScene | null>(null);
  const propsRef = useRef(props);
  propsRef.current = props;
  const [ready, setReady] = useState(false);

  useEffect(() => {
    // React StrictMode(dev)는 이 effect를 mount→cleanup→mount로 두 번 실행함. 첫 번째 Phaser.Game이
    // destroy된 뒤에도 그 READY 콜백이 비동기로 나중에 도착할 수 있는데, 이걸 막지 않으면 sceneRef.current가
    // 이미 죽은(첫 번째) 씬으로 덮어써져서, 실제 화면에 남아있는(두 번째) 캔버스가 이후 props 동기화를
    // 전혀 못 받는 경쟁 상태가 생김(카드가 시각적으로는 보이지만 클릭이 하나도 안 먹는 버그로 나타남).
    let cancelled = false;

    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: mountRef.current ?? undefined,
      backgroundColor: "#ffffff",
      scene: PlayZoneScene,
      // 내부 게임 좌표계(PlayZoneScene의 모든 좌표 계산 기준)는 SCENE_WIDTH/HEIGHT 그대로 유지하고,
      // 화면에 그려지는 크기만 부모 컨테이너 폭에 맞춰 비율 유지하며 축소 — 모바일에서 캔버스가
      // 뷰포트보다 커서 화면을 넘치던 문제를 씬 좌표 재계산 없이 해결.
      scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: SCENE_WIDTH,
        height: SCENE_HEIGHT,
      },
      // 터치 스와이프에 preventDefault를 걸지 않게 해서, 캔버스 위에서도 페이지 스크롤이 통과되게 함
      // (카드 선택은 탭 동작이라 스크롤 통과와 무관하게 그대로 동작).
      input: {
        touch: {
          capture: false,
        },
      },
    });
    gameRef.current = game;

    game.events.once(Phaser.Core.Events.READY, () => {
      if (cancelled) return;
      const scene = game.scene.keys["PlayZoneScene"] as PlayZoneScene;
      sceneRef.current = scene;
      scene.syncState({ ...propsRef.current, onHighlight: (hand) => propsRef.current.onHighlight(hand) });
      // create() 직후엔 라벨/빈 슬롯만 그려진 골격 상태라, syncState로 실제 카드를 채운 바로 다음에만
      // 드러냄(이제 mount 엘리먼트가 분리되어 있어 별도의 리사이즈-안정화 대기는 필요 없음).
      setReady(true);
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
      onHighlight: (hand) => propsRef.current.onHighlight(hand),
      highlightedHand: props.highlightedHand,
      selfCard: props.selfCard,
      selfOutcome: props.selfOutcome,
      opponentCard: props.opponentCard,
      opponentOutcome: props.opponentOutcome,
      revealed: props.revealed,
    });
  }, [
    props.availableCards,
    props.highlightedHand,
    props.selfCard,
    props.selfOutcome,
    props.opponentCard,
    props.opponentOutcome,
    props.revealed,
  ]);

  return (
    <div
      ref={wrapperRef}
      className="mx-auto overflow-hidden"
      style={{
        // 부모(Card 등)가 flex 자식이라 퍼센트(%) 기준 폭이 불확정적이라, 뷰포트(vw) 기준으로 직접 계산해서
        // 모바일에서도 항상 화면 폭 안에 들어오도록 함(7rem은 페이지/Card 좌우 패딩 합만큼 여유를 둔 값).
        width: `min(${SCENE_WIDTH}px, calc(100vw - 7rem))`,
        aspectRatio: `${SCENE_WIDTH} / ${SCENE_HEIGHT}`,
        touchAction: "pan-y",
        // 부트 골격이 잠깐 보이는 것만 가림(위 useEffect의 READY 핸들러 참고). overflow-hidden은
        // Phaser가 mountRef 엘리먼트에 어떤 크기를 쓰든 바깥 박스 크기(=이 엘리먼트의 aspectRatio)를
        // 벗어나는 부분을 시각적으로 잘라내는 안전장치.
        opacity: ready ? 1 : 0,
        transition: "opacity 120ms ease-out",
      }}
    >
      <div ref={mountRef} style={{ width: "100%", height: "100%" }} />
    </div>
  );
}

export default PhaserPlayZone;
