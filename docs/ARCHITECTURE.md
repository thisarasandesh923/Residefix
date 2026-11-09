# Architecture

ResideFix is a three-tier MERN application: a React single-page app, an Express REST
API and a MongoDB database. In deployment each tier runs in its own Docker container.

## Containers and networks

```text
              Lab network (LAN)
  Browser on any lab PC ──► http://<lab-pc-ip>:8080
                                   │   (only published port)
 ┌─────────────── Docker host (lab PC) ─────────────────────────────┐
 │                                 │                                │
 │   network "public"       ┌──────▼───────┐                        │
 │   ─────────────────────  │   frontend   │ Nginx, non-root, :8080 │
 │                          │ static files │                        │
 │                          │ + /api proxy │                        │
 │   network "internal"     └──────┬───────┘                        │
 │   (internal: true,              │ http://backend:5000/api/...    │
 │    no outside access)    ┌──────▼───────┐                        │
 │                          │   backend    │ Node 24, user "node"   │
 │                          │ Express API  │ volume backend_secrets │
 │                          └──────┬───────┘                        │
 │                                 │ mongodb://mongo:27017/residefix│
 │                          ┌──────▼───────┐                        │
 │                          │    mongo     │ MongoDB 7              │
 │                          │              │ volume mongo_data      │
 │                          └──────────────┘                        │
 └──────────────────────────────────────────────────────────────────┘
```

| Service | Image | Published | Persistent data | Health check |
|---------|-------|-----------|-----------------|--------------|
| `frontend` | `residefix/frontend` (Nginx unprivileged) | `${RESIDEFIX_PORT:-8080}` → 8080 | — | `GET /healthz` |
| `backend` | `residefix/backend` (node:24-alpine) | no | `backend_secrets` (generated JWT secret) | `GET /api/health/ready` |
| `mongo` | `mongo:7.0` | no | `mongo_data` (`/data/db`) | `mongosh ping` |

Start-up order is enforced with health checks: `mongo` healthy → `backend` starts and
connects (with retries) → `backend` healthy → `frontend` starts.

Only the frontend is reachable from the LAN. The backend and MongoDB sit on an
`internal` Docker network that has no route outside the host, and their ports are not
published.

## Request flow

1. A browser loads `http://<lab-pc-ip>:8080/`. Nginx returns `index.html` and the
   built JavaScript. Unknown paths such as `/dashboard` also return `index.html`
   (single-page app fallback), and React Router renders the right page.
2. The app calls **relative** URLs such as `/api/complaints`
   (`frontend/src/services/api.js`). The browser sends them to the same host and port
   it loaded the page from, so it works from every lab PC. Nothing in the browser code
   points at `localhost`.
3. Nginx forwards `/api/*` to `http://backend:5000` on the internal network. It
   re-resolves the `backend` name through Docker DNS, so a restarted backend is found again.
4. Express runs: Helmet headers → JSON body parser (100 kB limit) → route →
   `authenticate` (JWT) → `requireRole` (where needed) → validator → controller →
   Mongoose → MongoDB.
5. Errors go to one central handler that returns `{ "message": "..." }` with a 4xx code
   for client mistakes, or a generic 500 message (details only in the server log).

In development the Vite dev server plays Nginx's role: it proxies `/api` to
`http://localhost:5000` (`frontend/vite.config.js`), so the same frontend code works
unchanged.

## Backend layout

| Folder | Responsibility |
|--------|----------------|
| `src/config/env.js` | Reads and validates all environment variables once; generates/loads the JWT secret |
| `src/config/db.js` | Connects to MongoDB with retries; readiness flag; `sanitizeFilter` |
| `src/app.js` | Builds the Express app (middleware, routes, error handler) — used by tests too |
| `src/server.js` | Loads config, connects, listens, graceful shutdown on SIGTERM/SIGINT |
| `src/routes/` | URL → controller mapping; rate limiting on auth routes; health routes |
| `src/controllers/` | Request handling and authorization rules |
| `src/validators/` | Input validation (types, lengths, allowed values) |
| `src/models/` | Mongoose schemas `User` and `Complaint` |
| `src/middleware/` | `authenticate`, `requireRole`, `notFound`, `errorHandler` |

## Database connection flow

```text
compose.yaml  MONGO_URI=mongodb://mongo:27017/residefix
      │
      ▼
config/env.js  loadConfig()  ── missing/invalid? ──► clear error, exit(1)
      │
      ▼
config/db.js   connectDatabase()  ── retries 20 × 3 s ──► still failing? exit(1),
      │                                                    Docker restarts the container
      ▼
server.js      app.listen(5000)   /api/health/ready = 200 only while connected
```

The hostname depends on where the backend runs:

| Backend runs… | `MONGO_URI` |
|---------------|-------------|
| In Docker (`compose.yaml`) | `mongodb://mongo:27017/residefix` — `mongo` is the service name |
| Directly on your PC (`npm run dev`) | `mongodb://localhost:27017/residefix` (from `backend/.env`) |

This is why the old error *"The `uri` parameter to openUri() must be a string, got
undefined"* happened: the variable was not set in that environment. The backend now
checks it before connecting and explains exactly what to set.

## Data model

- **User**: `name`, `email` (unique, lower-case), `password` (bcrypt hash, never
  returned), `role` (`resident` | `manager`), `property`, timestamps.
- **Complaint**: `title`, `description`, `category`, `priority`, `status`, `property`,
  `createdBy` → User, `resolvedAt` (set automatically when status becomes `resolved`),
  timestamps. Indexes on `{createdBy, createdAt}` and `status`.

## Security

Already in place:

- Passwords hashed with bcrypt; minimum 8 characters for new accounts.
- JWT (HS256 only) with configurable expiry; secret ≥ 32 characters, generated
  randomly if not provided, never committed.
- Role checks on the server for every action (residents only see and edit their own
  complaints; only managers change status or see analytics).
- Input validation on every write; only strings accepted for text fields;
  Mongoose `sanitizeFilter` against NoSQL operator injection; escaped search regex.
- Rate limiting on login/signup (per client IP, Nginx `X-Forwarded-For` trusted for one hop).
- Helmet security headers on the API; `nosniff`, `X-Frame-Options: DENY` and others in Nginx.
- No stack traces sent to clients; credentials are redacted from logs.
- Containers run as non-root users; no privileged containers, no host bind mounts, no
  Docker socket; MongoDB and the API are not published to the network.

Known limitations (acceptable for a trusted lab network, not for the internet):

- Plain HTTP — add TLS before any public exposure.
- Anyone can sign up as a manager. A real deployment needs invitation or approval.
- MongoDB runs without authentication; it is only reachable from the internal Docker network.
- The JWT is stored in `localStorage`.
