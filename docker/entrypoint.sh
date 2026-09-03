#!/bin/sh
set -eu

cd /app

mkdir -p \
    storage/app/private \
    storage/app/public \
    storage/framework/cache/data \
    storage/framework/sessions \
    storage/framework/views \
    storage/logs \
    bootstrap/cache \
    /config \
    /data

chown -R www-data:www-data storage bootstrap/cache /config /data

run_as_app() {
    gosu www-data "$@"
}

role="${APP_ROLE:-${1:-web}}"
if [ "$#" -gt 0 ]; then
    shift
fi

if [ ! -e public/storage ] && [ ! -L public/storage ]; then
    run_as_app php artisan storage:link --no-interaction
fi

if [ "$role" = "web" ] && [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    run_as_app php artisan migrate --force --no-interaction
fi

run_as_app php artisan optimize --no-interaction

case "$role" in
    web)
        exec gosu www-data frankenphp run --config /etc/caddy/Caddyfile "$@"
        ;;
    worker)
        exec gosu www-data php artisan queue:work \
            --sleep="${QUEUE_WORKER_SLEEP:-3}" \
            --tries="${QUEUE_WORKER_TRIES:-3}" \
            --timeout="${QUEUE_WORKER_TIMEOUT:-90}" \
            --max-time="${QUEUE_WORKER_MAX_TIME:-3600}" \
            --no-interaction "$@"
        ;;
    scheduler)
        exec gosu www-data php artisan schedule:work --no-interaction "$@"
        ;;
    *)
        exec gosu www-data "$role" "$@"
        ;;
esac
