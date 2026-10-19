---
status: draft              # draft | approved   (refers to the core: Part A + Part C)
mode: greenfield           # greenfield | adopted
last_updated: YYYY-MM-DD
---

# Foundations: <project name>

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
| 1 | Language | <e.g. PHP 8.4> | A |
| 2 | Framework | <e.g. Laravel 12> | A |
| 3 | ... | ... | ... |

---

# PART A: Core (mandatory, decided before the PRD)

## 1. Overview and system shape

The minimum product knowledge needed to choose a stack and network. Features, users and scope belong in the PRD, not here.

- **Project:** <name>
- **Context:** <client | personal>
- **System type:** <web app (server-rendered) | SPA + API | API + mobile | API only | CLI | worker | other>
- **Clients that talk to the system:** <browser, mobile app, third-party integrations, none>
- **Environments:** <local, staging, production>
- **Target deploy:** <VPS, Fly.io, k8s, shared hosting, undecided>

## 2. Language and runtime

| Item | Value | Status |
|------|-------|--------|
| Language | | |
| Language version | | |
| Required extensions / system libs | | |
| Package manager(s) | | |
| Runtime for frontend build (if any) | | |

## 3. Framework

| Item | Value | Status |
|------|-------|--------|
| Framework | | |
| Version | | |
| Starter kit / skeleton | | |
| Architecture style | <layered, modular monolith, hexagonal, framework default> | |
| Frontend approach | <Blade, Livewire, Inertia, React SPA, API only> | |

## 4. Repository structure

**Layout type:** <single app | monorepo | backend + frontend side by side>

```text
<project>/
├── ...
```

**Rules**
- Where application code lives:
- Where infra files live (Dockerfile, compose, nginx):
- Where docs live (`docs/` for foundations, `specs/` for product and feature specs):
- Where tests live:
- Naming conventions:
- Files that must never be committed:

## 5. Dockerfile

### 5.1 Skeleton

| Item | Value | Status |
|------|-------|--------|
| Number of Dockerfiles / location | | |
| Base image (with tag) | | |
| Multi-stage? Stages | <deps, build, runtime> | |
| Targets | <dev, prod> | |
| System packages / extensions installed | | |
| Dependency install strategy | <composer install --no-dev in prod, etc.> | |
| Process manager / entrypoint | | |
| Healthcheck | | |

### 5.2 Rules

Defaults below. Keep, change or remove each one; every line is a decision.

- Run as a non-root user built from `HOST_UID` / `HOST_GID` build args (`id -u` / `id -g`), so files created in bind mounts belong to the host user.
- Pin package-manager versions where practical. Prefer official or well-maintained base images.
- Keep package-manager and tool caches outside the repository (named volume or home dir in the image).
- Set `git safe.directory` narrowly, to the workspace path only, when needed.
- Never bake secrets into images. Use build secrets or runtime env.
- A capability that needs extra extensions or packages adds them to the stage that needs them and records this in its Part B "Impacts: Dockerfile" row.

## 6. docker-compose

**Files:** <docker-compose.yml, docker-compose.override.yml, docker-compose.prod.yml>

### 6.1 Skeleton (only what F000 needs to boot)

| Service | Image / build | Purpose | Ports (host:container) | Depends on | Volumes | Status |
|---------|---------------|---------|------------------------|------------|---------|--------|
| app | | | | | | |
| web | | | | | | |
| db | | | | | | |

### 6.2 Rules for adding a service

Capabilities add services by following these rules. They record the service in their Part B block and do **not** edit the skeleton table.

- Service naming:
- Which network(s) a new service joins:
- Development ports are published on `127.0.0.1` only, never `0.0.0.0`.
- Every service that others depend on has a healthcheck; `depends_on` uses `condition: service_healthy`.
- Persistent data uses named volumes; source code uses bind mounts.
- Env var strategy (`.env`, `env_file`, secrets); `.env.example` with placeholders is committed, `.env` is not:
- Dev-only vs prod-only services:

### 6.3 Single entry point

- Wrapper: <e.g. `bin/dev`>
- Interface: <e.g. `bin/dev up | down | sh | test | <tool> ...`>
- The wrapper must not hide destructive behaviour (volume removal, db reset need an explicit subcommand).

## 7. Network architecture

### 7.1 Skeleton

