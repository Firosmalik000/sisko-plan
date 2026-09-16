<?php

namespace App\Actions\Registers;

use App\Models\BusinessMembership;
use App\Models\Register;
use App\Models\RegisterSession;
use App\Services\Registers\ExpectedCash;
use App\Support\BusinessCapability;
use App\Support\Decimal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CloseRegisterSession
{
    public function __construct(private ExpectedCash $expectedCash, private BusinessCapability $capabilities) {}

    public function handle(RegisterSession $session, BusinessMembership $actor, string $countedCash): RegisterSession
    {
        if (Decimal::compare($countedCash, '0', Decimal::MONEY_SCALE) < 0) {
            throw ValidationException::withMessages(['counted_cash' => __('Counted cash cannot be negative.')]);
        }

        return DB::transaction(function () use ($session, $actor, $countedCash): RegisterSession {
            Register::query()->whereKey($session->register_id)->lockForUpdate()->firstOrFail();
            $locked = RegisterSession::query()->with('store')->whereKey($session->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== 'open') {
                throw ValidationException::withMessages(['register' => __('This register shift is already closed.')]);
            }
            $isOwnShift = $locked->opened_by_business_membership_id === $actor->id;
            abort_unless($isOwnShift || $this->capabilities->allows($actor, 'register.approve', $locked->store), 403);
            $expected = $this->expectedCash->for($locked);
            $locked->update([
                'closed_by_business_membership_id' => $actor->id,
                'expected_cash' => $expected,
                'counted_cash' => $countedCash,
                'variance' => Decimal::subtract($countedCash, $expected, Decimal::MONEY_SCALE),
                'closed_at' => now(),
                'status' => 'closed',
            ]);

            return $locked->refresh();
        }, 3);
    }
}
