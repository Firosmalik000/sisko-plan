<?php

$configured = env('TRUSTED_PROXIES');

return [
    'proxies' => filled($configured)
        ? array_values(array_filter(array_map('trim', explode(',', (string) $configured))))
        : null,
];
