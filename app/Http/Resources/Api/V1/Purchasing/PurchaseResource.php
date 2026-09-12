<?php

namespace App\Http\Resources\Api\V1\Purchasing;

use App\Models\Purchase;
use App\Models\PurchasePayment;
use App\Support\Decimal;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * Serialisasi kulakan untuk Api_V1 (Req 16). Nominal string decimal scale 4.
 * `paid`/`debt`/`status` diturunkan dari total_amount vs jumlah PurchasePayment.
 * `items` disertakan hanya bila relasi `items` sudah dimuat (detail).
 *
 * @mixin Purchase
 */
class PurchaseResource extends JsonResource
{
    /**
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $total = (string) $this->total_amount;
        $paid = $this->resolvePaid();
        $debt = Decimal::subtract($total, $paid, Decimal::MONEY_SCALE);

        $data = [
            'public_id' => $this->public_id,
            'document_number' => $this->document_number,
            'supplier_invoice_number' => $this->supplier_invoice_number,
            'subtotal' => (string) $this->subtotal,
            'discount_amount' => (string) $this->discount_amount,
            'additional_cost' => (string) $this->additional_cost,
            'total_amount' => $total,
            'paid_amount' => $paid,
            'debt_amount' => $debt,
            'payment_status' => $this->paymentStatus($debt, $paid),
            'occurred_at' => $this->occurred_at?->toIso8601String(),
            'notes' => $this->notes,
        ];

        if ($this->relationLoaded('supplier') && $this->supplier !== null) {
            $data['supplier'] = [
                'public_id' => $this->supplier->public_id,
                'name' => $this->supplier->name,
            ];
        }

        if ($this->relationLoaded('items')) {
            $data['items'] = $this->items->map(fn ($item): array => [
                'product_name' => $item->product_name,
                'sku' => $item->sku,
                'unit_name' => $item->unit_name,
                'quantity' => (string) $item->quantity,
                'unit_price' => (string) $item->unit_price,
                'landed_total' => (string) $item->landed_total,
            ])->all();
        }

        return $data;
    }

    private function resolvePaid(): string
    {
        if ($this->relationLoaded('payments')) {
            $paid = '0.0000';
            foreach ($this->payments as $payment) {
                $paid = Decimal::add($paid, (string) $payment->amount, Decimal::MONEY_SCALE);
            }

            return $paid;
        }

        $sum = (string) PurchasePayment::query()
            ->where('purchase_id', $this->id)
            ->sum('amount');

        return Decimal::add('0', $sum, Decimal::MONEY_SCALE);
    }

    private function paymentStatus(string $debt, string $paid): string
    {
        if (Decimal::compare($debt, '0', Decimal::MONEY_SCALE) <= 0) {
            return 'paid';
        }

        return Decimal::compare($paid, '0', Decimal::MONEY_SCALE) > 0 ? 'partial' : 'unpaid';
    }
}
