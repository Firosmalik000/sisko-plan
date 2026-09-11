<?php

namespace App\Http\Resources\Api\V1;

use App\Models\StoreSetting;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi StoreSetting untuk snapshot bootstrap (design §3.2, Req 6.1).
 *
 * @mixin StoreSetting
 */
class StoreSettingsResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'timezone' => $this->timezone,
            'currency_code' => $this->currency,
            'locale' => $this->locale,
            'phone' => $this->phone,
            'email' => $this->email,
            'address' => $this->address,
            'receipt_header' => $this->receipt_header,
            'receipt_footer' => $this->receipt_footer,
            'receipt_paper_size' => $this->receipt_paper_size,
            'theme_color' => $this->theme_color,
        ];
    }
}
