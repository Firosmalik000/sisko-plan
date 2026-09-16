<?php

namespace App\Actions\Sales;

use App\Actions\Audit\RecordAudit;
use App\Enums\FinancialAccountType;
use App\Models\BusinessMembership;
use App\Models\FinancialAccount;
use App\Models\PosDevice;
use App\Models\Register;
use App\Models\Store;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ActivatePosDevice
{
    public function __construct(private RecordAudit $audit) {}

    /** @return array{PosDevice,string} */
    public function handle(Store $store, BusinessMembership $actor, string $name, ?string $ipAddress = null): array
    {
        abort_unless($actor->business_id === $store->business_id, 403);

        return DB::transaction(function () use ($store, $actor, $name, $ipAddress): array {
            Store::query()->lockForUpdate()->findOrFail($store->id);

            $cashAccount = FinancialAccount::query()
                ->where('store_id', $store->id)
                ->where('type', FinancialAccountType::Cash->value)
                ->where('is_active', true)
                ->orderBy('id')
                ->first();
            if ($cashAccount === null) {
                $accountName = FinancialAccount::query()->where('store_id', $store->id)->where('name', 'Kas')->exists()
                    ? 'Kas POS '.$store->public_id
                    : 'Kas';
                $cashAccount = FinancialAccount::query()->create([
                    'store_id' => $store->id,
                    'name' => $accountName,
                    'type' => FinancialAccountType::Cash,
                    'is_active' => true,
                ]);
            }
            Register::query()->firstOrCreate(
                ['store_id' => $store->id, 'name' => 'Kasir Utama'],
                ['cash_financial_account_id' => $cashAccount->id, 'status' => 'active'],
            );

            $token = Str::random(64);
            $device = PosDevice::create([
                'business_id' => $store->business_id,
                'store_id' => $store->id,
                'name' => trim($name),
                'token_hash' => hash('sha256', $token),
                'status' => 'active',
                'activated_by_business_membership_id' => $actor->id,
            ]);
            $this->audit->handle($actor, 'pos_device.activated', $device, $store, $ipAddress, [
                'device_id' => $device->public_id,
                'device_name' => $device->name,
            ]);

            return [$device, $token];
        });
    }
}
