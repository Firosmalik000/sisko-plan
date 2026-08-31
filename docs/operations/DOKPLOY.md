# Dokploy Deployment

## Application Setup

Create a Dokploy application from this repository with these settings:

- Build type: `Dockerfile`
- Dockerfile path: `Dockerfile`
- Container port: `8080`
- Health check path: `/up`
- Persistent volume: `/app/storage`

The image uses PHP 8.4 with FrankenPHP and Caddy. TLS terminates at the
Dokploy proxy, while the application container serves HTTP on port 8080.

## Required Environment

Configure secrets in Dokploy and do not commit a production `.env` file.

```dotenv
APP_NAME=Sisko Plan
APP_ENV=production
APP_KEY=base64:GENERATE_A_UNIQUE_KEY
APP_DEBUG=false
APP_URL=https://your-domain.example
APP_FORCE_HTTPS=true

DB_CONNECTION=mysql
DB_HOST=mysql-service-name
DB_PORT=3306
DB_DATABASE=sisko_plan
DB_USERNAME=sisko_plan
DB_PASSWORD=CHANGE_ME

CACHE_STORE=redis
SESSION_DRIVER=redis
QUEUE_CONNECTION=redis
REDIS_HOST=redis-service-name
REDIS_PORT=6379
REDIS_PASSWORD=CHANGE_ME

SESSION_SECURE_COOKIE=true
SESSION_ENCRYPT=true
SESSION_HTTP_ONLY=true
SESSION_SAME_SITE=lax

FILESYSTEM_DISK=local
LOG_CHANNEL=stderr
LOG_LEVEL=info

APP_ROLE=web
RUN_MIGRATIONS=false
TRUSTED_PROXIES=YOUR_DOKPLOY_PROXY_CIDR

GOOGLE_AUTH_ENABLED=true
GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_GOOGLE_CLIENT_SECRET
GOOGLE_REDIRECT_URI=https://your-domain.example/auth/google/callback
```

Also configure production mail, `PLATFORM_ADMIN_2FA_REQUIRED`, CSP, HSTS,
and external services according to `PRODUCTION_RUNBOOK.md`.

Generate `APP_KEY` outside the production container:

```sh
php artisan key:generate --show
```

Register the exact `GOOGLE_REDIRECT_URI` as an authorized redirect URI in
Google Cloud Console. Keep Google login disabled until the client ID, secret,
production domain, and HTTPS callback are configured.

## Database Migration

The image does not migrate automatically by default. Before routing traffic
to a release, use the Dokploy terminal to run:

```sh
php artisan migrate --force
php artisan app:production-check
```

For an initial single-replica deployment only, `RUN_MIGRATIONS=true` can be
used temporarily. Set it back to `false` after the first successful deploy.
Never enable automatic migration on multiple web replicas.

## Worker And Scheduler

Production requires a queue worker and scheduler. Create two additional
Dokploy applications from the same repository and environment variables.
They do not need domains or public ports.

Queue worker:

```dotenv
APP_ROLE=worker
RUN_MIGRATIONS=false
```

Scheduler:

```dotenv
APP_ROLE=scheduler
RUN_MIGRATIONS=false
```

All three applications must use the same release, `APP_KEY`, database,
Redis, and persistent storage. When using the local filesystem, mount the
same storage volume or use an external object-storage disk before scaling
across multiple servers.

## Release Verification

After deployment, verify:

1. `/up` returns HTTP 200.
2. `/ready` returns HTTP 200 after MySQL and Redis are reachable.
3. `php artisan migrate:status` shows every migration as run.
4. `php artisan app:production-check` exits successfully.
5. Login, an approved read flow, upload retrieval, queue processing, and the scheduler work.

Use `/up` for the Dokploy container health check. Use `/ready` for external
readiness monitoring because it intentionally checks application dependencies.
