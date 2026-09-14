<?php

namespace App\Services\Operations;

use App\Enums\UserStatus;
use App\Models\User;
use Illuminate\Database\Migrations\Migrator;
use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Throwable;

class ProductionReadiness
{
    /** @return array<int, array{key:string,label:string,passed:bool,critical:bool,message:string}> */
    public function evaluate(bool $includeRuntime = true): array
    {
        $checks = [
            $this->check('environment', 'Production environment', app()->environment('production'), true, 'APP_ENV must be production.'),
            $this->check('debug', 'Debugging disabled', ! config('app.debug'), true, 'APP_DEBUG must be false.'),
            $this->check('app_key', 'Valid application key', $this->validApplicationKey(), true, 'APP_KEY must be a unique generated key compatible with APP_CIPHER.'),
            $this->check('https_url', 'HTTPS application URL', str_starts_with((string) config('app.url'), 'https://'), true, 'APP_URL must use HTTPS.'),
            $this->check('force_https', 'HTTPS enforced', (bool) config('security.force_https'), true, 'APP_FORCE_HTTPS must be true.'),
            $this->check('session_secure', 'Secure session cookie', (bool) config('session.secure'), true, 'SESSION_SECURE_COOKIE must be true.'),
            $this->check('session_encrypted', 'Encrypted session payload', (bool) config('session.encrypt'), true, 'SESSION_ENCRYPT must be true.'),
            $this->check('session_http_only', 'HTTP-only session cookie', (bool) config('session.http_only'), true, 'SESSION_HTTP_ONLY must be true.'),
            $this->check('session_same_site', 'Secure SameSite policy', in_array(config('session.same_site'), ['lax', 'strict'], true), true, 'SESSION_SAME_SITE must be lax or strict.'),
            $this->check('session_backend', 'Persistent session backend', in_array(config('session.driver'), ['database', 'file', 'redis', 'memcached', 'dynamodb'], true), true, 'SESSION_DRIVER must use a supported persistent backend.'),
            $this->check('database', 'Production database', $this->configuredDriver('database.connections', config('database.default'), ['mysql']), true, 'DB_CONNECTION must use a configured MySQL connection.'),
            $this->check('cache', 'Persistent cache', $this->configuredDriver('cache.stores', config('cache.default'), ['database', 'file', 'storage', 'memcached', 'redis', 'dynamodb']), true, 'CACHE_STORE must use a configured persistent cache.'),
            $this->check('queue', 'Asynchronous queue', $this->configuredDriver('queue.connections', config('queue.default'), ['database', 'beanstalkd', 'sqs', 'redis']), true, 'QUEUE_CONNECTION must use a configured asynchronous queue.'),
            $this->check('mail', 'Production mailer', $this->configuredDriver('mail.mailers', config('mail.default'), ['smtp', 'ses', 'postmark', 'resend', 'sendmail', 'mailgun', 'failover', 'roundrobin']), true, 'MAIL_MAILER must use a configured production mailer.'),
            $this->check('log_level', 'Production log level', config('logging.production_level') !== 'debug', false, 'Use LOG_LEVEL info or higher.'),
            $this->check('csp', 'Content Security Policy enabled', (bool) config('security.content_security_policy'), false, 'Enable SECURITY_CSP_ENABLED only after the policy is compatible with Inertia.'),
            $this->check('hsts', 'HSTS enabled', (bool) config('security.hsts'), true, 'SECURITY_HSTS_ENABLED must be true.'),
            $this->check('admin_2fa_required', 'Platform Admin 2FA required', (bool) config('security.platform_admin_2fa_required'), true, 'PLATFORM_ADMIN_2FA_REQUIRED must be true.'),
            $this->check('write_limits', 'Valid write rate limits', (int) config('security.store_writes_per_minute') > 0 && (int) config('security.platform_writes_per_minute') > 0, true, 'Tenant and platform write rate limits must be greater than zero.'),
        ];

        if (! $includeRuntime) {
            return $checks;
        }

        return [...$checks, ...$this->runtimeChecks()];
    }

