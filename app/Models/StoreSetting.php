<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property int $id
 * @property int $store_id
 * @property string $timezone
 * @property string $currency
 * @property string $locale
 * @property-read Store $store
 */
#[Fillable([
    'store_id', 'timezone', 'currency', 'locale', 'phone', 'email', 'address',
    'receipt_header', 'receipt_footer', 'receipt_paper_size', 'receipt_show_address',
    'receipt_show_cashier', 'theme_color',
])]
class StoreSetting extends Model
{
    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    protected function casts(): array
    {
        return [
            'receipt_show_address' => 'boolean',
            'receipt_show_cashier' => 'boolean',
        ];
    }
}
