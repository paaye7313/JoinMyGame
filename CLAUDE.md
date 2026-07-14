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
| Frontend | React, Vite, TypeScript |
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
│       │   └── GamePage.tsx   ← 게임 진행, 결과, 재경기
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
  players: Player[];
  gameState: GameState;
}
```

### Player

```typescript
interface Player {
  socketId: string;
  nickname: string;       // 임시 닉네임 (로그인 없음)
  ready: boolean;
  selectedHand: Hand | null;
}
```

### Hand (RPS 전용)

```typescript
type Hand = "scissors" | "rock" | "paper";
```

---

## Socket 이벤트 설계

### Client → Server

| 이벤트 | 페이로드 | 설명 |
|---|---|---|
| `createRoom` | `{ nickname }` | 방 생성 요청 |
| `joinRoom` | `{ roomCode, nickname }` | 방 참가 요청 |
| `ready` | `{ roomCode }` | Ready 상태 전환 |
| `selectHand` | `{ roomCode, hand }` | 손 선택 |
| `rematch` | `{ roomCode }` | 재경기 요청 |

### Server → Client

| 이벤트 | 페이로드 | 설명 |
|---|---|---|
| `roomCreated` | `{ roomCode }` | 방 생성 완료 |
| `playerJoined` | `{ players }` | 상대방 입장 알림 |
| `gameStarted` | — | 두 플레이어 모두 Ready, 게임 시작 |
| `result` | `{ winner, hands }` | 승패 결과 |
| `rematchStarted` | — | 재경기 시작 |
| `error` | `{ message }` | 에러 전달 |

---

## 게임 진행 플로우

```
[메인 화면]
  ├── 방 만들기 → 6자리 코드 생성 → 상대 대기
  └── 방 참가  → 코드 입력 → 입장

[대기실]
  두 플레이어 모두 Ready → gameStarted 이벤트

[게임]
  양측 동시에 가위/바위/보 선택 → selectHand
  서버에서 승패 판정 → result 이벤트 동시 전송

[결과]
  두 플레이어 모두 Rematch Ready → rematchStarted → 게임 재시작
```

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
