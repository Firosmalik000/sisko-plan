<?php

return [
    'marketplaces' => [
        'ID' => [
            ['code' => 'shopee', 'label' => 'Shopee'],
            ['code' => 'tokopedia', 'label' => 'Tokopedia'],
            ['code' => 'blibli', 'label' => 'Blibli'],
            ['code' => 'lazada', 'label' => 'Lazada'],
            ['code' => 'other', 'label' => 'Marketplace lainnya'],
        ],
        'MY' => [
            ['code' => 'shopee', 'label' => 'Shopee'],
            ['code' => 'lazada', 'label' => 'Lazada'],
            ['code' => 'tiktok_shop', 'label' => 'TikTok Shop'],
            ['code' => 'other', 'label' => 'Marketplace lainnya'],
        ],
        'TH' => [
            ['code' => 'shopee', 'label' => 'Shopee'],
            ['code' => 'lazada', 'label' => 'Lazada'],
            ['code' => 'tiktok_shop', 'label' => 'TikTok Shop'],
            ['code' => 'other', 'label' => 'Marketplace lainnya'],
        ],
        'VN' => [
            ['code' => 'shopee', 'label' => 'Shopee'],
            ['code' => 'tiktok_shop', 'label' => 'TikTok Shop'],
            ['code' => 'lazada', 'label' => 'Lazada'],
            ['code' => 'other', 'label' => 'Marketplace lainnya'],
        ],
        'default' => [
            ['code' => 'shopee', 'label' => 'Shopee'],
            ['code' => 'lazada', 'label' => 'Lazada'],
            ['code' => 'other', 'label' => 'Marketplace lainnya'],
        ],
    ],
    'qr_payments' => [
        'ID' => ['code' => 'qris', 'method' => 'qris', 'label' => 'QRIS'],
        'MY' => ['code' => 'duitnow_qr', 'method' => 'qr_payment', 'label' => 'DuitNow QR'],
        'TH' => ['code' => 'promptpay_qr', 'method' => 'qr_payment', 'label' => 'PromptPay QR'],
        'VN' => ['code' => 'vietqr', 'method' => 'qr_payment', 'label' => 'VietQR'],
        'default' => ['code' => 'qr_payment', 'method' => 'qr_payment', 'label' => 'Pembayaran QR'],
    ],
    'country_wallets' => [
        'MY' => [
            ['code' => 'touch_n_go', 'label' => "Touch 'n Go eWallet"],
        ],
    ],
];
