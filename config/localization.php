<?php

return [
    /*
    | Cloudflare sends the visitor country as an ISO 3166-1 alpha-2 code.
    | The application only uses this hint until the visitor selects a locale.
    */
    'country_header' => env('LOCALE_COUNTRY_HEADER', 'CF-IPCountry'),
];
