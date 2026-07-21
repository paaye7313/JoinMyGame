# CLAUDE.md — JoinMyGame 프로젝트 오버뷰

> 이 파일은 Claude Code에서 Claude가 프로젝트 컨텍스트를 즉시 파악할 수 있도록 작성된 오버뷰입니다.
> 프로젝트 루트(`JoinMyGame/`)에 위치시켜 주세요.

---

## 프로젝트 개요

**이름:** JoinMyGame  
**목적:** 가위바위보 멀티플레이 웹 게임 — 단, 게임 구현 자체보다 **Docker 기반 개발 환경 구축**과 **Claude Code를 활용한 개발 워크플로우 학습**이 핵심 목표입니다.  
**중요:** 이 프로젝트는 일회성이 아닌, 향후 오목·묵찌빠·카드게임 등 여러 멀티플레이 게임을 추가할 수 있는 **기반 플랫폼**으로 설계합니다.

---

## 기술 스택

| 영역 | 기술 |
|---|---|
| Frontend | React, Vite, TypeScript, Phaser (게임 화면 렌더링) |
| Backend | Node.js, Express, Socket.IO, TypeScript |
| 개발 환경 | Docker, Docker Compose |
| 패키지 관리 | npm |
| DB / Cache | **사용 안 함** (MVP 범위 외) |

---

## 프로젝트 구조

```
JoinMyGame/
├── CLAUDE.md                  ← 이 파일
├── docker-compose.yml
├── .gitignore
├── README.md
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   └── src/
│       ├── pages/
│       │   ├── MainPage.tsx   ← 방 만들기 / 방 참가 선택
│       │   ├── RoomPage.tsx   ← 대기실, Ready 버튼
│       │   └── GamePage.tsx   ← 게임 진행, 결과, 재경기 (카드 대결 화면은 Phaser로 렌더링)
│       ├── game/rps/
│       │   ├── phaser/PlayZoneScene.ts        ← Phaser Scene, 카드 그리기/선택/뒤집기 연출
│       │   └── components/PhaserPlayZone.tsx  ← React ↔ Phaser 브릿지 (마운트 시 Game 생성, props 변경 시 syncState)
│       ├── components/
│       │   ├── Room/
│       │   └── Game/
│       ├── hooks/
│       │   └── useSocket.ts   ← Socket 연결 관리 (컴포넌트와 분리)
│       └── types/
│           └── index.ts       ← 공유 타입 정의
│
└── backend/
    ├── Dockerfile
    ├── package.json
    └── src/
        ├── server.ts          ← 진입점, Express + Socket.IO 초기화
        ├── socket/            ← Socket 이벤트 핸들러 (이벤트 수신/발신만 담당)
        ├── room/              ← Room 생성·참가·관리 비즈니스 로직
        └── game/
            ├── index.ts       ← 게임 타입 라우팅
            └── rps/
                ├── rps.game.ts    ← 승패 판정 로직
                └── rps.types.ts   ← RPS 전용 타입
```

> **설계 원칙:** Socket 이벤트 핸들러(`socket/`)와 비즈니스 로직(`room/`, `game/`)을 반드시 분리합니다.

---

## MVP 기능 범위

### 구현할 기능

- 방 생성 (6자리 랜덤 코드 발급)
- 방 참가 (코드 입력)
- 두 플레이어 Ready 상태 관리
- 실시간 가위/바위/보 선택
- 서버에서 승패 판정 후 동시 전송
- 재경기 (Rematch)

### 구현하지 않는 기능 (명시적 제외)

로그인, 회원가입, DB 저장, 랭킹, 전적, 친구 목록, 채팅

---

## 상태(State) 설계

### GameState (열거형)

```
WAITING → READY → PLAYING → RESULT → (WAITING)
```

### Room

```typescript
interface Room {
  roomCode: string;       // 6자리 코드
  gameType: string;       // "rps" | 향후 "omok" 등 확장 대비
  maxPlayers: number;      // 게임 종류별 정원 — backend/src/game/registry.ts의 GAME_DEFS에서 gameType별로 조회해 방 생성 시 고정
  players: Player[];
  gameState: GameState;
  drawStack: number;       // 누적 무승부 횟수 (연속일 필요 없음, 카드 리셋 트리거용) — DRAWS_TO_RESET(=3)에 도달하면 양쪽 카드 초기화 + 0으로 리셋
  winsToMatch: number;     // 매치 승리에 필요한 승수 — 2(3판 2선승) 또는 3(5판 3선승, 기본값)
}
```

