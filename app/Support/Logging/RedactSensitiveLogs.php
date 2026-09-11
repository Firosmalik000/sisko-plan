<?php

namespace App\Support\Logging;

use Illuminate\Log\Logger;

/**
 * Tap channel Monolog untuk memasang {@see RedactSensitiveProcessor} pada
 * setiap handler (Req 23.5, design §16). Didaftarkan via `tap` di
 * `config/logging.php` sehingga berlaku terpusat lintas channel.
 */
class RedactSensitiveLogs
{
    public function __invoke(Logger $logger): void
    {
        foreach ($logger->getHandlers() as $handler) {
            if (method_exists($handler, 'pushProcessor')) {
                $handler->pushProcessor(new RedactSensitiveProcessor);
            }
        }
    }
}
