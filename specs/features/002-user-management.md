# F002: User management

## Status
proposed

## Source
- Milestone M1 (Team access) in [`../product.md`](../product.md): "admins manage users".

## Objective
An admin creates accounts for employees, sets their role, resets forgotten passwords, and deactivates people who leave, entirely inside the app. Employees cannot see or use any of it.

## Scope
- Included: list, create, edit name/email/role, reset password, deactivate and reactivate; the admin screen in the SPA; admin-only navigation.
- Excluded: hard delete, self-registration, email invites or reset links (no mail in M1), per-document or per-group permissions (open question in the PRD), audit log, pagination and search (the user list is small), bulk import.

## Requirements
- FR-1: `GET /api/users` returns all users (id, name, email, role, deactivated_at) to an admin.
- FR-2: `POST /api/users` creates a user from name, email, role and a temporary password supplied by the admin. The new account is active.
- FR-3: `PATCH /api/users/{id}` updates name, email and role.
- FR-4: `POST /api/users/{id}/reset-password` sets a new password supplied by the admin and ends all of that user's sessions.
- FR-5: `POST /api/users/{id}/deactivate` sets `deactivated_at`, ends all of the user's sessions and blocks login.
- FR-6: `POST /api/users/{id}/reactivate` clears `deactivated_at`.
- FR-7: An admin cannot deactivate their own account or change their own role.
- FR-8: Every endpoint above returns `403` to an employee and `401` to a guest.
- FR-9: The SPA shows a "Users" page to admins only (list with role and active/deactivated state, create form, edit, reset password, deactivate / reactivate with confirmation). Employees do not see the navigation entry and are redirected away from the URL.
- FR-10: Validation errors from the API appear next to the matching form fields.

## Business Rules and Constraints
- Passwords follow the F001 rule (min 12 characters). The admin chooses and shares the temporary password; the user may change it from F001's change-password page (optional, owner decision).
- Email must be unique (case-insensitive); role must be `admin` or `employee`.
- Accounts are never deleted in M1; deactivation keeps ownership for M3's conversations.
- At least one active admin always exists, enforced by FR-7.

## Acceptance Criteria
- Given an admin, when they create a user with valid fields, then the user appears in the list as active with the chosen role and can log in with the temporary password.
- Given a duplicate email (any case), a short password or an invalid role, when creating or editing, then the response is `422` with field errors and nothing changes.
- Given an admin, when they edit another user's name, email and role, then the list shows the new values.
- Given an admin resets a user's password, when that user had a session open, then the session is invalid, the old password fails and the new one works.
- Given an admin deactivates a user, when that user tries to log in or uses an existing session, then access is denied (login `422` same message as wrong password; session `401`).
- Given a deactivated user, when an admin reactivates them, then they can log in again.
- Given an admin, when they try to deactivate themselves or change their own role, then the response is `422` and nothing changes.
- Given an employee, when they call any endpoint of this feature, then the response is `403`; given no session, `401`.
- Given an employee in the SPA, when they open the Users URL, then they are redirected away and no Users link is shown.
- Given an admin in the SPA, when they create a user with a taken email, then the error shows beside the email field.

## Dependencies
- F001: sessions, authenticated route group, `role` / `deactivated_at` columns, SPA shell and route guard.
- Foundations Part B: Authorization (roles); no new capability.

## Technical Approach
- Follow [`../architecture.md`](../architecture.md): Form Requests, API Resource for users, `UserPolicy`, user lifecycle rules. Deleting a user's rows from `sessions` implements "end sessions" for the database driver.
- Frontend: `features/users/` (list table, create/edit form, reset-password dialog), route guarded by role; reuses F001's auth context and fetch wrapper.
- Proposed design throughout; nothing here depends on an existing pattern.

## Data and API Impact
- No new tables or columns beyond F001's. Endpoints: `GET/POST /api/users`, `PATCH /api/users/{id}`, `POST /api/users/{id}/reset-password|deactivate|reactivate`.
- The email normalization (lowercase) applies on write.

## Testing and Verification
- Pest feature tests with a guest / employee / admin matrix for each endpoint, plus validation, self-protection and session-ending cases (session ending asserted with the `database` session driver, see architecture).
- Vitest + RTL: admin-only route and navigation, create form with server errors, confirmation before deactivate.
- Validation commands as in F001.

## Risks and Open Questions
- Temporary passwords are shared by the admin out of band (chat, in person); acceptable for M1 per owner decision, but they are visible to the admin. Revisit if email invites arrive.
- Without pagination the list assumes tens of users, not thousands.
