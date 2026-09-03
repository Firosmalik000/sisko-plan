# syntax=docker/dockerfile:1.7

ARG FRANKENPHP_IMAGE=dunglas/frankenphp:1-php8.4-bookworm

FROM node:22-bookworm-slim AS node
FROM composer:2 AS composer

FROM ${FRANKENPHP_IMAGE} AS build

RUN install-php-extensions \
        bcmath \
        curl \
        gd \
        intl \
        mbstring \
        opcache \
        pcntl \
        pdo_mysql \
        redis \
        zip

COPY --from=composer /usr/bin/composer /usr/local/bin/composer
COPY --from=node /usr/local/bin/node /usr/local/bin/node
COPY --from=node /usr/local/lib/node_modules /usr/local/lib/node_modules
RUN ln -s /usr/local/lib/node_modules/npm/bin/npm-cli.js /usr/local/bin/npm \
    && ln -s /usr/local/lib/node_modules/npm/bin/npx-cli.js /usr/local/bin/npx

WORKDIR /app

COPY composer.json composer.lock ./
RUN composer install \
        --no-dev \
        --no-interaction \
        --no-progress \
        --no-scripts \
        --prefer-dist

COPY package.json package-lock.json ./
RUN npm ci --include=optional --no-audit --no-fund

COPY . .

RUN composer dump-autoload \
        --no-dev \
        --classmap-authoritative \
        --no-interaction \
    && npm run build \
    && rm -rf node_modules \
    && rm -f public/hot

FROM ${FRANKENPHP_IMAGE} AS runtime

RUN install-php-extensions \
        bcmath \
        curl \
        gd \
        intl \
        mbstring \
        opcache \
        pcntl \
        pdo_mysql \
        redis \
        zip \
    && apt-get update \
    && apt-get install -y --no-install-recommends gosu \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=build --chown=www-data:www-data /app /app
COPY docker/Caddyfile /etc/caddy/Caddyfile
COPY docker/php.ini /usr/local/etc/php/conf.d/99-production.ini
COPY docker/entrypoint.sh /usr/local/bin/app-entrypoint

RUN chmod +x /usr/local/bin/app-entrypoint \
    && mkdir -p /config /data \
    && chown -R www-data:www-data /config /data /app/storage /app/bootstrap/cache

ENV APP_ENV=production \
    APP_DEBUG=false \
    APP_ROLE=web \
    RUN_MIGRATIONS=true \
    SERVER_NAME=:8080 \
    XDG_CONFIG_HOME=/config \
    XDG_DATA_HOME=/data

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD if [ "$APP_ROLE" != "web" ]; then exit 0; else php -r '$host = parse_url(getenv("APP_URL") ?: "http://localhost", PHP_URL_HOST) ?: "localhost"; $context = stream_context_create(["http" => ["header" => "Host: ".$host."\r\n"]]); exit(@file_get_contents("http://127.0.0.1:8080/up", false, $context) === false ? 1 : 0);'; fi

ENTRYPOINT ["app-entrypoint"]
CMD ["web"]
