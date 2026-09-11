<?php

namespace App\Models;

use App\Enums\CatalogAvailabilityStatus;
use App\Models\Concerns\HasPublicId;
use Database\Factories\DistributionCatalogItemFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Item katalog distributor — READ-ONLY, harga indikatif (design §4.1, §11,
 * Req 20.1/20.2/20.6). Uang string decimal scale 4, quantity scale 6.
 *
 * @property int $id
 * @property string $public_id
 * @property int $partner_id
 * @property string|null $partner_sku
 * @property string $name
 * @property string|null $description
 * @property string|null $image_url
 * @property string|null $sales_unit
 * @property numeric-string $min_quantity
 * @property numeric-string|null $indicative_price_amount
 * @property string|null $currency_code
 * @property CatalogAvailabilityStatus $availability_status
 * @property array<int, string>|null $market_targeting
 * @property Carbon|null $valid_from
 * @property Carbon|null $valid_until
 * @property int $revision
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read DistributionPartner $partner
 * @property-read Collection<int, PromotionCampaign> $promotionCampaigns
 */
#[Fillable([
    'partner_id', 'partner_sku', 'name', 'description', 'image_url', 'sales_unit',
    'min_quantity', 'indicative_price_amount', 'currency_code', 'availability_status',
    'market_targeting', 'valid_from', 'valid_until', 'revision',
])]
class DistributionCatalogItem extends Model
{
    /** @use HasFactory<DistributionCatalogItemFactory> */
    use HasFactory, HasPublicId;

    /** @return BelongsTo<DistributionPartner, $this> */
    public function partner(): BelongsTo
    {
        return $this->belongsTo(DistributionPartner::class, 'partner_id');
    }

    /** @return HasMany<PromotionCampaign, $this> */
    public function promotionCampaigns(): HasMany
    {
        return $this->hasMany(PromotionCampaign::class, 'catalog_item_id');
    }

    protected function casts(): array
    {
        return [
            'availability_status' => CatalogAvailabilityStatus::class,
            'market_targeting' => 'array',
            'valid_from' => 'datetime',
            'valid_until' => 'datetime',
            'revision' => 'integer',
        ];
    }
}
