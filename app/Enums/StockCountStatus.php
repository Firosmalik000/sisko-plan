<?php

namespace App\Enums;

enum StockCountStatus: string
{
    case Draft = 'draft';
    case Counted = 'counted';
    case Posted = 'posted';
    case Cancelled = 'cancelled';
}
