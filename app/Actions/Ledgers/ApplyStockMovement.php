<?php

namespace App\Actions\Ledgers;

use App\Models\InventoryBalance;
use App\Models\StockMovement;
use App\Models\User;
use App\Support\Decimal;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ApplyStockMovement
{
    private const MAX_MONEY = '999999999999999.9999';

    private const MAX_QUANTITY = '999999999999.999999';

    public function handle(int $storeId, int $productId, string $quantityChange, ?string $incomingUnitCost, string $reason, Model $reference, CarbonInterface $occurredAt, User $actor, ?string $notes, bool $requireEmptyProduct = false, ?string $incomingValue = null): StockMovement
    {
        if (Decimal::compare($quantityChange, '0', Decimal::QUANTITY_SCALE) === 0) {
            throw ValidationException::withMessages(['items' => 'Perubahan stok tidak boleh nol.']);
        }
        DB::table('inventory_balances')->insertOrIgnore([
            'store_id' => $storeId, 'product_id' => $productId, 'quantity' => 0,
            'average_cost' => 0, 'inventory_value' => 0, 'minimum_quantity' => 0,
            'created_at' => now(), 'updated_at' => now(),
        ]);
        $balance = InventoryBalance::query()->where(['store_id' => $storeId, 'product_id' => $productId])->lockForUpdate()->firstOrFail();
        $latestMovement = StockMovement::query()->where(['store_id' => $storeId, 'product_id' => $productId])
            ->latest('occurred_at')->latest('id')->lockForUpdate()->first(['occurred_at']);
        if ($requireEmptyProduct && $latestMovement !== null) {
            throw ValidationException::withMessages(['items' => 'Saldo awal hanya dapat diposting sebelum produk memiliki pergerakan stok.']);
        }
        if ($latestMovement !== null && $occurredAt->lt(CarbonImmutable::parse((string) $latestMovement->occurred_at))) {
            throw ValidationException::withMessages(['occurred_at' => 'Waktu transaksi tidak boleh mendahului pergerakan stok terakhir produk.']);
        }
        $newQuantity = Decimal::add($balance->quantity, $quantityChange, Decimal::QUANTITY_SCALE);
        if (Decimal::compare($newQuantity, '0', Decimal::QUANTITY_SCALE) < 0) {
            throw ValidationException::withMessages(['items' => 'Stok tidak mencukupi untuk transaksi ini.']);
        }
        if (Decimal::compare($newQuantity, self::MAX_QUANTITY, Decimal::QUANTITY_SCALE) > 0) {
            throw ValidationException::withMessages(['items' => 'Kuantitas stok melebihi kapasitas yang didukung.']);
        }

        if (Decimal::compare($quantityChange, '0', Decimal::QUANTITY_SCALE) > 0) {
            if ($incomingUnitCost === null || Decimal::compare($incomingUnitCost, '0', Decimal::MONEY_SCALE) < 0) {
                throw ValidationException::withMessages(['items' => 'Biaya per unit wajib diisi untuk stok masuk.']);
            }
            $unitCost = $incomingUnitCost;
            if ($incomingValue !== null && Decimal::compare($incomingValue, '0', Decimal::MONEY_SCALE) < 0) {
                throw ValidationException::withMessages(['items' => 'Nilai stok masuk tidak boleh negatif.']);
            }
            $valueChange = $incomingValue ?? Decimal::multiply($quantityChange, $unitCost);
            $newValue = Decimal::add($balance->inventory_value, $valueChange, Decimal::MONEY_SCALE);
            $newAverage = Decimal::compare($newQuantity, '0', Decimal::QUANTITY_SCALE) === 0
                ? '0.0000' : Decimal::divide($newValue, $newQuantity, Decimal::MONEY_SCALE);
            if (Decimal::compare($newValue, self::MAX_MONEY, Decimal::MONEY_SCALE) > 0 || Decimal::compare($newAverage, self::MAX_MONEY, Decimal::MONEY_SCALE) > 0) {
                throw ValidationException::withMessages(['items' => 'Nilai persediaan melebihi kapasitas yang didukung.']);
            }
        } else {
            $unitCost = $balance->average_cost;
            $depleted = Decimal::compare($newQuantity, '0', Decimal::QUANTITY_SCALE) === 0;
            $valueChange = $depleted
                ? Decimal::subtract('0', $balance->inventory_value, Decimal::MONEY_SCALE)
                : Decimal::multiply($quantityChange, $unitCost);
            $newValue = $depleted ? '0.0000' : Decimal::add($balance->inventory_value, $valueChange, Decimal::MONEY_SCALE);
            $newAverage = Decimal::compare($newQuantity, '0', Decimal::QUANTITY_SCALE) === 0 ? '0.0000' : $balance->average_cost;
        }

        $balance->update(['quantity' => $newQuantity, 'average_cost' => $newAverage, 'inventory_value' => $newValue]);

        return StockMovement::create([
            'store_id' => $storeId, 'product_id' => $productId, 'reason' => $reason,
            'quantity_change' => $quantityChange, 'unit_cost' => $unitCost, 'value_change' => $valueChange,
            'quantity_after' => $newQuantity, 'average_cost_after' => $newAverage, 'inventory_value_after' => $newValue,
            'reference_type' => $reference->getMorphClass(), 'reference_id' => $reference->getKey(),
            'occurred_at' => $occurredAt, 'notes' => $notes, 'created_by_user_id' => $actor->id,
        ]);
    }
}
