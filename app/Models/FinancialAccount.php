<?php

namespace App\Models;

use App\Enums\FinancialAccountType;
use App\Models\Concerns\HasPublicId;
use Database\Factories\FinancialAccountFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * @property FinancialAccountType $type
 * @property bool $is_active
 */
#[Fillable(['store_id', 'name', 'type', 'account_number', 'notes', 'is_active'])]
class FinancialAccount extends Model
{
    /** @use HasFactory<FinancialAccountFactory> */
    use HasFactory, HasPublicId;

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    protected function casts(): array
    {
        return [
            'type' => FinancialAccountType::class,
            'is_active' => 'boolean',
        ];
    }
}
