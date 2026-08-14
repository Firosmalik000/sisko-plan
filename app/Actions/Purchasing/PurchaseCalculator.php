<?php

namespace App\Actions\Purchasing;

use App\Support\Decimal;
use Illuminate\Validation\ValidationException;

class PurchaseCalculator
{
    private const MAX_MONEY = '999999999999999.9999';

    private const MAX_QUANTITY = '999999999999.999999';

    /**
     * @param  array<int, array{product_id:int, product_unit_id:int, product_name:string, sku:?string, unit_name:string, unit_symbol:string, quantity:string, conversion_factor:string, unit_price:string}>  $items
     * @return array{subtotal:string, discount:string, additional_cost:string, total:string, items:array<int, array<string, int|string|null>>}
     */
    public function calculate(array $items, string $discount, string $additionalCost): array
    {
        if ($items === []) {
            throw ValidationException::withMessages(['items' => 'Minimal satu item pembelian wajib diisi.']);
        }
        $subtotal = '0.0000';
        foreach ($items as $index => $item) {
            if (Decimal::compare($item['quantity'], '0', Decimal::QUANTITY_SCALE) <= 0 || Decimal::compare($item['unit_price'], '0', Decimal::MONEY_SCALE) < 0) {
                throw ValidationException::withMessages(["items.{$index}" => 'Kuantitas harus positif dan harga tidak boleh negatif.']);
            }
            $lineSubtotal = Decimal::multiply($item['quantity'], $item['unit_price']);
            $baseQuantity = Decimal::multiply($item['quantity'], $item['conversion_factor'], Decimal::QUANTITY_SCALE);
            if (Decimal::compare($baseQuantity, '0', Decimal::QUANTITY_SCALE) <= 0 || Decimal::compare($baseQuantity, self::MAX_QUANTITY, Decimal::QUANTITY_SCALE) > 0) {
                throw ValidationException::withMessages(["items.{$index}.quantity" => 'Hasil konversi kuantitas harus lebih besar dari nol dan tidak melebihi kapasitas yang didukung.']);
            }
            $items[$index] = [...$item, 'line_subtotal' => $lineSubtotal, 'base_quantity' => $baseQuantity];
            $subtotal = Decimal::add($subtotal, $lineSubtotal, Decimal::MONEY_SCALE);
        }
        if (Decimal::compare($subtotal, '0', Decimal::MONEY_SCALE) <= 0 || Decimal::compare($discount, '0', Decimal::MONEY_SCALE) < 0 || Decimal::compare($discount, $subtotal, Decimal::MONEY_SCALE) > 0 || Decimal::compare($additionalCost, '0', Decimal::MONEY_SCALE) < 0) {
            throw ValidationException::withMessages(['discount_amount' => 'Subtotal harus positif, diskon tidak boleh melebihi subtotal, dan biaya tambahan tidak boleh negatif.']);
        }
        $remainingDiscount = $discount;
        $remainingAdditional = $additionalCost;
        $lastIndex = array_key_last($items);
        foreach ($items as $index => $item) {
            if ($index === $lastIndex) {
                $allocatedDiscount = $remainingDiscount;
                $allocatedAdditional = $remainingAdditional;
            } else {
                $ratio = Decimal::divide((string) $item['line_subtotal'], $subtotal, 12);
                $allocatedDiscount = Decimal::multiply($discount, $ratio);
                $allocatedAdditional = Decimal::multiply($additionalCost, $ratio);
                $remainingDiscount = Decimal::subtract($remainingDiscount, $allocatedDiscount, Decimal::MONEY_SCALE);
                $remainingAdditional = Decimal::subtract($remainingAdditional, $allocatedAdditional, Decimal::MONEY_SCALE);
            }
            $landedTotal = Decimal::add(Decimal::subtract((string) $item['line_subtotal'], $allocatedDiscount, Decimal::MONEY_SCALE), $allocatedAdditional, Decimal::MONEY_SCALE);
            $baseUnitCost = Decimal::divide($landedTotal, (string) $item['base_quantity'], Decimal::MONEY_SCALE);
            if (Decimal::compare($landedTotal, '0', Decimal::MONEY_SCALE) < 0 || Decimal::compare($landedTotal, self::MAX_MONEY, Decimal::MONEY_SCALE) > 0 || Decimal::compare($baseUnitCost, self::MAX_MONEY, Decimal::MONEY_SCALE) > 0) {
                throw ValidationException::withMessages(["items.{$index}.unit_price" => 'Landed cost atau biaya per satuan dasar melebihi kapasitas yang didukung.']);
            }
            $items[$index] = [...$item, 'allocated_discount' => $allocatedDiscount, 'allocated_additional_cost' => $allocatedAdditional, 'landed_total' => $landedTotal, 'base_unit_cost' => $baseUnitCost];
        }
        $total = Decimal::add(Decimal::subtract($subtotal, $discount, Decimal::MONEY_SCALE), $additionalCost, Decimal::MONEY_SCALE);
        if (Decimal::compare($total, '0', Decimal::MONEY_SCALE) <= 0) {
            throw ValidationException::withMessages(['discount_amount' => 'Total pembelian setelah diskon dan biaya tambahan harus lebih besar dari nol.']);
        }
        if (Decimal::compare($subtotal, self::MAX_MONEY, Decimal::MONEY_SCALE) > 0 || Decimal::compare($total, self::MAX_MONEY, Decimal::MONEY_SCALE) > 0) {
            throw ValidationException::withMessages(['items' => 'Nilai pembelian melebihi kapasitas nominal yang didukung.']);
        }

        return ['subtotal' => $subtotal, 'discount' => $discount, 'additional_cost' => $additionalCost, 'total' => $total, 'items' => $items];
    }
}
