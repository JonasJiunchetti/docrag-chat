# F001: Login and session

## Status
done

## Source
- Milestone M1 (Team access) in [`../product.md`](../product.md): "Employees and admins log in with their own accounts … nothing is reachable without login".

## Objective
Every person who uses docrag-chat logs in with their own account, stays logged in while active, can log out and can change their own password. No other part of the system is reachable without a session. This is the foundation every later milestone builds on.

## Scope
- Included: first-admin bootstrap, login, logout, "who am I", change own password, the rule that all other API routes require a login, the SPA login page, protected routing and a minimal logged-in shell (header with the user's name, logout, change password).
- Excluded: creating, editing or deactivating other users (F002), self-registration, forgotten-password by email (no mail in M1; admins reset passwords, F002), two-factor, "remember me", editing own name or email.

## Requirements
- FR-1: An Artisan command creates an active admin account from an email, a name and a password entered interactively (not as a command-line argument). It refuses to run for an email that already exists.
- FR-2: `POST /api/login` with a valid email and password for an active user starts a session and returns the user (id, name, email, role).
- FR-3: Invalid credentials, an unknown email and a deactivated account all return the same `422` validation error and message.
- FR-4: Login attempts are throttled per email + IP; the throttled response is `429`.
- FR-5: `POST /api/logout` ends the session. Afterwards the same cookie is no longer authenticated.
- FR-6: `GET /api/me` returns the current user, or `401` when there is no session.
- FR-7: `PUT /api/me/password` takes the current password, a new password and its confirmation. It changes the password and ends the user's other sessions but keeps the current one.
- FR-8: Every `/api` route requires a login except `GET /api/ping`, `GET /api/sanctum/csrf-cookie` and `POST /api/login`. A request without a session gets `401` JSON, never a redirect.
- FR-9: A user who is deactivated while logged in is rejected (`401`) on their next request.
- FR-10: The SPA shows a login page to anyone without a session, whatever URL they open, and returns them to the page they asked for after logging in.
- FR-11: The SPA shows no protected page content before the session check has finished.
- FR-12: A logged-in user can log out and change their password from the SPA, with validation errors shown next to the fields.
- FR-13: After 120 minutes of inactivity the next action sends the user back to the login page with a short "session expired" message instead of failing silently.

## Business Rules and Constraints
- No public registration route exists ([foundations Part B "Authorization"](../../docs/foundations.md)).
- Password minimum length 12 characters (assumption, see [`../architecture.md`](../architecture.md)).
- Email is case-insensitive; stored lowercase.
- Responses never include `password`, `remember_token` or other internals.

## Acceptance Criteria
- Given no admin exists, when the operator runs the command with a new email and a valid password, then an active admin exists and can log in.
- Given an email already exists, when the command is run with it, then it fails and changes nothing.
- Given a valid active user, when they post correct credentials, then they get `200` with their profile and a session cookie, and `GET /api/me` returns the same profile.
- Given a wrong password, an unknown email, or a deactivated user, when logging in, then the response is the same `422` message in all three cases.
- Given more than five failed attempts within one minute for one email and IP, when the next attempt arrives, then the response is `429`.
- Given a logged-in user, when they log out, then `GET /api/me` returns `401`.
- Given no session, when any `/api` route other than the three public ones is requested (with or without an `Accept: application/json` header), then the response is `401` JSON.
- Given a logged-in user who is then deactivated, when they make any request, then the response is `401`.
- Given correct current password and a valid new one, when the user changes their password, then they can log in with the new one only, and their other sessions are invalid while the current one still works.
- Given a wrong current password, or a new password that is too short or unconfirmed, when changing it, then the response is `422` with field errors and the password is unchanged.
- Given a logged-out visitor, when they open `/some/page` in the browser, then they see the login page, and after logging in they land on `/some/page`.
- Given the session check is still pending, when the SPA first renders, then no protected content is shown.
- Given an expired session, when the user acts, then they are shown the login page with a "session expired" message.

## Dependencies
- Foundations Part B: Authentication (Sanctum SPA) and Authorization (roles). This feature installs Sanctum and adds the `role` and `deactivated_at` columns used by F002.
- Foundations F000 (scaffold, done).

## Technical Approach
- Follow [`../architecture.md`](../architecture.md) for API conventions, session handling, the authenticated route group, role enum and frontend structure; follow [`docs/foundations.md`](../../docs/foundations.md) for stack, Sanctum install steps (`composer require`, not `install:api`) and env values. Confirmed design: Sanctum stateful cookies. Proposed design: everything else in `architecture.md`.
- Backend: a migration adds `role` (default `employee`) and `deactivated_at` to `users`; `bootstrap/app.php` enables `statefulApi()` and JSON rendering for `api/*`; `routes/api.php` gets one `auth:sanctum` group with `ping`, CSRF and login outside it.
- Frontend: add `react-router`; `lib/` fetch wrapper (CSRF, JSON, 401 handling); `features/auth/` with an auth context/provider, login page, change-password page and a route guard; header with logout.
- Local-dev note: the stateful check needs the request's `Origin`/`Referer` host to be in `SANCTUM_STATEFUL_DOMAINS`; browsers via `http://localhost:8080` satisfy this, raw `curl` needs the header.

## Data and API Impact
- Migration: add `users.role` (string, default `employee`) and `users.deactivated_at` (nullable timestamp). Additive only; no existing data is rewritten. Do not run migrations without the owner's go-ahead.
- Endpoints: `GET /api/sanctum/csrf-cookie`, `POST /api/login`, `POST /api/logout`, `GET /api/me`, `PUT /api/me/password`.
- The `UserFactory` gains `role`/`deactivated` states. The seeder's `test@example.com` user stays dev-only and must not be seeded in production.

## Testing and Verification
- Pest feature tests for every acceptance criterion above, including the guest / employee / deactivated matrix on a protected route and the throttle.
- Pest test for the command (success, duplicate email, weak password).
- Vitest + RTL: guard states (loading, guest, authed), login success and failure, session-expired message, change-password field errors.
- Run in the container: `vendor/bin/pint --test`, `vendor/bin/phpstan analyse`, `vendor/bin/pest`, `npx eslint .`, `npx prettier --check .`, `npx tsc -b`, `npx vitest run` ([foundations §10](../../docs/foundations.md)).
- Manual: log in through `http://localhost:8080` with HMR running, reload a deep link, log out.

## Risks and Open Questions
- Sanctum's stateful check relies on `Origin`/`Referer`; a misconfigured `SANCTUM_STATEFUL_DOMAINS` makes the API answer `401`/`419` to the SPA. Verify early.
- Password minimum (12) is an assumption; confirm.
- Production cookie settings wait on foundations §12 #4.
