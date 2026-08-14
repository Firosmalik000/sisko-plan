<?php

namespace App\Actions\Subscriptions;

use App\Actions\Platform\RecordAdminAudit;
use App\Models\Plan;
use App\Models\PlatformAdmin;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SavePlan
{
    public function __construct(private RecordAdminAudit $audit) {}

    /** @param array{code:string,name:string,description:?string,monthly_price:string,max_products:int,max_members:int,is_default:bool,is_active:bool} $data */
    public function handle(PlatformAdmin $admin, array $data, ?Plan $plan, ?string $ipAddress): Plan
    {
        return DB::transaction(function () use ($admin, $data, $plan, $ipAddress): Plan {
            $locked = $plan === null ? null : Plan::query()->lockForUpdate()->findOrFail($plan->id);
            if ($locked?->is_default && ! $data['is_default']) {
                throw ValidationException::withMessages(['is_default' => 'Paket default hanya dapat diganti dengan menetapkan paket lain sebagai default.']);
            }
            if ($data['is_default']) {
                $data['is_active'] = true;
                Plan::query()->where('is_default', true)->lockForUpdate()->update(['is_default' => false]);
            }
            $before = $locked?->only(['code', 'name', 'monthly_price', 'max_products', 'max_members', 'is_default', 'is_active']);
            if ($locked === null) {
                $locked = Plan::create($data);
            } else {
                $locked->update($data);
            }
            $this->audit->handle($admin, $plan === null ? 'plan.created' : 'plan.updated', $locked, $ipAddress, ['before' => $before, 'after' => $locked->only(['code', 'name', 'monthly_price', 'max_products', 'max_members', 'is_default', 'is_active'])]);

            return $locked;
        });
    }
}
