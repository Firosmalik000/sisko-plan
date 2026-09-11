<?php

namespace App\Models;

use App\Enums\PromotionCampaignStatus;
use App\Models\Concerns\HasPublicId;
use Database\Factories\PromotionCampaignFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Kampanye promosi / sponsored placement transparan (design §4.1, §11, Req 20.7).
 *
 * @property int $id
 * @property string $public_id
 * @property int $partner_id
 * @property int|null $catalog_item_id
 * @property array<int, string>|null $allowed_placements
 * @property array<string, mixed>|null $localized_copy
 * @property Carbon|null $active_from
 * @property Carbon|null $active_until
 * @property array<int, string>|null $market_targeting
 * @property string $disclosure_label
 * @property int $priority
 * @property PromotionCampaignStatus $status
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read DistributionPartner $partner
 * @property-read DistributionCatalogItem|null $catalogItem
 */
#[Fillable([
    'partner_id', 'catalog_item_id', 'allowed_placements', 'localized_copy',
    'active_from', 'active_until', 'market_targeting', 'disclosure_label',
    'priority', 'status',
])]
class PromotionCampaign extends Model
{
    /** @use HasFactory<PromotionCampaignFactory> */
    use HasFactory, HasPublicId;

    /** @return BelongsTo<DistributionPartner, $this> */
    public function partner(): BelongsTo
    {
        return $this->belongsTo(DistributionPartner::class, 'partner_id');
    }

    /** @return BelongsTo<DistributionCatalogItem, $this> */
    public function catalogItem(): BelongsTo
    {
        return $this->belongsTo(DistributionCatalogItem::class, 'catalog_item_id');
    }

    protected function casts(): array
    {
        return [
            'status' => PromotionCampaignStatus::class,
            'allowed_placements' => 'array',
            'localized_copy' => 'array',
            'market_targeting' => 'array',
            'active_from' => 'datetime',
            'active_until' => 'datetime',
            'priority' => 'integer',
        ];
    }
}
