# LightRoast Deliver

Self-hosted file delivery for files that already live on your NAS. You point the app at finished
project files on a mounted volume and share them with clients through private per-client portals.
Nothing is uploaded or copied — files stream straight from disk, and every download is logged.

I built this for my studio ([lightroast.studio](https://lightroast.studio)), but nothing in it is
studio-specific. Bring your own domain, credentials, and media mount.

**Features**

- Admin panel for managing clients, projects, and files
- A portal per client at `/c/<slug>`, optionally password-protected
- Per-client access toggle to cut off a portal without deleting it
- "Download all" streams a zip of a whole project on the fly (no compression, large video stays fast)
- Download log with timestamp, IP, and user agent
- Dark/light portal theme

**Stack:** Next.js 15 (App Router) · React 19 · TypeScript · Prisma + SQLite · Tailwind ·
Bun · Docker Compose

## Local development

```bash
cp .env.example .env          # then edit values (see below)
bun install
bun run db:migrate            # creates prisma/dev.db
bun run db:seed               # optional demo data
bun run dev                   # http://localhost:3000
```

The seed creates an admin (`admin` / `changeme` at `/admin`), an open portal at
`/c/haven-documentary`, and a locked one at `/c/acme-brand` (password `preview123`), with sample
media under `/tmp/lr-nas-test`.

## Deploying with Docker

1. Set real values in `.env` — at minimum `ADMIN_PASSWORD` and a `JWT_SECRET`
   (`openssl rand -base64 48`).

2. In `docker-compose.yml`, point the read-only mount at your media root:

   ```yaml
   volumes:
     - ./data:/data
     - /volume1/media:/mnt/nas:ro    # <- your media path here
   ```

3. `docker compose up --build -d`

Migrations run automatically on container start; the SQLite database lives in `./data`.

The container runs as uid 1001 — if writes to `./data` fail, `chown` the folder to `1001:1001` or
set the `user:` line in `docker-compose.yml` to your own uid.

Set `COOKIE_SECURE=true` when serving over HTTPS. Only leave it `false` for plain-HTTP LAN access,
otherwise the admin session cookie won't be set.

### Building on a different machine than the NAS

Most NAS boxes are x86_64, so building on an ARM Mac needs a cross-build. Push to a registry and use
an image-based compose on the NAS (`image: you/lightroast-deliver:latest` instead of `build: .`):

```bash
docker buildx build --platform linux/amd64 -t you/lightroast-deliver:latest --push .
```

## Publishing with a Cloudflare Tunnel

The `cloudflared` service in `docker-compose.yml` exposes the app without opening any inbound ports:
the tunnel reaches it inside the compose network as `http://app:3000`.

In the Cloudflare Zero Trust dashboard:

1. **Networks → Tunnels → Create a tunnel** (type Cloudflared) and copy the tunnel token.
2. Add a public hostname, e.g. `deliver.yourdomain.com`, type `HTTP`, URL `app:3000`.

Then on the NAS, add to `.env` and bring the stack up:

```bash
TUNNEL_TOKEN=eyJhIjoi...
COOKIE_SECURE=true
PUBLIC_PORTAL_URL=https://deliver.yourdomain.com
```

Cloudflare creates the DNS record for you. Visitor IPs come through on `cf-connecting-ip`, so the
download log shows real client addresses.

### Keep `/admin` off the public domain

Every `/admin` and `/api/admin` route requires a valid session, but there's no reason to expose them
publicly at all. Sign in over the LAN or a private hostname (Tailscale works well) and block the
admin paths at Cloudflare's edge with a WAF custom rule:

```
(http.host eq "deliver.yourdomain.com" and (
  starts_with(http.request.uri.path, "/admin") or
  starts_with(http.request.uri.path, "/api/admin")
))
```

Client portals (`/c/*`, `/api/portal/*`, `/api/download/*`) stay reachable. If you go this route,
set `PUBLIC_PORTAL_URL` so the "Copy portal link" button copies the public URL rather than whatever
host you're administering from.

## Environment variables

Everything is read from `.env`. The app refuses to start if a required variable is missing.

| Variable            | Required | Purpose |
| ------------------- | :------: | ------- |
| `ADMIN_USERNAME`    | ✓ | Admin login username. |
| `ADMIN_PASSWORD`    | ✓ | Admin login password (never stored in the DB). |
| `JWT_SECRET`        | ✓ | Signs the admin session JWT. Min 32 chars. |
| `NAS_MOUNT_PATH`    | ✓ | Media mount point inside the container. Fixed at `/mnt/nas` by compose. |
| `DATABASE_URL`      | ✓ | SQLite file URL. Fixed at `file:/data/db.sqlite` by compose. |
| `COOKIE_SECURE`     | ✓ | `true` behind HTTPS, `false` for plain-HTTP LAN. |
| `TUNNEL_TOKEN`      |   | Cloudflare Tunnel token, only needed by the `cloudflared` service. |
| `PUBLIC_PORTAL_URL` |   | Public base URL for copied portal links. Unset, links use the current origin. |

## How file paths work

In the admin "Add files" form, start typing a path and it browses the mount live. Paths can be
absolute (`/mnt/nas/haven/export/v3.mp4`) or relative to the mount (`haven/export/v3.mp4`). Picking
a folder imports every file inside it recursively (OS junk skipped, re-imports de-duplicated,
capped at 2000 files).

Every path is normalised, checked for `..` traversal, symlink-resolved, and confirmed to stay
inside the mount before it's stored.

## Security

- Admin routes gated by a JWT session cookie in middleware
- Downloads validate that the file belongs to the requesting portal's client
- Locked portals require a valid unlock session before any download
- Path-traversal and mount-containment checks on every file path
- Portal passwords stored as bcrypt hashes; unlock endpoint rate-limited per IP
- Refuses to boot without a valid `JWT_SECRET`

A few trade-offs worth knowing: download counts ignore `Range` requests past byte 0 (video
scrubbing doesn't inflate them), and deleting a file or client cascades to its download history.
The actual files on the NAS are never touched.
