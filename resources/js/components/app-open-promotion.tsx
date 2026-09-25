import { useEffect, useState } from 'react';
import { PromotionLink } from '@/components/promotion-link';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { useTranslation } from '@/lib/i18n';
import { markPromotionShown, selectAppOpenPromotion } from '@/lib/promotions';
import type { AppOpenPromotion as AppOpenPromotionData } from '@/lib/promotions';

let promotionHandledForCurrentAppEntry = false;

export function AppOpenPromotion({ promotions }: { promotions: AppOpenPromotionData[] }) {
    const { t } = useTranslation();
    const [selected] = useState<AppOpenPromotionData | null>(() => {
        if (typeof window === 'undefined') {
            return null;
        }

        return selectAppOpenPromotion(promotions, window.sessionStorage, window.localStorage, localDateKey());
    });
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!selected) {
            return;
        }

        const timeout = window.setTimeout(() => {
            if (promotionHandledForCurrentAppEntry) {
                return;
            }

            promotionHandledForCurrentAppEntry = true;
            markPromotionShown(selected, window.sessionStorage, window.localStorage, localDateKey());
            setOpen(true);
        }, 450);

        return () => {
            window.clearTimeout(timeout);
            window.setTimeout(() => {
                promotionHandledForCurrentAppEntry = false;
            }, 0);
        };
        // This shell persists through Inertia navigation; frequency selection runs only on a fresh shell entry.
    }, [selected]);

    if (!selected) {
        return null;
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="block max-h-[calc(100svh-2.5rem)] w-[calc(100vw-2.5rem)] max-w-sm gap-0 overflow-hidden border-0 bg-transparent p-0 shadow-none sm:max-w-md [&>button]:top-2 [&>button]:right-2 [&>button]:z-10 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-black/65 [&>button]:text-white [&>button]:opacity-100 hover:[&>button]:bg-black/80 focus-visible:[&>button]:ring-2 focus-visible:[&>button]:ring-white">
                <DialogTitle className="sr-only">{t('Gambar promosi')}</DialogTitle>
                <DialogDescription className="sr-only">{t('Gambar promosi yang dapat ditutup')}</DialogDescription>
                <PromotionLink
                    destination={selected.destination_url}
                    onClick={() => setOpen(false)}
                    className="relative block w-full overflow-hidden rounded-2xl shadow-2xl focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--app-primary)]"
                >
                    <img src={selected.image_url} alt={selected.name} className="block h-auto w-full object-contain" />
                </PromotionLink>
            </DialogContent>
        </Dialog>
    );
}

function localDateKey(): string {
    const date = new Date();

    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
