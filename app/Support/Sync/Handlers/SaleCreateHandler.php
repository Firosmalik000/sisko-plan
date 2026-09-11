<?php

namespace App\Support\Sync\Handlers;

use App\Actions\Sales\PostSale;
use App\Models\FinancialAccount;
use App\Models\ProductUnit;
use App\Models\Sale;
use App\Models\Store;
use App\Models\User;
use App\Support\Sync\SyncCommandResult;
use Illuminate\Database\Eloquent\ModelNotFoundException;
use Illuminate\Validation\ValidationException;

/**
 * Handler operation `sale.create` untuk `sync/push` (design §3.5, Req 7.5, 12.6).
 *
 * Menerjemahkan payload command offline ke signature `PostSale::handle` yang
 * sudah ada — tidak menduplikasi business logic. `client_operation_id` dipakai
 * sebagai idempotency key; `IdempotencyGuard` menjamin same-payload → hasil
 * sama, different-payload → konflik. Harga di-hydrate server dari
 * `ProductUnit->selling_price`; `local_price_snapshot`/`catalog_revision`
 * hanya audit, bukan sumber harga.
 */
class SaleCreateHandler
{
    public function __construct(private PostSale $postSale) {}

    /**
     * @param  array<string, mixed>  $payload
     */
    public function handle(Store $store, User $actor, string $clientOperationId, array $payload, ?string $ipAddress = null): SyncCommandResult
    {
        try {
            $accountId = $this->resolveAccountId($store, $payload);
            $items = $this->resolveItems($store, $payload);

            $sale = $this->postSale->handle(
                store: $store,
                actor: $actor,
                accountId: $accountId,
                items: $items,
                transactionDiscount: $this->stringValue($payload, 'transaction_discount', '0'),
                paidAmount: $this->stringValue($payload, 'paid_amount', '0'),
                occurredAt: $this->stringValue($payload, 'occurred_at', now()->toIso8601ZuluString()),
                notes: $this->nullableString($payload, 'notes'),
                idempotencyKey: $clientOperationId,
                ipAddress: $ipAddress,
            );

            return SyncCommandResult::synced($clientOperationId, $this->summarize($sale));
        } catch (ValidationException $exception) {
            return $this->fromValidation($clientOperationId, $exception);
        } catch (ModelNotFoundException) {
            // Precondition gagal di dalam PostSale (mis. akun/satuan nonaktif atau
            // hilang → firstOrFail). Jadikan error per-command yang memetakan ke
            // `needs_attention` di klien, bukan menggagalkan seluruh batch (Req 9.4).
            return SyncCommandResult::error(
                $clientOperationId,
                'PRECONDITION_FAILED',
                'Satuan produk atau akun penerimaan tidak aktif atau tidak ditemukan.',
                retryable: false,
            );
        }
    }

    /**
     * Konflik idempotency (same key, beda payload) di-signal `IdempotencyGuard`
     * lewat ValidationException pada field `idempotency_key`. Precondition lain
     * (produk/akun nonaktif, payload invalid) → error command biasa yang
     * memetakan ke `needs_attention` di klien (Req 9.4).
     */
    private function fromValidation(string $clientOperationId, ValidationException $exception): SyncCommandResult
    {
        $errors = $exception->errors();

        if (array_key_exists('idempotency_key', $errors)) {
            return SyncCommandResult::error(
                $clientOperationId,
                'IDEMPOTENCY_CONFLICT',
                'Operasi ini sudah diproses dengan payload berbeda.',
                $errors,
                retryable: false,
            );
        }

        return SyncCommandResult::error(
            $clientOperationId,
            'VALIDATION_ERROR',
            $exception->getMessage(),
            $errors,
            retryable: false,
        );
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function resolveAccountId(Store $store, array $payload): int
    {
        $accountPublicId = $this->nullableString($payload, 'account_public_id');

        if ($accountPublicId === null) {
            throw ValidationException::withMessages([
                'account_public_id' => __('Akun penerimaan wajib diisi.'),
            ]);
        }

        $account = FinancialAccount::query()
            ->where('store_id', $store->id)
            ->where('public_id', $accountPublicId)
            ->first();

        if ($account === null) {
            throw ValidationException::withMessages([
                'account_public_id' => __('Akun penerimaan tidak ditemukan.'),
            ]);
        }

        return $account->id;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<int, array{product_unit_id:int, quantity:string, item_discount:string}>
     */
    private function resolveItems(Store $store, array $payload): array
    {
        $rawItems = $payload['items'] ?? null;

        if (! is_array($rawItems) || $rawItems === []) {
            throw ValidationException::withMessages([
                'items' => __('Minimal satu item penjualan diperlukan.'),
            ]);
        }

        $items = [];

        foreach ($rawItems as $index => $rawItem) {
            if (! is_array($rawItem)) {
                throw ValidationException::withMessages([
                    "items.{$index}" => __('Item penjualan tidak valid.'),
                ]);
            }

            $items[] = [
                'product_unit_id' => $this->resolveProductUnitId($store, $rawItem, (string) $index),
                'quantity' => $this->stringValue($rawItem, 'quantity', '0'),
                'item_discount' => $this->stringValue($rawItem, 'item_discount', '0'),
            ];
        }

        return $items;
    }

    /**
     * Klien membawa identifier lokal `product_unit_id` (integer sebagai string,
     * karena ProductUnit tidak punya public_id) atau `product_unit_public_id`
     * untuk kompatibilitas maju. Keduanya diresolve ke id integer scoped store.
     *
     * @param  array<string, mixed>  $rawItem
     */
    private function resolveProductUnitId(Store $store, array $rawItem, string $index): int
    {
        $identifier = $rawItem['product_unit_id'] ?? $rawItem['product_unit_public_id'] ?? null;

        if (! is_string($identifier) && ! is_int($identifier)) {
            throw ValidationException::withMessages([
                "items.{$index}.product_unit_id" => __('Satuan produk wajib diisi.'),
            ]);
        }

        if (! ctype_digit((string) $identifier)) {
            throw ValidationException::withMessages([
                "items.{$index}.product_unit_id" => __('Satuan produk tidak dikenali.'),
            ]);
        }

        $productUnit = ProductUnit::query()
            ->where('store_id', $store->id)
            ->whereKey((int) $identifier)
            ->first();

        if ($productUnit === null) {
            throw ValidationException::withMessages([
                "items.{$index}.product_unit_id" => __('Satuan produk tidak ditemukan pada toko ini.'),
            ]);
        }

        return $productUnit->id;
    }

    /**
     * @return array<string, mixed>
     */
    private function summarize(Sale $sale): array
    {
        return [
            'public_id' => $sale->public_id,
            'document_number' => $sale->document_number,
            'total' => (string) $sale->total_amount,
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function stringValue(array $payload, string $key, string $default): string
    {
        $value = $payload[$key] ?? null;

        if (is_string($value) && $value !== '') {
            return $value;
        }

        if (is_int($value) || is_float($value)) {
            return (string) $value;
        }

        return $default;
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function nullableString(array $payload, string $key): ?string
    {
        $value = $payload[$key] ?? null;

        return is_string($value) && $value !== '' ? $value : null;
    }
}
