<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next): Response
    {
        return self::apply($request, $next($request));
    }

    public static function apply(Request $request, Response $response): Response
    {
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        $response->headers->set('X-Frame-Options', 'DENY');
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        $response->headers->set('Permissions-Policy', 'camera=(self), microphone=(), geolocation=(), payment=()');
        $response->headers->set('Cross-Origin-Opener-Policy', 'same-origin');
        $response->headers->set('X-Request-ID', (string) $request->attributes->get('request_id', 'unavailable'));

        if (config('security.content_security_policy')) {
            $telescopePath = trim((string) config('telescope.path', 'telescope'), '/');
            $isTelescope = $telescopePath !== '' && $request->is($telescopePath, "{$telescopePath}/*");
            $viteSources = self::viteDevelopmentSources($request);
            $scriptSources = ["'self'"];
            $styleSources = ["'self'", "'unsafe-inline'"];
            $fontSources = ["'self'", 'data:'];
            $connectSources = ["'self'"];

            if ($isTelescope) {
                $scriptSources[] = "'unsafe-inline'";
                $styleSources[] = 'https://fonts.bunny.net';
                $fontSources[] = 'https://fonts.bunny.net';
            }

            if ($viteSources !== null) {
                $scriptSources[] = "'unsafe-inline'";
                $scriptSources[] = $viteSources['http'];
                $styleSources[] = $viteSources['http'];
                $fontSources[] = $viteSources['http'];
                $connectSources[] = $viteSources['http'];
                $connectSources[] = $viteSources['websocket'];
            }

            $contentSecurityPolicy = implode('; ', [
                "default-src 'self'",
                "base-uri 'self'",
                "frame-ancestors 'none'",
                "object-src 'none'",
                "form-action 'self'",
                "img-src 'self' data: blob:",
                'font-src '.implode(' ', array_unique($fontSources)),
                'style-src '.implode(' ', array_unique($styleSources)),
                'script-src '.implode(' ', array_unique($scriptSources)),
                'connect-src '.implode(' ', array_unique($connectSources)),
            ]);

            $response->headers->set('Content-Security-Policy', $contentSecurityPolicy);
        }

        if (config('security.hsts') && $request->isSecure()) {
            $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
        }

        return $response;
    }

    /**
     * @return array{http: string, websocket: string}|null
     */
    private static function viteDevelopmentSources(Request $request): ?array
    {
        if (! app()->environment('local')) {
            return null;
        }

        $hotFile = public_path('hot');
        if (! is_file($hotFile)) {
            return null;
        }

        $hotUrl = trim((string) file_get_contents($hotFile));
        $parts = parse_url($hotUrl);
        $scheme = $parts['scheme'] ?? null;
        $host = $parts['host'] ?? null;
        $port = $parts['port'] ?? null;

        if (! in_array($scheme, ['http', 'https'], true) || ! is_string($host)) {
            return null;
        }

        $allowedHosts = array_filter([
            $request->getHost(),
            parse_url((string) config('app.url'), PHP_URL_HOST),
            'localhost',
            '127.0.0.1',
            '::1',
        ]);
        if (! in_array($host, $allowedHosts, true)) {
            return null;
        }

        $formattedHost = str_contains($host, ':') ? "[{$host}]" : $host;
        $origin = "{$scheme}://{$formattedHost}".($port === null ? '' : ":{$port}");
        $websocketScheme = $scheme === 'https' ? 'wss' : 'ws';

        return [
            'http' => $origin,
            'websocket' => "{$websocketScheme}://{$formattedHost}".($port === null ? '' : ":{$port}"),
        ];
    }
}
