# syntax=docker/dockerfile:1

FROM node:24.22.0-trixie-slim AS node-bin
FROM composer:2.10.3 AS composer-bin

# ---- base: PHP 8.4 + Node 24 + Composer, non-root user ----
FROM php:8.4.26-fpm-trixie AS base

ARG HOST_UID=1000
ARG HOST_GID=1000

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        git unzip libfcgi-bin libpq-dev libicu-dev libzip-dev \
    && docker-php-ext-install -j"$(nproc)" pdo_pgsql intl zip bcmath opcache \
    && rm -rf /var/lib/apt/lists/*

COPY --from=node-bin /usr/local/bin/node /usr/local/bin/node
COPY --from=node-bin /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s ../lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s ../lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

COPY --from=composer-bin /usr/bin/composer /usr/bin/composer

RUN groupadd --gid "${HOST_GID}" app \
    && useradd --uid "${HOST_UID}" --gid "${HOST_GID}" --create-home --shell /bin/bash app \
    && git config --system --add safe.directory /var/www

COPY docker/app/php/fpm-pool.conf /usr/local/etc/php-fpm.d/zz-app.conf

WORKDIR /var/www

HEALTHCHECK --interval=5s --timeout=3s --retries=10 \
    CMD SCRIPT_NAME=/ping SCRIPT_FILENAME=/ping REQUEST_METHOD=GET cgi-fcgi -bind -connect 127.0.0.1:9000 | grep -q pong

# ---- dev: used by docker-compose, source is bind-mounted ----
FROM base AS dev

RUN pecl install pcov && docker-php-ext-enable pcov
COPY docker/app/php/dev.ini /usr/local/etc/php/conf.d/zz-dev.ini

USER app
CMD ["php-fpm"]

# ---- frontend-build: compiles the SPA ----
FROM base AS frontend-build

WORKDIR /build
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ---- prod ----
FROM base AS prod

COPY docker/app/php/prod.ini /usr/local/etc/php/conf.d/zz-prod.ini

WORKDIR /var/www/backend
COPY --chown=app:app backend/ ./
RUN composer install --no-dev --no-scripts --optimize-autoloader --no-interaction \
    && chown -R app:app storage bootstrap/cache
COPY --from=frontend-build --chown=app:app /build/dist /var/www/frontend/dist

USER app
CMD ["php-fpm"]
