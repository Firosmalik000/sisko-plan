<?php

namespace App\Exceptions;

use RuntimeException;

class ScanQuotaExceeded extends RuntimeException
{
    public function __construct(public readonly int $limit, public readonly int $used)
    {
        parent::__construct('Monthly scan quota has been reached.');
    }
}
