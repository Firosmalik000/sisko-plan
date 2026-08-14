<?php

namespace App\Actions\Ledgers;

use App\Actions\Audit\RecordAudit;
use App\Models\AccountTransfer;
use App\Models\FinancialAccount;
use App\Models\Store;
use App\Models\User;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PostAccountTransfer
{
    public function __construct(private NextDocumentNumber $numbers, private ApplyCashTransaction $cash, private RecordAudit $audit, private IdempotencyGuard $idempotency, private LedgerTimestamp $timestamps) {}

    public function handle(Store $store, User $actor, int $fromId, int $toId, string $amount, string $occurredAt, ?string $notes, string $idempotencyKey, ?string $ipAddress = null): AccountTransfer
    {
        $date = $this->timestamps->parse($store, $occurredAt);
        $requestHash = $this->idempotency->hash(['from_account_id' => $fromId, 'to_account_id' => $toId, 'amount' => $amount, 'occurred_at' => $date->toISOString(), 'notes' => $notes]);

        try {
            return DB::transaction(function () use ($store, $actor, $fromId, $toId, $amount, $date, $notes, $idempotencyKey, $requestHash, $ipAddress): AccountTransfer {
                $existing = $this->idempotency->existing(fn (): ?AccountTransfer => AccountTransfer::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash);
                if ($existing) {
                    return $existing;
                }
                if ($fromId === $toId) {
                    throw ValidationException::withMessages(['to_account' => 'Akun tujuan harus berbeda.']);
                }
                $count = FinancialAccount::query()->where('store_id', $store->id)->whereIn('id', [$fromId, $toId])->count();
                if ($count !== 2) {
                    throw ValidationException::withMessages(['account' => 'Akun tidak tersedia pada toko aktif.']);
                }
                $transfer = AccountTransfer::create([
                    'store_id' => $store->id, 'document_number' => $this->numbers->handle($store->id, 'trf', $date),
                    'from_account_id' => $fromId, 'to_account_id' => $toId, 'amount' => $amount,
                    'idempotency_key' => $idempotencyKey, 'request_hash' => $requestHash, 'occurred_at' => $date, 'notes' => $notes,
                    'created_by_user_id' => $actor->id, 'posted_at' => now(),
                ]);
                $this->cash->handle($store->id, $fromId, 'out', $amount, 'transfer_out', $transfer, $date, $actor, $notes);
                $this->cash->handle($store->id, $toId, 'in', $amount, 'transfer_in', $transfer, $date, $actor, $notes);
                $this->audit->handle($actor, 'account_transfer.posted', $transfer, $store, $ipAddress, ['document_number' => $transfer->document_number, 'amount' => $amount]);

                return $transfer;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            return $this->idempotency->recover(fn (): ?AccountTransfer => AccountTransfer::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash, $exception);
        }
    }
}
