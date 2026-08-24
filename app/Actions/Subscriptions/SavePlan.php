<?php

namespace App\Actions\Subscriptions;

use App\Actions\Platform\RecordAdminAudit;
use App\Models\Plan;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class SavePlan
{
    public function __construct(private RecordAdminAudit $audit) {}

    /** @param array{name:string,description:?string,monthly_price:string,duration_months:int,max_stores:int,max_products:int,max_members:int,is_active:bool} $data */
    public function handle(User $admin, array $data, ?Plan $plan, ?string $ipAddress): Plan
    {
        return DB::transaction(function () use ($admin, $data, $plan, $ipAddress): Plan {
            $locked = $plan === null ? null : Plan::query()->lockForUpdate()->findOrFail($plan->id);
            if ($locked?->is_trial) {
                $data['monthly_price'] = '0';
                $data['duration_months'] = 1;
                $data['is_active'] = true;
            }
            $before = $locked?->only(['code', 'name', 'monthly_price', 'duration_months', 'max_stores', 'max_products', 'max_members', 'is_default', 'is_trial', 'is_active']);
            if ($locked === null) {
                $locked = Plan::create([
                    ...$data,
                    'code' => $this->uniqueCode($data['name']),
                    'is_default' => false,
                    'is_trial' => false,
                ]);
            } else {
                $locked->update($data);
            }
            $this->audit->handle($admin, $plan === null ? 'plan.created' : 'plan.updated', $locked, $ipAddress, ['before' => $before, 'after' => $locked->only(['code', 'name', 'monthly_price', 'duration_months', 'max_stores', 'max_products', 'max_members', 'is_default', 'is_trial', 'is_active'])]);

            return $locked;
        });
    }

    private function uniqueCode(string $name): string
    {
        $base = Str::slug($name) ?: 'paket';
        $base = Str::limit($base, 42, '');
        $code = $base;
        $suffix = 2;

        while (Plan::query()->where('code', $code)->exists()) {
            $code = Str::limit($base, 42, '').'-'.$suffix;
            $suffix++;
        }

        return $code;
    }
}
