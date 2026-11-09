# Development guide

## Requirements

- Node.js 20 or newer (24 LTS recommended — the Docker images use it)
- Docker Desktop (for MongoDB, and to test the full stack)
- Git

## 1. Start MongoDB

```powershell
docker compose -f compose.dev.yaml up -d
```

This starts only MongoDB, bound to `127.0.0.1:27017` (not visible on the network), with
its own `residefix-dev` volume — separate from the lab deployment's data.

If port 27017 is already taken (for example by a locally installed MongoDB), either use
that MongoDB or pick another port:

```powershell
$env:DEV_MONGO_PORT = "27018"; docker compose -f compose.dev.yaml up -d
```

and use `mongodb://localhost:27018/residefix` as `MONGO_URI`.

## 2. Backend

```powershell
cd backend
Copy-Item .env.example .env
```

Edit `backend/.env` and set `JWT_SECRET`. Generate a value with:

```powershell
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

Then:

```powershell
npm install
npm run dev      # restarts automatically when you save a file
```

You should see `Connected to MongoDB` and `ResideFix API listening on port 5000`.
Check <http://localhost:5000/api/health/ready>.

## 3. Frontend

```powershell
cd frontend
npm install
npm run dev
```

Open <http://localhost:5173>. Vite forwards `/api` requests to `http://localhost:5000`,
so no API URL needs configuring. To use a backend elsewhere, set `VITE_PROXY_TARGET`
before `npm run dev`.

## Tests and checks

```powershell
# Backend: unit tests + API tests against a real MongoDB
cd backend
npm test
# API tests use TEST_MONGO_URI (default mongodb://127.0.0.1:27017/residefix_test).
# The database name must contain "test"; it is dropped before and after the run.
$env:TEST_MONGO_URI = "mongodb://127.0.0.1:27018/residefix_test"; npm test

# Frontend
cd frontend
npm run lint
npm test
npm run build
```

If MongoDB is not reachable, the API tests are reported as **skipped** (not passed).
GitHub Actions (`.github/workflows/ci.yml`) runs all of the above plus a Docker
Compose smoke test on every push and pull request.

## Testing the full Docker stack

```powershell
docker compose up -d --build
```

To try it without touching an existing deployment's data, use a separate project name
and port:

```powershell
$env:RESIDEFIX_PORT = "8090"
docker compose -p residefix-test up -d --build
# ...
docker compose -p residefix-test down -v   # -v is fine here: it is a throwaway project
```

## Conventions

- Branches: `feature/<short-name>`, `fix/<short-name>`; open a pull request into the
  shared branch and let CI pass before merging.
- Commit messages: imperative, short subject (`Add manager analytics endpoint`).
- Never commit `.env` files, secrets, database dumps or `node_modules`.
- Backend code is ES modules. Add new endpoints as: route → controller → validator; keep
  shared lists (categories, statuses) in `constants/` on both sides.
- The frontend calls the API only through `src/services/api.js`.