- **Compose networks:** <default, or frontend/backend split>
- **Entry point:** <Nginx, Traefik, Caddy, platform ingress>
- **Public routes:** <`/` to app, `/api` to app, etc.>
- **Ports exposed to host:**
- **Service-to-service communication:** <hostnames, protocols>
- **TLS / domains (local and prod):**
- **CORS / cookie / session domain rules (if SPA or mobile client):**

```text
<optional ASCII diagram: client -> web -> app -> db>
```

### 7.2 Rules for adding a route or port

- New public routes go through the entry point; services are never exposed directly.
- Websocket or other long-lived connections: <same domain via path, or subdomain>
- A capability that adds a route or port records it in its Part B "Impacts: network" row.

## 8. Core dependencies

Only the dependencies that shape the architecture. Not a full lockfile. Capability libraries go in Part B.

| Dependency | Version | Role | Status |
|------------|---------|------|--------|
| | | | |

---

# PART B: Capabilities (decided per milestone, after the PRD)

Filled by `/plan-foundations --capabilities <milestone>`. **An empty Part B when the core is approved is normal.**

Each capability is one block and follows the rules in §5.2, §6.2 and §7.2. If the owner named a library, it is **[LOCKED]**. If not, Claude proposes a default plus alternatives.

Common capabilities: admin panel, realtime / live chat, auth, queue and jobs, cache, search, file storage, mail, payments, observability and logging, scheduler, API docs, mobile client, AI / LLM / vector store, i18n.

### Capability: <name, e.g. Admin panel>

| Item | Value |
|------|-------|
| Needed by | <milestone M# / brief / feature> |
| Library / service | <e.g. Filament> |
| Version | |
| Why this one | <owner's choice, or rationale for proposed default> |
| Alternatives considered | |
| Status | [LOCKED] / [PROPOSED] / [OPEN] |
| Impacts: Dockerfile | <extra extensions, packages, none> |
| Impacts: compose | <new service (name, image, ports, volumes, healthcheck), none> |
| Impacts: network | <new route, websocket port, none> |
| Impacts: repo tree | <new directories, none> |
| Config / env vars | |
| Constraints | <e.g. needs Redis, must run behind same domain> |

<!-- Copy the block above for each capability. -->

---

# PART C: Cross-cutting (core, decided before the PRD)

## 9. Configuration and secrets

- Env files and which are committed:
- Secret handling per environment:

## 10. Conventions

These are the project's engineering rules. `/implement` follows them.

- Code style / linter / formatter:
- Static analysis:
- Testing stack and where tests run:
- Commit / branch convention:
- CI (if any):

## 11. Non-goals

What this project deliberately will not do or use. Prevents later commands from adding it.

-

## 12. Open questions

Anything still [OPEN]. Commands must ask about these before relying on them.

| # | Question | Blocks |
|---|----------|--------|
| | | |

## 13. Change log

| Date | Change | Reason |
|------|--------|--------|
| | | |

## 14. Scaffold acceptance (F000)

F000 has no separate spec. Its spec is Part A plus this checklist. `/implement F000` is done only when every line has evidence.

- [ ] The stack builds and starts on a machine with only Docker (and the documented prerequisites) installed. No language runtime or package manager is needed on the host.
- [ ] The repo tree matches §4.
- [ ] Dockerfile stages, targets and non-root user match §5.
- [ ] Compose services match §6.1, ports are bound to `127.0.0.1`, and healthchecks pass.
- [ ] The entry point serves the routes in §7.1 (for example `/` returns the framework's default page or a health endpoint).
- [ ] The wrapper (§6.3) works for: up, down, shell, running tests.
- [ ] Linter, formatter and test runner from §10 run inside the container (an empty test suite passing is fine).
- [ ] `.env.example` exists with placeholders; `.env` is gitignored.
- [ ] <project-specific checks>

---

## How commands must use this file

1. Read section 0, Part A and Part C before doing anything else. Read Part B blocks only when relevant to the current work.
2. Treat **[LOCKED]** items and section 0 as immutable.
3. For any **[OPEN]** or empty field that the current task depends on, ask the owner before proceeding. Never invent a value.
4. A feature that needs a capability missing from Part B: stop and run `/plan-foundations --capabilities <milestone|brief>`. Ordinary libraries inside the established stack do not need a block.
5. A change to a core principle (Part A or C): run `/plan-foundations <change>`. Get approval, then record it in section 13.
6. `/implement` follows sections 4 to 7 exactly, and section 14 for F000.
