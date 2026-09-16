<?php

namespace App\Services\Stores;

use App\Models\Store;
use App\Support\StoreOperationalHistory;
use Illuminate\Validation\ValidationException;

class StoreCountryChange
{
    public function __construct(private StoreOperationalHistory $history) {}

    public function allowed(Store $store): bool
    {
        return ! $this->history->hasPostedRecords($store);
    }

    public function assertAllowed(Store $store): void
    {
        if (! $this->allowed($store)) {
            throw ValidationException::withMessages([
                'country' => __('Store country cannot be changed after transactions exist.'),
            ]);
        }
    }
}
