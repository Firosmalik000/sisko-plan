<?php

namespace App\Actions\Purchasing;

use App\Actions\Ledgers\ApplyCashTransaction;
use App\Actions\Ledgers\NextDocumentNumber;
use App\Models\BusinessMembership;
use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Models\Store;
use App\Models\User;
use Carbon\CarbonInterface;

class ApplyPurchasePayment
{
    public function __construct(private NextDocumentNumber $numbers, private ApplyCashTransaction $cash, private ApplySupplierPayable $payable) {}

    public function handle(Purchase $purchase, int $accountId, string $amount, CarbonInterface $occurredAt, BusinessMembership|User $actor, ?string $notes, string $idempotencyKey, string $requestHash): PurchasePayment
    {
        $actor = BusinessMembership::operational(Store::query()->findOrFail($purchase->store_id), $actor);
        $payment = PurchasePayment::create([
            'store_id' => $purchase->store_id, 'purchase_id' => $purchase->id, 'financial_account_id' => $accountId,
            'currency_code' => $purchase->currency_code,
            'document_number' => $this->numbers->handle($purchase->store_id, 'pay', $occurredAt), 'amount' => $amount,
            'idempotency_key' => $idempotencyKey, 'request_hash' => $requestHash, 'occurred_at' => $occurredAt,
            'notes' => $notes,
            'created_by_business_membership_id' => $actor->id, 'posted_at' => now(),
        ]);
        $this->payable->handle($purchase->store_id, $purchase->supplier_id, 'decrease', $amount, 'purchase_payment', $payment, $occurredAt, $actor, $notes);
        $this->cash->handle($purchase->store_id, $accountId, 'out', $amount, 'purchase_payment', $payment, $occurredAt, $actor, $notes);

        return $payment;
    }
}
