<?php

namespace App\Http\Controllers\Api\V1\Finance;

use App\Actions\Ledgers\PostAccountTransfer;
use App\Actions\Ledgers\PostCapitalTransaction;
use App\Actions\Ledgers\PostOpeningCash;
use App\Http\Requests\Api\V1\Finance\StoreCapitalTransactionRequest;
use App\Http\Requests\Api\V1\Finance\StoreCashOpeningRequest;
use App\Http\Requests\Api\V1\Finance\StoreCashTransferRequest;
use App\Http\Resources\Api\V1\Finance\AccountTransferResource;
use App\Http\Resources\Api\V1\Finance\CapitalTransactionResource;
use App\Http\Resources\Api\V1\Finance\CashTransactionResource;
use App\Http\Responses\ApiResponse;
use App\Models\FinancialAccount;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\Store;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;
use Symfony\Component\HttpKernel\Exception\NotFoundHttpException;

/**
 * Operasi kas store-scoped: kas awal, transfer antar akun, dan transaksi modal
 * (Req 18.1–18.3). Controller tipis: gate `finance.write`, resolusi identifier
 * publik (akun/produk) → id internal, delegasi ke ledger action (REUSE — saldo,
 * ledger, idempotensi, audit tidak diduplikasi). Saldo kurang → `ValidationException`
 * dari `ApplyCashTransaction` (surfaced 422 VALIDATION_ERROR). Uang string scale 4.
 */
class CashLedgerController
{
    public function __construct(
        private PostOpeningCash $postOpeningCash,
        private PostAccountTransfer $postAccountTransfer,
        private PostCapitalTransaction $postCapitalTransaction,
    ) {}

    public function opening(StoreCashOpeningRequest $request, Store $store): JsonResponse
    {
        $this->assertCan($request);
        $validated = $request->validated();

        $transaction = $this->postOpeningCash->handle(
            store: $store,
            actor: $request->user(),
            accountId: $this->resolveAccountId($store, $validated['account_public_id']),
            amount: (string) $validated['amount'],
            occurredAt: (string) $validated['occurred_at'],
            notes: $validated['notes'] ?? null,
            idempotencyKey: (string) $validated['idempotency_key'],
            ipAddress: $request->ip(),
        );

        return ApiResponse::success(
            (new CashTransactionResource($transaction))->resolve($request),
            status: 201,
        );
    }

    public function transfer(StoreCashTransferRequest $request, Store $store): JsonResponse
    {
        $this->assertCan($request);
        $validated = $request->validated();

        $transfer = $this->postAccountTransfer->handle(
            store: $store,
            actor: $request->user(),
            fromId: $this->resolveAccountId($store, $validated['from_account_public_id']),
            toId: $this->resolveAccountId($store, $validated['to_account_public_id']),
            amount: (string) $validated['amount'],
            occurredAt: (string) $validated['occurred_at'],
            notes: $validated['notes'] ?? null,
            idempotencyKey: (string) $validated['idempotency_key'],
            ipAddress: $request->ip(),
        );

        return ApiResponse::success(
            (new AccountTransferResource($transfer))->resolve($request),
            status: 201,
        );
    }

    public function capital(StoreCapitalTransactionRequest $request, Store $store): JsonResponse
    {
        $this->assertCan($request);
        $validated = $request->validated();

        $accountId = isset($validated['account_public_id'])
            ? $this->resolveAccountId($store, $validated['account_public_id'])
            : null;

        $capital = $this->postCapitalTransaction->handle(
            store: $store,
            actor: $request->user(),
            type: (string) $validated['type'],
            accountId: $accountId,
            amount: isset($validated['amount']) ? (string) $validated['amount'] : null,
            items: $this->resolveItems($store, $validated['items'] ?? []),
            occurredAt: (string) $validated['occurred_at'],
            notes: $validated['notes'] ?? null,
            idempotencyKey: (string) $validated['idempotency_key'],
            ipAddress: $request->ip(),
        );

        return ApiResponse::success(
            (new CapitalTransactionResource($capital))->resolve($request),
            status: 201,
        );
    }

    private function resolveAccountId(Store $store, string $publicId): int
    {
        $account = FinancialAccount::query()
            ->where('store_id', $store->id)
            ->where('public_id', $publicId)
            ->first();

        if ($account === null) {
            throw new NotFoundHttpException('Akun keuangan tidak ditemukan.');
        }

        return $account->id;
    }

    /**
     * Resolusi item modal inventory: identifier publik produk/varian → id internal,
     * dipastikan milik store (tenant isolation). Validasi kuantitas/harga tetap
     * otoritatif di `PostCapitalTransaction`.
     *
     * @param  array<int, array{product_public_id:string, variant_public_id?:string|null, quantity:string, unit_cost?:string|null}>  $items
     * @return array<int, array{product_id:int, product_variant_id?:int|null, quantity:string, unit_cost?:string|null}>
     */
    private function resolveItems(Store $store, array $items): array
    {
        return array_map(function (array $item) use ($store): array {
            $product = Product::query()
                ->where('store_id', $store->id)
                ->where('public_id', $item['product_public_id'])
                ->first();

            if ($product === null) {
                throw new NotFoundHttpException('Produk tidak ditemukan pada toko aktif.');
            }

            $variantId = null;
            if (! empty($item['variant_public_id'])) {
                $variant = ProductVariant::query()
                    ->where('store_id', $store->id)
                    ->where('product_id', $product->id)
                    ->where('public_id', $item['variant_public_id'])
                    ->first();

                if ($variant === null) {
                    throw new NotFoundHttpException('Varian produk tidak ditemukan.');
                }

                $variantId = $variant->id;
            }

            return [
                'product_id' => $product->id,
                'product_variant_id' => $variantId,
                'quantity' => (string) $item['quantity'],
                'unit_cost' => isset($item['unit_cost']) ? (string) $item['unit_cost'] : null,
            ];
        }, $items);
    }

    private function assertCan(Request $request): void
    {
        if (! $request->user()->tokenCan('finance.write')) {
            throw new AccessDeniedHttpException('Ability finance.write diperlukan.');
        }
    }
}
