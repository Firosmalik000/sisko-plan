import inertia from '@inertiajs/vite';
import { wayfinder } from '@laravel/vite-plugin-wayfinder';
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import laravel from 'laravel-vite-plugin';
import { bunny } from 'laravel-vite-plugin/fonts';
import { defineConfig } from 'vite';
import translateUiLiterals from './build/translate-ui.cjs';

const devPort = Number(process.env.VITE_DEV_PORT ?? 5175);

export default defineConfig(({ command }) => ({
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
        host: '0.0.0.0',
        port: devPort,
        strictPort: true,
        ws: {
            host: 'sisko-plan.test',
            protocol: 'wss',
            clientPort: devPort,
        },
    },
    plugins: [
        laravel({
            input: ['resources/css/app.css', 'resources/js/app.tsx'],
            refresh: true,
            detectTls: 'sisko-plan.test',
            fonts: [
                bunny('Instrument Sans', {
                    weights: [400, 500, 600],
                }),
            ],
        }),
        inertia({ ssr: command === 'serve' ? false : undefined }),
        react({
            babel: {
                plugins: [
                    translateUiLiterals,
                    ...(command === 'build'
                        ? ['babel-plugin-react-compiler']
                        : []),
                ],
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
}));
