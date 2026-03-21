# TempoEdu

TempoEdu is a full-stack peer-to-peer learning platform where users teach and learn skills through live sessions, chat, credits, reviews, and certificates.

## Platform Highlights

- Skill marketplace: publish skills to offer or request.
- Session lifecycle: request, accept, reject, cancel, complete.
- Live communication: real-time chat and WebRTC video calls.
- Credits economy: controlled credit transfer per completed session.
- Reviews and reputation: build trust with feedback and ratings.
- Earned skills and certificates: claim public achievements and export certificates as PDF.
- Admin tools: monitor platform usage and manage users.

## Tech Stack

### Backend
- NestJS
- MongoDB + Mongoose
- Socket.IO
- JWT authentication
- Jest unit testing

### Frontend
- React + TypeScript
- Vite
- Tailwind CSS
- Socket.IO client

### Deployment
- Docker + Docker Compose

## Demonstrative Pictures

### 1) Platform Architecture
![TempoEdu Architecture](docs/images/architecture.svg)

### 2) User Learning Flow
![TempoEdu User Flow](docs/images/user-flow.svg)

### 3) Certificate Preview Concept
![TempoEdu Certificate Preview](docs/images/certificate-preview.svg)

## Core User Journey

1. A user creates or discovers skills.
2. A learner requests a session with a teacher.
3. Teacher accepts and a live room is generated.
4. Users communicate through chat and video.
5. On completion, credits are transferred.
6. Learner claims the earned skill and generates a branded certificate PDF.

## Project Structure

```text
TempoEdu/
  TempoEdu-backend/   # NestJS API, websocket gateways, data models, tests
  TempoEdu-frontend/  # React app, pages, services, UI components
  docs/images/        # Public project visuals used in README
```

## Quick Start

### Run with Docker

```bash
cd TempoEdu-backend
docker compose build
docker compose up -d
```

### Production Deploy (Recommended For VPS)

Use the optimized production stack at the repository root:

```bash
cp .env.prod.example .env.prod
# Edit .env.prod and set JWT_SECRET + CORS_ORIGIN

docker compose --env-file .env.prod -f docker-compose.prod.yml build
docker compose --env-file .env.prod -f docker-compose.prod.yml up -d
```

Useful production operations:

```bash
# Check service status and healthchecks
docker compose --env-file .env.prod -f docker-compose.prod.yml ps

# Follow logs
docker compose --env-file .env.prod -f docker-compose.prod.yml logs -f

# Pull down safely
docker compose --env-file .env.prod -f docker-compose.prod.yml down
```

### Daily Mongo Backups (Automatic)

The production compose stack includes a `mongo-backup` cron container.

- Schedule: daily at `03:15` server time
- Storage: Docker volume `mongobackups`
- Retention: controlled by `BACKUP_RETENTION_DAYS` in `.env.prod`

Check backup files:

```bash
docker compose --env-file .env.prod -f docker-compose.prod.yml exec mongo-backup ls -lah /backups
```

### Droplet Security Checklist

See full guide in [docs/deployment-hardening.md](docs/deployment-hardening.md) for:

- UFW firewall rules
- fail2ban setup
- SSH hardening
- backup restore commands

### GitHub Actions Auto-Deploy

Workflow file: `.github/workflows/deploy.yml`

It deploys automatically on push to `main` (or manual trigger), via SSH.

Required GitHub repository secrets:

- `DO_HOST`: droplet IP or hostname
- `DO_USER`: SSH user
- `DO_SSH_KEY`: private SSH key
- `DO_PORT`: optional SSH port (default 22)
- `APP_DIR`: optional app directory on server (default `$HOME/TempoEdu`)

Server requirements for deploy workflow:

1. Repository already cloned on server in `APP_DIR`
2. `.env.prod` present on server (never committed)
3. Docker + Docker Compose installed

### Run locally

```bash
# backend
cd TempoEdu-backend
npm install
npm run start:dev

# frontend
cd ../TempoEdu-frontend
npm install
npm run dev
```

## Tests

```bash
cd TempoEdu-backend
npm run test
```

## Author

Built by the TempoEdu team.
