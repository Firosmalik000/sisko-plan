<?php

return [
    'platform_admin_2fa_required' => env(
        'PLATFORM_ADMIN_2FA_REQUIRED',
        env('APP_ENV', 'production') === 'production',
    ),
    'force_https' => env('APP_FORCE_HTTPS', env('APP_ENV', 'production') === 'production'),
    'content_security_policy' => env('SECURITY_CSP_ENABLED', false),
    'hsts' => env('SECURITY_HSTS_ENABLED', env('APP_ENV', 'production') === 'production'),
    'store_writes_per_minute' => (int) env('STORE_WRITES_PER_MINUTE', 90),
    'platform_writes_per_minute' => (int) env('PLATFORM_WRITES_PER_MINUTE', 60),
    'smart_scanner_auto_capture' => (bool) env('SMART_SCANNER_AUTO_CAPTURE_ENABLED', true),

    /*
    |--------------------------------------------------------------------------
    | Rate limit API mobile (/api/v1) — Req 23.4, design §16
    |--------------------------------------------------------------------------
    | Named limiter berbasis (user, device, store, endpoint/risiko). Auth paling
    | ketat (anti brute force), sync/sales sedang, read paling longgar. Kunci
    | limiter memakai user+device+store agar isolasi antar-perangkat & antar-toko.
    */
    'api_rate_limits' => [
        'auth_per_minute' => (int) env('API_RATE_AUTH_PER_MINUTE', 10),
        'sync_per_minute' => (int) env('API_RATE_SYNC_PER_MINUTE', 60),
        'sales_per_minute' => (int) env('API_RATE_SALES_PER_MINUTE', 60),
        'read_per_minute' => (int) env('API_RATE_READ_PER_MINUTE', 120),
    ],
];
