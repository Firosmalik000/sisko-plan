<?php

namespace App\Models;

use App\Enums\PromotionFrequency;
use App\Enums\PromotionLocale;
use App\Enums\PromotionPlacement;
use App\Enums\PromotionStatus;
use App\Models\Concerns\HasPublicId;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $public_id
 * @property string $name
 * @property PromotionPlacement $placement
 * @property string $image_path
 * @property string|null $destination_url
 * @property PromotionLocale $locale
 * @property CarbonImmutable $starts_at
 * @property CarbonImmutable $ends_at
 * @property int $sort_order
 * @property PromotionStatus $status
 * @property PromotionFrequency|null $frequency
 * @property CarbonImmutable $updated_at
 */
#[Fillable([
    'name',
    'placement',
    'image_path',
    'destination_url',
    'locale',
    'starts_at',
    'ends_at',
    'sort_order',
    'status',
    'frequency',
])]
class Promotion extends Model
{
    use HasPublicId;

    /** @param Builder<Promotion> $query */
    public function scopeEligible(Builder $query, string $locale, ?CarbonImmutable $now = null): void
    {
        $now ??= now();

        $query
            ->where('status', PromotionStatus::Active->value)
            ->where('starts_at', '<=', $now)
            ->where('ends_at', '>=', $now)
            ->whereIn('locale', [PromotionLocale::All->value, $locale]);
    }

    public function runtimeStatus(?CarbonImmutable $now = null): string
    {
        $now ??= now();

        if ($this->status === PromotionStatus::Draft) {
            return 'draft';
        }

        if ($this->status === PromotionStatus::Paused) {
            return 'paused';
        }

        if ($now->lt($this->starts_at)) {
            return 'scheduled';
        }

        return $now->gt($this->ends_at) ? 'expired' : 'live';
    }

    protected function casts(): array
    {
        return [
            'placement' => PromotionPlacement::class,
            'locale' => PromotionLocale::class,
            'starts_at' => 'immutable_datetime',
            'ends_at' => 'immutable_datetime',
            'sort_order' => 'integer',
            'status' => PromotionStatus::class,
            'frequency' => PromotionFrequency::class,
        ];
    }
}
