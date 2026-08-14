<?php

return [
    'platform_admin_2fa_required' => env(
        'PLATFORM_ADMIN_2FA_REQUIRED',
        env('APP_ENV', 'production') === 'production',
    ),
    'force_https' => env('APP_FORCE_HTTPS', env('APP_ENV', 'production') === 'production'),
    'content_security_policy' => env('SECURITY_CSP_ENABLED', env('APP_ENV', 'production') === 'production'),
    'hsts' => env('SECURITY_HSTS_ENABLED', env('APP_ENV', 'production') === 'production'),
    'store_writes_per_minute' => (int) env('STORE_WRITES_PER_MINUTE', 90),
    'platform_writes_per_minute' => (int) env('PLATFORM_WRITES_PER_MINUTE', 60),
];
