<?php

namespace App\Support;

use InvalidArgumentException;

final class DecimalPercentage
{
    public static function of(string $amount, string $rate): string
    {
        $amountUnits = self::scaledInteger($amount, 4);
        $rateUnits = (int) self::scaledInteger($rate, 2);
        if ($rateUnits < 0 || $rateUnits > 10000) {
            throw new InvalidArgumentException('Percentage must be between 0 and 100.');
        }

        $product = self::multiply($amountUnits, $rateUnits);
        $quotient = substr($product, 0, -4) ?: '0';
        $remainder = str_pad(substr($product, -4), 4, '0', STR_PAD_LEFT);
        if ((int) $remainder >= 5000) {
            $quotient = self::increment($quotient);
        }

        return self::decimal($quotient, 4);
    }

    private static function scaledInteger(string $value, int $scale): string
    {
        if (! preg_match('/^\d+(?:\.(\d+))?$/', $value, $matches)) {
            throw new InvalidArgumentException('Invalid non-negative decimal.');
        }
        $fraction = str_pad(substr($matches[1] ?? '', 0, $scale), $scale, '0');

        return ltrim(strtok($value, '.').$fraction, '0') ?: '0';
    }

    private static function multiply(string $value, int $multiplier): string
    {
        $carry = 0;
        $result = '';
        for ($index = strlen($value) - 1; $index >= 0; $index--) {
            $current = ((int) $value[$index] * $multiplier) + $carry;
            $result = ($current % 10).$result;
            $carry = intdiv($current, 10);
        }

        return ltrim(($carry > 0 ? (string) $carry : '').$result, '0') ?: '0';
    }

    private static function increment(string $value): string
    {
        $carry = 1;
        $result = '';
        for ($index = strlen($value) - 1; $index >= 0; $index--) {
            $current = (int) $value[$index] + $carry;
            $result = ($current % 10).$result;
            $carry = intdiv($current, 10);
        }

        return ($carry ? '1' : '').$result;
    }

    private static function decimal(string $units, int $scale): string
    {
        $units = str_pad($units, $scale + 1, '0', STR_PAD_LEFT);

        return substr($units, 0, -$scale).'.'.substr($units, -$scale);
    }
}
