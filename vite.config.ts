import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { readFileSync } from 'node:fs';
import { defineConfig, loadEnv } from 'vite';
import translateUiLiterals from './build/translate-ui.cjs';

export default defineConfig(({ command, mode }) => {
    const env = loadEnv(mode, process.cwd(), '');
    const lan = command === 'serve' && env.DEV_LAN === 'true';
    const devPort = Number(env.VITE_DEV_PORT || 5175);
    const appUrl = lan ? new URL(env.APP_URL) : undefined;

    if (appUrl && appUrl.protocol !== 'https:') {
        throw new Error(
            'DEV_LAN requires an HTTPS APP_URL matching the LAN certificate.',
        );
    }

    return {
        optimizeDeps: {
            // Inertia discovers every page eagerly; avoid blocking HMR while Vite
            // scans the entire application during local development.
            noDiscovery: command === 'serve',
            include:
                command === 'serve'
                    ? [
                          'react',
                          'react/jsx-runtime',
                          'react-dom',
                          'react-dom/client',
                          '@inertiajs/react',
                          '@laravel/passkeys/react',
                          '@radix-ui/react-checkbox',
                          '@radix-ui/react-label',
                          '@radix-ui/react-select',
                          'framer-motion',
                          'lucide-react',
                          'sonner',
                          'zxing-wasm/reader',
                      ]
                    : undefined,
        },
        server: {
            port: devPort,
            strictPort: lan,
            ...(appUrl
                ? {
                      host: appUrl.hostname,
                      origin: `https://${appUrl.hostname}:${devPort}`,
                      https: {
                          key: readFileSync('.certs/lan-key.pem'),
                          cert: readFileSync('.certs/lan.pem'),
                      },
                      ws: {
                          host: appUrl.hostname,
                          protocol: 'wss',
                          clientPort: devPort,
                      },
                      cors: {
                          origin: [
                              appUrl.origin,
                              /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/,
                          ],
                      },
                  }
                : {}),
        },
        plugins: [
            laravel({
                input: ['resources/css/app.css', 'resources/js/app.tsx'],
                refresh: true,
                detectTls: lan ? false : env.DEV_TLS_HOST || undefined,
                fonts: [
                    bunny('Instrument Sans', {
                        weights: [400, 500, 600],
                    }),
                ],
            }),
            inertia({ ssr: command === 'serve' ? false : undefined }),
            react({
                babel: {
                    // Runtime translations depend on locale-aware metadata
                    // getters. React Compiler can memoize those getter results
                    // across an Inertia locale switch and retain stale copy.
                    plugins: [translateUiLiterals],
                },
            }),
            tailwindcss(),
            wayfinder({
                formVariants: true,
                command:
                    process.env.WAYFINDER_COMMAND ??
                    'php artisan wayfinder:generate',
            }),
        ],
    };
});
