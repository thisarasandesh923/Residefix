# Lab deployment guide (Windows)

This guide sets up ResideFix on **one lab PC** (the *host*) so that **other PCs on the same
lab network** can use it in a web browser. Basic Git and Docker knowledge is enough.

```text
Host lab PC (runs Docker)                 Other lab PCs
http://localhost:8080          ◄────────  http://<host-ip>:8080
```

---

## 1. Install the tools (once per PC)

1. **Git for Windows** — <https://git-scm.com/download/win> (default options).
2. **Docker Desktop** — <https://www.docker.com/products/docker-desktop/>.
   Installing needs administrator rights; ask the lab administrator if you do not have them.
3. Start Docker Desktop and wait until it shows **Engine running**.

Check in PowerShell:

```powershell
git --version
docker version
docker compose version
```

> The first build downloads about 1 GB of base images (`node`, `nginx`, `mongo`). Do it
> before the demonstration if the lab network is slow.

## 2. Get the code

```powershell
cd $HOME\Documents
git clone https://github.com/thisarasandesh923/Residefix.git
cd Residefix
```

## 3. Start ResideFix

**Option A — helper script (recommended):**

```powershell
.\scripts\start-lab.ps1
```

It checks Docker, builds and starts the containers, waits until all three are healthy and
prints the addresses to use. If Windows blocks scripts:

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\start-lab.ps1
```

**Option B — plain Docker Compose:**

```powershell
docker compose up -d --build
```

No configuration file is required. A strong login-token secret is generated automatically
on the first start and stored in a Docker volume (never in Git).

Optional settings (port, token lifetime, rate limit) go in a `.env` file:

```powershell
Copy-Item .env.example .env
notepad .env
```

## 4. Check that it is healthy

```powershell
docker compose ps
```

All three services must show **`(healthy)`**:

```text
NAME                   SERVICE    STATUS
residefix-backend-1    backend    Up 1 minute (healthy)
residefix-frontend-1   frontend   Up 1 minute (healthy)   0.0.0.0:8080->8080/tcp
residefix-mongo-1      mongo      Up 1 minute (healthy)
```

Or run the full check:

```powershell
.\scripts\check-deployment.ps1
```

Open <http://localhost:8080> on the host PC.

## 5. Find the host PC's IP address

```powershell
ipconfig
```

Look under the adapter that connects to the lab network (usually **Ethernet** or
**Wi-Fi**) for **IPv4 Address**, e.g. `192.168.1.100` or `10.90.251.143`.
Ignore adapters named *vEthernet (WSL)*, *VirtualBox* or *VMware*, and addresses starting
with `169.254.` or `127.`.

`start-lab.ps1` prints the right address automatically.

## 6. Open ResideFix from another lab PC

On a second PC connected to the **same** network, open a browser and go to:

```text
http://<host-ip>:8080
```

for example `http://192.168.1.100:8080`. Use `http://` (not `https://`).

Quick connectivity test from the second PC (PowerShell):

```powershell
Test-NetConnection 192.168.1.100 -Port 8080      # TcpTestSucceeded : True
Invoke-RestMethod http://192.168.1.100:8080/api/health/ready
```

Expected: `status = ready`, `database = up`.

## 7. Windows Firewall

If the site works on the host but **not** from other PCs, the host's firewall is usually
blocking the port. On the **host PC**, open PowerShell **as Administrator**:

```powershell
New-NetFirewallRule -DisplayName "ResideFix 8080" -Direction Inbound -Protocol TCP -LocalPort 8080 -Action Allow -Profile Domain,Private
```

Also check:

- The network profile: *Settings → Network & internet → (your network) → Network profile
  type*. If it is **Public**, either switch it to **Private** or add `Public` to `-Profile`
  above (only on a trusted lab network).
- Docker Desktop may ask to allow network access the first time — click **Allow**.
- Some university networks isolate PCs from each other (client isolation) or block
  non-standard ports. If `Test-NetConnection` fails even with the firewall rule, ask the
  lab administrator to allow TCP port 8080 between lab PCs, or try another port they allow.

To remove the rule after the demonstration:

```powershell
Remove-NetFirewallRule -DisplayName "ResideFix 8080"
```

## 8. Using a different port

If 8080 is already used, pick another port, e.g. 8081:

```powershell
.\scripts\start-lab.ps1 -Port 8081
```

or put `RESIDEFIX_PORT=8081` in `.env` and run `docker compose up -d`. Remember to allow the
new port in the firewall.

## 9. Demo walkthrough

The database starts empty.

1. Sign up as **Property Manager / Landlord**, then log out.
2. On another PC, sign up as a **Resident** (enter a property such as *Green Hostel, Room 12*),
   log in and report a few issues with different categories and priorities.
3. Log in as the manager: all complaints appear with the analytics panel. Move some to
   *In progress* and *Resolved*.
4. The resident's dashboard updates within 30 seconds (or press **Refresh**).

## 10. Logs, restarts and stopping

```powershell
docker compose logs -f backend          # follow API logs (Ctrl+C to stop following)
docker compose logs --tail 100 frontend # last 100 Nginx log lines
docker compose logs mongo
docker compose restart backend          # restart one service
docker compose stop                     # stop, keep containers and data
docker compose start                    # start again
docker compose down                     # remove containers, KEEP data
```

> ⚠️ **Never run `docker compose down -v` on the lab PC** unless you want to delete every
> account and complaint. `-v` removes the database volume.

The containers restart automatically after a crash, and after a reboot once Docker Desktop
is running again (enable *Start Docker Desktop when you sign in* in Docker Desktop settings).

## 11. Updating to a new version

```powershell
cd $HOME\Documents\Residefix
.\scripts\backup-db.ps1           # optional but recommended
git pull
docker compose up -d --build      # or .\scripts\start-lab.ps1
```

Your data stays in the `residefix_mongo_data` volume and is not touched by rebuilding.

## 12. Backup and restore

```powershell
.\scripts\backup-db.ps1
# -> backups\residefix-20261110-090000.archive.gz

.\scripts\restore-db.ps1 .\backups\residefix-20261110-090000.archive.gz
```

Backups are git-ignored. Copy them somewhere safe (e.g. a USB drive) if needed.

## 13. Troubleshooting

| Symptom | What to do |
|---------|------------|
| `docker: command not found` / `error during connect` | Docker Desktop is not installed or not running. Start it and wait for *Engine running*. |
| `port is already allocated` | Use another port (section 8) or stop the program using 8080. |
| A service stays `(unhealthy)` or `Restarting` | `docker compose logs backend` (or `mongo`). The backend prints exactly which setting is wrong. |
| Backend log: `Could not connect to MongoDB` | `docker compose ps mongo` must be healthy; `docker compose restart mongo backend`. |
| Page loads but login says "server is not available" | Backend not healthy — see above. |
| Works on host, not on other PCs | Firewall / network isolation — section 7. Check you used the right IP (section 5). |
| `Too many attempts` on login | Rate limit (20 per 15 min per IP). Wait, or set `AUTH_RATE_LIMIT=100` in `.env` and `docker compose up -d`. |
| Build fails while downloading | Network problem; run the same command again. Docker resumes cached layers. |
| `running scripts is disabled on this system` | `powershell -ExecutionPolicy Bypass -File .\scripts\start-lab.ps1` |

## Security reminder

This deployment uses plain HTTP and is intended for a **trusted lab network** only. Do not
forward the port to the internet. Public deployment needs HTTPS, MongoDB authentication and
controlled manager registration (see [ARCHITECTURE.md](ARCHITECTURE.md#security)).
