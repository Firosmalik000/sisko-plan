<?php

namespace App\Http\Controllers\Api\V1\Stores;

use App\Http\Requests\Api\V1\Sync\PushCommandsRequest;
use App\Http\Responses\ApiResponse;
use App\Models\Store;
use App\Support\Sync\SyncCommandResult;
use App\Support\Sync\SyncOperationRegistry;
use Illuminate\Http\JsonResponse;

/**
 * POST /stores/{store}/sync/push — batch command idempotent, hasil per-command
 * (design §3.2, §3.5, Req 7.2–7.7, 9.6, 12.6).
 *
 * Batch selalu HTTP 200 (kecuali error auth/validasi batch); status sukses/gagal
 * ada per-command. `sync/push` bukan generic RPC: hanya operation di registry
 * yang boleh side effect. Ability dicek per-command (fast gate); membership sudah
 * divalidasi middleware `store.membership`. Idempotency (same id+payload → hasil
 * sama; same id+beda payload → IDEMPOTENCY_CONFLICT) ditangani PostSale via
 * IdempotencyGuard di dalam handler.
 */
class SyncPushController
{
    public function __construct(private SyncOperationRegistry $registry) {}

    public function __invoke(PushCommandsRequest $request, Store $store): JsonResponse
    {
        $user = $request->user();
        $ipAddress = $request->ip();

        $results = [];

        /** @var array<int, array<string, mixed>> $commands */
        $commands = $request->validated('commands');

        foreach ($commands as $command) {
            $results[] = $this->process($store, $user, $command, $ipAddress)->toArray();
        }

        return ApiResponse::success(['results' => $results]);
    }

    /**
     * @param  array<string, mixed>  $command
     */
    private function process(Store $store, mixed $user, array $command, ?string $ipAddress): SyncCommandResult
    {
        $clientOperationId = (string) $command['client_operation_id'];
        $operationType = (string) $command['operation_type'];

        /** @var array<string, mixed> $payload */
        $payload = is_array($command['payload'] ?? null) ? $command['payload'] : [];

        if (! $this->registry->supports($operationType)) {
            return SyncCommandResult::error(
                $clientOperationId,
                'UNSUPPORTED_OPERATION',
                'Tipe operasi tidak didukung.',
                retryable: false,
            );
        }

        $ability = $this->registry->abilityFor($operationType);

        if ($ability !== null && ! $user->tokenCan($ability)) {
            return SyncCommandResult::error(
                $clientOperationId,
                'FORBIDDEN',
                'Anda tidak memiliki akses untuk operasi ini.',
                retryable: false,
            );
        }

        return $this->registry->dispatch($operationType, $store, $user, $clientOperationId, $payload, $ipAddress);
    }
}
