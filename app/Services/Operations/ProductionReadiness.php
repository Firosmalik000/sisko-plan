<?php

namespace App\Services\Operations;

use App\Models\PlatformAdmin;
use Illuminate\Database\Migrations\Migrator;
use Illuminate\Encryption\Encrypter;
use Illuminate\Support\Facades\DB;
use Throwable;

class ProductionReadiness
{
    /** @return array<int, array{key:string,label:string,passed:bool,critical:bool,message:string}> */
    public function evaluate(bool $includeRuntime = true): array
    {
        $checks = [
            $this->check('environment', 'Environment production', app()->environment('production'), true, 'APP_ENV harus production.'),
            $this->check('debug', 'Debug dinonaktifkan', ! config('app.debug'), true, 'APP_DEBUG harus false.'),
            $this->check('app_key', 'Application key valid', $this->validApplicationKey(), true, 'APP_KEY wajib berupa key unik hasil generate yang sesuai dengan APP_CIPHER.'),
            $this->check('https_url', 'URL aplikasi HTTPS', str_starts_with((string) config('app.url'), 'https://'), true, 'APP_URL harus menggunakan HTTPS.'),
            $this->check('force_https', 'HTTPS dipaksakan', (bool) config('security.force_https'), true, 'APP_FORCE_HTTPS harus true.'),
            $this->check('session_secure', 'Cookie sesi secure', (bool) config('session.secure'), true, 'SESSION_SECURE_COOKIE harus true.'),
            $this->check('session_encrypted', 'Payload sesi terenkripsi', (bool) config('session.encrypt'), true, 'SESSION_ENCRYPT harus true.'),
            $this->check('session_http_only', 'Cookie sesi HTTP-only', (bool) config('session.http_only'), true, 'SESSION_HTTP_ONLY harus true.'),
            $this->check('session_same_site', 'SameSite aman', in_array(config('session.same_site'), ['lax', 'strict'], true), true, 'SESSION_SAME_SITE harus lax atau strict.'),
            $this->check('session_backend', 'Backend sesi persisten', in_array(config('session.driver'), ['database', 'file', 'redis', 'memcached', 'dynamodb'], true), true, 'SESSION_DRIVER harus menggunakan backend persisten yang didukung.'),
            $this->check('database', 'Database production', $this->configuredDriver('database.connections', config('database.default'), ['mysql']), true, 'DB_CONNECTION harus menggunakan koneksi MySQL yang terkonfigurasi.'),
            $this->check('cache', 'Cache persisten', $this->configuredDriver('cache.stores', config('cache.default'), ['database', 'file', 'storage', 'memcached', 'redis', 'dynamodb']), true, 'CACHE_STORE harus menggunakan cache persisten yang terkonfigurasi.'),
            $this->check('queue', 'Queue asynchronous', $this->configuredDriver('queue.connections', config('queue.default'), ['database', 'beanstalkd', 'sqs', 'redis']), true, 'QUEUE_CONNECTION harus menggunakan queue asynchronous yang terkonfigurasi.'),
            $this->check('mail', 'Mailer production', $this->configuredDriver('mail.mailers', config('mail.default'), ['smtp', 'ses', 'postmark', 'resend', 'sendmail', 'mailgun', 'failover', 'roundrobin']), true, 'MAIL_MAILER harus menggunakan mailer production yang terkonfigurasi.'),
            $this->check('log_level', 'Level log production', config('logging.production_level') !== 'debug', false, 'Gunakan LOG_LEVEL info atau lebih tinggi.'),
            $this->check('csp', 'Content Security Policy aktif', (bool) config('security.content_security_policy'), true, 'SECURITY_CSP_ENABLED harus true.'),
            $this->check('hsts', 'HSTS aktif', (bool) config('security.hsts'), true, 'SECURITY_HSTS_ENABLED harus true.'),
            $this->check('admin_2fa_required', '2FA Platform Admin diwajibkan', (bool) config('security.platform_admin_2fa_required'), true, 'PLATFORM_ADMIN_2FA_REQUIRED harus true.'),
            $this->check('write_limits', 'Rate limit write valid', (int) config('security.store_writes_per_minute') > 0 && (int) config('security.platform_writes_per_minute') > 0, true, 'Rate limit write tenant dan platform harus lebih dari nol.'),
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
            $database = $this->check('database_connection', 'Koneksi database', true, true, 'Database tidak dapat dihubungi.');
            $activeAdmins = PlatformAdmin::query()->where('is_active', true)->count();
            $adminsWithoutTwoFactor = PlatformAdmin::query()
                ->where('is_active', true)
                ->where(fn ($query) => $query->whereNull('two_factor_secret')->orWhereNull('two_factor_confirmed_at'))
                ->count();
            $admins = $this->check(
                'platform_admins',
                'Platform Admin aktif terlindungi 2FA',
                $activeAdmins > 0 && $adminsWithoutTwoFactor === 0,
                true,
                $activeAdmins === 0 ? 'Buat minimal satu Platform Admin aktif.' : "{$adminsWithoutTwoFactor} Platform Admin aktif belum mengonfirmasi 2FA.",
            );
            $migrator = app(Migrator::class);
            $files = array_keys($migrator->getMigrationFiles([database_path('migrations')]));
            $pending = array_diff($files, $migrator->getRepository()->getRan());
            $migrations = $this->check('migrations', 'Migration terkini', $pending === [], true, count($pending).' migration belum dijalankan.');

            return [$database, $admins, $migrations];
        } catch (Throwable) {
            return [
                $this->check('database_connection', 'Koneksi database', false, true, 'Database atau metadata migration tidak dapat diperiksa.'),
            ];
        }
    }

    /** @return array{key:string,label:string,passed:bool,critical:bool,message:string} */
    private function check(string $key, string $label, bool $passed, bool $critical, string $message): array
    {
        return compact('key', 'label', 'passed', 'critical', 'message');
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
}
