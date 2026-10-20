# Architecture

Shared technical decisions that are **not** in [`docs/foundations.md`](../docs/foundations.md). Stack, repo tree, Docker, network, tooling and the auth/roles capabilities live there and are not restated here. Status tags: **Confirmed** (owner decision), **Observed** (found in the repo), **Proposed** (this plan; not yet implemented), **Assumption** (needs validation).

## Observed conventions (F000 scaffold)

| Area | What exists | Reference |
|---|---|---|
| API routing | One flat `routes/api.php` with a single `GET /ping`; CORS middleware removed (same origin) | `backend/routes/api.php`, `backend/bootstrap/app.php` |
| Backend structure | Laravel defaults. `app/Http/Controllers` is empty; the only model is `User`; no policies, requests or resources yet | `backend/app/` |
| Users table | `name`, `email` (unique), `password`, `remember_token`, timestamps, plus unused `email_verified_at`; `sessions` table with `user_id`; `password_reset_tokens` table unused | `backend/database/migrations/0001_01_01_000000_create_users_table.php` |
| Backend tests | Pest `it('…')` functions in `tests/Feature`; `TestCase` is applied to `Feature` only; tests run on `docrag_test`; `RefreshDatabase` is not enabled globally | `backend/tests/Pest.php`, `backend/phpunit.xml` |
| Frontend structure | Bare Vite template: `src/App.tsx`, `src/main.tsx`; no router, no API client, no state library | `frontend/src/` |
| Frontend tests | Vitest + RTL, co-located `*.test.tsx`, jest-dom set up, `cleanup` after each | `frontend/src/App.test.tsx`, `frontend/tests/setup.ts` |
| Logging, error handling | Framework defaults only | `backend/bootstrap/app.php` |

There is no existing example for validation, authorization, data access or API resources; the patterns below are proposals, not conventions.

## Decisions

### API conventions (Proposed)
- All backend routes live under `/api` ([foundations §7.2](../docs/foundations.md)). JSON in, JSON out.
- Errors use Laravel's standard JSON shapes: `422 {message, errors{field:[…]}}` for validation, `401` unauthenticated, `403` forbidden, `429` throttled. For paths under `api/*`, the exception handler always renders JSON, so a missing `Accept` header never produces a redirect to a nonexistent login route.
- Validation lives in Form Request classes; controllers stay thin and return Eloquent API Resources, never raw models (so `password` and other internals can't leak).
- Plural resource naming (`/api/users`). Actions that are not CRUD use a verb sub-path (`POST /api/users/{id}/deactivate`).

### Authentication and session (Proposed, builds on foundations Part B "Authentication")
- Cookie session via Sanctum stateful mode. The SPA's `fetch` wrapper calls `GET /api/sanctum/csrf-cookie` before the first state-changing request and echoes the `XSRF-TOKEN` cookie as `X-XSRF-TOKEN` (foundations: "with `fetch` the SPA reads the cookie itself"). It always sends `credentials: 'same-origin'`, `Accept: application/json`.
- Session lifetime is 120 minutes of inactivity (existing `SESSION_LIFETIME`), owner-confirmed.
- On login the session id is regenerated; on logout the session is invalidated and the CSRF token regenerated.
- Login is throttled per email + IP.
- Every `/api` route sits behind `auth:sanctum`, **except** `GET /api/ping`, `GET /api/sanctum/csrf-cookie` and `POST /api/login`. This is the single enforcement point for the PRD rule "nothing is accessed without login"; new routes are protected by default by being added inside the authenticated group.
- A deactivated user is rejected on every request even if a session survives (defence in depth beyond deleting that user's rows from `sessions`). The check lives in one place (the authenticated group), not in individual controllers.
- Controllers and the login request name the `web` guard explicitly; the default guard switches to `sanctum` once `auth:sanctum` has run. Guests are never redirected (`redirectGuestsTo` returns null) because there is no server-side login page.
- Login failure messages are identical for unknown email, wrong password and deactivated account, so the response never reveals which accounts exist.

### Authorization (Proposed, builds on foundations Part B "Authorization")
- `users.role` is a string column cast to a backed PHP enum with two cases, `admin` and `employee`; the default is `employee`.
- Admin-only actions are protected by a `UserPolicy` and `authorize()` calls in controllers, not by checks in the SPA. The SPA hides admin navigation only for convenience.
- Later milestones add their own policies in the same place (`app/Policies`).

### User lifecycle (Proposed)
- Accounts are created only by an admin (API) or, for the very first admin, by an Artisan command run through `docker compose exec app …`. There is no public registration route.
- "Remove" means deactivate: `users.deactivated_at` (nullable timestamp). Rows are never hard-deleted in M1, so M3 can keep conversation ownership intact.
- Password changes (self or admin reset) end the user's other sessions. Mechanism (implemented in F001): Sanctum's stateful middleware already runs its `AuthenticateSession`, which compares a password hash kept in the session with the user's current one; login stores that hash (a session that never makes another request would otherwise survive), and a self-service change calls `logoutOtherDevices`. An admin reset only needs to update the password.
- An admin cannot deactivate themselves or change their own role, which guarantees at least one active admin.
- Email is stored lowercase and unique.
- Password policy: minimum 12 characters (Laravel `Password` rule). **Assumption**, needs the owner's check.

### Frontend structure (Proposed)
- Feature folders under `frontend/src/`: `features/auth/`, `features/users/`, shared `lib/` (API client). Components PascalCase, hooks/utilities camelCase ([foundations §4](../docs/foundations.md)).
- `react-router` provides client-side routes (ordinary library inside the established stack; version pinned at implementation to the current stable that supports React 19). Nginx's SPA fallback in prod and Vite's fallback in dev already serve deep links.
- Server state is fetched with a thin `fetch` wrapper in `lib/`; no data-fetching or state library until a feature needs one.
- Auth state is read once on load from `GET /api/me`. Loading, unauthenticated and authenticated are three explicit states, so protected pages never flash before the session check completes.

### Testing strategy (Proposed, in addition to foundations §10)
- Backend feature tests with Pest `it()` cases enable `RefreshDatabase` for the `Feature` directory via `tests/Pest.php`. Authorization is tested per role (guest, employee, admin) for every endpoint.
- Frontend tests use Vitest + RTL with `fetch` mocked per test; assert on roles and visible text, not implementation.
- Tests use `SESSION_DRIVER=array`, whose store is shared across requests inside one test. `TestCase::withSessionFrom()` replays a login's session cookie the way a browser would (flushing the shared store and enabling credentials); use it instead of assuming cookies persist. Session ending is asserted through the password-hash check, so no `database`-driver test is needed.

## Unresolved technical questions
- None blocking M1. The password minimum length (above) is an assumption to confirm during F001 review.
- Production values for `SANCTUM_STATEFUL_DOMAINS` and secure cookies wait for foundations §12 #4 (domain and TLS).
