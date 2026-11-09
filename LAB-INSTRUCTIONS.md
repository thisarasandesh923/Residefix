# ResideFix: running it on the lab PC

The stack is three containers: `mongo` (database), `backend` (API on port 5000)
and `frontend` (website on port 5173). Everything runs on the lab PC itself, so
the browser on that PC talks to `localhost`.

## What the lab PC needs

- Docker Desktop, started and showing "Engine running"
- Git (only for Option A)
- About 2 GB of free disk space

Check Docker in PowerShell:

```powershell
docker version
docker compose version
```

---

## Option A: build on the lab PC (needs internet)

```powershell
git clone https://github.com/thisarasandesh923/Residefix.git
cd Residefix
Copy-Item .env.example .env
notepad .env        # replace JWT_SECRET with a long random string, save
docker build -t residefix-backend:latest ./residefix-server
docker build -t residefix-frontend:latest ./residefix-client
docker compose up -d --no-build
```

The first run downloads the `node:24-alpine` and `mongo:7` base images
(about 1 GB), which can take a while on a slow network.

## Option B: bring the images on a USB stick (no big downloads)

**On your own laptop**, after building the images (Option A steps), export
all three into one file:

```powershell
docker pull mongo:7
docker save -o residefix-images.tar residefix-backend:latest residefix-frontend:latest mongo:7
```

Copy `residefix-images.tar` **and** the project folder (or just `compose.yaml`
and `.env.example`) to the USB stick.

**On the lab PC**, from the project folder:

```powershell
docker load -i E:\residefix-images.tar      # use your USB drive letter
Copy-Item .env.example .env
notepad .env                                # set JWT_SECRET
docker compose up -d --no-build
```

`--no-build` tells Compose to use the loaded images instead of rebuilding.

---

## Check it is working

```powershell
docker compose ps
```

All three services should be `Up` (mongo shows `healthy`). Then open:

- Website: <http://localhost:5173>
- API health check: <http://localhost:5000/> → "ResideFix API is running"

The database starts empty. For a demo:

1. Sign up as a **Property Manager / Landlord**, then log out.
2. Sign up as a **Resident**, log in, and report a couple of issues.
3. Log in as the manager and move them to *In progress* / *Resolved*.
4. Log back in as the resident to show the updated status.

## Useful commands

```powershell
docker compose logs -f backend    # API logs
docker compose logs -f frontend   # website logs
docker compose restart backend
docker compose down               # stop everything (keeps data)
```

Avoid `docker compose down -v` unless you want to erase all MongoDB data.

## Troubleshooting

| Problem | Fix |
|---------|-----|
| `additional privileges requested: pass "--allow=fs.read=..."` | Known Compose v5 bug on Windows. Build with `docker build` as shown above, then `docker compose up -d --no-build`. |
| `Set JWT_SECRET in .env before running` | The `.env` file is missing; run `Copy-Item .env.example .env`. |
| `port is already allocated` | Something else uses 5000 or 5173. Stop it, or change the left-hand port in `compose.yaml`. |
| Login says "Could not reach the server" | Check `docker compose ps`; the backend must be `Up`. Open the site on the same PC that runs Docker. |
| Backend keeps restarting | `docker compose logs backend`; usually MongoDB is still starting and it recovers on its own. |

This setup runs the Vite development server for a classroom demonstration; it
is not a hardened production deployment.
