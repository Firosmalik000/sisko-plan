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
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
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
                    transition: opacity 220ms cubic-bezier(0.4, 0, 0.2, 1);
                }

                #app-boot[data-state='ready'] {
                    pointer-events: none;
                    opacity: 0;
                }

                .app-boot__content {
                    display: flex;
                    align-items: center;
                    flex-direction: column;
                    gap: 16px;
                    padding: 24px;
                    text-align: center;
                }

                .app-boot__logo-wrapper {
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 96px;
                    height: 96px;
                    border-radius: 1.5rem;
                    background: #ffffff;
                    box-shadow: 0 12px 32px -8px rgba(238, 77, 45, 0.18), 0 2px 8px rgba(0, 0, 0, 0.04);
                    animation: app-boot-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }

                @keyframes app-boot-pulse {
                    0%, 100% { transform: scale(1); }
                    50% { transform: scale(1.04); }
                }

                .app-boot__logo {
                    width: 72px;
                    height: 72px;
                    border-radius: 1rem;
                    object-fit: contain;
                }

                .app-boot__title {
                    font-family: ui-sans-serif, system-ui, sans-serif;
                    font-size: 20px;
                    font-weight: 800;
                    letter-spacing: -0.02em;
                    color: #2d2928;
                }

                .app-boot__loader {
                    width: 28px;
                    height: 28px;
                    margin-top: 4px;
                }

                .app-boot__circular {
                    animation: app-boot-rotate 2s linear infinite;
                    height: 100%;
                    transform-origin: center center;
                    width: 100%;
                }

                .app-boot__path {
                    stroke-dasharray: 1, 200;
                    stroke-dashoffset: 0;
                    animation: app-boot-dash 1.5s ease-in-out infinite;
                    stroke-linecap: round;
                    stroke: #ee4d2d;
                }

                @keyframes app-boot-rotate {
                    100% { transform: rotate(360deg); }
                }

                @keyframes app-boot-dash {
                    0% {
                        stroke-dasharray: 1, 200;
                        stroke-dashoffset: 0;
                    }
                    50% {
                        stroke-dasharray: 89, 200;
                        stroke-dashoffset: -35px;
                    }
                    100% {
                        stroke-dasharray: 89, 200;
                        stroke-dashoffset: -124px;
                    }
                }

                .app-boot__status,
                .app-boot__error {
                    margin: 0;
                    font-family: ui-sans-serif, system-ui, sans-serif;
                }

                .app-boot__status {
                    color: #8c827e;
                    font-size: 13px;
                    font-weight: 500;
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
                    border-radius: 0.75rem;
                    background: #ee4d2d;
                    padding: 0 20px;
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
                .app-boot__status,
                .app-boot__logo-wrapper,
                .app-boot__circular,
                .app-boot__path {
                    animation: none !important;
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
                <div class="app-boot__logo-wrapper">
                    <img class="app-boot__logo" src="{{ $brandLogoUrl ?: '/icons/icon-192.png' }}" alt="" width="72" height="72">
                </div>
                <div class="app-boot__title">{{ $brandName }}</div>
                <div class="app-boot__loader" aria-hidden="true">
                    <svg class="app-boot__circular" viewBox="25 25 50 50">
                        <circle class="app-boot__path" cx="50" cy="50" r="20" fill="none" stroke-width="4" stroke-miterlimit="10"/>
                    </svg>
                </div>
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
