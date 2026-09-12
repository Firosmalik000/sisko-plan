<?php

namespace App\Support;

final class DecimalAmount
{
    /** @param iterable<string> $amounts */
    public static function sum(iterable $amounts): string
    {
        $total = '0';
        foreach ($amounts as $amount) {
            $units = self::units($amount);
            $carry = 0;
            $result = '';
            $left = str_pad($total, max(strlen($total), strlen($units)), '0', STR_PAD_LEFT);
            $right = str_pad($units, strlen($left), '0', STR_PAD_LEFT);
            for ($index = strlen($left) - 1; $index >= 0; $index--) {
                $value = (int) $left[$index] + (int) $right[$index] + $carry;
                $result = ($value % 10).$result;
                $carry = intdiv($value, 10);
            }
            $total = ($carry ? '1' : '').$result;
        }
        $total = str_pad(ltrim($total, '0') ?: '0', 5, '0', STR_PAD_LEFT);

        return substr($total, 0, -4).'.'.substr($total, -4);
    }

    private static function units(string $amount): string
    {
        [$whole, $fraction] = array_pad(explode('.', $amount, 2), 2, '');

        return ltrim($whole.str_pad(substr($fraction, 0, 4), 4, '0'), '0') ?: '0';
    }
}
