# Docker + Database Guide

This guide covers running Postgres in Docker for local development, and how to
inspect the database directly — no GUI tool required.

Setup used by this project: **Postgres runs in Docker, the Nest app runs on
your host machine** (via `npm run start:dev`), connecting to Postgres over
`localhost`.

---

## 1. Start Postgres

```bash
docker compose up -d postgres
```

- `docker compose up` starts the services defined in `docker-compose.yml`.
- `-d` means "detached" — it runs in the background instead of taking over
  your terminal.
- `postgres` is the service name — only that one container starts (we're not
  running the Nest app in Docker in this setup).

## 2. Confirm it's healthy

```bash
docker compose ps
```

You want to see `STATUS` say something like `Up X seconds (healthy)`. The
`healthy` part comes from the `healthcheck` block in `docker-compose.yml`,
which pings Postgres internally until it's actually ready to accept
connections (not just "the container started").

If it's stuck on `starting` for more than ~15 seconds, check the logs:

```bash
docker compose logs postgres
```

Look for `database system is ready to accept connections`.

## 3. Start the Nest app

```bash
npm run start:dev
```

Your `.env` should have:

```
DB_HOST=localhost
DB_PORT=5432
```

`DB_HOST=localhost` is correct here because the app is running on your host
machine, not inside Docker. (If the app were *also* containerized and on the
same Docker network as Postgres, you'd use the service name `postgres` as the
host instead — but that's not this setup.)

## 4. Inspect the database directly

Postgres ships a command-line client called `psql`, and it's already inside
the container — no extra install needed. "Step into" the running container
and open it:

```bash
docker compose exec postgres psql -U dental_admin -d dental_core
```

Breaking that down:
- `docker compose exec postgres` → run a command *inside* the running
  `postgres` container
- `psql -U dental_admin -d dental_core` → open the Postgres CLI, logging in
  as user `dental_admin`, connecting to database `dental_core`

(Match the username/database to whatever's in your `.env` — `DB_USERNAME` and
`DB_NAME`.)

You'll land on a `dental_core=#` prompt. From there, plain SQL works.

### Useful queries

```sql
-- list all tables
\dt

-- see your users (password intentionally excluded — don't put hashes in scrollback)
SELECT id, email, "mobileNumber", role, "isActive", "createdAt" FROM users;

-- check for accidental duplicate registrations
SELECT email, COUNT(*) FROM users GROUP BY email HAVING COUNT(*) > 1;

-- look at refresh tokens
-- (the "token" column will show a 64-char hash, not a JWT — that's expected,
-- refresh tokens are hashed before being stored)
SELECT id, "userId", "isRevoked", "expiresAt" FROM refresh_tokens;

-- see a single user's active (non-revoked, non-expired) sessions
SELECT id, "deviceInfo", "ipAddress", "expiresAt"
FROM refresh_tokens
WHERE "userId" = 'paste-a-user-id-here'
  AND "isRevoked" = false
  AND "expiresAt" > now();

-- exit
\q
```

> **Why the double quotes?** Postgres lowercases unquoted identifiers by
> default (`mobileNumber` would become `mobilenumber`), but TypeORM created
> your columns with exact camelCase names. Quoting `"mobileNumber"` tells
> Postgres to match the case exactly.

## 5. Stop Postgres

```bash
docker compose down
```

This stops and removes the container, but your **data is safe** — it lives in
the `postgres_data` volume declared in `docker-compose.yml`, which survives
`down`. Next time you run `docker compose up -d postgres`, your data is still
there.

## 6. Wipe the database and start fresh (destructive)

Only do this if you're OK losing everything:

```bash
docker compose down -v
```

The `-v` flag also deletes the volume. Next `docker compose up -d postgres`
will start from a completely empty database, and since
`synchronize: process.env.NODE_ENV === 'development'` is set in
`database.config.ts`, TypeORM will recreate all tables automatically from
your entities on app startup.

---

## Quick troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `ECONNREFUSED` in Nest logs | Postgres container not running or not ready yet | `docker compose up -d postgres`, wait for `healthy` |
| `password authentication failed` | `.env` values don't match what Postgres was initialized with | Check `DB_USERNAME`/`DB_PASSWORD` match `docker-compose.yml` env vars. If you already created the volume with different credentials, you may need `docker compose down -v` to reset. |
| Port `5432` already in use | Another Postgres (local install or another container) is already using it | `lsof -i :5432` to find it, or change the host port mapping in `docker-compose.yml` (e.g. `'5433:5432'`) and update `DB_PORT` in `.env` to match |
| Columns show as lowercase/unrecognized in `psql` | Forgot to quote camelCase identifiers | Wrap column names in double quotes, e.g. `"mobileNumber"` |
