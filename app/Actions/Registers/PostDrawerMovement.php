<?php

namespace App\Actions\Registers;

use App\Actions\Ledgers\ApplyCashTransaction;
use App\Models\BusinessMembership;
use App\Models\PosActionApproval;
use App\Models\RegisterDrawerMovement;
use App\Models\RegisterSession;
use App\Support\BusinessCapability;
use App\Support\Decimal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class PostDrawerMovement
{
    public function __construct(private ApplyCashTransaction $cash, private ApprovePosAction $approvals, private BusinessCapability $capabilities) {}

    public function handle(RegisterSession $session, BusinessMembership $actor, string $direction, string $amount, string $reason, ?PosActionApproval $approval = null, ?RegisterDrawerMovement $reversalOf = null): RegisterDrawerMovement
    {
        if (! in_array($direction, ['cash_in', 'cash_out'], true) || Decimal::compare($amount, '0', Decimal::MONEY_SCALE) <= 0 || trim($reason) === '') {
            throw ValidationException::withMessages(['amount' => __('A valid positive drawer movement is required.')]);
        }

        return DB::transaction(function () use ($session, $actor, $direction, $amount, $reason, $approval, $reversalOf): RegisterDrawerMovement {
            $locked = RegisterSession::query()->with(['register', 'store'])->whereKey($session->id)->lockForUpdate()->firstOrFail();
            if ($locked->status !== 'open') {
                throw ValidationException::withMessages(['register' => __('Drawer movements require an open register shift.')]);
            }
            abort_unless($actor->business_id === $locked->store->business_id, 403);
            if ($direction === 'cash_out' && $reversalOf === null && ! $this->capabilities->allows($actor, 'register.approve', $locked->store)) {
                if ($approval === null) {
                    throw ValidationException::withMessages(['approval' => __('A manager approval is required for cash out.')]);
                }
                $approval = $this->approvals->consume($approval, $locked->store, $actor, 'drawer.cash_out', $locked);
            }
            $movement = RegisterDrawerMovement::create([
                'store_id' => $locked->store_id,
                'register_session_id' => $locked->id,
                'direction' => $direction,
                'amount' => $amount,
                'reason' => trim($reason),
                'actor_business_membership_id' => $actor->id,
                'approval_id' => $approval?->id,
                'reversal_of_movement_id' => $reversalOf?->id,
                'occurred_at' => now(),
            ]);
            $this->cash->handle(
                $locked->store_id,
                $locked->register->cash_financial_account_id,
                $direction === 'cash_in' ? 'in' : 'out',
                $amount,
                'register_drawer',
                $movement,
                now(),
                $actor,
                $movement->reason,
                registerSessionId: $locked->id,
            );

            return $movement;
        }, 3);
    }

    public function reverse(RegisterDrawerMovement $movement, BusinessMembership $actor, string $reason): RegisterDrawerMovement
    {
        $movement = RegisterDrawerMovement::query()->with('session')->findOrFail($movement->id);
        if (RegisterDrawerMovement::query()->where('reversal_of_movement_id', $movement->id)->exists()) {
            throw ValidationException::withMessages(['movement' => __('This drawer movement has already been reversed.')]);
        }

        return $this->handle(
            $movement->session,
            $actor,
            $movement->direction === 'cash_in' ? 'cash_out' : 'cash_in',
            (string) $movement->amount,
            $reason,
            reversalOf: $movement,
        );
    }
}
