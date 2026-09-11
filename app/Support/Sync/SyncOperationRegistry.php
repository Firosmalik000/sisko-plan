<?php

namespace App\Support\Sync;

use App\Models\Store;
use App\Models\User;
use App\Support\Sync\Handlers\SaleCreateHandler;

/**
 * Registry operation eksplisit untuk `sync/push` (design §3.5, Req 7.5, 7.6, 7.7).
 *
 * `sync/push` BUKAN generic RPC lintas-domain: hanya operation type yang
 * terdaftar di sini yang boleh mengeksekusi side effect. Menambah operation
 * baru = tambah handler + validator + ability check + Action + test, bukan
 * memperluas dispatcher generik.
 *
 * Rilis pertama hanya mendukung `sale.create` → PostSale (via SaleCreateHandler).
 */
class SyncOperationRegistry
{
    public function __construct(private SaleCreateHandler $saleCreateHandler) {}

    /**
     * Ability Sanctum yang diperlukan per operation type (dicek per-command
     * sebelum eksekusi; server tetap re-check membership di middleware).
     */
    public const ABILITIES = [
        'sale.create' => 'sale.create',
    ];

    /**
     * True bila operation type terdaftar di registry.
     */
    public function supports(string $operationType): bool
    {
        return array_key_exists($operationType, self::ABILITIES);
    }

    /**
     * Ability yang diperlukan untuk operation type, atau null bila tidak terdaftar.
     */
    public function abilityFor(string $operationType): ?string
    {
        return self::ABILITIES[$operationType] ?? null;
    }

    /**
     * Dispatch satu command ke handler-nya. Pemanggil WAJIB memverifikasi
     * `supports()` lebih dulu; operation tak terdaftar tidak boleh sampai ke sini.
     *
     * @param  array<string, mixed>  $payload
     */
    public function dispatch(
        string $operationType,
        Store $store,
        User $actor,
        string $clientOperationId,
        array $payload,
        ?string $ipAddress = null,
    ): SyncCommandResult {
        return match ($operationType) {
            'sale.create' => $this->saleCreateHandler->handle($store, $actor, $clientOperationId, $payload, $ipAddress),
            default => SyncCommandResult::error(
                $clientOperationId,
                'UNSUPPORTED_OPERATION',
                'Tipe operasi tidak didukung.',
                retryable: false,
            ),
        };
    }
}
