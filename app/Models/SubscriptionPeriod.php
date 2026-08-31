<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Carbon\CarbonImmutable;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Casts\Attribute;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['subscription_id', 'user_id', 'plan_id', 'plan_name', 'monthly_price', 'duration_months', 'period_start', 'period_end', 'source', 'activated_at', 'created_by_user_id'])]
class SubscriptionPeriod extends Model
{
    use HasPublicId;

    /** @return BelongsTo<Subscription, $this> */
    public function subscription(): BelongsTo
    {
        return $this->belongsTo(Subscription::class);
    }

    /** @return BelongsTo<Plan, $this> */
    public function plan(): BelongsTo
    {
        return $this->belongsTo(Plan::class);
    }

    /** @return Attribute<CarbonImmutable, mixed> */
    protected function periodStart(): Attribute
    {
        return Attribute::set(fn (mixed $value): string => CarbonImmutable::parse($value)->toDateString());
    }

    /** @return Attribute<CarbonImmutable|null, mixed> */
    protected function periodEnd(): Attribute
    {
        return Attribute::set(fn (mixed $value): ?string => $value === null ? null : CarbonImmutable::parse($value)->toDateString());
    }

    protected function casts(): array
    {
        return [
            'monthly_price' => 'decimal:4',
            'duration_months' => 'integer',
            'period_start' => 'date:Y-m-d',
            'period_end' => 'date:Y-m-d',
            'activated_at' => 'datetime',
        ];
    }
}
