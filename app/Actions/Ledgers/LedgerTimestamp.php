<?php

namespace App\Actions\Ledgers;

use App\Models\Store;
use Carbon\CarbonImmutable;

class LedgerTimestamp
{
    public function parse(Store $store, string $value): CarbonImmutable
    {
        $timezone = $store->settings()->value('timezone') ?? 'Asia/Jakarta';

        return CarbonImmutable::parse($value, $timezone)->utc();
    }
}
