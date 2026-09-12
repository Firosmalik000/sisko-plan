<?php

namespace App\Http\Resources\Api\V1\Stores;

use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi identitas toko + pengaturan struk untuk `PATCH /stores/{store}/
 * settings` (Req 21.2). Identifier publik = `public_id` (ULID). Mengekspos nama
 * toko (Store) beserta seluruh field StoreSetting termasuk flag tampilan struk.
 *
 * @mixin Store
 */
class StoreProfileResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $settings = $this->settings;

        return [
            'public_id' => $this->public_id,
            'name' => $this->name,
            'status' => $this->status->value,
            'settings' => $settings === null ? null : [
                'timezone' => $settings->timezone,
                'currency_code' => $settings->currency,
                'locale' => $settings->locale,
                'phone' => $settings->phone,
                'email' => $settings->email,
                'address' => $settings->address,
                'receipt_header' => $settings->receipt_header,
                'receipt_footer' => $settings->receipt_footer,
                'receipt_paper_size' => $settings->receipt_paper_size,
                'receipt_show_address' => (bool) $settings->receipt_show_address,
                'receipt_show_cashier' => (bool) $settings->receipt_show_cashier,
                'theme_color' => $settings->theme_color,
            ],
        ];
    }
}
