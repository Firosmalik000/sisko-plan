<?php

namespace App\Enums;

/**
 * Ketersediaan item katalog distribusi (design §4.1, §11, Req 20.1).
 */
enum CatalogAvailabilityStatus: string
{
    case Available = 'available';
    case OutOfStock = 'out_of_stock';
    case Discontinued = 'discontinued';
}
