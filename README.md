# JoinMyGame

가위바위보 멀티플레이 웹 게임. Docker 기반 개발 환경 구축과 Claude Code 워크플로우 학습을 목표로 하는 프로젝트입니다.

## 실행 방법

```bash
docker compose up --build
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000 (헬스체크: `/health`)

## 기술 스택

- Frontend: React, Vite, TypeScript
- Backend: Node.js, Express, Socket.IO, TypeScript
- 개발 환경: Docker, Docker Compose

자세한 프로젝트 구조와 설계는 [CLAUDE.md](./CLAUDE.md)를 참고하세요.
