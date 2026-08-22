<?php

namespace App\Enums;

enum ProductScannerPurpose: string
{
    case Sale = 'sale';
    case Purchase = 'purchase';
    case StockCount = 'stock_count';
    case Product = 'product';

    public function ability(): string
    {
        return match ($this) {
            self::Sale => 'manageSales',
            self::Purchase => 'managePurchasing',
            self::StockCount => 'countStock',
            self::Product => 'manageMasterData',
        };
    }
}