### Player

```typescript
interface Player {
  socketId: string;
  nickname: string;       // 임시 닉네임 (로그인 없음)
  ready: boolean;
  selectedHand: Hand | null;
  wins: number;           // 현재 매치 내 라운드 승수
  cards: Record<Hand, number>; // 보유 카드 수량 (특수카드 시스템, 아래 참고)
  isAI?: boolean;         // AI(컴퓨터) 상대 여부 — 아래 "AI 대전" 절 참고
}
```

> 같은 방에서 닉네임이 겹치면 두 번째로 들어온 플레이어부터 자동으로 `(2)`, `(3)`... 구분자가 붙음(`room.service.ts`의 `dedupeNickname`, `joinRoom`에서 적용). `(2)`가 이미 다른 이유로 쓰이고 있어도 다음 번호를 계속 찾으므로 인원이 늘어나도(3인 이상 게임 확장 대비) 그대로 동작.

### 매치(Match) 규칙

- 한 라운드 = 가위/바위/보(또는 특수카드) 1회 판정. 한 매치 = **`room.winsToMatch`만큼 먼저 승리**하면 종료.
- 경기 방식은 대기실(`RoomPage`)에서 두 값 중 선택 가능: `winsToMatch=2`(3판 2선승) / `winsToMatch=3`(5판 3선승, **기본값**). 어느 플레이어든 변경 가능하며, 변경 시 양쪽 Ready 상태가 초기화됨(`setMatchFormat` 이벤트).
- 무승부 라운드는 승수에 반영되지 않고 그대로 다음 라운드로 이어짐(둘 다 승수 그대로 재도전). 단, **카드는 승/패/무 구분 없이 낼 때마다 소모됨** — 무승부라고 카드가 아끼지진 않음.
- 무승부가 `room.drawStack` 기준 **누적 3회**(연속일 필요 없음, `DRAWS_TO_RESET`)가 되면 양쪽 카드가 매치 시작 상태(기본 각 2장 + 무작위 특수 1장)로 통째로 초기화되고 `drawStack`도 0으로 리셋(승점은 안 건드림) — 카드 소모가 무승부에도 적용되면서 생긴 고갈 위험을 막는 안전장치. 매치가 끝나고 새 매치가 시작될 때도 `drawStack`은 0으로 리셋됨.
- `room.service.ts`의 `DEFAULT_WINS_TO_MATCH`(=3)/`ALLOWED_WINS_TO_MATCH`(=[2,3]) 상수로 관리, `isMatchOver(room)`이 `room.winsToMatch` 기준으로 매치 종료 여부 판단.
- 매치가 끝난 뒤 양측이 재경기에 동의하면(`rematch`) 두 플레이어의 `wins`가 0으로 초기화되고 새 매치 시작. 매치 도중(아직 결판 안 남) 양측이 동의하면 `wins`는 유지된 채 다음 라운드로만 진행.

### Hand (RPS 전용)

```typescript
type Hand = "scissors" | "rock" | "paper";
```

> **UI 순서 규칙**: 카드/이모지 등 화면에 손 모양을 나열할 때는 항상 한국어 관용 순서인 **가위 → 바위 → 보**를 따른다(영어의 "rock-paper-scissors" 순서 아님). 특수카드도 대응 순서(총→중지→거울)로 맞춘다. `frontend/src/game/rps/cards.ts`의 `HAND_CARDS` 배열 순서가 기준.

---

## 게임 선택 방식

여러 게임을 지원하는 플랫폼이라, 어떤 게임을 할지 고르는 지점과 방법을 다음과 같이 고정한다:

