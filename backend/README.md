# ResideFix backend

Express + Mongoose REST API. See the [main README](../README.md) for the full project.

```powershell
Copy-Item .env.example .env   # set MONGO_URI and JWT_SECRET
npm install
npm run dev                   # http://localhost:5000, reloads on save
npm test                      # unit + API tests (needs MongoDB, see docs/DEVELOPMENT.md)
npm start                     # production mode
```

- Health: `GET /api/health` (liveness), `GET /api/health/ready` (database connected)
- Code layout and request flow: [docs/ARCHITECTURE.md](../docs/ARCHITECTURE.md)
