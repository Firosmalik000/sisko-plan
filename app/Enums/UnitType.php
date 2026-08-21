<?php

namespace App\Enums;

enum UnitType: string
{
    case Large = 'large';
    case Retail = 'retail';

    public function label(): string
    {
        return match ($this) {
            self::Large => 'Besar',
            self::Retail => 'Ecer',
        };
    }
}
