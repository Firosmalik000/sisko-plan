<?php

namespace App\Http\Controllers\Api\V1\Sales;

use App\Actions\Audit\RecordAudit;
use App\Actions\Sales\PostSaleReturn;
use App\Http\Requests\Api\V1\Sales\ReconcileSaleRequest;
use App\Http\Responses\ApiResponse;
use App\Models\FinancialAccount;
use App\Models\Sale;
use App\Models\SaleItem;
use App\Models\Store;
use App\Support\Decimal;
use Illuminate\Http\JsonResponse;
use Symfony\Component\HttpKernel\Exception\AccessDeniedHttpException;

/**
 * POST /stores/{store}/sales/{sale}/reconcile — jalur owner menyelesaikan sale
 * `needs_attention` (design §5.5, Req 9.2, 9.3, 9.4, 9.5).
 *
 * Sale yang sudah diterima server bersifat immutable (Req 9.1) dan HANYA dapat
 * dikoreksi lewat reversal. Endpoint ini TIDAK pernah mengubah jumlah dibayar
 * secara diam-diam dan TIDAK membuat produk/stok bayangan:
 *
 * - `accept-snapshot`: owner menerima harga otoritatif server apa adanya.
 *   Mencatat audit berisi snapshot harga lokal + catalog revision + alasan +
 *   actor + timestamp klien & server. Tidak ada mutasi ledger.
 * - `reversal`: reuse `PostSaleReturn` (Action yang sama) untuk membalik seluruh
 *   item; pencatatan harga/alasan/actor/revision ditangani Action + audit.
 *
 * Ability `sale.reconcile` (owner) dicek eksplisit; admin/cashier → 403.
 */
class SaleReconcileController
{
    public function __construct(private PostSaleReturn $postSaleReturn, private RecordAudit $audit) {}

    public function __invoke(ReconcileSaleRequest $request, Store $store, string $sale): JsonResponse
    {
        if (! $request->user()->tokenCan('sale.reconcile')) {
            throw new AccessDeniedHttpException('Ability sale.reconcile diperlukan.');
        }

        $model = Sale::query()
            ->where('store_id', $store->id)
            ->where('public_id', $sale)
            ->firstOrFail();

        $validated = $request->validated();
        $actor = $request->user();
        $serverRecordedAt = now();

        $auditMetadata = [
            'sale_document' => $model->document_number,
            'paid_amount' => (string) $model->paid_amount,
            'server_total' => (string) $model->total_amount,
            'local_price_snapshot' => $validated['local_price_snapshot'] ?? null,
            'catalog_revision' => $validated['catalog_revision'] ?? null,
            'reason' => $validated['reason'],
            'client_recorded_at' => $validated['client_recorded_at'],
            'server_recorded_at' => $serverRecordedAt->toISOString(),
        ];

        if ($validated['action'] === 'accept-snapshot') {
            $this->audit->handle($actor, 'sale.reconciled.accepted', $model, $store, $request->ip(), $auditMetadata);

            return ApiResponse::success([
                'sale_public_id' => $model->public_id,
                'resolution' => 'accepted',
                // Jumlah dibayar TIDAK diubah (Req 9.2) — dikembalikan apa adanya.
                'paid_amount' => (string) $model->paid_amount,
                'total_amount' => (string) $model->total_amount,
                'client_recorded_at' => $validated['client_recorded_at'],
                'server_recorded_at' => $serverRecordedAt->toISOString(),
            ]);
        }

        // Reversal penuh via Action yang sama dengan retur (tidak menduplikasi logika).
        $accountId = FinancialAccount::query()
            ->where('store_id', $store->id)
            ->where('public_id', $validated['account_public_id'])
            ->firstOrFail()
            ->id;

        $saleReturn = $this->postSaleReturn->handle(
            store: $store,
            actor: $actor,
            saleId: $model->id,
            accountId: $accountId,
            items: $this->fullReversalItems($store, $model),
            occurredAt: (string) $validated['occurred_at'],
            notes: $validated['reason'],
            idempotencyKey: (string) $validated['client_operation_id'],
            ipAddress: $request->ip(),
        );

        $this->audit->handle($actor, 'sale.reconciled.reversed', $model, $store, $request->ip(), [
            ...$auditMetadata,
            'sale_return_document' => $saleReturn->document_number,
            'refund_amount' => (string) $saleReturn->refund_amount,
        ]);

        return ApiResponse::success([
            'sale_public_id' => $model->public_id,
            'resolution' => 'reversed',
            // Reversal terpisah; jumlah dibayar pada sale asli tetap immutable.
            'paid_amount' => (string) $model->paid_amount,
            'sale_return' => [
                'document_number' => $saleReturn->document_number,
                'refund_amount' => (string) $saleReturn->refund_amount,
            ],
            'client_recorded_at' => $validated['client_recorded_at'],
            'server_recorded_at' => $serverRecordedAt->toISOString(),
        ], status: 201);
    }

    /**
     * Bangun item reversal penuh: sisa kuantitas yang belum diretur untuk setiap
     * baris sale. Kuantitas string decimal scale 6 (tanpa float).
     *
     * @return array<int, array{sale_item_id:int, quantity:string}>
     */
    private function fullReversalItems(Store $store, Sale $sale): array
    {
        return SaleItem::query()
            ->where('store_id', $store->id)
            ->where('sale_id', $sale->id)
            ->get(['id', 'quantity'])
            ->map(fn (SaleItem $item): array => [
                'sale_item_id' => $item->id,
                'quantity' => Decimal::add((string) $item->quantity, '0', Decimal::QUANTITY_SCALE),
            ])
            ->all();
    }
}
