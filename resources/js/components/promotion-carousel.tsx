import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { PromotionLink } from '@/components/promotion-link';
import { useTranslation } from '@/lib/i18n';
import type { CustomerPromotion } from '@/lib/promotions';
import { cn } from '@/lib/utils';

export function PromotionCarousel({ promotions }: { promotions: CustomerPromotion[] }) {
    const { t } = useTranslation();
    const [active, setActive] = useState(0);
    const [paused, setPaused] = useState(false);
    const viewport = useRef<HTMLDivElement>(null);
    const multiple = promotions.length > 1;

    const goTo = useCallback(
        (index: number) => {
            const next = (index + promotions.length) % promotions.length;
            setActive(next);
            viewport.current?.scrollTo({ left: next * viewport.current.clientWidth, behavior: 'smooth' });
        },
        [promotions.length],
    );

    useEffect(() => {
        if (!multiple || paused || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
            return;
        }

        const interval = window.setInterval(() => goTo(active + 1), 5_000);

        return () => window.clearInterval(interval);
    }, [active, goTo, multiple, paused]);

    if (promotions.length === 0) {
        return null;
    }

    return (
        <section
            aria-label={t('Gambar promosi')}
            className="group relative overflow-hidden rounded-[1.4rem] border border-[var(--app-ink)]/10 bg-white shadow-sm"
            onPointerEnter={() => setPaused(true)}
            onPointerLeave={() => setPaused(false)}
            onFocusCapture={() => setPaused(true)}
            onBlurCapture={() => setPaused(false)}
            onKeyDown={(event) => {
                if (event.key === 'ArrowLeft') {
                    goTo(active - 1);
                }

                if (event.key === 'ArrowRight') {
                    goTo(active + 1);
                }
            }}
        >
            <div
                ref={viewport}
                className="flex snap-x snap-mandatory [scrollbar-width:none] overflow-x-auto [&::-webkit-scrollbar]:hidden"
                onScroll={(event) => {
                    const width = event.currentTarget.clientWidth;

                    if (width > 0) {
                        setActive(Math.round(event.currentTarget.scrollLeft / width));
                    }
                }}
            >
                {promotions.map((promotion) => (
                    <PromotionLink
                        key={promotion.public_id}
                        destination={promotion.destination_url}
                        className="block min-w-full snap-center"
                    >
                        <img src={promotion.image_url} alt={promotion.name} className="aspect-video w-full bg-slate-50 object-contain" />
                    </PromotionLink>
                ))}
            </div>
            {multiple && (
                <>
                    <button
                        type="button"
                        onClick={() => goTo(active - 1)}
                        aria-label={t('Gambar sebelumnya')}
                        className="absolute top-1/2 left-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md ring-1 ring-black/5 transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none md:flex"
                    >
                        <ChevronLeft className="size-5" />
                    </button>
                    <button
                        type="button"
                        onClick={() => goTo(active + 1)}
                        aria-label={t('Gambar berikutnya')}
                        className="absolute top-1/2 right-3 hidden size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 text-slate-800 shadow-md ring-1 ring-black/5 transition hover:bg-white focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none md:flex"
                    >
                        <ChevronRight className="size-5" />
                    </button>
                    <div
                        className="absolute right-0 bottom-3 left-0 flex justify-center gap-1.5"
                        role="tablist"
                        aria-label={t('Pilih gambar promosi')}
                    >
                        {promotions.map((promotion, index) => (
                            <button
                                key={promotion.public_id}
                                type="button"
                                role="tab"
                                aria-selected={active === index}
                                aria-label={`${t('Gambar')} ${index + 1}`}
                                onClick={() => goTo(index)}
                                className="grid size-11 place-items-center rounded-full focus-visible:ring-2 focus-visible:ring-[var(--app-primary)] focus-visible:outline-none"
                            >
                                <span
                                    className={cn(
                                        'size-2.5 rounded-full shadow-sm ring-1 ring-black/10 transition',
                                        active === index ? 'bg-[var(--app-primary)]' : 'bg-white/85',
                                    )}
                                />
                            </button>
                        ))}
                    </div>
                </>
            )}
        </section>
    );
}
