---
status: approved            # draft | approved   (refers to the core: Part A + Part C)
mode: greenfield           # greenfield | adopted
last_updated: 2026-10-19
---

# Foundations: docrag-chat

> The project's engineering principles.
> - **Core** (Part A + Part C) is decided **before the PRD**: language, framework, repo tree, Docker, network and conventions. It does not depend on the product.
> - **Capabilities** (Part B) are decided **after the PRD, one milestone at a time**, with `/plan-foundations --capabilities <milestone>`.
>
> `/plan-prd`, `/plan-dev` and `/implement` read this file and must not contradict it. Only `/plan-foundations` writes it.
>
> Status tags used below:
> - **[LOCKED]**: decided or approved by the owner. Immutable. Changing it requires the owner to say so explicitly.
> - **[PROPOSED]**: suggested by Claude, not yet approved.
> - **[OPEN]**: unresolved. Commands must ask, never assume.
> - **[OBSERVED]**: found in an existing codebase (adopt mode). It becomes [LOCKED] once the owner confirms it.

## 0. Locked decisions (summary)

One line per locked decision. This is the first thing every command reads.

| # | Decision | Value | Part |
|---|----------|-------|------|
| 1 | Context | Personal project | A |
| 2 | System type | React SPA + JSON API, same origin | A |
| 3 | Language (backend) | PHP 8.4 | A |
| 4 | Framework (backend) | Laravel 12 (owner kept it knowing security support ends 2027-02-24; see §12 #1) | A |
| 5 | Frontend | React 19.2 + TypeScript + Vite 8.x | A |
| 6 | Frontend runtime | Node 24 LTS, inside the container only | A |
| 7 | Repo layout | Side by side: `backend/` + `frontend/`, infra in `docker/` | A |
| 8 | Dockerfile | **One** multi-stage Dockerfile (PHP + Node) at `docker/app/Dockerfile`, base `php:8.4-fpm-trixie` | A |
| 9 | App service | **One** compose service `app` serves both PHP and Node tooling | A |
| 10 | Dev processes | Compose does not run `npm run dev` or `artisan serve`. php-fpm is the only process the container starts; the engineer runs `npm run dev` by hand in dev; prod uses `npm run build` | A |
| 11 | Entry point | Nginx; dev: `/` → Vite dev server (with HMR), `/api` + `/up` → php-fpm; prod: `/` → built `frontend/dist` | A |
| 12 | Database | PostgreSQL 18 | A |
| 13 | Volumes | The db data volume is the only named volume; everything else is a bind mount; no cache volumes | A |
| 14 | Wrapper | None. Commands go through `docker compose exec app …` | A |
| 15 | Host ports | `127.0.0.1:8080` → nginx, `127.0.0.1:5432` → db | A |
| 16 | Origin / CORS | Same origin, no CORS | A |
| 17 | Local URL / TLS | `http://localhost:8080`, no local TLS | A |
| 18 | PHP tooling | Pint, Larastan 3 (PHPStan level 6), Pest 4 | C |
| 19 | JS tooling | ESLint 10 (flat config, typescript-eslint, react-hooks), Prettier 3, `tsc --noEmit`, Vitest + React Testing Library | C |
| 20 | Commits / branches | No enforced convention; owner's choice per moment | C |
| 21 | CI | None for now | C |
| 22 | Non-goal | No Kubernetes | C |
| 23 | Backend skeleton | Plain `laravel/laravel` 12, API routing enabled by hand (no `install:api` / Sanctum) | A |
| 24 | Dockerfile stages | `base` → `dev` / `frontend-build` → `prod` | A |
| 25 | Nginx configs | `docker/nginx/dev.conf` + `prod.conf`; new routes go in both | A |
| 26 | Env files | Root `.env` (compose), `backend/.env`, `frontend/.env` (`VITE_*` only); `.env.example` for each is committed | C |
| 27 | Test database | `docrag_test`, created by `docker/db/init/` | C |
| 28 | Auth (M1) | `laravel/sanctum ^4`, stateful SPA cookie mode, no API tokens; CSRF cookie at `/api/sanctum/csrf-cookie` | B |
| 29 | Roles (M1) | Built-in gates/policies + `users.role` (`admin` \| `employee`); admin-created accounts, no mail in M1 | B |

---

# PART A: Core (mandatory, decided before the PRD)

## 1. Overview and system shape

- **Project:** docrag-chat
- **Context:** personal [LOCKED]
- **System type:** SPA + API. A React SPA in the browser talks to a Laravel JSON API on the same origin [LOCKED]
- **Clients that talk to the system:** browser (the SPA) [LOCKED]
- **Environments:** local, production [LOCKED]. No staging until a deploy target exists.
- **Target deploy:** undecided [OPEN] (§12 #2). Kubernetes is excluded (§11).

## 2. Language and runtime

| Item | Value | Status |
|------|-------|--------|
| Language | PHP (backend), TypeScript (frontend) | [LOCKED] |
| Language version | PHP 8.4; TypeScript strict mode, version pinned at F000 to current stable | [LOCKED] |
| Required extensions / system libs | PHP: `pdo_pgsql`, `intl`, `zip`, `bcmath`, `opcache`; dev only: `pcov`. System: `libpq-dev`, `libicu-dev`, `libzip-dev`, `git`, `unzip`, `libfcgi-bin` (fpm healthcheck) | [LOCKED] |
| Package manager(s) | Composer 2 (binary copied from `composer:2`), npm (bundled with Node) | [LOCKED] |
| Runtime for frontend build (if any) | Node 24 LTS (binaries copied from `node:24-trixie-slim`), inside the `app` image only | [LOCKED] |

## 3. Framework

| Item | Value | Status |
|------|-------|--------|
| Framework | Laravel (backend), React (frontend) | [LOCKED] |
| Version | Laravel `^12`; React `^19.2`; Vite `^8` | [LOCKED] |
| Starter kit / skeleton | Backend: plain `laravel/laravel` 12 skeleton with API routing turned on by hand in `bootstrap/app.php` (not `install:api`, because that installs Sanctum, and auth is a capability). Frontend: Vite `react-ts` template | [LOCKED] |
| Architecture style | Framework default (Laravel conventions; feature folders under `frontend/src/`) | [LOCKED] |
| Frontend approach | React SPA, client-rendered, built by Vite and served by nginx | [LOCKED] |

## 4. Repository structure

**Layout type:** backend + frontend side by side [LOCKED]

```text
docrag-chat/
├── backend/                 # Laravel 12 app (composer.json)
│   ├── app/
│   ├── bootstrap/
│   ├── config/
│   ├── database/
│   ├── public/              # php-fpm document root (index.php)
│   ├── routes/
│   │   ├── api.php
│   │   └── web.php          # /up health route (framework default)
│   ├── tests/               # Pest: Feature/, Unit/
│   ├── phpstan.neon
│   ├── pint.json
│   └── .env.example
├── frontend/                # React 19.2 + TS + Vite (package.json)
│   ├── src/
│   ├── tests/               # Vitest + RTL (co-located *.test.tsx also allowed)
│   ├── public/
│   ├── index.html
│   ├── vite.config.ts
│   ├── eslint.config.js
│   ├── tsconfig.json
│   └── .env.example
├── docker/
│   ├── app/Dockerfile       # the single PHP + Node Dockerfile
│   ├── app/php/             # php.ini / fpm pool overrides
│   ├── nginx/
│   │   ├── dev.conf         # / → Vite dev server, /api → fpm
│   │   └── prod.conf        # / → frontend/dist, /api → fpm
│   └── db/init/             # Postgres init SQL (creates the test db)
├── docs/                    # foundations.md (this file)
├── specs/                   # product.md, roadmap, briefs, feature specs
├── docker-compose.yml
├── .env.example             # compose-level vars (HOST_UID/GID, POSTGRES_*)
├── .gitignore
├── CLAUDE.md
└── README.md
```

**Rules**
- Where application code lives: backend code in `backend/`, SPA code in `frontend/src/`. Neither app imports files from the other; they talk only over HTTP under `/api`. [LOCKED]
- Where infra files live (Dockerfile, compose, nginx): `docker/<service>/`. `docker-compose.yml` is at the repo root. [LOCKED]
- Where docs live: `docs/` for foundations, `specs/` for product and feature specs. [LOCKED]
- Where tests live: `backend/tests/` (Pest) and `frontend/tests/` or co-located `*.test.ts(x)` (Vitest). [LOCKED]
- Naming conventions: PHP follows PSR-4 and Laravel defaults. TS uses PascalCase for component files (`ChatPanel.tsx`) and camelCase for hooks and utilities (`useChat.ts`). [LOCKED]
- Files that must never be committed: `.env`, `backend/.env`, `frontend/.env*` (except `.env.example`), `backend/vendor/`, `frontend/node_modules/`, `frontend/dist/`, `backend/storage/*` runtime files, IDE folders. [LOCKED]

## 5. Dockerfile

### 5.1 Skeleton

| Item | Value | Status |
|------|-------|--------|
| Number of Dockerfiles / location | One: `docker/app/Dockerfile`. It holds both PHP and Node. Nginx and Postgres use official images with no custom Dockerfile. | [LOCKED] |
| Base image (with tag) | `php:8.4-fpm-trixie`. Node 24 copied from `node:24-trixie-slim`, Composer from `composer:2`. F000 pins exact patch tags. | [LOCKED] |
| Multi-stage? Stages | `base` (PHP extensions, Node, Composer, non-root user) → `dev` (pcov, dev ini) / `frontend-build` (`npm ci && npm run build`) → `prod` (`composer install --no-dev`, opcache prod ini, backend code copied in) | [LOCKED] |
| Targets | `dev` (used by compose locally), `prod` | [LOCKED] |
| System packages / extensions installed | See §2 | [LOCKED] |
| Dependency install strategy | dev: `composer install` / `npm install` run by the engineer via `docker compose exec app`, landing in the bind mount. prod: `composer install --no-dev --optimize-autoloader` and `npm ci && npm run build` at build time | [LOCKED] |
| Process manager / entrypoint | `php-fpm` in the foreground is the only process the container starts. No supervisor; no `npm run dev` or `artisan serve` in the CMD. | [LOCKED] |
| Healthcheck | fpm ping through `cgi-fcgi` (`ping.path = /ping` in the pool config) | [LOCKED] |

### 5.2 Rules

- Run as a non-root user built from the `HOST_UID` / `HOST_GID` build args (`id -u` / `id -g`), so files created in bind mounts belong to the host user. [LOCKED]
- Pin package-manager versions where practical. Prefer official or well-maintained base images. [LOCKED]
- No cache volumes. Composer and npm caches stay in the container user's home directory (they don't survive a container rebuild) and never inside the repository. [LOCKED]
- Set `git safe.directory` narrowly, to `/var/www` only, when needed. [LOCKED]
- Never bake secrets into images. Use build secrets or runtime env. [LOCKED]
- There is only one application Dockerfile. A capability that needs extra extensions or packages adds them to the stage of `docker/app/Dockerfile` that needs them and records this in its Part B "Impacts: Dockerfile" row. A capability that needs a different runtime (not PHP or Node) is a change request to the core. [LOCKED]

## 6. docker-compose

**Files:** `docker-compose.yml` (local dev). A production compose file depends on the deploy target [OPEN] (§12 #3).

### 6.1 Skeleton (only what F000 needs to boot)

| Service | Image / build | Purpose | Ports (host:container) | Depends on | Volumes | Status |
|---------|---------------|---------|------------------------|------------|---------|--------|
| app | build `docker/app/Dockerfile`, target `dev`, args `HOST_UID`/`HOST_GID` | php-fpm (`:9000`); the engineer also runs Composer, Artisan, npm and the Vite dev server (`:5173`, not published) here | none | db (healthy) | bind `.:/var/www` | [LOCKED] |
| web | `nginx:1.30-alpine` (current stable line; F000 confirms the exact tag) | Entry point, routing per §7.1 | `127.0.0.1:8080:80` | app (healthy) | bind `./docker/nginx/dev.conf:/etc/nginx/conf.d/default.conf:ro` | [LOCKED] |
| db | `postgres:18` (F000 pins the minor version) | Primary database | `127.0.0.1:5432:5432` | none | named `db-data:/var/lib/postgresql`; bind `./docker/db/init:/docker-entrypoint-initdb.d:ro` | [LOCKED] |

### 6.2 Rules for adding a service

Capabilities add services by following these rules. They record the service in their Part B block and do **not** edit the skeleton table.

- Service naming: short lowercase role name (`queue`, `cache`, `search`), never a product name. [LOCKED]
- Which network(s) a new service joins: the compose default network. [LOCKED]
- Development ports are published on `127.0.0.1` only, never `0.0.0.0`. Only publish a port when a host tool needs it; HTTP traffic goes through `web`. [LOCKED]
- Every service that others depend on has a healthcheck; `depends_on` uses `condition: service_healthy`. [LOCKED]
- Named volumes are only for database or persistent-store data. Source code and config use bind mounts. No cache volumes. [LOCKED]
- Env var strategy: compose reads the root `.env` for interpolation (`HOST_UID`, `HOST_GID`, `POSTGRES_*`). Laravel reads `backend/.env`; Vite reads `frontend/.env` (`VITE_*` only, never secrets). Each one has a committed `.env.example` with placeholders; the real `.env` files are gitignored. [LOCKED]
- Dev-only vs prod-only services: dev-only services are allowed only in `docker-compose.yml` and must be marked in their Part B block. Prod services wait for §12 #3. [LOCKED]

### 6.3 Single entry point

- Wrapper: **none** [LOCKED]. The engineer works directly with compose:
  - `docker compose up -d` / `docker compose down`
  - `docker compose exec app bash`
  - `docker compose exec app composer …` / `… php artisan …` (from `backend/`)
  - `docker compose exec app npm …` (from `frontend/`), including `npm run dev`
- Documentation (README) lists these commands. Destructive actions (`down -v`, `migrate:fresh`) are never chained into another documented command.

## 7. Network architecture

### 7.1 Skeleton

- **Compose networks:** the single default network. [LOCKED]
- **Entry point:** Nginx (`web`). [LOCKED]
- **Public routes:** [LOCKED]
  - `/api/*` → php-fpm `app:9000`, `SCRIPT_FILENAME=/var/www/backend/public/index.php`
  - `/up` → php-fpm (Laravel's default health route)
  - `/` and everything else:
    - **dev** (`docker/nginx/dev.conf`): proxied to the Vite dev server at `app:5173`, with the WebSocket upgrade headers needed for HMR. Returns 502 until `npm run dev` is running; `/api` and `/up` keep working.
    - **prod** (`docker/nginx/prod.conf`): static files from `frontend/dist` with `try_files $uri /index.html` (SPA fallback).
- **Ports exposed to host:** `127.0.0.1:8080` (web) and `127.0.0.1:5432` (db). Vite's `5173` and fpm's `9000` are not published. [LOCKED]
- **Service-to-service communication:** web → `app:9000` (FastCGI), web → `app:5173` (HTTP + WS, dev only), app → `db:5432` (Postgres). [LOCKED]
- **TLS / domains (local and prod):** local `http://localhost:8080`, no TLS [LOCKED]. Production domain and TLS [OPEN] (§12 #4).
- **CORS / cookie / session domain rules:** the SPA and API share one origin, so there is **no CORS configuration**. Cookies are first-party (`SameSite=Lax`, host-only, no `Domain` attribute). Which auth library to use is a Part B capability. [LOCKED]
- **Vite behind nginx (dev):** `server.host: '0.0.0.0'`, `server.port: 5173`, `server.strictPort: true`, `server.hmr.clientPort: 8080`. Vite does not proxy `/api`; nginx routes it. [LOCKED]

```text
browser ──http://localhost:8080──▶ web (nginx)
                                     ├─ /api/*, /up ──FastCGI──▶ app:9000 (php-fpm, Laravel) ──▶ db:5432 (Postgres 18)
                                     └─ /*  dev:  ──HTTP+WS──▶ app:5173 (Vite dev server, started by hand)
                                            prod: ──static──▶ frontend/dist
```

### 7.2 Rules for adding a route or port

- New public routes go through the entry point; services are never exposed directly. [LOCKED]
- Backend routes live under `/api` (plus framework system routes like `/up`). Anything else belongs to the SPA. [LOCKED]
- WebSocket or other long-lived connections: same origin through a path on nginx (e.g. `/ws`), never a separate host port. [LOCKED]
- A capability that adds a route or port records it in its Part B "Impacts: network" row and adds it to **both** `dev.conf` and `prod.conf`. [LOCKED]

## 8. Core dependencies

Only the dependencies that shape the architecture. Not a full lockfile. Capability libraries go in Part B.

| Dependency | Version | Role | Status |
|------------|---------|------|--------|
| PHP | 8.4 | Backend runtime | [LOCKED] |
| laravel/framework | ^12 | Backend framework | [LOCKED] |
| PostgreSQL | 18 | Database | [LOCKED] |
| Nginx | 1.30 (stable line) | Entry point | [LOCKED] |
| Node.js | 24 LTS | Frontend tooling runtime | [LOCKED] |
| react / react-dom | ^19.2 | SPA | [LOCKED] |
| vite + @vitejs/plugin-react | ^8 | Dev server and bundler | [LOCKED] |
| typescript | current stable, pinned at F000 | Type system (strict) | [LOCKED] |

---

# PART B: Capabilities (decided per milestone, after the PRD)

Filled by `/plan-foundations --capabilities <milestone>`. **An empty Part B when the core is approved is normal.**

Each capability is one block and follows the rules in §5.2, §6.2 and §7.2. If the owner named a library, it is **[LOCKED]**. If not, Claude proposes a default plus alternatives.

Common capabilities: admin panel, realtime / live chat, auth, queue and jobs, cache, search, file storage, mail, payments, observability and logging, scheduler, API docs, mobile client, AI / LLM / vector store, i18n.

### Capability: Authentication (SPA session)

| Item | Value |
|------|-------|
| Needed by | M1 Team access ("nothing is reachable without login") |
| Library / service | `laravel/sanctum`, stateful SPA (cookie) mode only. API tokens are not used. [LOCKED] |
| Version | `^4` (4.3.x supports Laravel 12 and PHP 8.4; exact version resolved by Composer at install) [LOCKED] |
| Why this one | Owner's choice. First-party; its stateful middleware gives session cookies plus CSRF protection for a same-origin SPA, which matches §7.1 exactly |
| Alternatives considered | Sanctum + Fortify (ready-made login, reset and 2FA endpoints; more than M1 needs, and registration would have to be disabled); plain session guard without a package (re-implements what Sanctum's stateful middleware does) |
| Status | [LOCKED] |
| Impacts: Dockerfile | None |
| Impacts: compose | None |
| Impacts: network | None. Sanctum's CSRF cookie route moves under `/api` (`sanctum.prefix = api/sanctum`, so `GET /api/sanctum/csrf-cookie`), and the login, logout and current-user endpoints live under `/api`. The existing `/api/` location in `dev.conf` and `prod.conf` covers all of them, so nginx needs no new route. [LOCKED] |
| Impacts: repo tree | `backend/config/sanctum.php` (published). Installed with `composer require laravel/sanctum` plus config publish, **not** `php artisan install:api` (§0 row 23; `routes/api.php` already exists). The `personal_access_tokens` migration is not published because tokens are unused. [LOCKED] |
| Config / env vars | `backend/.env`: `SANCTUM_STATEFUL_DOMAINS=localhost:8080` (prod: the production host, §12 #4); `SESSION_DRIVER=database` (already set); `SESSION_DOMAIN=null` (host-only cookie, §7.1); `SESSION_SAME_SITE=lax`; `SESSION_SECURE_COOKIE=false` locally, `true` in prod. `bootstrap/app.php` enables `$middleware->statefulApi()`. [LOCKED] |
| Constraints | Same origin only (§7.1); no CORS. The SPA calls `/api/sanctum/csrf-cookie` before login and sends `X-XSRF-TOKEN` on state-changing requests (automatic with axios; with `fetch` the SPA reads the `XSRF-TOKEN` cookie itself). No public registration endpoint. Login is rate-limited with Laravel's built-in rate limiter. Every `/api` route except login and the CSRF cookie requires `auth:sanctum`. [LOCKED] |

### Capability: Authorization (roles)

| Item | Value |
|------|-------|
| Needed by | M1 Team access (admins and employees; "admins manage users") |
| Library / service | None. Laravel's built-in gates and policies, plus a `role` column on `users` (`admin` \| `employee`) [LOCKED] |
| Version | Ships with `laravel/framework ^12` |
| Why this one | Owner's choice. Two fixed roles don't justify a permissions library |
| Alternatives considered | `spatie/laravel-permission` (roles and permissions tables; revisit if the PRD's open question on per-document permissions is answered "yes") |
| Status | [LOCKED] |
| Impacts: Dockerfile | None |
| Impacts: compose | None |
| Impacts: network | None |
| Impacts: repo tree | None beyond Laravel defaults (`app/Policies/`, a migration for `users.role`) |
| Config / env vars | None |
| Constraints | Accounts are created only by admins, who set a temporary password the user changes after first login. Admins reset forgotten passwords. **No mail capability in M1** (owner's choice). The first admin is bootstrapped from the CLI (`docker compose exec app …`), never through a public endpoint. Roles are enforced on the backend; the SPA only hides UI. [LOCKED] |

---

# PART C: Cross-cutting (core, decided before the PRD)

## 9. Configuration and secrets

- Env files and which are committed: `.env.example`, `backend/.env.example` and `frontend/.env.example` are committed with placeholders. `.env`, `backend/.env` and `frontend/.env` are gitignored. [LOCKED]
- Secret handling per environment: local secrets live in the gitignored `.env` files. `frontend/.env` never holds secrets (anything `VITE_*` ships to the browser). Production secret handling depends on the deploy target [OPEN] (§12 #2).

## 10. Conventions

These are the project's engineering rules. `/implement` follows them. All tools run inside the `app` container.

- Code style / linter / formatter:
  - PHP: Laravel Pint, `laravel` preset. Check with `vendor/bin/pint --test`. [LOCKED]
  - TS: ESLint 10 flat config (`typescript-eslint`, `eslint-plugin-react-hooks`) and Prettier 3. [LOCKED]
- Static analysis:
  - PHP: Larastan 3, PHPStan level 6. [LOCKED]
  - TS: `tsc --noEmit` with `strict: true`. [LOCKED]
- Testing stack and where tests run:
  - Backend: Pest 4 (PHPUnit 12). Pest 5 needs Laravel 13, so it is blocked by row 4 in §0. Tests run against a separate Postgres database `docrag_test`, created by `docker/db/init/`. [LOCKED]
  - Frontend: Vitest (major compatible with Vite 8, pinned at F000) with React Testing Library on jsdom. [LOCKED]
- Commit / branch convention: no enforced convention. The owner decides per moment; commands must not impose one. [LOCKED]
- CI (if any): none for now [LOCKED]. Can be added later through a change request.

## 11. Non-goals

What this project deliberately will not do or use. Prevents later commands from adding it.

- No Kubernetes (manifests, Helm charts, k8s-specific tooling). [LOCKED]

## 12. Open questions

Anything still [OPEN]. Commands must ask about these before relying on them.

| # | Question | Blocks |
|---|----------|--------|
| 1 | Laravel 12 bug fixes ended 2026-08-13 and security fixes end 2027-02-24. When will the project move to Laravel 13? (Laravel 13 also unlocks Pest 5.) | Anything shipped after 2027-02-24 |
| 2 | Deploy target (VPS, PaaS, …) and production secret handling. | Production deploy, §9 prod secrets |
| 3 | Production compose and how nginx gets `frontend/dist` in prod (e.g. a shared build artifact, or an nginx stage in the single Dockerfile). | Production deploy |
| 4 | Production domain and TLS termination. | Production deploy |
| 5 | Node 26 becomes LTS on 2026-10-28. Stay on Node 24 (Active LTS until ~2028-04) or move to 26 later? | Nothing now |

## 13. Change log

| Date | Change | Reason |
|------|--------|--------|
| 2026-10-19 | Core drafted (Part A, Part C, §14) | `/plan-foundations` core interview |
| 2026-10-19 | Core approved; all proposed defaults locked | Owner approval |
| 2026-10-19 | Part B: Authentication (Sanctum SPA) and Authorization (built-in roles) for M1; all items locked | `/plan-foundations --capabilities M1`, owner approval |

## 14. Scaffold acceptance (F000)

F000 has no separate spec. Its spec is Part A plus this checklist. `/implement F000` is done only when every line has evidence.

- [ ] The stack builds and starts with `docker compose up -d --build` on a machine with only Docker installed. No PHP, Composer or Node is needed on the host.
- [ ] The repo tree matches §4.
- [ ] `docker/app/Dockerfile` is the only application Dockerfile. It has `dev` and `prod` targets, a non-root user built from `HOST_UID`/`HOST_GID`, and Node 24 alongside PHP 8.4 (`docker compose exec app php -v` and `… node -v`).
- [ ] Compose services match §6.1. Ports are bound to `127.0.0.1`. `db-data` is the only named volume; there are no cache volumes. Healthchecks for `db`, `app` and `web` pass.
- [ ] `app`'s command is php-fpm only. Nothing in compose or the Dockerfile CMD starts `npm run dev` or `artisan serve`.
- [ ] `GET http://localhost:8080/up` returns 200 through nginx → php-fpm.
- [ ] `GET http://localhost:8080/api/<placeholder>` reaches Laravel (a JSON response), with no CORS headers configured.
- [ ] With `docker compose exec app npm run dev` running, `http://localhost:8080/` serves the Vite React app, and editing a component hot-reloads it in the browser (HMR over the WebSocket through nginx).
- [ ] `docker compose exec app npm run build` produces `frontend/dist`, and `docker/nginx/prod.conf` serves it with SPA fallback (checked by mounting `prod.conf` once).
- [ ] `docker build --target prod -f docker/app/Dockerfile .` succeeds.
- [ ] Files created via `docker compose exec app …` (e.g. `vendor/`, `node_modules/`) are owned by the host user.
- [ ] Postgres is reachable from the host on `127.0.0.1:5432`, and the `docrag_test` database exists.
- [ ] Inside the container these pass: `vendor/bin/pint --test`, `vendor/bin/phpstan` (level 6), `vendor/bin/pest` (on `docrag_test`), `npx eslint .`, `npx prettier --check .`, `npx tsc --noEmit`, `npx vitest run`. An empty or example test suite passing is fine.
- [ ] `.env.example`, `backend/.env.example` and `frontend/.env.example` exist with placeholders; all real `.env` files are gitignored.
- [ ] The README documents the `docker compose` commands from §6.3.

---

## How commands must use this file

1. Read section 0, Part A and Part C before doing anything else. Read Part B blocks only when relevant to the current work.
2. Treat **[LOCKED]** items and section 0 as immutable.
3. For any **[OPEN]** or empty field that the current task depends on, ask the owner before proceeding. Never invent a value.
4. A feature that needs a capability missing from Part B: stop and run `/plan-foundations --capabilities <milestone|brief>`. Ordinary libraries inside the established stack do not need a block.
5. A change to a core principle (Part A or C): run `/plan-foundations <change>`. Get approval, then record it in section 13.
6. `/implement` follows sections 4 to 7 exactly, and section 14 for F000.
