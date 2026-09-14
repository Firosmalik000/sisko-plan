<?php

namespace App\Enums;

enum CommissionPayoutStatus: string
{
    case Pending = 'pending';
    case Paid = 'paid';
}
