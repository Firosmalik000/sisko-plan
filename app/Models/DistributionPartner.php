<?php

namespace App\Models;

use App\Enums\DistributionPartnerStatus;
use App\Models\Concerns\HasPublicId;
use Database\Factories\DistributionPartnerFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * Mitra distribusi katalog transparan (design §4.1, §11, Req 20.4).
 *
 * @property int $id
 * @property string $public_id
 * @property string $name
 * @property string|null $legal_name
 * @property string|null $logo_url
 * @property array<string, mixed>|null $contact
 * @property DistributionPartnerStatus $status
 * @property array<int, string>|null $service_markets
 * @property string|null $disclosure_label
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Collection<int, DistributionCatalogItem> $catalogItems
 * @property-read Collection<int, PromotionCampaign> $promotionCampaigns
 */
#[Fillable(['name', 'legal_name', 'logo_url', 'contact', 'status', 'service_markets', 'disclosure_label'])]
class DistributionPartner extends Model
{
    /** @use HasFactory<DistributionPartnerFactory> */
    use HasFactory, HasPublicId;

    /** @return HasMany<DistributionCatalogItem, $this> */
    public function catalogItems(): HasMany
    {
        return $this->hasMany(DistributionCatalogItem::class, 'partner_id');
    }

    /** @return HasMany<PromotionCampaign, $this> */
    public function promotionCampaigns(): HasMany
    {
        return $this->hasMany(PromotionCampaign::class, 'partner_id');
    }

    protected function casts(): array
    {
        return [
            'status' => DistributionPartnerStatus::class,
            'contact' => 'array',
            'service_markets' => 'array',
        ];
    }
}
