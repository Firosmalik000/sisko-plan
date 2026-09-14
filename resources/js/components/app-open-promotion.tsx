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
            <DialogContent className="max-h-[calc(100svh-2rem)] w-auto max-w-[min(92vw,32rem)] overflow-hidden border-white/15 bg-transparent p-0 shadow-2xl [&>button]:top-2 [&>button]:right-2 [&>button]:z-10 [&>button]:flex [&>button]:size-11 [&>button]:items-center [&>button]:justify-center [&>button]:rounded-full [&>button]:bg-black/65 [&>button]:text-white [&>button]:opacity-100">
                <DialogTitle className="sr-only">{t('Gambar promosi')}</DialogTitle>
                <DialogDescription className="sr-only">{t('Gambar promosi yang dapat ditutup')}</DialogDescription>
                <PromotionLink
                    destination={selected.destination_url}
                    onClick={() => setOpen(false)}
                    className="block overflow-hidden rounded-xl bg-black/5"
                >
                    <img
                        src={selected.image_url}
                        alt={selected.name}
                        className="max-h-[calc(100svh-2rem)] w-auto max-w-[92vw] object-contain"
                    />
                </PromotionLink>
            </DialogContent>
        </Dialog>
    );
}

function localDateKey(): string {
    const date = new Date();

    return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
}
