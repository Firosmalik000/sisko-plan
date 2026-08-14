<?php

namespace App\Support;

use InvalidArgumentException;

final class Decimal
{
    public const MONEY_SCALE = 4;

    public const QUANTITY_SCALE = 6;

    public static function add(string $left, string $right, int $scale): string
    {
        return bcadd(self::numeric($left), self::numeric($right), $scale);
    }

    public static function subtract(string $left, string $right, int $scale): string
    {
        return bcsub(self::numeric($left), self::numeric($right), $scale);
    }

    public static function multiply(string $left, string $right, int $scale = self::MONEY_SCALE): string
    {
        return bcmul(self::numeric($left), self::numeric($right), $scale);
    }

    public static function divide(string $left, string $right, int $scale): string
    {
        if (bccomp(self::numeric($right), '0', max($scale, self::QUANTITY_SCALE)) === 0) {
            throw new InvalidArgumentException('Pembagian dengan nol tidak diizinkan.');
        }

        return bcdiv(self::numeric($left), self::numeric($right), $scale);
    }

    public static function compare(string $left, string $right, int $scale): int
    {
        return bccomp(self::numeric($left), self::numeric($right), $scale);
    }

    public static function absolute(string $value, int $scale): string
    {
        return self::compare($value, '0', $scale) < 0 ? bcsub('0', self::numeric($value), $scale) : $value;
    }

    /** @return numeric-string */
    private static function numeric(string $value): string
    {
        if (! is_numeric($value)) {
            throw new InvalidArgumentException('Nilai desimal tidak valid.');
        }

        return $value;
    }
}
