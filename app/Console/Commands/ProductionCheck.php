<?php

namespace App\Console\Commands;

use App\Services\Operations\ProductionReadiness;
use Illuminate\Console\Command;

class ProductionCheck extends Command
{
    protected $signature = 'app:production-check';

    protected $description = 'Fail closed when critical production readiness requirements are not satisfied';

    public function handle(ProductionReadiness $readiness): int
    {
        $checks = $readiness->evaluate();
        $this->table(
            ['Status', 'Check', 'Detail'],
            collect($checks)->map(fn (array $check): array => [
                $check['passed'] ? 'PASS' : ($check['critical'] ? 'FAIL' : 'WARN'),
                $check['label'],
                $check['passed'] ? 'OK' : $check['message'],
            ])->all(),
        );

        if (collect($checks)->contains(fn (array $check): bool => $check['critical'] && ! $check['passed'])) {
            $this->error('Production preflight gagal. Perbaiki seluruh check kritis sebelum deploy.');

            return self::FAILURE;
        }

        $this->info('Production preflight lulus.');

        return self::SUCCESS;
    }
}
