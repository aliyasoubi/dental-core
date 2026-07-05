# DentalCore — Auth Module Setup & Operations Guide

Reference for getting the auth/users module running locally, and for the one-time admin bootstrap process.
Keep this alongside `README.md`.

## 1. Environment

Copy the block below into `.env` (never commit this file — only commit `.env.example` with placeholder values).

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=dental_admin
DB_PASSWORD=<generate-a-real-password>
DB_NAME=dental_core

JWT_ACCESS_SECRET=<openssl rand -hex 32>
JWT_REFRESH_SECRET=<openssl rand -hex 32>
JWT_ACCESS_EXPIRATION_TIME=900      # seconds (15 min)
JWT_REFRESH_EXPIRATION_TIME=604800  # seconds (7 days)

PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173   # your frontend's origin, NOT this API's own port
```

> **Rotate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` / `DB_PASSWORD` before any shared or production
> environment.** If these values were ever pasted into a chat, ticket, or committed to git, they're
> compromised — generate new ones with `openssl rand -hex 32`.

## 2. Install & start Postgres

```bash
npm install
npm run docker:up      # starts postgres via docker-compose
```

TypeORM's `synchronize: true` (dev only, see `database.config.ts`) will create tables automatically on
first boot — no manual migration step needed in development.

## 3. Bootstrap the first Admin account

There is **no public registration endpoint** — by design. `POST /users` (the only account-creation path)
requires an authenticated Admin. The very first Admin has to be created by a script that talks to the
database directly.

**One-time env vars for the seed script** (export in your shell, don't add these to `.env` — they're not
needed after the first run):

```bash
export SEED_ADMIN_EMAIL="admin@dentalcore.local"
export SEED_ADMIN_PASSWORD="ChooseAStrongP@ss123"
export SEED_ADMIN_MOBILE="09120000000"
```

**Run it:**

```bash
npm run seed:admin
```

`package.json` script (already wired):

```json
"scripts": {
  "seed:admin": "ts-node -r dotenv/config -r tsconfig-paths/register src/database/seed-admin.ts"
}
```

- `-r dotenv/config` loads `.env` for the DB connection (the script runs outside Nest's `ConfigModule`, so
  this is required — without it, `DB_HOST` etc. will be `undefined`).
- The script checks for an existing user with `SEED_ADMIN_EMAIL` first and skips if found — safe to re-run.
- Requires `dotenv` as a dependency: `npm i dotenv` if not already installed.

**After running once:** change the admin's password immediately via the app (or just pick a strong one at
seed time and store it in your password manager), and don't leave `SEED_ADMIN_PASSWORD` sitting in shell
history — `history -d <line>` or start a fresh shell session afterward.

## 4. Day-to-day account lifecycle

| Step | Who | Endpoint | Notes |
|---|---|---|---|
| Bootstrap first Admin | Server operator | `npm run seed:admin` | One-time, direct DB write, bypasses the API |
| Admin logs in | Admin | `POST /api/auth/login` | Returns `{ accessToken, refreshToken, user }` |
| Admin creates staff account + assigns role | Admin | `POST /api/users` | `@Roles(ADMIN)` guarded; role is chosen by the admin in the request body — never by the new user |
| New staff member logs in | Staff | `POST /api/auth/login` | Their token now carries their assigned role |
| Change a role later | Admin | `PATCH /api/users/:id` | `{ "role": "dentist" }`, admin-only |
| Refresh an expired access token | Any logged-in user | `POST /api/auth/refresh` | Body: `{ "refreshToken": "..." }` |
| Log out one device | Any logged-in user | `POST /api/auth/logout` | Revokes that one refresh token |
| Log out everywhere | Any logged-in user | `POST /api/auth/logout-all` | Revokes all of that user's refresh tokens |

## 5. Local dev troubleshooting

**TypeScript can't find `describe`/`jest`/`it` in `.spec.ts` files:**
1. Confirm `node_modules/@types/jest` exists — if not, `npm install` again.
2. VS Code → Cmd/Ctrl+Shift+P → "TypeScript: Restart TS Server".
3. Confirm the editor isn't accidentally using `tsconfig.build.json` (which excludes `**/*spec.ts` on
   purpose — that's correct for `nest build`, wrong for editing).

**`baseUrl` deprecation warning in `tsconfig.json`:** safe to just delete the `"baseUrl": "./"` line — nothing
in this codebase uses bare-specifier imports that depend on it.

**CORS errors from the frontend:** check `CORS_ORIGIN` matches the frontend's actual dev server origin, and
that it isn't accidentally set to this API's own `PORT`.

## 6. Still to build

- Global exception filter matching the `{statusCode, message, errors, error}` shape from `API_DESIGN.md`.
- Refresh-token rotation (new token issued + old one revoked on every `/auth/refresh`).
- Optional: invite-flow so an Admin can create a shell account (no password) and email a one-time setup
  link, instead of typing the new hire's password directly. Role is still fixed by the Admin at creation
  time either way.
- `categories/`, `suppliers/`, `inventory/`, `alerts/`, `audit/` modules, each `@Roles(...)`-gated per
  `API_DESIGN.md`.
