<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use App\Models\Concerns\ImmutableLedgerRecord;
use Database\Factories\MarketplaceSettlementFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * @property int $destination_account_id
 * @property int $clearing_account_id
 * @property string $net_amount
 * @property string $gross_amount
 * @property-read Store $store
 */
#[Fillable(['store_id', 'marketplace_id', 'clearing_account_id', 'destination_account_id', 'currency_code', 'gross_amount', 'fee_amount', 'other_deduction_amount', 'net_amount', 'idempotency_key', 'request_hash', 'created_by_business_membership_id', 'reversal_of_settlement_id', 'occurred_at', 'notes'])]
class MarketplaceSettlement extends Model
{
    /** @use HasFactory<MarketplaceSettlementFactory> */
    use HasFactory, HasPublicId, ImmutableLedgerRecord;

    /** @return HasMany<MarketplaceSettlementSale, $this> */
    public function sales(): HasMany
    {
        return $this->hasMany(MarketplaceSettlementSale::class);
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    protected function casts(): array
    {
        return [
            'gross_amount' => 'decimal:4', 'fee_amount' => 'decimal:4',
            'other_deduction_amount' => 'decimal:4', 'net_amount' => 'decimal:4',
            'occurred_at' => 'datetime',
        ];
    }
}
