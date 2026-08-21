<?php

namespace App\Http\Requests\Purchasing;

use App\Models\Supplier;
use App\Rules\CatalogProductSelection;
use App\Support\CurrentStore;
use Illuminate\Validation\Rule;

class StorePurchaseRequest extends PurchasingRequest
{
    /** @return array<string, mixed> */
    public function rules(): array
    {
        $storeId = app(CurrentStore::class)->id();
        $supplierPublicId = $this->input('supplier_id');
        $supplierId = is_string($supplierPublicId)
            ? (int) (Supplier::query()->where(['store_id' => $storeId, 'public_id' => $supplierPublicId])->value('id') ?? 0)
            : 0;
        $money = ['decimal:0,4', 'gte:0', 'lte:999999999999999.9999'];

        return [
            ...$this->postingRules(),
            'supplier_id' => ['required', Rule::exists('suppliers', 'public_id')->where(fn ($query) => $query->where('store_id', $storeId)->where('is_active', true))],
            'supplier_invoice_number' => ['nullable', 'string', 'max:100', Rule::unique('purchases', 'supplier_invoice_number')->where(fn ($query) => $query->where('store_id', $storeId)->where('supplier_id', $supplierId))],
            'discount_amount' => ['required', ...$money],
            'additional_cost' => ['required', ...$money],
            'paid_amount' => ['required', ...$money],
            'account_id' => ['nullable', Rule::exists('financial_accounts', 'public_id')->where(fn ($query) => $query->where('store_id', $storeId)->where('is_active', true))],
            'items' => ['required', 'array', 'min:1', 'max:100'],
            'items.*.product_id' => ['required', new CatalogProductSelection($storeId)],
            'items.*.unit_id' => ['required', Rule::exists('units', 'public_id')->where(fn ($query) => $query->where('store_id', $storeId)->where('is_active', true))],
            'items.*.quantity' => ['required', 'decimal:0,6', 'gt:0', 'lte:999999999999.999999'],
            'items.*.unit_price' => ['required', ...$money],
        ];
    }
}