    /** @return array<int, array{key:string,label:string,passed:bool,critical:bool,message:string}> */
    private function runtimeChecks(): array
    {
        try {
            DB::select('select 1');
            $database = $this->check('database_connection', 'Database connection', true, true, 'The database cannot be reached.');
            $activeAdmins = User::query()->whereNotNull('platform_role')->where('status', UserStatus::Active)->count();
            $adminsWithoutTwoFactor = User::query()
                ->whereNotNull('platform_role')
                ->where('status', UserStatus::Active)
                ->where(fn ($query) => $query->whereNull('two_factor_secret')->orWhereNull('two_factor_confirmed_at'))
                ->count();
            $admins = $this->check(
                'platform_users',
                'Active Platform Admin accounts protected by 2FA',
                $activeAdmins > 0 && $adminsWithoutTwoFactor === 0,
                true,
                $activeAdmins === 0
                    ? 'Create at least one active Platform Admin.'
                    : __(':count active Platform Admin accounts have not confirmed 2FA.', ['count' => $adminsWithoutTwoFactor]),
            );
            $migrator = app(Migrator::class);
            $files = array_keys($migrator->getMigrationFiles([database_path('migrations')]));
            $pending = array_diff($files, $migrator->getRepository()->getRan());
            $migrations = $this->check(
                'migrations',
                'Migrations up to date',
                $pending === [],
                true,
                __(':count migrations have not been run.', ['count' => count($pending)]),
            );
            $catalogSchema = $this->check(
                'catalog_schema',
                'Consistent catalog schema',
                $this->catalogSchemaIsCanonical(),
                true,
                'The product, variant, unit, SKU, barcode, photo, or stock schema does not match the application contract.',
            );

            return [$database, $admins, $migrations, $catalogSchema];
        } catch (Throwable) {
            return [
                $this->check('database_connection', 'Database connection', false, true, 'The database or migration metadata could not be checked.'),
            ];
        }
    }

    /** @return array{key:string,label:string,passed:bool,critical:bool,message:string} */
    private function check(string $key, string $label, bool $passed, bool $critical, string $message): array
    {
        return [
            'key' => $key,
            'label' => __($label),
            'passed' => $passed,
            'critical' => $critical,
            'message' => __($message),
        ];
    }

    private function validApplicationKey(): bool
    {
        $configured = config('app.key');
        if (! is_string($configured) || $configured === '') {
            return false;
        }

        $key = str_starts_with($configured, 'base64:')
            ? base64_decode(substr($configured, 7), true)
            : $configured;

        return is_string($key) && Encrypter::supported($key, (string) config('app.cipher'));
    }

    /** @param list<string> $allowedDrivers */
    private function configuredDriver(string $root, mixed $selected, array $allowedDrivers): bool
    {
        if (! is_string($selected) || $selected === '') {
            return false;
        }

        $driver = config("{$root}.{$selected}.driver") ?? config("{$root}.{$selected}.transport");

        return is_string($driver) && in_array($driver, $allowedDrivers, true);
    }

    private function catalogSchemaIsCanonical(): bool
    {
        return Schema::hasColumns('products', [
            'store_id', 'category_id', 'base_unit_id', 'large_unit_id', 'variant_mode', 'name', 'photo_path',
        ])
            && ! Schema::hasColumn('products', 'sku')
            && ! Schema::hasColumn('products', 'barcode')
            && Schema::hasColumns('product_variants', [
                'public_id', 'store_id', 'product_id', 'name', 'photo_path', 'is_active',
            ])
            && Schema::hasColumns('product_units', [
                'store_id', 'product_id', 'product_variant_id', 'unit_id', 'sku', 'barcode',
                'conversion_factor', 'purchase_price', 'selling_price', 'is_active',
            ])
            && Schema::hasIndex('product_units', 'product_units_store_id_sku_unique')
            && Schema::hasIndex('product_units', 'product_units_store_id_barcode_unique')
            && Schema::hasColumns('inventory_balances', [
                'store_id', 'product_id', 'product_variant_id', 'stock_key', 'quantity', 'minimum_quantity',
            ]);
    }
}
