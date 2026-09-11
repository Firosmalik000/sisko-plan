<?php

namespace App\Http\Resources\Api\V1;

use App\Models\MobileNotification;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Representasi item notification center (design §10, Req 15.2).
 *
 * @mixin MobileNotification
 */
class NotificationResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'category' => $this->category->value,
            'title' => $this->title,
            'body' => $this->body,
            'read_at' => $this->read_at?->toIso8601ZuluString(),
            'created_at' => $this->created_at?->toIso8601ZuluString(),
        ];
    }
}
