<div align="center">

# ResideFix

**A unified complaint and maintenance tracking platform for hostels, apartments and boarding houses.**

![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)
![Node.js](https://img.shields.io/badge/Node.js-24_LTS-339933?logo=nodedotjs&logoColor=white)
![Express](https://img.shields.io/badge/Express-4-000000?logo=express&logoColor=white)
![MongoDB](https://img.shields.io/badge/MongoDB-7-47A248?logo=mongodb&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Compose-2496ED?logo=docker&logoColor=white)
![Nginx](https://img.shields.io/badge/Nginx-reverse_proxy-009639?logo=nginx&logoColor=white)

</div>

Residents report maintenance issues (electrical, plumbing, internet, security and more)
with a category and priority, then follow each complaint until it is fixed. Property
managers, wardens and landlords get one dashboard to update every complaint across all
their properties, plus analytics on resolution time, common issue types and load per property.

> DevOps Engineering module project — Group 18
> EG/2023/5606 Garusinghe T. S. · EG/2023/5607 Geeganage S. P.

---

## Contents

- [Features](#features)
- [Tech stack](#tech-stack)
- [Quick start (Docker)](#quick-start-docker)
- [Lab deployment](#lab-deployment)
- [Local development](#local-development)
- [Configuration](#configuration)
- [Project structure](#project-structure)
- [API](#api)
- [Common commands](#common-commands)
- [Troubleshooting](#troubleshooting)

## Features

| Residents | Managers / landlords |
|-----------|----------------------|
| Sign up, log in, stay logged in (JWT) | See every complaint across all properties, with the reporter |
| Report an issue with title, description, category, priority and property | Move complaints between *Open*, *In progress* and *Resolved* (resolution time is recorded) |
| Edit or withdraw a complaint while it is still open | Delete complaints |
| Follow status from *Open* → *In progress* → *Resolved* | Analytics: average resolution time, most common issue, unresolved high-priority count, complaints per property, 14-day trend |

Both roles get status counts, search, filters, automatic refresh every 30 seconds and a
layout that works on phones.

## Tech stack

| Layer | Technology |
|-------|------------|
| Frontend | React 19, React Router 7, Vite 8 — served by Nginx in production |
| Backend | Node.js 24 LTS, Express 4, Mongoose 8, JWT, bcrypt, Helmet, express-rate-limit |
| Database | MongoDB 7 (persistent Docker volume) |
| DevOps | Docker multi-stage builds, Docker Compose, Nginx reverse proxy, health checks, GitHub Actions CI |

## Quick start (Docker)

Requirements: [Docker Desktop](https://www.docker.com/products/docker-desktop/) (running) and Git.

```powershell
git clone https://github.com/thisarasandesh923/Residefix.git
cd Residefix
docker compose up -d --build
```

Open **http://localhost:8080**. No `.env` file or manual secret is needed: on first start
the backend generates a strong random JWT secret and keeps it in a Docker volume.

The database starts empty. Sign up once as a **Property Manager / Landlord** and once as
a **Resident** to try both dashboards.

## Lab deployment

On the lab PC, the helper script does the same as above, waits until everything is
healthy, and prints the address other computers should use:

```powershell
.\scripts\start-lab.ps1
```

Other computers on the same network open **`http://<lab-pc-ip>:8080`**
(for example `http://10.90.251.143:8080`).

See **[docs/LAB_DEPLOYMENT.md](docs/LAB_DEPLOYMENT.md)** for the full step-by-step guide:
finding the IP address, Windows Firewall, updates, backups and troubleshooting.

> If PowerShell refuses to run the script, use
> `powershell -ExecutionPolicy Bypass -File .\scripts\start-lab.ps1` (only affects that one run).

## Local development

Run MongoDB in Docker and the backend/frontend directly with Node.js 20+ for instant reloads:

```powershell
docker compose -f compose.dev.yaml up -d          # MongoDB on localhost:27017

cd backend
Copy-Item .env.example .env                       # then set JWT_SECRET (see the file)
npm install
npm run dev                                       # API on http://localhost:5000

cd ..\frontend
npm install
npm run dev                                       # site on http://localhost:5173
```

Details, tests and tips: **[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)**.

## Configuration

Docker needs **no configuration**. Optional overrides go in a root `.env` file
(copy [`.env.example`](.env.example)):

| Variable | Default | Purpose |
|----------|---------|---------|
| `RESIDEFIX_PORT` | `8080` | Port on the host where the website is published |
| `JWT_SECRET` | *(auto-generated)* | Token signing secret, min. 32 characters |
| `JWT_EXPIRES_IN` | `7d` | How long a login stays valid |
| `AUTH_RATE_LIMIT` | `20` | Login/signup attempts per IP per 15 minutes |

The backend validates its settings at start-up and stops with a clear message if, for
example, `MONGO_URI` is missing — instead of failing later inside Mongoose.

## Project structure

```text
Residefix/
├── backend/                 Express REST API
│   ├── src/
│   │   ├── config/          env validation, MongoDB connection
│   │   ├── controllers/     request handlers (auth, complaints)
│   │   ├── routes/          URL → controller mapping, health checks
│   │   ├── models/          Mongoose schemas (User, Complaint)
│   │   ├── middleware/      JWT auth, roles, error handling
│   │   ├── validators/      input validation
│   │   ├── constants/  utils/
│   │   ├── app.js           Express app (no network port; used by tests)
│   │   └── server.js        starts the API, graceful shutdown
│   ├── tests/               node:test + supertest
│   └── Dockerfile
├── frontend/                React single-page app
│   ├── src/
│   │   ├── pages/           Home, Login, Signup, Dashboard, NotFound
│   │   ├── components/      ComplaintCard, ComplaintForm, StatsPanel, ProtectedRoute
│   │   ├── services/        api.js (all HTTP calls), session.js
│   │   ├── constants/  styles/
│   │   └── main.jsx, App.jsx
│   ├── nginx/default.conf   static files + /api reverse proxy
│   ├── tests/               Vitest
│   └── Dockerfile           multi-stage: Node build → Nginx
├── scripts/                 start-lab, check-deployment, backup-db, restore-db (PowerShell)
├── docs/                    ARCHITECTURE, DEVELOPMENT, LAB_DEPLOYMENT
├── compose.yaml             production / lab stack
├── compose.dev.yaml         MongoDB only, for local development
└── .env.example
```

Architecture and request flow: **[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)**.

## API

All routes are under `/api`. Complaint routes need `Authorization: Bearer <token>`.

| Method | Route | Who | Purpose |
|--------|-------|-----|---------|
| GET | `/api/health` | anyone | Liveness check |
| GET | `/api/health/ready` | anyone | Readiness (database connected) |
| POST | `/api/auth/signup` | anyone | `{ name, email, password, role?, property? }` |
| POST | `/api/auth/login` | anyone | Returns `{ token, user }` |
| GET | `/api/auth/me` | logged in | Current user |
| GET | `/api/complaints` | resident (own) / manager (all) | List; optional `?status=&category=&priority=&q=` |
| POST | `/api/complaints` | logged in | `{ title, description, property, category?, priority? }` |
| GET | `/api/complaints/stats` | manager | Analytics |
| GET | `/api/complaints/:id` | owner / manager | One complaint |
| PATCH | `/api/complaints/:id` | owner (details, while open) / manager (`status`) | Update |
| DELETE | `/api/complaints/:id` | owner (while open) / manager | Withdraw or delete |

Allowed values — category: `electrical | plumbing | internet | security | other`;
priority: `low | medium | high`; status: `open | in-progress | resolved`.

## Common commands

```powershell
docker compose ps                         # status and health of each service
docker compose logs -f backend            # follow API logs (also: frontend, mongo)
docker compose restart backend            # restart one service
docker compose down                       # stop everything — data is kept
git pull; docker compose up -d --build    # update to the latest version — data is kept
.\scripts\check-deployment.ps1            # health check from this PC
.\scripts\backup-db.ps1                   # back up the database to .\backups
```

> ⚠️ `docker compose down -v` **deletes the database volume**. Do not use it unless you
> really want to erase all data.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `Cannot connect to the Docker daemon` / `docker info` fails | Start Docker Desktop and wait for *Engine running*. |
| `port is already allocated` | Another program uses 8080. Set `RESIDEFIX_PORT=8081` in `.env` (or `.\scripts\start-lab.ps1 -Port 8081`). |
| Works on the lab PC, not from other PCs | Windows Firewall or lab network isolation — see [LAB_DEPLOYMENT.md](docs/LAB_DEPLOYMENT.md#7-windows-firewall). |
| Backend logs `Invalid configuration: MONGO_URI is not set` | Running the backend outside Docker without `backend/.env`. Copy `backend/.env.example`. |
| "Too many attempts" when logging in | Rate limit reached; wait 15 minutes or raise `AUTH_RATE_LIMIT` in `.env`. |
| Website shows "The server is not available" | `docker compose ps` — the backend should be *healthy*; check `docker compose logs backend`. |

## Security notes

The lab setup uses plain HTTP and is meant for a trusted local network. Before exposing
ResideFix to the internet, put it behind HTTPS (TLS-terminating proxy), restrict who can
register as a manager, and enable MongoDB authentication. See
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#security) for what is already in place.