- **선택 시점**: 방을 만들기 전, `MainPage`에서만 고른다. 방은 생성되는 순간 `gameType`(과 그에 따른 `maxPlayers`)이 고정되며, 도중에 바꿀 수 없다.
- **초대 링크로 들어온 상대**: 선택지가 없다. `JoinInvitePage`/코드 입력 참가 모두 방에 이미 저장된 `gameType`을 그대로 따른다.
- **레지스트리 패턴**: 실제로 구현된 게임만 `backend/src/game/registry.ts`의 `GAME_DEFS`(`{ [gameType]: { maxPlayers, supportsAI? } }`)에 등록한다. `frontend/src/game/registry.ts`의 `GAME_OPTIONS`가 `MainPage`의 선택 UI를 렌더링하는 소스 — 아직 실제로 구현되지 않은 게임은 `comingSoon: true`로 표시해 선택은 안 되고 "준비 중"만 보이게 해둔다(현재 4인 게임 자리 표시자가 이 상태).
- **새 게임 추가 절차**: (1) 백엔드 `GAME_DEFS`에 항목 추가 + `backend/src/game/<name>/`에 게임 로직 모듈 작성 + `backend/src/game/index.ts`의 `judgeGame` 스위치에 `case` 추가, (2) 프론트 `GAME_OPTIONS`의 해당 항목을 `comingSoon` 없이 실제 게임으로 교체. **`room/`, `socket/`는 건드리지 않아도 된다** — `room.service.ts`/`socket/index.ts`는 이미 `gameType`을 매개변수로 받아 레지스트리에서 정원을 조회하는 일반적인 구조로 되어 있음(가위바위보 하나만 있던 시절엔 `gameType`이 `"rps"`로 하드코딩되어 있었고 `MAX_PLAYERS=2`도 상수였는데, 두 번째 게임(4인용) 논의를 계기로 일반화함).
- **아직 일반화하지 않은 부분(후속 과제)**: `room.service.ts`의 `cards`/`wins`/`winsToMatch`/`applyRoundResult`(무승부·카드 소모·1:1 승패 판정)는 여전히 RPS 전용 로직이 그대로 박혀 있다. 두 번째 게임(4인용, 룰 미정)이 실제로 설계되면 이 부분을 게임별 인터페이스로 분리하는 작업이 별도로 필요함 — 룰이 정해지지 않은 상태에서 미리 일반화하지 않기로 함(추측성 설계 방지).

## AI 대전

혼자서도 즐길 수 있도록, 대기실(`RoomPage`)에서 상대가 없을 때 빈 자리를 AI로 채울 수 있다.

- **진입 방식**: `MainPage`/`createRoom`은 전혀 관여하지 않는다. 방을 만든 뒤 대기실에서 정원이 덜 찼고(`players.length < maxPlayers`) 해당 게임이 `GAME_DEFS[gameType].supportsAI`(현재 `rps`만 true)를 지원하면 "AI로 채우기" 버튼이 뜨고, `addAiPlayer` 이벤트로 남은 빈 자리를 전부 AI 플레이어로 채운다. AI가 이미 있으면 같은 자리에 "AI 제거" 버튼이 대신 뜨고 `removeAiPlayer`로 되돌릴 수 있다(토글).
- **"AI는 항상 ready" 불변식**: AI 플레이어는 생성 시 `ready: true`로 시작하고, `room.service.ts`에서 `p.ready = false`로 전원을 리셋하는 모든 지점(`applyRoundResult`, `markRematchReady`의 새 라운드 진입, `setMatchFormat`)이 실제로는 `p.ready = !!p.isAI`로 되어 있어 AI만은 리셋되지 않는다. 덕분에 `ready`/`rematch`/`setMatchFormat` 소켓 핸들러는 AI를 전혀 의식하지 않아도 되고, 사람이 한 번만 액션을 취하면(Ready 누르기, 재경기 누르기) 즉시 다음 단계로 넘어간다.
- **손 선택 전략**: `backend/src/game/rps/rps.ai.ts`의 `chooseAiHand(cards)` — 보유한 특수카드(총/중지/거울)가 있으면 그중 무작위로 우선 내고, 없으면 기본 카드 중 무작위로 낸다. 사람 쪽엔 상대의 `specialCardCount`가 이미 보이므로(카드 시스템 절 참고) 예측 가능하면서도 완전 랜덤보다 약간 도전적인 난이도. `socket/index.ts`의 `selectHand` 핸들러가 사람의 선택 직후 AI 몫을 대신 골라 즉시 `roomService.selectHand`를 호출해준다.
- **정리**: 사람이 나가면(`leaveRoom`/`disconnect`) 상대할 사람이 없는 AI도 함께 제거되어(`removePlayer`) 방이 자동 삭제된다(기존 "정원 0이면 방 삭제" 로직을 그대로 재사용). AI는 실제 연결된 소켓이 없으므로 `broadcastPlayers`가 AI에게는 emit하지 않는다.

