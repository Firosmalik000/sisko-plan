<?php

namespace App\Actions\Purchasing;

use App\Actions\Audit\RecordAudit;
use App\Actions\Ledgers\IdempotencyGuard;
use App\Actions\Ledgers\LedgerTimestamp;
use App\Models\FinancialAccount;
use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Models\Store;
use App\Models\User;
use App\Support\Decimal;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PostPurchasePayment
{
    public function __construct(private ApplyPurchasePayment $payments, private RecordAudit $audit, private IdempotencyGuard $idempotency, private LedgerTimestamp $timestamps) {}

    public function handle(Store $store, User $actor, int $purchaseId, int $accountId, string $amount, string $occurredAt, ?string $notes, string $idempotencyKey, ?string $ipAddress = null): PurchasePayment
    {
        $date = $this->timestamps->parse($store, $occurredAt);
        $requestHash = $this->idempotency->hash(['purchase_id' => $purchaseId, 'account_id' => $accountId, 'amount' => $amount, 'occurred_at' => $date->toISOString(), 'notes' => $notes]);

        try {
            return DB::transaction(function () use ($store, $actor, $purchaseId, $accountId, $amount, $date, $notes, $idempotencyKey, $requestHash, $ipAddress): PurchasePayment {
                $existing = $this->idempotency->existing(fn (): ?PurchasePayment => PurchasePayment::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash);
                if ($existing) {
                    return $existing;
                }
                $purchase = Purchase::query()->where(['id' => $purchaseId, 'store_id' => $store->id])->lockForUpdate()->firstOrFail();
                FinancialAccount::query()->where(['id' => $accountId, 'store_id' => $store->id])->firstOrFail();
                $paid = '0.0000';
                foreach (PurchasePayment::query()->where(['store_id' => $store->id, 'purchase_id' => $purchase->id])->lockForUpdate()->get(['amount']) as $payment) {
                    $paid = Decimal::add($paid, (string) $payment->amount, Decimal::MONEY_SCALE);
                }
                $outstanding = Decimal::subtract($purchase->total_amount, $paid, Decimal::MONEY_SCALE);
                if (Decimal::compare($amount, '0', Decimal::MONEY_SCALE) <= 0 || Decimal::compare($amount, $outstanding, Decimal::MONEY_SCALE) > 0) {
                    throw ValidationException::withMessages(['amount' => 'Pembayaran harus positif dan tidak boleh melebihi sisa tagihan.']);
                }
                $payment = $this->payments->handle($purchase, $accountId, $amount, $date, $actor, $notes, $idempotencyKey, $requestHash);
                $this->audit->handle($actor, 'purchase_payment.posted', $payment, $store, $ipAddress, ['purchase_document' => $purchase->document_number, 'amount' => $amount]);

                return $payment;
            }, 3);
        } catch (UniqueConstraintViolationException $exception) {
            return $this->idempotency->recover(fn (): ?PurchasePayment => PurchasePayment::query()->where(['store_id' => $store->id, 'idempotency_key' => $idempotencyKey])->lockForUpdate()->first(), $requestHash, $exception);
        }
    }
}
