<?php

namespace Tests\Feature\Api\V1;

use App\Support\Logging\LogRedactor;
use App\Support\Logging\RedactSensitiveProcessor;
use Monolog\Level;
use Monolog\LogRecord;
use Tests\TestCase;

/**
 * Feature: xsisten, Property 32: Redaksi log.
 *
 * For any entri log terstruktur yang memuat field sensitif (token/password/
 * byte foto/payload pembayaran penuh), keluaran ter-serialisasi menyamarkan/
 * menghilangkannya. Dijalankan >=100 iterasi dengan kombinasi acak field
 * sensitif + benign, termasuk nested & byte biner.
 */
class LogRedactionPropertyTest extends TestCase
{
    private const ITERATIONS = 120;

    /** @var list<string> */
    private const SENSITIVE_KEYS = [
        'token', 'access_token', 'refresh_token', 'id_token', 'identity_token',
        'password', 'authorization', 'bearer', 'secret', 'api_key',
        'photo', 'image', 'payment_proof', 'payment_payload', 'card_number', 'cvv',
    ];

    /** @var list<string> */
    private const BENIGN_KEYS = ['request_id', 'store_public_id', 'device_id', 'status', 'count', 'total_amount'];

    protected function setUp(): void
    {
        parent::setUp();
        mt_srand(20260913);
    }

    /**
     * Feature: xsisten, Property 32: field sensitif selalu tersamar.
     */
    public function test_property_32_sensitive_fields_always_masked(): void
    {
        for ($i = 0; $i < self::ITERATIONS; $i++) {
            $secret = bin2hex(random_bytes(mt_rand(4, 24)));
            $sensitiveKey = self::SENSITIVE_KEYS[array_rand(self::SENSITIVE_KEYS)];
            $benignKey = self::BENIGN_KEYS[array_rand(self::BENIGN_KEYS)];
            $benignValue = 'ok-'.mt_rand(1, 999999);

            $context = [
                $sensitiveKey => $secret,
                $benignKey => $benignValue,
                'nested' => [
                    // `payment` = payload pembayaran penuh → disamarkan sebagai satu blok.
                    'payment' => ['card_number' => '4111111111111111', 'note' => $secret],
                    'meta' => ['token' => $secret, 'label' => 'keep'],
                ],
            ];

            $redacted = LogRedactor::redact($context);
            $serialized = (string) json_encode($redacted);

            // Nilai rahasia tidak boleh muncul dalam output apa pun.
            $this->assertStringNotContainsString($secret, $serialized, "Rahasia bocor untuk key {$sensitiveKey}");
            $this->assertStringNotContainsString('4111111111111111', $serialized, 'Nomor kartu bocor');

            // Field sensitif tersamar; field benign dipertahankan.
            $this->assertSame(LogRedactor::MASK, $redacted[$sensitiveKey]);
            $this->assertSame($benignValue, $redacted[$benignKey]);
            // Payload pembayaran penuh (`payment`) disamarkan sebagai satu blok.
            $this->assertSame(LogRedactor::MASK, $redacted['nested']['payment']);
            // Token bersarang tersamar; label benign yang berdampingan tetap ada.
            $this->assertSame(LogRedactor::MASK, $redacted['nested']['meta']['token']);
            $this->assertSame('keep', $redacted['nested']['meta']['label']);
        }
    }

    /**
     * Feature: xsisten, Property 32: byte foto/biner tak pernah tertulis.
     */
    public function test_property_32_binary_photo_bytes_masked(): void
    {
        for ($i = 0; $i < self::ITERATIONS; $i++) {
            $photoBytes = random_bytes(mt_rand(16, 64)); // memuat byte kontrol
            $key = ['photo', 'image', 'payment_proof'][array_rand(['photo', 'image', 'payment_proof'])];

            $redacted = LogRedactor::redact([$key => $photoBytes, 'ok' => 'visible']);

            $this->assertContains($redacted[$key], [LogRedactor::MASK, LogRedactor::BINARY_MASK]);
            $this->assertSame('visible', $redacted['ok']);

            $serialized = (string) json_encode($redacted, JSON_INVALID_UTF8_SUBSTITUTE);
            $this->assertStringNotContainsString(bin2hex($photoBytes), bin2hex($serialized));
        }
    }

    /**
     * Feature: xsisten, Property 32: processor Monolog memakai redactor terpusat.
     */
    public function test_property_32_monolog_processor_redacts_context_and_extra(): void
    {
        $processor = new RedactSensitiveProcessor;
        $secret = 'tok_'.bin2hex(random_bytes(8));

        $record = new LogRecord(
            datetime: now()->toDateTimeImmutable(),
            channel: 'testing',
            level: Level::Info,
            message: 'sale posted',
            context: ['access_token' => $secret, 'store_public_id' => 'STORE1'],
            extra: ['payment_payload' => ['pan' => $secret]],
        );

        $processed = $processor($record);

        $this->assertSame(LogRedactor::MASK, $processed->context['access_token']);
        $this->assertSame('STORE1', $processed->context['store_public_id']);
        $this->assertSame(LogRedactor::MASK, $processed->extra['payment_payload']);
        $this->assertStringNotContainsString($secret, (string) json_encode($processed->context));
        $this->assertStringNotContainsString($secret, (string) json_encode($processed->extra));
    }
}
