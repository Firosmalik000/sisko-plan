import { router } from '@inertiajs/react';
import { useEffect } from 'react';
import { toast } from 'sonner';
import { translate } from '@/lib/i18n';
import type { FlashToast } from '@/types/ui';

export function useFlashToast(): void {
    useEffect(() => {
        return router.on('flash', (event) => {
            const flash = (event as CustomEvent).detail?.flash;
            const data = flash?.toast as FlashToast | undefined;

            if (!data) {
                return;
            }

            toast[data.type](translate(data.message), {
                duration: data.type === 'error' ? 10_000 : data.type === 'warning' ? 7_000 : 4_000,
            });
        });
    }, []);
}
