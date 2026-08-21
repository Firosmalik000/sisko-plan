<?php

namespace App\Actions\Platform;

use App\Models\AdminAuditLog;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

class RecordAdminAudit
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function handle(
        User $admin,
        string $action,
        ?Model $subject,
        ?string $ipAddress,
        array $metadata = [],
    ): AdminAuditLog {
        return AdminAuditLog::create([
            'user_id' => $admin->id,
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'metadata' => $metadata ?: null,
            'ip_address' => $ipAddress,
        ]);
    }
}