## Socket 이벤트 설계

### Client → Server

| 이벤트 | 페이로드 | 설명 |
|---|---|---|
| `createRoom` | `{ nickname, gameType }` | 방 생성 요청. `gameType`은 `backend/src/game/registry.ts`의 `GAME_DEFS`에 등록된 것만 허용, 아니면 `error`로 거부 |
| `joinRoom` | `{ roomCode, nickname }` | 방 참가 요청 |
| `ready` | `{ roomCode }` | Ready 상태 전환 |
| `selectHand` | `{ roomCode, hand }` | 손 선택 |
| `rematch` | `{ roomCode }` | 재경기 요청 |
| `leaveRoom` | — | 방 나가기 요청 (자발적으로 나가는 경우; 연결 종료 시엔 `disconnect`가 동일 로직을 처리) |
| `setMatchFormat` | `{ roomCode, winsToMatch }` | 경기 방식 변경 요청 (2 또는 3만 허용, 대기실에서만 의미 있음) |
| `addAiPlayer` | `{ roomCode }` | 대기실에서 빈 자리를 AI로 채우는 요청 (해당 게임이 `supportsAI`이고 정원이 덜 찼을 때만) |
| `removeAiPlayer` | `{ roomCode }` | 방에 있는 AI 플레이어 제거 요청 |
| `chatMessage` | `{ roomCode, message }` | 채팅 메시지 전송 (대기실/게임 화면 공통) |

### Server → Client

| 이벤트 | 페이로드 | 설명 |
|---|---|---|
| `roomCreated` | `{ roomCode, gameType, maxPlayers, winsToMatch }` | 방 생성 완료 |
| `playerJoined` | `{ players, gameType, maxPlayers, winsToMatch }` | 상대방 입장 알림 |
| `playersUpdated` | `{ players }` | 플레이어 상태(ready 등) 변경 시 전체 목록 브로드캐스트 (Ready/재경기 동의 실시간 표시용, AI 추가/제거도 이 이벤트로 전달) |
| `playerLeft` | `{ players }` | 상대방 연결 종료로 방을 나감 (남은 플레이어를 대기실로 되돌리는 용도) |
| `matchFormatUpdated` | `{ winsToMatch }` | 경기 방식(3판 2선승/5판 3선승)이 변경됨 — 대기실에 있는 양쪽에 브로드캐스트 |
| `gameStarted` | `{ players, gameType, maxPlayers, winsToMatch, drawStack }` | 정원(`maxPlayers`)만큼 모두 Ready, 게임 시작. payload를 실어 보내는 이유: 클라이언트가 자신의 로컬 상태(클로저)에 의존하면 다른 이벤트와 연달아 도착할 때 리액트 상태 반영 전 값을 읽는 경쟁 상태가 생길 수 있어, 항상 이 payload를 신뢰해야 함 |
| `result` | `{ winner, hands, winsDelta, scores, matchOver, cardsReset, drawStack }` | 라운드 결과. `scores`는 `{ socketId: 승수 }`, `matchOver`는 이 라운드로 매치가 끝났는지, `cardsReset`은 이 라운드로 무승부 누적이 `DRAWS_TO_RESET`에 도달해 양쪽 카드가 초기화됐는지, `drawStack`은 갱신된 누적 무승부 횟수 |
| `rematchStarted` | `{ drawStack }` | 재경기(또는 다음 라운드) 시작. 새 매치가 시작된 경우 `drawStack`은 0 |
| `chatMessage` | `{ socketId, nickname, message, timestamp }` | 채팅 메시지 브로드캐스트 (같은 방 전체, 카드처럼 수신자별로 가릴 필요가 없어 단순 `io.to(roomCode).emit`) |
| `error` | `{ message }` | 에러 전달 |

### 채팅 제한 규칙

DB/로그인이 없는 MVP 특성상 신고·차단 대신 서버(`backend/src/chat/chat.service.ts`)에서 다음을 검증하고, 위반 시 기존 `error` 이벤트로 알림:

- 메시지 길이 200자 초과 금지, 빈 메시지 금지, 제어문자(널바이트 등) 포함 금지
- 소켓당 최소 전송 간격 500ms(너무 빠른 연속 전송 차단)
- 동일한 메시지를 연속 3회째 보내려 하면 차단(도배 방지)
- 욕설 필터링은 하지 않음(사용자 확정 — 특수카드에 이미 중지🖕가 있어 의미 없다고 판단)
- Socket.IO 서버(`backend/src/server.ts`)에 `maxHttpBufferSize: 1_000_000`(1MB) 명시로 비정상적으로 큰 페이로드를 전송 계층에서 차단

