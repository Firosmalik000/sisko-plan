<?php

namespace App\Actions\Sales;

use App\Models\Customer;
use App\Models\Store;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class UpsertSaleCustomer
{
    public function handle(Store $store, ?string $name, ?string $phone): ?Customer
    {
        if ($name === null && $phone === null) {
            return null;
        }

        if ($name === null || $phone === null) {
            throw ValidationException::withMessages([
                'customer_name' => __('Nama pelanggan dan nomor telepon harus diisi bersama.'),
            ]);
        }

        $name = trim($name);
        $phone = trim($phone);
        $store->loadMissing('country');
        $normalizedPhone = self::normalizePhone($phone, $store->country?->code);
        $now = now();

        Customer::query()->upsert([[
            'public_id' => (string) Str::ulid(),
            'store_id' => $store->id,
            'name' => $name,
            'phone' => $phone,
            'phone_normalized' => $normalizedPhone,
            'created_at' => $now,
            'updated_at' => $now,
        ]], ['store_id', 'phone_normalized'], ['name', 'phone', 'updated_at']);

        return Customer::query()
            ->where('store_id', $store->id)
            ->where('phone_normalized', $normalizedPhone)
            ->firstOrFail();
    }

    public static function normalizePhone(string $phone, ?string $countryCode = null): string
    {
        $trimmed = trim($phone);
        $digits = preg_replace('/\D/u', '', $trimmed) ?? '';

        if (str_starts_with($trimmed, '+')) {
            return '+'.$digits;
        }

        if (str_starts_with($digits, '00')) {
            return '+'.substr($digits, 2);
        }

        $dialingCode = match ($countryCode) {
            'ID' => '62',
            'MY' => '60',
            'TH' => '66',
            'VN' => '84',
            default => null,
        };

        if ($dialingCode === null) {
            return $digits;
        }

        if (str_starts_with($digits, $dialingCode)) {
            return '+'.$digits;
        }

        return '+'.$dialingCode.ltrim($digits, '0');
    }
}
