<?php

namespace App\Models;

use App\Enums\MembershipRole;
use App\Enums\MembershipStatus;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * @property int $id
 * @property int $store_id
 * @property int $business_membership_id
 * @property MembershipRole $role
 * @property MembershipStatus $status
 */
class StoreMembership extends Pivot
{
    protected $table = 'store_memberships';

    /** @return BelongsTo<BusinessMembership, $this> */
    public function businessMembership(): BelongsTo
    {
        return $this->belongsTo(BusinessMembership::class);
    }

    /** @return BelongsTo<Store, $this> */
    public function store(): BelongsTo
    {
        return $this->belongsTo(Store::class);
    }

    protected function casts(): array
    {
        return [
            'role' => MembershipRole::class,
            'status' => MembershipStatus::class,
        ];
    }
}
