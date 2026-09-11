<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Offline Lease
    |--------------------------------------------------------------------------
    |
    | Durasi (detik) offline lease yang diberikan ke perangkat saat login /
    | bootstrap (design §5.4, D-005). Selama lease berlaku, cached workspace
    | dapat dipakai penuh tanpa koneksi. Default 72 jam (259200 detik),
    | configurable server-side — bukan konstanta tersebar di klien.
    |
    */

    'offline_lease_seconds' => (int) env('MOBILE_OFFLINE_LEASE_SECONDS', 259200),

];