`players`가 실리는 모든 이벤트(`playerJoined`/`playersUpdated`/`playerLeft`/`gameStarted`)는 **수신자별로 다른 payload**를 보냄(`socket/index.ts`의 `broadcastPlayers`/`toWirePlayers`) — 본인 항목은 `cards`가 정확한 값 그대로, 상대방 항목은 기본카드(가위/바위/보)만 정확하고 특수카드(총/중지/거울) 수량은 0으로 가려진 채 대신 `specialCardCount`(상대가 들고 있는 특수카드 총 개수)만 별도로 옴. 상대가 카드를 소모하는 걸 보고 전략을 짤 수 있게 하되, 어떤 특수카드를 들고 있는지는 실제로 낼 때까지 숨기기 위함.

### 연결/요청 제한

`ufw`(포트 필터링)와 `fail2ban`(SSH 브루트포스 차단)만으로는 애플리케이션 레벨(소켓 연결, 방 생성/참가)의 남용을 못 막아서, `backend/src/security/rateLimiter.ts`의 범용 슬라이딩 윈도우 리미터(`createRateLimiter(maxAttempts, windowMs)`)로 두 곳을 제한(`socket/index.ts`):

- **연결 자체**: IP(`socket.handshake.address`)당 분당 20회 — `io.use` 미들웨어에서 검사, 초과 시 핸드셰이크를 거부(`next(new Error(...))`, 클라이언트에는 `connect_error`로 전달되고 `App.tsx`가 토스트로 표시)
- **`createRoom`/`joinRoom`**: IP당 분당 10회 — 초과 시 핸들러 진입을 막고 기존 `error` 이벤트로 안내
- 채팅(`chat.service.ts`)은 메시지 내용 검증까지 얽혀있어 이 공용 리미터를 쓰지 않고 별도 구현 유지
- 현재 Docker 브리지 네트워크(포트 매핑, 리버스 프록시 없음) 구성에서는 컨테이너가 보는 `socket.handshake.address`가 클라이언트의 실제 IP와 같음(DNAT는 목적지만 바꾸고 출발지 IP는 보존). 나중에 nginx 등 리버스 프록시를 앞에 두면 이 주소가 프록시의 IP로 바뀌므로, 그때는 `X-Forwarded-For`를 신뢰하도록 별도 설정이 필요함.
- 대규모 분산 DoS(DDoS) 자체는 이 리미터로 막을 수 없음(앱 레벨 조치의 한계) — 여기서는 단일 IP의 과도한 반복 요청만 완화.

---

## 게임 진행 플로우

```
[메인 화면]
  ├── 방 만들기 → 6자리 코드 생성 → 상대 대기
  └── 방 참가  → 코드 입력 → 입장

[URL 초대]
  /room/{6자리 코드}로 직접 접속 → 닉네임 확인 화면(JoinInvitePage) → 입장하기
  (방이 없거나 가득 찼으면 기존 joinRoom 에러가 그대로 표시되고 "메인으로"로 탈출)

[대기실]
  두 플레이어 모두 Ready → gameStarted 이벤트

[게임]
  양측 동시에 가위/바위/보 선택 → selectHand
  서버에서 승패 판정 → result 이벤트 동시 전송

[결과]
  두 플레이어 모두 Rematch Ready → rematchStarted → 게임 재시작
```

### 방 초대 URL / 닉네임

- 방 생성/참가 시 브라우저 주소가 `history.pushState`로 `/room/{roomCode}`로 바뀌고, 대기실의 방 코드 버튼을 탭하면 이 전체 URL이 클립보드에 복사됨(기존엔 6자리 코드만 복사했음). 이 URL을 그대로 열면 `JoinInvitePage`(닉네임 확인 후 입장 전용 화면)로 진입.
- 별도 라우팅 라이브러리 없이 `App.tsx`가 `window.location.pathname`을 `/^\/room\/(\d{6})$/`로 파싱하는 수동 방식(화면이 몇 개 안 되는 프로젝트 규모 고려). 뒤로가기(`popstate`)로 이전 화면을 복원하는 로직은 의도적으로 없음 — 새로고침 시 세션이 사라지는 기존 구조(DB 없음)와 일관되게, URL은 공유 링크 용도로만 정확히 유지됨.
- 닉네임은 `frontend/src/nickname.ts`가 `localStorage`(`jmg_nickname`)에 저장/재사용. 저장된 값이 없으면 `손님{4자리 랜덤 숫자}` 형식의 임시 닉네임을 자동 생성해 채워두고, 방 생성/참가/초대 입장 시점에 입력한 값으로 갱신됨.

