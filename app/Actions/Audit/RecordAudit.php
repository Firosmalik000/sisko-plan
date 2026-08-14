<?php

namespace App\Actions\Audit;

use App\Models\AuditLog;
use App\Models\Store;
use Illuminate\Database\Eloquent\Model;

class RecordAudit
{
    /**
     * @param  array<string, mixed>  $metadata
     */
    public function handle(
        Model $actor,
        string $action,
        ?Model $subject,
        ?Store $store,
        ?string $ipAddress,
        array $metadata = [],
    ): AuditLog {
        return AuditLog::create([
            'store_id' => $store?->id,
            'actor_type' => $actor->getMorphClass(),
            'actor_id' => $actor->getKey(),
            'action' => $action,
            'subject_type' => $subject?->getMorphClass(),
            'subject_id' => $subject?->getKey(),
            'metadata' => $metadata ?: null,
            'ip_address' => $ipAddress,
        ]);
    }
}
