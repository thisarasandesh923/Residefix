# ResideFix

Complaint tracking for hostels, apartments and boarding houses. Residents report
maintenance issues; managers and landlords track them from one dashboard until
they are resolved.

DevOps Engineering module project: a React frontend, an Express + MongoDB API,
and a Docker Compose setup that runs the whole stack on any lab computer.

## Features

**Residents**
- Sign up, log in and stay logged in (JWT, 7-day session)
- Report an issue with title, description, category, priority and property/room
  (the property is pre-filled from the account)
- Edit or withdraw a complaint while it is still open
- Follow each complaint from Open → In progress → Resolved

**Managers / landlords**
- See every complaint across all properties, with who reported it
- Move complaints between Open, In progress and Resolved (resolution date is recorded)
- Delete complaints

**Both roles**
- Summary counts per status (click a count to filter)
- Search and filter by status, category and priority
- Works on phone-sized screens

## Tech stack

| Part      | Technology                                   |
|-----------|----------------------------------------------|
| Frontend  | React 19, React Router 7, Vite               |
| Backend   | Node.js 24, Express 4, Mongoose 8, JWT, bcrypt |
| Database  | MongoDB 7                                    |
| DevOps    | Docker, Docker Compose, GitHub Actions (frontend to GitHub Pages) |

## Project structure

```
Residefix/
├── compose.yaml            # mongo + backend + frontend
├── .env.example            # copy to .env and set JWT_SECRET
├── LAB-INSTRUCTIONS.md     # step-by-step guide for the lab computer
├── residefix-client/       # React app (Vite dev server on :5173)
│   ├── Dockerfile
│   └── src/
│       ├── api.js            # API URL, shared constants, fetch helper
│       ├── Dashboard.jsx     # resident + manager dashboard
│       ├── ComplaintCard.jsx
│       ├── ComplaintForm.jsx # create / edit modal
│       ├── Login.jsx, Signup.jsx, Home.jsx
└── residefix-server/       # Express API on :5000
    ├── Dockerfile
    ├── server.js
    ├── middleware/authMiddleware.js
    ├── models/ (User, Complaint)
    └── routes/ (auth, complaints)
```

## Run with Docker (recommended)

Requires Docker Desktop.

```powershell
Copy-Item .env.example .env      # then put a long random value in JWT_SECRET
docker build -t residefix-backend:latest ./residefix-server
docker build -t residefix-frontend:latest ./residefix-client
docker compose up -d --no-build
```

Open <http://localhost:5173>. API health check: <http://localhost:5000/>.

`docker compose up --build -d` also works on Docker versions whose Compose build
step is healthy; building with `docker build` first avoids a known Compose v5
bug on Windows ("additional privileges requested: pass --allow=fs.read=...").

See [LAB-INSTRUCTIONS.md](LAB-INSTRUCTIONS.md) for running on the lab PC, including
copying the images over on a USB stick when the lab network is slow.

## Run without Docker (development)

Needs Node.js 20+ and a MongoDB server.

```powershell
# terminal 1
cd residefix-server
Copy-Item .env.example .env   # set MONGO_URI and JWT_SECRET
npm install
npm run dev

# terminal 2
cd residefix-client
npm install
npm run dev
```

## API

All complaint routes need `Authorization: Bearer <token>`.

| Method | Route                   | Who                         | Purpose |
|--------|-------------------------|-----------------------------|---------|
| POST   | `/api/auth/signup`      | anyone                      | Create account `{ name, email, password, role, property? }` |
| POST   | `/api/auth/login`       | anyone                      | Returns `{ token, user }` |
| GET    | `/api/complaints`       | resident (own) / manager (all) | List; optional `?status=&category=&priority=&q=` |
| POST   | `/api/complaints`       | logged in                   | Create `{ title, description, category, priority, property }` |
| GET    | `/api/complaints/:id`   | owner / manager             | One complaint |
| PATCH  | `/api/complaints/:id`   | owner (details, while open) / manager (`status`) | Update |
| DELETE | `/api/complaints/:id`   | owner (while open) / manager | Withdraw or delete |

Allowed values: category `electrical | plumbing | internet | security | other`,
priority `low | medium | high`, status `open | in-progress | resolved`.
