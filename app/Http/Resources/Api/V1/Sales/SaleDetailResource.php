<?php

namespace App\Http\Resources\Api\V1\Sales;

use App\Models\Sale;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Representasi lengkap Sale untuk `POST /stores/{store}/sales` (hasil) dan
 * `GET /stores/{store}/sales/{sale}` (detail/reprint) (design §3.6, Req 12.6,
 * 12.9).
 *
 * Memuat item, pembayaran, informasi pelanggan, dan seluruh total agar struk
 * dapat dicetak ulang dari snapshot server. Identifier publik = `public_id`
 * (ULID); uang string decimal scale 4, quantity scale 6 (tanpa float). Relasi
 * `items` dan `payments` di-eager load controller untuk menghindari N+1.
 *
 * @mixin Sale
 */
class SaleDetailResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'public_id' => $this->public_id,
            'document_number' => $this->document_number,
            'sales_channel' => $this->sales_channel,
            'marketplace_code' => $this->marketplace_code,
            'external_order_number' => $this->external_order_number,
            'customer' => [
                'name' => $this->customer_name,
                'phone' => $this->customer_phone,
                'email' => $this->customer_email,
            ],
            'totals' => [
                'subtotal' => (string) $this->subtotal,
                'item_discount_amount' => (string) $this->item_discount_amount,
                'transaction_discount_amount' => (string) $this->transaction_discount_amount,
                'total_amount' => (string) $this->total_amount,
                'paid_amount' => (string) $this->paid_amount,
                'change_amount' => (string) $this->change_amount,
            ],
            'items' => $this->items
                ->map(fn ($item): array => [
                    'public_id' => $item->public_id,
                    'product_unit_id' => (string) $item->product_unit_id,
                    'product_name' => $item->product_name,
                    'sku' => $item->sku,
                    'barcode' => $item->barcode,
                    'unit_name' => $item->unit_name,
                    'unit_symbol' => $item->unit_symbol,
                    'quantity' => (string) $item->quantity,
                    'unit_price' => (string) $item->unit_price,
                    'item_discount_amount' => (string) $item->item_discount_amount,
                    'net_total' => (string) $item->net_total,
                ])
                ->values()
                ->all(),
            'payments' => $this->payments
                ->map(fn ($payment): array => [
                    'payment_method' => $payment->payment_method,
                    'amount' => (string) $payment->amount,
                    'tendered_amount' => (string) $payment->tendered_amount,
                    'change_amount' => (string) $payment->change_amount,
                    'has_payment_proof' => $payment->payment_proof_path !== null,
                ])
                ->values()
                ->all(),
            'notes' => $this->notes,
            'occurred_at' => $this->occurred_at?->toIso8601ZuluString(),
            'posted_at' => $this->posted_at?->toIso8601ZuluString(),
        ];
    }
}
