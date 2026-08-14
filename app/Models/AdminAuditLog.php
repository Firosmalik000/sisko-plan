<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\MorphTo;
use Illuminate\Support\Carbon;

/**
 * @property int $id
 * @property int $platform_admin_id
 * @property string $action
 * @property array<string, mixed>|null $metadata
 * @property Carbon $created_at
 * @property-read PlatformAdmin $platformAdmin
 * @property-read Model|null $subject
 */
#[Fillable(['platform_admin_id', 'action', 'subject_type', 'subject_id', 'metadata', 'ip_address'])]
class AdminAuditLog extends Model
{
    public const UPDATED_AT = null;

    /** @return BelongsTo<PlatformAdmin, $this> */
    public function platformAdmin(): BelongsTo
    {
        return $this->belongsTo(PlatformAdmin::class);
    }

    /** @return MorphTo<Model, $this> */
    public function subject(): MorphTo
    {
        return $this->morphTo();
    }

    protected function casts(): array
    {
        return ['metadata' => 'array'];
    }
}
