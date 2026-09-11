<?php

namespace App\Http\Resources\Api\V1\Distribution;

use App\Models\DistributionCatalogItem;
use App\Support\Decimal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Representasi item katalog distribusi READ-ONLY (design §3.2, §11, Req 20.2,
 * 20.6, 20.7, 20.8).
 *
 * Harga = string decimal scale 4 berlabel INDIKATIF (Req 20.6); TIDAK ada
 * field/URL beli/checkout (Req 20.8). `is_sponsored` + `disclosure_label`
 * berasal dari kampanye promosi aktif untuk market ini (Req 20.7). Sponsored
 * status di-set controller melalui `additional(['sponsorship' => ...])` /
 * `withSponsorship()` agar market-aware.
 *
 * @mixin DistributionCatalogItem
 */
class DistributionCatalogItemResource extends JsonResource
{
    private bool $isSponsored = false;

    private ?string $sponsorDisclosureLabel = null;

    /**
     * Tandai sponsorship (market-aware) untuk item ini.
     */
    public function withSponsorship(bool $isSponsored, ?string $disclosureLabel): static
    {
        $this->isSponsored = $isSponsored;
        $this->sponsorDisclosureLabel = $disclosureLabel;

        return $this;
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'partner' => [
                'public_id' => $this->partner->public_id,
                'name' => $this->partner->name,
                'disclosure_label' => $this->partner->disclosure_label,
            ],
            'name' => $this->name,
            'description' => $this->description,
            'image_url' => $this->image_url,
            'sales_unit' => $this->sales_unit,
            'min_quantity' => $this->quantityString(),
            'indicative_price' => $this->indicativePriceString(),
            'price_label' => 'indikatif',
            'currency_code' => $this->currency_code,
            'availability_status' => $this->availability_status->value,
            'is_sponsored' => $this->isSponsored,
            'disclosure_label' => $this->isSponsored
                ? ($this->sponsorDisclosureLabel ?? $this->partner->disclosure_label)
                : null,
        ];
    }

    /**
     * Harga indikatif sebagai string decimal scale 4 (tanpa float), atau null.
     *
     * @return numeric-string|null
     */
    private function indicativePriceString(): ?string
    {
        if ($this->indicative_price_amount === null) {
            return null;
        }

        return Decimal::add((string) $this->indicative_price_amount, '0', Decimal::MONEY_SCALE);
    }

    /**
     * @return numeric-string
     */
    private function quantityString(): string
    {
        return Decimal::add((string) $this->min_quantity, '0', Decimal::QUANTITY_SCALE);
    }
}
