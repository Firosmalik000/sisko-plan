<?php

return [
    /*
    | Cloudflare sends the visitor country as an ISO 3166-1 alpha-2 code.
    | The application only uses this hint until the visitor selects a locale.
    */
    'country_header' => env('LOCALE_COUNTRY_HEADER', 'CF-IPCountry'),

    /*
    | Store markets use ISO 3166-1 alpha-2 codes. Locale is a separate user
    | preference; countries without a dedicated catalog fall back to English.
    */
    'countries' => [
        'ID' => ['locale' => 'id', 'timezones' => ['Asia/Jakarta', 'Asia/Makassar', 'Asia/Jayapura']],
        'MY' => ['locale' => 'ms', 'timezones' => ['Asia/Kuala_Lumpur', 'Asia/Kuching']],
        'VN' => ['locale' => 'vi', 'timezones' => ['Asia/Ho_Chi_Minh']],
        'TH' => ['locale' => 'th', 'timezones' => ['Asia/Bangkok']],
        'SG' => ['locale' => 'en', 'timezones' => ['Asia/Singapore']],
        'PH' => ['locale' => 'fil', 'timezones' => ['Asia/Manila']],
        'BN' => ['locale' => 'ms', 'timezones' => ['Asia/Brunei']],
        'KH' => ['locale' => 'km', 'timezones' => ['Asia/Phnom_Penh']],
        'LA' => ['locale' => 'lo', 'timezones' => ['Asia/Vientiane']],
        'MM' => ['locale' => 'my', 'timezones' => ['Asia/Yangon']],
        'TL' => ['locale' => 'tet', 'timezones' => ['Asia/Dili']],
    ],
];
