# docrag-chat

Laravel 12 API + React SPA, run entirely through Docker. See `docs/foundations.md` for the engineering decisions.

## Setup

```bash
cp .env.example .env                    # set HOST_UID/HOST_GID from `id -u` / `id -g`
cp backend/.env.example backend/.env    # then set DB_PASSWORD to match POSTGRES_PASSWORD
cp frontend/.env.example frontend/.env
docker compose up -d --build
docker compose exec app bash -c 'cd backend && composer install && php artisan key:generate'
docker compose exec app bash -c 'cd frontend && npm install'
```

## Daily commands

```bash
docker compose up -d / docker compose down
docker compose exec app bash
docker compose exec app bash -c 'cd backend && php artisan <cmd>'
docker compose exec app bash -c 'cd frontend && npm run dev'     # SPA at http://localhost:8080
```

`docker compose down -v` deletes the database volume; use it only on purpose.

## Checks (inside the `app` container)

```bash
# backend/
vendor/bin/pint --test && vendor/bin/phpstan analyse && vendor/bin/pest
# frontend/
npx eslint . && npx prettier --check . && npx tsc -b && npx vitest run
```
