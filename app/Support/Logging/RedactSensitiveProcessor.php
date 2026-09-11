<?php

namespace App\Support\Logging;

use Monolog\LogRecord;
use Monolog\Processor\ProcessorInterface;

/**
 * Monolog processor yang meredaksi field sensitif dari setiap entri log
 * (Req 23.5, Property 32, design §16).
 *
 * Berlaku pada `context` dan `extra` sehingga token/password/byte foto/payload
 * pembayaran penuh tidak pernah tertulis ke channel manapun. Didaftarkan lewat
 * tap `RedactSensitiveLogs` pada semua channel di `config/logging.php`.
 */
class RedactSensitiveProcessor implements ProcessorInterface
{
    public function __invoke(LogRecord $record): LogRecord
    {
        return $record->with(
            context: LogRedactor::redact($record->context),
            extra: LogRedactor::redact($record->extra),
        );
    }
}
