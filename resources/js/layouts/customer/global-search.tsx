import { Link } from '@inertiajs/react';
import { ArrowRight, LoaderCircle, Search, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { ResponsiveDialog } from '@/components/overlays/responsive-dialog';
import { apiClient } from '@/lib/api-client';
import { useTranslation } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import * as customerRoutes from '@/routes/customer';

type SearchItem = { id: string; title: string; meta: string | null; href: string };
type SearchGroup = { type: string; label: string; items: SearchItem[] };
const keyboardShortcut = '⌘K';

export function GlobalSearch() {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [groups, setGroups] = useState<SearchGroup[]>([]);
    const [resultQuery, setResultQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [failed, setFailed] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleShortcut = (event: KeyboardEvent) => {
            if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
                event.preventDefault();
                setOpen(true);
            }
        };

        window.addEventListener('keydown', handleShortcut);

        return () => window.removeEventListener('keydown', handleShortcut);
    }, []);

    useEffect(() => {
        if (open) {
            window.setTimeout(() => inputRef.current?.focus(), 0);
        }
    }, [open]);

    useEffect(() => {
        const normalized = query.trim();

        if (!open || normalized.length < 2) {
            return;
        }

        const controller = new AbortController();
        const requestTimer = window.setTimeout(() => {
            const loadingTimer = window.setTimeout(() => setLoading(true), 300);
            setFailed(false);
            void apiClient
                .get<{ groups: SearchGroup[] }>(customerRoutes.search.url({ query: { q: normalized } }), {
                    signal: controller.signal,
                })
                .then((response) => {
                    if (!response.ok) {
                        throw new Error('Search request failed');
                    }

                    setGroups(response.body.groups);
                    setResultQuery(normalized);
                })
                .catch((error: unknown) => {
                    if (!(error instanceof DOMException && error.name === 'AbortError')) {
                        setFailed(true);
                        setGroups([]);
                    }
                })
                .finally(() => {
                    window.clearTimeout(loadingTimer);

                    if (!controller.signal.aborted) {
                        setLoading(false);
                    }
                });
        }, 225);

        return () => {
            window.clearTimeout(requestTimer);
            controller.abort();
        };
    }, [open, query]);

    const visibleGroups = query.trim() === resultQuery ? groups : [];
    const resultCount = visibleGroups.reduce((count, group) => count + group.items.length, 0);
    const handleOpenChange = (nextOpen: boolean) => {
        setOpen(nextOpen);

        if (!nextOpen) {
            setQuery('');
            setGroups([]);
            setResultQuery('');
            setLoading(false);
            setFailed(false);
        }
    };

    return (
        <>
            <button
                type="button"
                onClick={() => setOpen(true)}
                aria-label={t('Search all customer data')}
                className="grid size-11 shrink-0 place-items-center rounded-full text-primary transition hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring/30 focus-visible:outline-none md:flex md:h-11 md:w-[min(22rem,28vw)] md:justify-start md:gap-2 md:rounded-xl md:border md:border-input md:bg-background md:px-3 md:text-muted-foreground"
            >
                <Search className="size-[18px] shrink-0" aria-hidden="true" />
                <span className="hidden min-w-0 flex-1 truncate text-left text-sm md:block">{t('Search products, sales, and more')}</span>
                <kbd className="hidden rounded border border-border bg-muted px-1.5 py-0.5 text-[11px] font-semibold lg:inline">
                    {keyboardShortcut}
                </kbd>
            </button>

            <ResponsiveDialog
                open={open}
                onOpenChange={handleOpenChange}
                title={t('Global search')}
                description={t('Search only data from the active store.')}
                mobile="fullscreen"
                size="lg"
                bodyClassName="p-0 sm:p-0"
            >
                <div className="sticky top-0 z-10 border-b border-border bg-card p-3 sm:p-4">
                    <div className="flex min-h-12 items-center gap-2 rounded-xl border border-input bg-background px-3 focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/20">
                        {loading ? (
                            <LoaderCircle
                                className="size-5 shrink-0 animate-spin text-primary motion-reduce:animate-none"
                                aria-hidden="true"
                            />
                        ) : (
                            <Search className="size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
                        )}
                        <input
                            ref={inputRef}
                            value={query}
                            onChange={(event) => setQuery(event.target.value)}
                            placeholder={t('Type at least 2 characters')}
                            aria-label={t('Global search')}
                            className="min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
                        />
                        {query && (
                            <button
                                type="button"
                                onClick={() => setQuery('')}
                                aria-label={t('Clear search')}
                                className="grid size-11 shrink-0 place-items-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
                            >
                                <X className="size-5" />
                            </button>
                        )}
                    </div>
                </div>

                <div className="min-h-[18rem] p-3 sm:p-4" aria-live="polite" aria-busy={loading}>
                    {failed ? (
                        <SearchState
                            title={t('Search is temporarily unavailable')}
                            description={t('Check your connection and try again.')}
                        />
                    ) : query.trim().length < 2 ? (
                        <SearchState
                            title={t('Find anything faster')}
                            description={t('Search products, codes, transactions, suppliers, finance, and inventory.')}
                        />
                    ) : !loading && resultCount === 0 ? (
                        <SearchState title={t('No results found')} description={t('Try another name, document number, SKU, or barcode.')} />
                    ) : (
                        <div className="space-y-5">
                            {visibleGroups.map((group) => (
                                <section key={group.type}>
                                    <h3 className="mb-2 px-2 text-xs font-bold tracking-wide text-muted-foreground uppercase">
                                        {t(group.label)}
                                    </h3>
                                    <div className="overflow-hidden rounded-xl border border-border">
                                        {group.items.map((item) => (
                                            <Link
                                                key={`${group.type}-${item.id}`}
                                                href={item.href}
                                                onClick={() => handleOpenChange(false)}
                                                className="flex min-h-14 items-center gap-3 border-b border-border px-3 py-2.5 last:border-b-0 hover:bg-accent focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                                            >
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-sm font-bold">{item.title}</span>
                                                    {item.meta && (
                                                        <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                                                            {item.meta}
                                                        </span>
                                                    )}
                                                </span>
                                                <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                                            </Link>
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    )}
                </div>
            </ResponsiveDialog>
        </>
    );
}

function SearchState({ title, description }: { title: string; description: string }) {
    return (
        <div className={cn('grid min-h-[18rem] place-content-center px-6 text-center')}>
            <Search className="mx-auto mb-3 size-8 text-primary" aria-hidden="true" />
            <p className="font-bold text-foreground">{title}</p>
            <p className="mt-1 max-w-sm text-sm leading-6 text-muted-foreground">{description}</p>
        </div>
    );
}
