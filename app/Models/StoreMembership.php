<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Relations\Pivot;

/**
 * @property int $id
 * @property int $store_id
 * @property int $user_id
 * @property string $role
 * @property string $status
 */
class StoreMembership extends Pivot
{
    protected $table = 'store_user';
}
