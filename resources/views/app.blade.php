<!DOCTYPE html>
@php($market = strtoupper($page['props']['market'] ?? 'ID'))
@php($marketCurrency = [
    'BN' => ['code' => 'BND', 'symbol' => 'B$', 'decimals' => 2, 'position' => 'before'],
    'KH' => ['code' => 'KHR', 'symbol' => '៛', 'decimals' => 0, 'position' => 'after'],
    'ID' => ['code' => 'IDR', 'symbol' => 'Rp', 'decimals' => 0, 'position' => 'before'],
    'LA' => ['code' => 'LAK', 'symbol' => '₭', 'decimals' => 0, 'position' => 'after'],
    'MY' => ['code' => 'MYR', 'symbol' => 'RM', 'decimals' => 2, 'position' => 'before'],
    'MM' => ['code' => 'MMK', 'symbol' => 'K', 'decimals' => 0, 'position' => 'after'],
    'PH' => ['code' => 'PHP', 'symbol' => '₱', 'decimals' => 2, 'position' => 'before'],
    'SG' => ['code' => 'SGD', 'symbol' => 'S$', 'decimals' => 2, 'position' => 'before'],
    'TH' => ['code' => 'THB', 'symbol' => '฿', 'decimals' => 2, 'position' => 'before'],
    'TL' => ['code' => 'USD', 'symbol' => '$', 'decimals' => 2, 'position' => 'before'],
    'VN' => ['code' => 'VND', 'symbol' => '₫', 'decimals' => 0, 'position' => 'after'],
][$market] ?? ['code' => 'IDR', 'symbol' => 'Rp', 'decimals' => 0, 'position' => 'before'])
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="light" style="color-scheme: light" data-market="{{ $market }}" data-currency="{{ $page['props']['activeStore']['currency_code'] ?? $marketCurrency['code'] }}" data-currency-symbol="{{ $page['props']['activeStore']['currency_symbol'] ?? $marketCurrency['symbol'] }}" data-currency-decimals="{{ $page['props']['activeStore']['currency_decimal_places'] ?? $marketCurrency['decimals'] }}" data-currency-position="{{ $page['props']['activeStore']['currency_symbol_position'] ?? $marketCurrency['position'] }}" data-app-name="{{ $page['props']['branding']['brand_name'] ?? config('app.name', 'Sisko Plan') }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        @php($publicSeo = request()->routeIs('home') || request()->routeIs('pricing*'))
        @php($brandName = $page['props']['branding']['brand_name'] ?? config('app.name', 'Sisko Plan'))
        @php($brandLogoUrl = $page['props']['branding']['logo_url'] ?? null)
        @php($socialImageUrl = $page['props']['branding']['social_image_url'] ?? $brandLogoUrl)
        <meta name="application-name" content="{{ $brandName }}">
        <meta name="apple-mobile-web-app-title" content="{{ $brandName }}">
        <meta name="theme-color" content="#fff8f5">
        <link rel="manifest" href="/manifest.webmanifest">
        <meta name="description" content="{{ $page['props']['branding']['seo_description'] ?? '' }}">
        @if (! empty($page['props']['branding']['seo_keywords']))
            <meta name="keywords" content="{{ $page['props']['branding']['seo_keywords'] }}">
        @endif
        <meta name="robots" content="{{ $publicSeo && ($page['props']['branding']['robots_index'] ?? true) ? 'index, follow' : 'noindex, nofollow' }}">
        <meta property="og:site_name" content="{{ $brandName }}">
        <meta property="og:title" content="{{ $page['props']['branding']['seo_title'] ?? config('app.name', 'Sisko Plan') }}">
        <meta property="og:description" content="{{ $page['props']['branding']['seo_description'] ?? '' }}">
        <meta property="og:type" content="website">
        @if ($publicSeo)
            <meta property="og:url" content="{{ url()->current() }}">
            <link rel="canonical" href="{{ url()->current() }}">
        @endif
        @if (! empty($socialImageUrl))
            <meta property="og:image" content="{{ $socialImageUrl }}">
            <meta name="twitter:image" content="{{ $socialImageUrl }}">
            <meta name="twitter:card" content="{{ ! empty($page['props']['branding']['social_image_url']) ? 'summary_large_image' : 'summary' }}">
        @endif

        <style>
            html {
                background-color: #fff8f5;
                color-scheme: light;
            }

            #app-boot {
                display: none;
            }

            @media (display-mode: standalone) {
                #app-boot {
                    position: fixed;
                    inset: 0;
                    z-index: 2147483647;
                    display: grid;
                    place-items: center;
                    background: #fff8f5;
                    color: #2d2928;
                    opacity: 1;
                    transition: opacity 180ms ease-out;
                }

                #app-boot[data-state='ready'] {
                    pointer-events: none;
                    opacity: 0;
                }

                .app-boot__content {
                    display: flex;
                    align-items: center;
                    flex-direction: column;
                    gap: 18px;
                    padding: 24px;
                    text-align: center;
                }

                .app-boot__logo {
                    width: 88px;
                    height: 88px;
                    border-radius: 0.5rem;
                }

                .app-boot__status,
                .app-boot__error {
                    margin: 0;
                    font-family: ui-sans-serif, system-ui, sans-serif;
                }

                .app-boot__status {
                    color: #6f6764;
                    font-size: 14px;
                    opacity: 0;
                    transition: opacity 160ms ease-out;
                }

                #app-boot[data-state='slow'] .app-boot__status {
                    opacity: 1;
                }

                .app-boot__error {
                    display: none;
                    align-items: center;
                    flex-direction: column;
                    gap: 12px;
                    color: #2d2928;
                    font-size: 14px;
                    font-weight: 600;
                }

                #app-boot[data-state='failed'] .app-boot__status {
                    display: none;
                }

                #app-boot[data-state='failed'] .app-boot__error {
                    display: flex;
                }

                .app-boot__retry {
                    min-height: 44px;
                    border: 0;
                    border-radius: 0.45rem;
                    background: #ee4d2d;
                    padding: 0 18px;
                    color: #fff;
                    font: inherit;
                    font-weight: 700;
                }

                .app-boot__retry:focus-visible {
                    outline: 3px solid rgb(238 77 45 / 35%);
                    outline-offset: 3px;
                }
            }

            @media (display-mode: standalone) and (prefers-reduced-motion: reduce) {
                #app-boot,
                .app-boot__status {
                    transition: none;
                }
            }
        </style>

        @if ($brandLogoUrl)
            <link rel="icon" href="{{ $brandLogoUrl }}">
            <link rel="shortcut icon" href="{{ $brandLogoUrl }}">
            <link rel="apple-touch-icon" href="{{ $brandLogoUrl }}">
        @else
            <link rel="icon" href="/icons/icon-192.png" type="image/png">
            <link rel="apple-touch-icon" href="/icons/icon-192.png">
        @endif

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ $page['props']['branding']['seo_title'] ?? $brandName }} - {{ $brandName }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <!-- THESIS: Sisko Plan is a calm operational ledger for Indonesian retail teams, not a generic SaaS brochure. OWN-WORLD: Ivory paper, forest ink, ruled records, compact operational tables, and one orange action color. STORY: Daily transactions flow visibly through stock and cash into business reports. FIRST VIEWPORT: A decisive editorial promise sits beside a working Kasir-to-Laporan board built from believable example data. FORM: Canon direction selected from the attended concept round; AsistenToko is the sole category benchmark; approved reference .impeccable/mocks/decision/store-ledger-reference.png; seed b2d4ef92. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->
        <div id="app-boot" data-state="loading" aria-live="polite">
            <div class="app-boot__content">
                <img class="app-boot__logo" src="/icons/icon-192.png" alt="" width="88" height="88">
                <p class="app-boot__status">{{ __('Setting up the application…') }}</p>
                <div class="app-boot__error" role="alert">
                    <span>{{ __('Connection problem') }}</span>
                    <button id="app-boot-retry" class="app-boot__retry" type="button">{{ __('Try again') }}</button>
                </div>
            </div>
        </div>
        <x-inertia::app />
    </body>
</html>
