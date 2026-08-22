<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Resend, Postmark, AWS, and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

    'catalog_intelligence' => [
        'enabled' => (bool) env('CATALOG_INTELLIGENCE_ENABLED', false),
        'url' => env('CATALOG_INTELLIGENCE_URL', 'http://localhost:8001'),
        'token' => env('CATALOG_INTELLIGENCE_TOKEN'),
        'application_key' => env('CATALOG_INTELLIGENCE_APPLICATION_KEY', 'sisko-plan'),
        'connect_timeout' => (int) env('CATALOG_INTELLIGENCE_CONNECT_TIMEOUT', 1),
        'timeout' => (int) env('CATALOG_INTELLIGENCE_TIMEOUT', 4),
        'discovery_timeout' => (int) env('CATALOG_INTELLIGENCE_DISCOVERY_TIMEOUT', 35),
        'max_images' => (int) env('CATALOG_INTELLIGENCE_MAX_IMAGES', 3),
    ],

];
