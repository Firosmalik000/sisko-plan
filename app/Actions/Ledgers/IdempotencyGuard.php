<?php

namespace App\Actions\Ledgers;

use Closure;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Validation\ValidationException;
use JsonException;

class IdempotencyGuard
{
    /** @param array<string, mixed> $payload */
    public function hash(array $payload): string
    {
        return hash('sha256', json_encode($this->canonicalize($payload), JSON_THROW_ON_ERROR));
    }

    /**
     * @template TModel of Model
     *
     * @param  Closure(): (TModel|null)  $find
     * @return TModel|null
     */
    public function existing(Closure $find, string $requestHash): ?Model
    {
        $existing = $find();
        if ($existing !== null) {
            $this->ensureSamePayload($existing, $requestHash);
        }

        return $existing;
    }

    /**
     * @template TModel of Model
     *
     * @param  Closure(): (TModel|null)  $find
     * @return TModel
     */
    public function recover(Closure $find, string $requestHash, UniqueConstraintViolationException $exception): Model
    {
        $existing = $find();
        if ($existing === null) {
            throw $exception;
        }
        $this->ensureSamePayload($existing, $requestHash);

        return $existing;
    }

    private function ensureSamePayload(Model $existing, string $requestHash): void
    {
        if (! hash_equals((string) $existing->getAttribute('request_hash'), $requestHash)) {
            throw ValidationException::withMessages([
                'idempotency_key' => 'Kunci idempotency sudah digunakan untuk payload yang berbeda.',
            ]);
        }
    }

    /** @throws JsonException */
    private function canonicalize(mixed $value): mixed
    {
        if (! is_array($value)) {
            return $value;
        }
        if (! array_is_list($value)) {
            ksort($value);
        }

        return array_map(fn (mixed $item): mixed => $this->canonicalize($item), $value);
    }
}
