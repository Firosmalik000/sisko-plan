<?php

namespace App\Actions\Sales;

use App\Support\Decimal;
use Illuminate\Validation\ValidationException;

class SaleCalculator
{
    private const MAX_MONEY = '999999999999999.9999';

    private const MAX_QUANTITY = '999999999999.999999';

    /**
     * @param  array<int, array{product_id:int, product_unit_id:int, product_name:string, sku:?string, barcode:?string, unit_name:string, unit_symbol:string, quantity:string, conversion_factor:string, unit_price:string, item_discount:string}>  $items
     * @return array{subtotal:string, item_discount:string, transaction_discount:string, total:string, items:array<int, array<string, int|string|null>>}
     */
    public function calculate(array $items, string $transactionDiscount): array
    {
        if ($items === []) {
            throw ValidationException::withMessages(['items' => 'Minimal satu item penjualan wajib diisi.']);
        }
        $subtotal = '0.0000';
        $itemDiscountTotal = '0.0000';
        $netBeforeTransaction = '0.0000';
        foreach ($items as $index => $item) {
            if (Decimal::compare($item['quantity'], '0', Decimal::QUANTITY_SCALE) <= 0 || Decimal::compare($item['unit_price'], '0', Decimal::MONEY_SCALE) < 0 || Decimal::compare($item['item_discount'], '0', Decimal::MONEY_SCALE) < 0) {
                throw ValidationException::withMessages(["items.{$index}" => __('The quantity must be positive, and price or discount values cannot be negative.')]);
            }
            $gross = Decimal::multiply($item['quantity'], $item['unit_price']);
            if (Decimal::compare($gross, '0', Decimal::MONEY_SCALE) <= 0 || Decimal::compare($item['item_discount'], $gross, Decimal::MONEY_SCALE) > 0) {
                throw ValidationException::withMessages(["items.{$index}.discount_amount" => __('The item price must be positive and the item discount cannot exceed its subtotal.')]);
            }
            $baseQuantity = Decimal::multiply($item['quantity'], $item['conversion_factor'], Decimal::QUANTITY_SCALE);
            if (Decimal::compare($baseQuantity, '0', Decimal::QUANTITY_SCALE) <= 0 || Decimal::compare($baseQuantity, self::MAX_QUANTITY, Decimal::QUANTITY_SCALE) > 0) {
                throw ValidationException::withMessages(["items.{$index}.quantity" => __('The converted quantity is not supported.')]);
            }
            $netBeforeDiscount = Decimal::subtract($gross, $item['item_discount'], Decimal::MONEY_SCALE);
            $items[$index] = [...$item, 'gross_subtotal' => $gross, 'base_quantity' => $baseQuantity, 'net_before_transaction_discount' => $netBeforeDiscount];
            $subtotal = Decimal::add($subtotal, $gross, Decimal::MONEY_SCALE);
            $itemDiscountTotal = Decimal::add($itemDiscountTotal, $item['item_discount'], Decimal::MONEY_SCALE);
            $netBeforeTransaction = Decimal::add($netBeforeTransaction, $netBeforeDiscount, Decimal::MONEY_SCALE);
        }
        if (Decimal::compare($transactionDiscount, '0', Decimal::MONEY_SCALE) < 0 || Decimal::compare($transactionDiscount, $netBeforeTransaction, Decimal::MONEY_SCALE) >= 0) {
            throw ValidationException::withMessages(['transaction_discount_amount' => __('The transaction discount cannot be negative and must be lower than the item value after discounts.')]);
        }
        if (Decimal::compare($subtotal, self::MAX_MONEY, Decimal::MONEY_SCALE) > 0) {
            throw ValidationException::withMessages(['items' => __('The sale value exceeds the supported capacity.')]);
        }

        $remainingDiscount = $transactionDiscount;
        $eligibleIndexes = array_keys(array_filter($items, fn (array $item): bool => Decimal::compare((string) $item['net_before_transaction_discount'], '0', Decimal::MONEY_SCALE) > 0));
        $lastEligible = end($eligibleIndexes);
        foreach ($items as $index => $item) {
            if ($index === $lastEligible) {
                $allocatedDiscount = $remainingDiscount;
            } elseif (Decimal::compare((string) $item['net_before_transaction_discount'], '0', Decimal::MONEY_SCALE) === 0) {
                $allocatedDiscount = '0.0000';
            } else {
                $ratio = Decimal::divide((string) $item['net_before_transaction_discount'], $netBeforeTransaction, 12);
                $allocatedDiscount = Decimal::multiply($transactionDiscount, $ratio);
                $remainingDiscount = Decimal::subtract($remainingDiscount, $allocatedDiscount, Decimal::MONEY_SCALE);
            }
            $netTotal = Decimal::subtract((string) $item['net_before_transaction_discount'], $allocatedDiscount, Decimal::MONEY_SCALE);
            $items[$index] = [...$item, 'allocated_transaction_discount' => $allocatedDiscount, 'net_total' => $netTotal];
        }
        $total = Decimal::subtract($netBeforeTransaction, $transactionDiscount, Decimal::MONEY_SCALE);
        if (Decimal::compare($total, '0', Decimal::MONEY_SCALE) <= 0 || Decimal::compare($total, self::MAX_MONEY, Decimal::MONEY_SCALE) > 0) {
            throw ValidationException::withMessages(['transaction_discount_amount' => __('The sale total must be positive and within the supported capacity.')]);
        }

        return ['subtotal' => $subtotal, 'item_discount' => $itemDiscountTotal, 'transaction_discount' => $transactionDiscount, 'total' => $total, 'items' => $items];
    }
}
