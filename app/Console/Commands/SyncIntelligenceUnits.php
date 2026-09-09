<?php

namespace App\Console\Commands;

use App\Actions\Stores\SeedStoreStarterData;
use App\Models\Store;
use App\Models\UnitReference;
use App\Services\Intelligence\CatalogIntelligenceClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Throwable;

class SyncIntelligenceUnits extends Command
{
    protected $signature = 'intelligence:sync-units';

    protected $description = 'Atomically synchronize the intelligence unit reference catalog';

    public function handle(CatalogIntelligenceClient $client): int
    {
        $lock = Cache::lock('intelligence:sync-units', max(300, (int) config('services.catalog_intelligence.timeout') + 60));
        if (! $lock->get()) {
            $this->error('A unit reference sync is already running.');

            return self::FAILURE;
        }
        try {
            $payload = $client->unitReferences();
            Validator::make($payload, [
                'catalog_version' => ['required', 'string', 'max:80'],
                'data' => ['required', 'array', 'list', 'min:1', 'max:1000'],
                'data.*.code' => ['required', 'string', 'max:80', 'regex:/^[a-z][a-z0-9_]*$/', 'distinct:strict'],
                'data.*.name' => ['required', 'string', 'max:120'],
                'data.*.symbol' => ['required', 'string', 'max:20'],
                'data.*.roles' => ['required', 'array', 'list', 'min:1', 'max:3'],
                'data.*.roles.*' => ['required', Rule::in(['sale', 'large', 'measurement'])],
                'data.*.dimension' => ['required', Rule::in(['count', 'package', 'serving', 'mass', 'volume', 'length', 'area'])],
                'data.*.allows_fraction' => ['required', 'boolean:strict'],
                'data.*.is_active' => ['required', 'boolean:strict'],
            ])->validate();
            foreach ($payload['data'] as $reference) {
                if (count($reference['roles']) !== count(array_unique($reference['roles']))) {
                    throw new \UnexpectedValueException('Reference roles must be unique.');
                }
            }
            if (UnitReference::query()->exists() && ! UnitReference::query()->where('catalog_version', '!=', $payload['catalog_version'])->exists()) {
                $this->info('Unit reference catalog is unchanged.');

            } else {
                DB::transaction(function () use ($payload): void {
                    UnitReference::query()->update(['is_active' => false, 'catalog_version' => $payload['catalog_version']]);
                    foreach ($payload['data'] as $reference) {
                        UnitReference::query()->updateOrCreate(['code' => $reference['code']], [
                            ...array_intersect_key($reference, array_flip(['name', 'symbol', 'roles', 'dimension', 'allows_fraction', 'is_active'])),
                            'catalog_version' => $payload['catalog_version'],
                        ]);
                    }
                });
                $this->info('Unit reference catalog synchronized.');
            }
            $starter = app(SeedStoreStarterData::class);
            $catalog = $starter->referenceDefaults();
            $failed = false;
            foreach (Store::query()->lazyById(100) as $store) {
                try {
                    foreach ($starter->syncReferences($store, ['units' => $catalog['units']]) as $conflict) {
                        $this->warn("{$store->public_id}: {$conflict} conflicts with existing store data; skipped.");
                    }
                } catch (Throwable $exception) {
                    $failed = true;
                    $this->error("{$store->public_id}: defaults failed; rerun sync to retry.");
                    report($exception);
                }
            }
            if ($failed) {
                return self::FAILURE;
            }

            $this->info('Store defaults synchronized; existing store settings were preserved.');

            return self::SUCCESS;
        } catch (Throwable $exception) {
            $this->error('Unit reference sync failed; no incomplete catalog was imported. Rerun to retry.');
            report($exception);

            return self::FAILURE;
        } finally {
            $lock->release();
        }
    }
}
