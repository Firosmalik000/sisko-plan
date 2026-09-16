<?php

namespace App\Actions\Registers;

use App\Enums\FinancialAccountType;
use App\Models\BusinessMembership;
use App\Models\PosDevice;
use App\Models\Register;
use App\Models\RegisterSession;
use App\Support\Decimal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class OpenRegisterSession
{
    public function handle(Register $register, BusinessMembership $actor, string $openingCash, ?PosDevice $device = null): RegisterSession
    {
        if (Decimal::compare($openingCash, '0', Decimal::MONEY_SCALE) < 0) {
            throw ValidationException::withMessages(['opening_cash' => __('Opening cash cannot be negative.')]);
        }

        return DB::transaction(function () use ($register, $actor, $openingCash, $device): RegisterSession {
            $locked = Register::query()->with(['store.settings', 'cashAccount'])->lockForUpdate()->findOrFail($register->id);
            abort_unless($locked->store->business_id === $actor->business_id, 403);
            if ($locked->status !== 'active' || $locked->cashAccount->type !== FinancialAccountType::Cash || ! $locked->cashAccount->is_active) {
                throw ValidationException::withMessages(['register' => __('The register requires an active cash account.')]);
            }
            if ($locked->sessions()->where('status', 'open')->exists()) {
                throw ValidationException::withMessages(['register' => __('This register already has an open shift.')]);
            }
            if ($device !== null && $device->store_id !== $locked->store_id) {
                throw ValidationException::withMessages(['register' => __('This register does not belong to the active device Store.')]);
            }

            return RegisterSession::create([
                'store_id' => $locked->store_id,
                'register_id' => $locked->id,
                'pos_device_id' => $device?->id,
                'opened_by_business_membership_id' => $actor->id,
                'currency_code' => $locked->store->settings->currency ?? $locked->store->country()->value('currency_code') ?? 'IDR',
                'opening_cash' => $openingCash,
                'opened_at' => now(),
                'status' => 'open',
            ]);
        }, 3);
    }
}
