# PROGRESS

> CLAUDE.md의 "개발 순서 (Claude Code 작업 단위)" 10단계를 기준으로 진행 상황을 기록합니다.

## 1. 완료된 작업

- ✅ Docker 환경 구성 — `docker-compose.yml`, `frontend/Dockerfile`, `backend/Dockerfile` 작성 (개발용, 볼륨 마운트 기반 핫리로드)
- ✅ Frontend 프로젝트 생성 — Vite + React + TypeScript 스캐폴드 (`frontend/`)
- ✅ Backend 프로젝트 생성 — Express + TypeScript (`backend/src/server.ts`, `tsconfig.json`, `package.json`)
- ✅ Socket.IO 연결 확인 — `backend/src/socket/index.ts`에 연결/해제 핸들러 구현, handshake(`/socket.io/`) 및 `/health` 응답 검증 완료
- ✅ 방 생성 기능 — `room/room.types.ts`, `room.store.ts`(6자리 코드 발급), `room.service.ts`의 `createRoom`, socket `createRoom` → `roomCreated`
- ✅ 방 참가 기능 — `room.service.ts`의 `joinRoom`, socket `joinRoom` → `playerJoined` (방 없음/가득 참 시 `error`)
- ✅ Ready 기능 — `room.service.ts`의 `setReady`/`allReady`, 양측 Ready 시 `gameState`를 `PLAYING`으로 전환 후 `gameStarted` emit
- ✅ 가위바위보 게임 구현 — `game/rps/rps.types.ts`(Hand), `rps.game.ts`(판정), `game/index.ts`(gameType 라우팅), socket `selectHand` → 양측 선택 완료 시 `result` emit
- ✅ 재경기 기능 — `room.service.ts`의 `markRematchReady`, 양측 준비 시 손패/ready 초기화 후 `PLAYING` 재진입, `rematchStarted` emit
- ✅ Frontend 구현 — `types/index.ts`(공유 타입), `hooks/useSocket.ts`(소켓 싱글턴), `pages/MainPage.tsx`(방 생성/참가), `pages/RoomPage.tsx`(대기실/Ready), `pages/GamePage.tsx`(손 선택/결과/재경기), `App.tsx`(화면 전환)
- ✅ 리팩터링 — Vite 기본 스캐폴드 잔재(`App.css`, `assets/`, `public/icons.svg`) 정리, `index.html` 타이틀 변경
- ✅ 통합 테스트 — `docker compose up --build` 기동 후 socket.io-client로 방 생성→참가→Ready→선택→결과→재경기→재판정 전체 플로우 자동 검증 완료 (룸 코드 발급, rock-beats-scissors 판정, paper-paper 무승부 판정 모두 정상)
- ✅ 브라우저 수동 테스트 — 사용자가 직접 브라우저에서 확인, 정상 작동 확인
- ✅ GitHub 저장소 생성 및 연결 — https://github.com/paaye7313/JoinMyGame (Public), 초기 커밋 푸시 완료
- ✅ 버그 수정: 재경기 동의 없이 첫 재경기가 즉시 시작되던 문제 — `room.service.ts`의 `finishRound`가 라운드 종료 시 `player.ready`를 리셋하지 않아, 로비 Ready 단계에서 남아있던 `ready=true`가 그대로 `markRematchReady`의 `allReady()` 판정에 재사용되던 것이 원인. `finishRound`에서 라운드 종료 시 전원 `ready=false`로 초기화하도록 수정. socket.io-client 스크립트로 "한쪽만 재경기 클릭 시 rematchStarted 미발생 / 양쪽 클릭 시 발생" 검증 완료.
- ✅ 버그 수정(부분): 한글 닉네임 입력 중 마지막 글자가 사라지는 문제 — `MainPage.tsx`의 닉네임 `<input>`이 `onChange`(native `input` 이벤트)에만 의존해, IME 조합이 `input` 이벤트 없이 `compositionend`로만 끝나는 경우 React state가 갱신되지 않고, 이후 다른 상태 변화로 리렌더될 때 컨트롤드 인풋이 오래된 state로 DOM을 덮어써 글자가 사라짐. `onCompositionEnd`와 `onBlur`에서 실제 DOM 값을 state에 명시적으로 재동기화하도록 수정 — "같은 페이지 안에서 다른 입력으로 포커스 이동" 케이스는 Playwright로 재현·수정 확인 완료. 단, "브라우저 탭 전환 단축키와 마지막 키 입력이 정확히 겹쳐 그 키 자체가 브라우저 크롬으로 소비되는" 레이스 컨디션은 웹페이지 JS로 근본 해결 불가능한 브라우저/OS IME 레벨 이슈로 확인됨(대형 한국 사이트에서도 동일 현상 재현되는 것을 사용자가 확인) — 이 부분은 프로젝트 코드로 추가 조치하지 않기로 함.
- ✅ `frontend/index.html`의 `<html lang="en">` → `lang="ko"`로 변경 — 크롬이 페이지를 영어로 오인해 새로고침 시 번역 팝업이 뜨던 문제 해결 (IME 버그와는 무관, 별개 개선).

## 2. 현재 진행 중인 작업

- (없음 — CLAUDE.md 10단계 개발 순서 전체 완료 및 브라우저 검증까지 마침)

## 3. 앞으로 해야 할 작업

- ⬜ (필요 시) MVP 이후 확장: 묵찌빠, 오목, 카드게임 등 `game/` 하위 신규 게임 추가

## 4. 현재 이슈나 메모

- Windows 호스트 + Docker 조합에서 `.dockerignore` 없이 `COPY . .`를 하면 호스트에서 설치한 `node_modules`(Windows용 바이너리)가 컨테이너의 Linux용 `node_modules`를 덮어써 `tsx` 실행이 `node.exe: not found`로 실패하는 문제가 있었음. `.dockerignore`로 `node_modules` 제외 + 오염된 익명 볼륨은 `docker compose down -v`로 초기화하여 해결.
- 익명 볼륨(`/app/node_modules`)은 `docker compose up`으로 재생성해도 이전 컨테이너의 내용을 이어받는 경우가 있으므로, 의존성 관련 이슈 발생 시 `docker compose down -v` 후 재빌드할 것.
- backend/frontend 모두 로컬 검증용으로 호스트에도 `npm install`이 되어 있음 (`.gitignore`/`.dockerignore`로 제외되므로 컨테이너 빌드에는 영향 없음).
- Ready 상태는 서버가 상대방의 ready 여부를 별도로 브로드캐스트하지 않으므로(스펙상 `gameStarted`만 존재), `RoomPage`는 본인 Ready 클릭 여부만 로컬 상태로 표시함. 상대방이 Ready했는지는 UI에 노출되지 않고 양측 모두 Ready되면 바로 `gameStarted`로 게임 화면 전환됨.
- 컨테이너는 현재 실행 중 (`docker compose up -d` 상태) — 필요시 `docker compose down`.
- gh CLI가 로컬에 없었어서 winget으로 설치 후 `gh auth login`으로 로그인, `gh repo create --source=. --push`로 저장소 생성과 첫 푸시를 한 번에 진행함.
- Windows 바인드 마운트에서는 `tsx watch`(backend)와 Vite HMR(frontend) 모두 파일 변경 감지를 놓치는 경우가 있었음 — 코드 수정 후 브라우저/API에 반영이 안 되면 `docker compose restart <service>`로 강제 재시작할 것. (`index.html`처럼 Vite가 매 요청마다 디스크에서 직접 읽는 정적 파일은 재시작 없이도 즉시 반영됨.)