---

## Docker 구성

컨테이너는 두 개만 사용합니다.

```
[frontend 컨테이너]  →  [backend 컨테이너]
  React + Vite           Express + Socket.IO
  port: 5173             port: 3000
```

- DB 컨테이너 없음
- Redis 컨테이너 없음
- 필요 시 이후 `docker-compose.yml`에 추가

---

## 개발 순서 (Claude Code 작업 단위)

기능 단위로 하나씩 완성 후 테스트, 그 다음 단계로 진행합니다.

```
1. Docker 환경 구성 (docker-compose.yml, Dockerfile × 2)
2. Frontend 프로젝트 생성 (Vite + React + TypeScript)
3. Backend 프로젝트 생성 (Express + TypeScript)
4. Socket.IO 연결 확인
5. 방 생성 기능
6. 방 참가 기능
7. Ready 기능
8. 가위바위보 게임 구현
9. 재경기 기능
10. 리팩터링
```

---

## 코드 작성 원칙

- TypeScript 적극 활용, `any` 사용 금지
- 함수·클래스는 단일 책임 원칙(SRP) 준수
- Socket 이벤트 처리와 비즈니스 로직 분리 유지
- 코드 품질보다 **작동하는 MVP 우선**, 이후 리팩터링
- 새 게임 추가 시 기존 코드(`room/`, `socket/`)를 수정하지 않고 `game/` 하위에 추가만 하는 구조 목표

---

## 진행 규칙
- 작업 시작 전 PROGRESS.md를 읽고 현재 상태를 파악할 것
- 작업 완료 후 반드시 PROGRESS.md를 업데이트할 것

---

## 향후 확장 계획

`gameType` 필드와 `game/` 폴더 구조를 통해 아래 게임들을 기존 코드 변경 없이 추가할 수 있도록 설계합니다.

- 묵찌빠
- 오목
- 간단한 카드게임
- 실시간 액션 게임

Room 관리, Socket 통신, 플레이어 관리 코드는 모든 게임에서 공유합니다.

### Phaser 엔진 (정식 채택, `GamePage`의 기본 렌더러)

캐릭터가 움직이는 2D 액션/아케이드 게임을 다음 확장으로 구상 중이라, `/phaser-test` 경로에서 가위바위보를 Phaser로 이식해 품질 검증을 거친 뒤(`PROGRESS.md` 기록 참고), 그 결과를 정식 `GamePage`로 승격함. 카드 대결 화면은 `frontend/src/game/rps/phaser/PlayZoneScene.ts`(Phaser Scene, 카드 그리기/선택/뒤집기 연출)와 `frontend/src/game/rps/components/PhaserPlayZone.tsx`(React ↔ Phaser 브릿지 — 마운트 시 1회 `Phaser.Game` 생성, 이후 props 변경마다 `scene.syncState(...)` 호출)로 렌더링됨. 실험 단계에서 쓰던 `/phaser-test` 전용 페이지(`PhaserGamePage.tsx`)와 구버전 비-Phaser 카드 컴포넌트(`PlayZone.tsx`, `HandCard.tsx`)는 삭제했고, `App.tsx`의 엔진 분기(`?engine=phaser` 쿼리)도 제거함 — 이제 `GamePage`가 곧 Phaser 버전이라 분기가 필요 없음.

현재 설치된 패키지명은 `phaser`(4.x, API는 기존에 알려진 Phaser 3와 거의 동일 — `Scene`/`GameObjectFactory`/`Tweens` 등 마이그레이션 이슈 없음, 다만 `SceneManager`에 `getScene()` 같은 헬퍼는 없어서 `game.scene.keys["씬이름"]`으로 인스턴스를 직접 가져와야 함). Phaser가 새 의존성이라 번들 크기 경고(500KB 초과)가 발생하는데, 알려진 트레이드오프로 별도 code-splitting은 하지 않음.
