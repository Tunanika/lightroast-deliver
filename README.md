# LightRoast Deliver

Self-hosted file delivery for [LightRoast.studio](https://lightroast.studio). The studio admin
references finished project files already sitting on the NAS and shares them with clients through
private per-client portals. Files are never uploaded or copied — the app streams them straight from
the mounted NAS path and logs every download.

Built to the LightRoast brand book: monochrome (ink / paper), **Host Grotesk** + **Geist Mono**,
sharp corners, flat surfaces, one restrained Slate accent on primary actions. The client portal ships
both an **ink** (dark) and **paper** (light) surface with a toggle.

---

## Stack

- **Next.js 15** (App Router, standalone output) · React 19 · TypeScript
- **Prisma + SQLite** (file-based, on a Docker volume)
- **Tailwind CSS** (utility-only)
- **jose** (JWT admin session) · **bcryptjs** (portal password hashes)
- **bun** (package manager / scripts) · **Docker + Docker Compose**

---

## Quick start (local development)

```bash
cp .env.example .env          # then edit values (see below)
bun install
bun run db:migrate            # creates prisma/dev.db and applies migrations
bun run db:seed               # optional: demo clients/projects/files
bun run dev                   # http://localhost:3000
```

For local dev the bundled `.env` points `DATABASE_URL` at `file:./dev.db` and `NAS_MOUNT_PATH` at
`/tmp/lr-nas-test`. The seed writes sample media there.

Demo data after seeding:

- Admin: `admin` / `changeme` at `/admin`
- Open portal: `/c/haven-documentary`
- Locked portal: `/c/acme-brand` (password `preview123`)

---

## Docker deployment (NAS)

1. Set real values in `.env` (at minimum `ADMIN_PASSWORD` and a 48-char `JWT_SECRET`):

   ```bash
   openssl rand -base64 48        # use the output as JWT_SECRET
   ```

2. In `docker-compose.yml`, point the NAS mount at your media root:

   ```yaml
   volumes:
     - ./data:/data
     - /volume1/media:/mnt/nas:ro    # <- your NAS media path here
   ```

3. Bring it up:

   ```bash
   docker compose up --build -d
   ```

   On start the container runs `prisma migrate deploy` (creating `/data/db.sqlite` on first run),
   then serves on port 3000.

**Permissions:** the container runs as uid 1001. If writes to `./data` fail on your NAS, either
`chown` that folder to `1001:1001` or uncomment the `user:` line in `docker-compose.yml` to match
your account.

**HTTPS:** set `COOKIE_SECURE=true` when serving behind HTTPS (the Cloudflare tunnel below). Leave it
`false` only for plain-HTTP LAN access (otherwise the admin session cookie won't be set).

---

## Publish at `deliver.lightroast.studio` (Cloudflare Tunnel)

The `cloudflared` service in `docker-compose.yml` exposes the app through a Cloudflare Tunnel — no
inbound ports opened on the NAS, no port-forwarding, automatic HTTPS. The app is reached **inside**
the compose network as `http://app:3000`, so it never needs to be internet-facing itself.

**One-time setup in the Cloudflare dashboard** (the domain `lightroast.studio` must already be on
Cloudflare):

1. **Zero Trust** → **Networks → Tunnels** → **Create a tunnel** → type **Cloudflared** → name it
   e.g. `lightroast-deliver`.
2. On the install screen, copy the **tunnel token** (the long string after `--token`). Don't run the
   shown command — the compose `cloudflared` service runs it for you.
3. Add a **Public Hostname**:
   - **Subdomain:** `deliver`  · **Domain:** `lightroast.studio`
   - **Type:** `HTTP`  · **URL:** `app:3000`
4. Save. Cloudflare creates the `deliver.lightroast.studio` DNS record automatically.

**On the NAS**, put the token and secure-cookie flag in `.env`:

```bash
TUNNEL_TOKEN=eyJhIjoi...your-token...
COOKIE_SECURE=true
```

Then:

```bash
docker compose up --build -d
```

`https://deliver.lightroast.studio` now serves the app. Each client gets
`https://deliver.lightroast.studio/c/<slug>`. Visitor IPs are read from Cloudflare's
`cf-connecting-ip` header, so the download log shows real client IPs.

### Keep `/admin` off the public domain (recommended)

The admin area should never be reachable over the public tunnel — sign in from the LAN
(`http://nas-ip:3000` with `COOKIE_SECURE=false`, or a private hostname). Block it at Cloudflare's
edge with a **WAF custom rule** (Block action). Cover both the admin UI **and** the admin API:

```
(http.host eq "deliver.lightroast.studio" and (
  starts_with(http.request.uri.path, "/admin") or
  starts_with(http.request.uri.path, "/api/admin")
))
```

> The app already requires a JWT on every `/admin` and `/api/admin` route, so this WAF rule is an
> extra edge layer, not the only lock. For even tighter control, put a **Zero Trust → Access**
> policy (e.g. email-OTP) on the admin paths instead of a plain Block. Client portals
> (`/c/*`, `/api/portal/*`, `/api/download/*`) stay reachable.

You can drop the `ports: - "3000:3000"` mapping from `docker-compose.yml` if you don't want LAN
access — but then admin sign-in must go through a private hostname, since `/admin` is blocked on the
public domain.

---

## Environment variables

Everything is read from `.env` (Docker Compose loads it automatically). The app **refuses to start**
if `ADMIN_USERNAME`, `ADMIN_PASSWORD`, `JWT_SECRET` (≥32 chars), `NAS_MOUNT_PATH`, or `DATABASE_URL`
is missing.

| Variable         | Required | Set by | Purpose |
| ---------------- | :------: | ------ | ------- |
| `ADMIN_USERNAME` | ✓ | you | Admin login username. |
| `ADMIN_PASSWORD` | ✓ | you | Admin login password (compared directly; never stored in the DB). |
| `JWT_SECRET`     | ✓ | you | Signs the admin session JWT. **Min 32 chars.** Generate: `openssl rand -base64 48`. |
| `NAS_MOUNT_PATH` | ✓ | compose | Mount point of the NAS media inside the container. Fixed at `/mnt/nas`. |
| `DATABASE_URL`   | ✓ | compose | SQLite file URL. Fixed at `file:/data/db.sqlite` (the `./data` volume). |
| `COOKIE_SECURE`  | ✓ | you | `true` marks cookies Secure (HTTPS) — use behind the tunnel. `false` for LAN HTTP. |
| `TUNNEL_TOKEN`   | tunnel only | you | Cloudflare Tunnel token, consumed by the `cloudflared` service. |
| `PORT` / `HOSTNAME` | — | image | Default `3000` / `0.0.0.0`. Override only if you change the port mapping. |

`NAS_MOUNT_PATH` and `DATABASE_URL` are hard-set in `docker-compose.yml`, so a **Docker `.env` only
needs**:

```bash
ADMIN_USERNAME=admin
ADMIN_PASSWORD=a-strong-password
JWT_SECRET=replace-with-openssl-rand-base64-48-output
COOKIE_SECURE=true
TUNNEL_TOKEN=eyJhIjoi...your-cloudflare-tunnel-token...   # only if using the tunnel
```


---

## Deploy from a container registry (build → push → pull)

The UGreen DXP4800+ is **x86_64**, so if you build on an Apple-Silicon Mac you must cross-build for
`linux/amd64`. Example with Docker Hub (plays nicest with UGOS's Docker app):

```bash
# 1) On your machine — cross-build for the NAS and push (USER = your Docker Hub username)
docker login
docker buildx build --platform linux/amd64 \
  -t USER/lightroast-deliver:1.0.0 \
  -t USER/lightroast-deliver:latest \
  --push .
```

On the NAS, use an image-based compose instead of building locally — same as
`docker-compose.yml` but swap `build: .` for the pushed image:

```yaml
services:
  app:
    image: USER/lightroast-deliver:latest   # was: build: .
    restart: unless-stopped
    expose: ["3000"]
    ports: ["3000:3000"]
    environment:
      - ADMIN_USERNAME=${ADMIN_USERNAME}
      - ADMIN_PASSWORD=${ADMIN_PASSWORD}
      - JWT_SECRET=${JWT_SECRET}
      - COOKIE_SECURE=${COOKIE_SECURE:-true}
      - NAS_MOUNT_PATH=/mnt/nas
      - DATABASE_URL=file:/data/db.sqlite
    volumes:
      - ./data:/data
      - /volume1/media:/mnt/nas:ro                   # your NAS media path
  cloudflared:
    image: cloudflare/cloudflared:latest
    restart: unless-stopped
    command: tunnel --no-autoupdate run
    environment:
      - TUNNEL_TOKEN=${TUNNEL_TOKEN}
    depends_on: [app]
```

```bash
# 2) On the NAS — create .env (admin creds, JWT_SECRET, COOKIE_SECURE, TUNNEL_TOKEN), then:
docker compose pull
docker compose up -d
```

Migrations run automatically on container start; the SQLite DB persists in `./data`.

---

## How file paths work

In the admin **Add files** form, start typing a path and it browses the mount live — click a folder
to open it or a file to select it. Enter either an absolute path already inside the mount
(`/mnt/nas/haven/export/v3.mp4`) or one relative to it (`haven/export/v3.mp4`). Every path is
normalised, checked for `..` traversal, symlink-resolved, and confirmed to stay **inside** the NAS
mount before anything is stored.

- **Pick a file** → it's added with the resolved absolute path.
- **Pick a folder** → every file inside is added recursively (OS junk skipped, re-imports
  de-duplicated, capped at 2000 files), each named by its path within the folder.

Clients can download files one at a time, or hit **Download all** on a project to stream a `.zip` of
everything in it (built on the fly from the NAS — no compression, so large video stays fast).

---

## Security

- Admin app + admin API (`/admin/*`, `/api/admin/*`) gated by a JWT cookie in middleware.
- Downloads validate the file belongs to the requesting portal's client — portal A can't fetch
  portal B's file by ID.
- Password-protected portals require a valid unlock session before any download.
- Path-traversal + mount-containment checks on every file path.
- Portal password endpoint rate-limited to 10 attempts / IP / 15 min (in-memory).
- Portal passwords stored as bcrypt hashes.
- App refuses to start without a valid `JWT_SECRET` (checked in `start.sh` and at boot).

---

## Notes & trade-offs

- **Download counts:** a `DownloadEvent` is logged once per download (no `Range` header, or a range
  starting at byte 0). Video scrubbing/resume range requests don't inflate counts.
- **Deletion is cascading:** deleting a file or client also removes its download history (the data
  model ties events to a file). NAS files themselves are never touched.
- **Client IP** is read from `x-forwarded-for` / `x-real-ip`; accurate only if your reverse proxy
  forwards them, otherwise logged as `unknown`.
- **Accent** is Slate `#455362` (one CSS var, `--accent`); swap to Sage `#5E6B57` if preferred.

---

```
src/
  app/            # routes: /admin, /admin/(app)/*, /c/[slug], /api/*
  components/     # Wordmark, ui primitives, admin/* and portal/* components
  lib/            # auth, env, paths, prisma, portal-session, ratelimit, logs, format
  middleware.ts   # admin route gating
  instrumentation.ts  # env validation at boot
prisma/           # schema, migrations, seed
```

©2026 LightRoast.studio
