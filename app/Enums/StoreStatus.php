<?php

namespace App\Enums;

enum StoreStatus: string
{
    case Active = 'active';
    case Suspended = 'suspended';

    case Archived = 'archived';
}
