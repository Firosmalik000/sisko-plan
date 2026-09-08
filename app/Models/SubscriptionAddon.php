<?php

namespace App\Models;

use App\Models\Concerns\HasPublicId;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

#[Fillable(['subscription_id', 'user_id', 'plan_id', 'plan_name', 'offer_category', 'price', 'duration_months', 'stores', 'products', 'members', 'scans', 'starts_on', 'ends_on', 'source', 'created_by_user_id'])]
class SubscriptionAddon extends Model
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

    protected function casts(): array
    {
        return [
            'price' => 'decimal:4',
            'duration_months' => 'integer',
            'stores' => 'integer',
            'products' => 'integer',
            'members' => 'integer',
            'scans' => 'integer',
            'starts_on' => 'date:Y-m-d',
            'ends_on' => 'date:Y-m-d',
        ];
    }
}
