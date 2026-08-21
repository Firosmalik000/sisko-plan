<?php

namespace App\Enums;

enum ProductVariantMode: string
{
    case None = 'none';
    case Separate = 'separate';
    case Shared = 'shared';
}
