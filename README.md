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
- **Docker + Docker Compose**

---

## Quick start (local development)

```bash
cp .env.example .env          # then edit values (see below)
npm install
npm run db:migrate            # creates prisma/dev.db and applies migrations
npm run db:seed               # optional: demo clients/projects/files
npm run dev                   # http://localhost:3000
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

**HTTPS:** set `COOKIE_SECURE=true` when serving behind HTTPS. Leave it `false` for plain-HTTP LAN
access (otherwise the admin session cookie won't be set).

---

## Environment variables

| Variable         | Purpose                                                                 |
| ---------------- | ----------------------------------------------------------------------- |
| `ADMIN_USERNAME` | Admin login username.                                                   |
| `ADMIN_PASSWORD` | Admin login password (compared directly; not stored in the DB).         |
| `JWT_SECRET`     | Signs the admin session JWT. **Min 32 chars** — the app won't start otherwise. |
| `NAS_MOUNT_PATH` | Where NAS media is mounted in the container (`/mnt/nas`).                |
| `DATABASE_URL`   | SQLite file URL (`file:/data/db.sqlite`).                               |
| `COOKIE_SECURE`  | `true` to mark cookies Secure (HTTPS). Default `false`.                  |

---

## How file paths work

In the admin **Add file** form, enter either an absolute path already inside the mount
(`/mnt/nas/haven/export/v3.mp4`) or one relative to it (`haven/export/v3.mp4`). Before saving, the
path is normalised, checked for `..` traversal, symlink-resolved, confirmed to stay **inside** the
NAS mount, and confirmed to be a real file. The resolved absolute path is stored.

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
