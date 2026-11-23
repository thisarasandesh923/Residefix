# Jenkins CI on the lab PC

The [`Jenkinsfile`](../Jenkinsfile) in the repository root defines the CI pipeline. It runs on
the lab PC's existing Jenkins (<http://localhost:8080>) and is built for a **locked-down PC**:
no `sudo`, no software installs and no extra Jenkins plugins are needed.

```text
git push ──► GitHub ◄── checks every 5 min ── Jenkins on the lab PC (http://localhost:8080)
                                                 │
   Tools ─► Install ─► Test ───────────────► Docker build ─► Smoke test
   Node     npm ci     backend + frontend      (only if the Jenkins user can use Docker)
```

| Stage | What it does |
|-------|--------------|
| Tools | Uses the PC's Node.js if it is v22 or newer. Otherwise downloads Node 24 into the Jenkins user's home folder (`~/.cache/residefix-ci`) on the first build and reuses it. Checks whether Docker is usable. |
| Install | `npm ci` in `backend` and `frontend` (in parallel) |
| Test | Backend: `npm test` (with a throwaway MongoDB on port 27027 when Docker is usable). Frontend: `npm run lint`, `npm test`, `npm run build` (the `dist` folder is saved with the build) |
| Docker build | `docker compose build` — **skipped** if Docker is not usable |
| Smoke test | Starts the full stack as project `residefix-ci` on port **18080**, checks `/`, `/dashboard` and `/api/health/ready`, then removes it — **skipped** if Docker is not usable |

Without Docker the build is still green: the 3 backend API tests that need MongoDB show as
*skipped*, and the two Docker stages show as *skipped*. The other 12 backend tests and all
frontend checks run normally.

The pipeline does not deploy anything, and it never touches port 8080 (Jenkins) or a running
ResideFix stack.

---

## What the lab PC needs

Only things a normal lab setup already has:

- Jenkins running (<http://localhost:8080>) with the standard **Pipeline** and **Git** plugins
  (installed by *Install suggested plugins*).
- Internet access to github.com, nodejs.org and registry.npmjs.org.
- `tar` with `xz` support and `curl` or `wget` (standard on Ubuntu) — only used if Node is missing.

## 1. Create the job (once)

1. Open <http://localhost:8080> and log in.
2. **New Item** → name `residefix` → **Pipeline** → OK.
3. Scroll to **Pipeline**:
   - Definition: **Pipeline script from SCM**
   - SCM: **Git**
   - Repository URL: `https://github.com/thisarasandesh923/Residefix.git`
   - Credentials: none (the repository is public)
   - Branch Specifier: `*/feature/jenkins-pipeline` for the first test, later `*/dev-main`
   - Script Path: `Jenkinsfile`
4. **Save**.

> If **Pipeline** is not in the *New Item* list, the Pipeline plugin is missing. Ask whoever
> manages the lab's Jenkins to install the suggested plugins; nothing else is needed.

## 2. Run it

1. Click **Build Now**. The first build takes a few minutes (it may download Node and the
   npm packages).
2. Click the build number → **Console Output** to watch it.
3. A green build means every stage passed or was skipped on purpose.

After this first manual build Jenkins checks GitHub every 5 minutes (`pollSCM` in the
Jenkinsfile) and builds automatically when someone pushes to that branch.

**Several branches:** if *Multibranch Pipeline* is in the *New Item* list, you can use it
instead: add a **Git** branch source with the URL above and tick *Periodically if not
otherwise run* (5 minutes). Jenkins then builds every branch that has a `Jenkinsfile`.

## 3. Troubleshooting

| Problem | Fix |
|---------|-----|
| `Could not resolve host` / download fails in *Tools* or *Install* | The lab network blocks nodejs.org or the npm registry. Ask whether a proxy is required. |
| `tar: ... xz: Cannot exec` | Missing `xz`. Ask the lab admin for `xz-utils`, or for Node.js 22+ to be installed system-wide. |
| Docker stages skipped but you want them | The `jenkins` user must be in the `docker` group (needs an admin): `sudo usermod -aG docker jenkins`, then restart Jenkins. |
| `port is already allocated` on 18080 or 27027 | A previous build left containers behind: `docker compose -p residefix-ci down -v` and `docker compose -p residefix-ci-mongo down -v`. |
| Builds never start by themselves | Run **Build Now** once (the 5-minute check is registered by the first build), and check the lab PC can reach github.com. |
| Want to run ResideFix itself on the lab PC | Jenkins uses 8080, so start ResideFix on another port: `RESIDEFIX_PORT=8081 docker compose up -d --build`. |
