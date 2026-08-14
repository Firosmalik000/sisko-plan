<?php

namespace App\Support;

use App\Models\Store;
use LogicException;

class CurrentStore
{
    private ?Store $store = null;

    public function set(Store $store): void
    {
        $this->store = $store;
    }

    public function get(): Store
    {
        return $this->store ?? throw new LogicException('No active store has been resolved.');
    }

    public function id(): int
    {
        return $this->get()->id;
    }

    public function hasStore(): bool
    {
        return $this->store !== null;
    }
}
