<?php

namespace App\Console\Commands;

use App\Actions\Stores\SeedStoreStarterData;
use App\Models\CategoryReference;
use App\Models\Store;
use App\Services\Intelligence\CatalogIntelligenceClient;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Throwable;

class SyncIntelligenceCategories extends Command
{
    protected $signature = 'intelligence:sync-categories';

    protected $description = 'Atomically synchronize the intelligence category reference catalog';

    public function handle(CatalogIntelligenceClient $client): int
    {
        $lock = Cache::lock('intelligence:sync-categories', max(300, (int) config('services.catalog_intelligence.timeout') + 60));
        if (! $lock->get()) {
            $this->error('A category reference sync is already running.');

            return self::FAILURE;
        }
        try {
            $payload = $client->categoryReferences();
            Validator::make($payload, [
                'catalog_version' => ['required', 'string', 'max:80'],
                'data' => ['required', 'array', 'list', 'min:1', 'max:1000'],
                'data.*.code' => ['required', 'string', 'max:80', 'regex:/^[a-z][a-z0-9_]*$/', 'distinct:strict'],
                'data.*.name' => ['required', 'string', 'max:120'],
                'data.*.is_active' => ['required', 'boolean:strict'],
            ])->validate();
            if (CategoryReference::query()->exists() && ! CategoryReference::query()->where('catalog_version', '!=', $payload['catalog_version'])->exists()) {
                $this->info('Category reference catalog is unchanged.');

            } else {
                DB::transaction(function () use ($payload): void {
                    CategoryReference::query()->update(['is_active' => false, 'catalog_version' => $payload['catalog_version']]);
                    foreach ($payload['data'] as $reference) {
                        CategoryReference::query()->updateOrCreate(['code' => $reference['code']], [
                            ...array_intersect_key($reference, array_flip(['name', 'is_active'])),
                            'catalog_version' => $payload['catalog_version'],
                        ]);
                    }
                });
                $this->info('Category reference catalog synchronized.');
            }
            $starter = app(SeedStoreStarterData::class);
            $catalog = $starter->referenceDefaults();
            $failed = false;
            foreach (Store::query()->lazyById(100) as $store) {
                try {
                    foreach ($starter->syncReferences($store, ['categories' => $catalog['categories']]) as $conflict) {
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
            $this->error('Category reference sync failed; no incomplete catalog was imported. Rerun to retry.');
            report($exception);

            return self::FAILURE;
        } finally {
            $lock->release();
        }
    }
}
