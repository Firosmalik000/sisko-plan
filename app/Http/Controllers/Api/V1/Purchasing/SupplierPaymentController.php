<?php

namespace App\Http\Controllers\Api\V1\Purchasing;

use App\Actions\Purchasing\PostPurchasePayment;
use App\Http\Requests\Api\V1\Purchasing\StoreSupplierPaymentRequest;
use App\Http\Responses\ApiResponse;
use App\Models\FinancialAccount;
use App\Models\Purchase;
use App\Models\Store;
use App\Models\Supplier;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * POST /stores/{store}/suppliers/{supplier}/payments — pembayaran hutang atas
 * kulakan supplier (Req 16.4).
 *
 * Controller tipis: ability gate `purchasing.write`, resolve supplier + purchase
 * + account by public_id, delegasi ke `PostPurchasePayment` (REUSE — pengurangan
 * hutang + ledger + validasi ≤ sisa tagihan + idempotency tidak diduplikasi).
 */
class SupplierPaymentController
{
    public function __construct(private PostPurchasePayment $postPurchasePayment) {}

    public function __invoke(StoreSupplierPaymentRequest $request, Store $store, string $supplier): JsonResponse
    {
        if (! $request->user()->tokenCan('purchasing.write')) {
            throw new AccessDeniedHttpException('Ability purchasing.write diperlukan.');
        }

        $validated = $request->validated();

        $supplierModel = Supplier::query()
            ->where('store_id', $store->id)
            ->where('public_id', $supplier)
            ->firstOrFail();

        $purchase = Purchase::query()
            ->where('store_id', $store->id)
            ->where('supplier_id', $supplierModel->id)
            ->where('public_id', $validated['purchase_public_id'])
            ->first();

        if ($purchase === null) {
            throw new NotFoundHttpException('Kulakan tidak ditemukan untuk supplier ini.');
        }

        $account = FinancialAccount::query()
            ->where('store_id', $store->id)
            ->where('public_id', $validated['account_public_id'])
            ->firstOrFail();

        $payment = $this->postPurchasePayment->handle(
            store: $store,
            actor: $request->user(),
            purchaseId: $purchase->id,
            accountId: $account->id,
            amount: (string) $validated['amount'],
            occurredAt: (string) $validated['occurred_at'],
            notes: $validated['notes'] ?? null,
            idempotencyKey: (string) $validated['client_operation_id'],
            ipAddress: $request->ip(),
        );

        return ApiResponse::success([
            'public_id' => $payment->public_id,
            'document_number' => $payment->document_number,
            'amount' => (string) $payment->amount,
            'occurred_at' => $payment->occurred_at?->toIso8601String(),
        ], status: 201);
    }
}
