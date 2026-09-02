<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" data-app-name="{{ $page['props']['branding']['brand_name'] ?? config('app.name', 'Sisko Plan') }}">
    <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1">
        @php($publicSeo = request()->routeIs('home') || request()->routeIs('pricing*'))
        <meta name="description" content="{{ $page['props']['branding']['seo_description'] ?? '' }}">
        @if (! empty($page['props']['branding']['seo_keywords']))
            <meta name="keywords" content="{{ $page['props']['branding']['seo_keywords'] }}">
        @endif
        <meta name="robots" content="{{ $publicSeo && ($page['props']['branding']['robots_index'] ?? true) ? 'index, follow' : 'noindex, nofollow' }}">
        <meta property="og:site_name" content="{{ $page['props']['branding']['brand_name'] ?? config('app.name', 'Sisko Plan') }}">
        <meta property="og:title" content="{{ $page['props']['branding']['seo_title'] ?? config('app.name', 'Sisko Plan') }}">
        <meta property="og:description" content="{{ $page['props']['branding']['seo_description'] ?? '' }}">
        <meta property="og:type" content="website">
        @if ($publicSeo)
            <meta property="og:url" content="{{ url()->current() }}">
            <link rel="canonical" href="{{ url()->current() }}">
        @endif
        @if (! empty($page['props']['branding']['social_image_url']))
            <meta property="og:image" content="{{ $page['props']['branding']['social_image_url'] }}">
            <meta name="twitter:card" content="summary_large_image">
        @endif

        {{-- The application currently ships with one consistent light theme. --}}
        <script>
            (function() {
                document.documentElement.classList.remove('dark');
                document.documentElement.style.colorScheme = 'light';
            })();
        </script>

        <style>
            html {
                background-color: #fff8f5;
                color-scheme: light;
            }
        </style>

        <link rel="icon" href="/favicon.ico" sizes="any">
        <link rel="icon" href="/favicon.svg" type="image/svg+xml">
        <link rel="apple-touch-icon" href="/apple-touch-icon.png">

        @fonts

        @viteReactRefresh
        @vite(['resources/css/app.css', 'resources/js/app.tsx', "resources/js/pages/{$page['component']}.tsx"])
        <x-inertia::head>
            <title>{{ $page['props']['branding']['seo_title'] ?? config('app.name', 'Laravel') }} - {{ $page['props']['branding']['brand_name'] ?? config('app.name', 'Laravel') }}</title>
        </x-inertia::head>
    </head>
    <body class="font-sans antialiased">
        <!-- THESIS: Sisko Plan is a calm operational ledger for Indonesian retail teams, not a generic SaaS brochure. OWN-WORLD: Ivory paper, forest ink, ruled records, compact operational tables, and one orange action color. STORY: Daily transactions flow visibly through stock and cash into business reports. FIRST VIEWPORT: A decisive editorial promise sits beside a working Kasir-to-Laporan board built from believable example data. FORM: Canon direction selected from the attended concept round; AsistenToko is the sole category benchmark; approved reference .impeccable/mocks/decision/store-ledger-reference.png; seed b2d4ef92. FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance -->
        <x-inertia::app />
    </body>
</html>
