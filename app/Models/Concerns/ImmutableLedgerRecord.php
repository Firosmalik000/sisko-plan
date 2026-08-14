<?php

namespace App\Models\Concerns;

use LogicException;

trait ImmutableLedgerRecord
{
    protected static function bootImmutableLedgerRecord(): void
    {
        static::updating(fn () => throw new LogicException('Posted ledger records are immutable.'));
        static::deleting(fn () => throw new LogicException('Posted ledger records are immutable.'));
    }
}
