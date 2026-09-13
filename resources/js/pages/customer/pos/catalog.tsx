import { Camera, PackageOpen, Search } from 'lucide-react';
import type { KeyboardEvent, RefObject } from 'react';
import { EmptyState } from '@/components/page/empty-state';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney, formatQuantity } from '@/lib/currency';
import { translate } from '@/lib/i18n';
import type { CatalogProduct, ProductOption } from './types';

type PosCatalogProps = {
    activeCategory: string;
    categories: [string, string][];
    products: CatalogProduct[];
    scannerCount: number;
    scannerSummary: string;
    search: string;
    searchError: string;
    searchRef: RefObject<HTMLInputElement | null>;
    onCategoryChange: (category: string) => void;
    onChooseProduct: (product: CatalogProduct) => void;
    onDiscardScan: () => void;
    onReviewScan: () => void;
    onScan: () => void;
    onSearchChange: (value: string) => void;
    onSearchKeyDown: (event: KeyboardEvent<HTMLInputElement>) => void;
};

const available = (product: ProductOption) => Number(product.stock_quantity) / Number(product.conversion_factor);
const isCritical = (product: ProductOption) => available(product) <= Number(product.minimum_quantity) / Number(product.conversion_factor);

export function PosCatalog({
    activeCategory,
    categories,
    products,
    scannerCount,
    scannerSummary,
    search,
    searchError,
    searchRef,
    onCategoryChange,
    onChooseProduct,
    onDiscardScan,
    onReviewScan,
    onScan,
    onSearchChange,
    onSearchKeyDown,
}: PosCatalogProps) {
    return (
        <section className="min-w-0 space-y-4">
            <section className="sticky top-[calc(4.75rem+env(safe-area-inset-top))] z-20 rounded-2xl bg-card p-3 text-card-foreground sm:static sm:p-4">
                {scannerCount > 0 && (
                    <div className="flex flex-wrap gap-2">
                        <Button type="button" size="touch" variant="outline" onClick={onReviewScan}>
                            {translate('View results')} ({scannerCount})
                        </Button>
                        <Button
                            type="button"
                            size="touch"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={onDiscardScan}
                        >
                            {translate('Discard scan results')}
                        </Button>
                    </div>
                )}
                {scannerSummary && (
                    <p
                        role="status"
                        className="mt-3 rounded-xl bg-[var(--app-soft)] px-3 py-2 text-xs font-semibold text-[var(--app-primary)]"
                    >
                        {scannerSummary}
                    </p>
                )}
                <div className="mt-3 flex h-12 overflow-hidden rounded-xl border border-input bg-background transition focus-within:border-ring focus-within:ring-2 focus-within:ring-ring/30 has-[input[aria-invalid=true]]:border-destructive has-[input[aria-invalid=true]]:ring-destructive/20">
                    <div className="relative min-w-0 flex-1">
                        <Search
                            className="pointer-events-none absolute top-1/2 left-4 size-5 -translate-y-1/2 text-muted-foreground"
                            aria-hidden="true"
                        />
                        <Input
                            ref={searchRef}
                            autoFocus
                            value={search}
                            onChange={(event) => onSearchChange(event.target.value)}
                            onKeyDown={onSearchKeyDown}
                            placeholder={translate('Search name, SKU, or scan barcode')}
                            aria-label={translate('Search by product name, SKU, or scan a barcode')}
                            aria-invalid={Boolean(searchError)}
                            className="h-full w-full rounded-none border-0 bg-transparent pr-4 pl-11 text-base shadow-none focus-visible:ring-0 sm:text-sm"
                        />
                    </div>
                    <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label={translate('Scan camera')}
                        title={translate('Scan camera')}
                        className="h-full w-12 shrink-0 rounded-none border-l text-primary"
                        onClick={onScan}
                    >
                        <Camera className="size-5" aria-hidden="true" />
                    </Button>
                </div>
                {searchError && <p className="mt-2 text-sm font-semibold text-destructive">{searchError}</p>}
                <div className="mt-3 flex max-w-full gap-2 overflow-x-auto pb-1" aria-label={translate('Filter category')}>
                    {[['', translate('All')] as [string, string], ...categories].map(([id, name]) => {
                        const active = activeCategory === id;

                        return (
                            <button
                                key={id || 'all'}
                                type="button"
                                aria-pressed={active}
                                onClick={() => onCategoryChange(id)}
                                className={`min-h-10 shrink-0 rounded-lg border px-3 text-xs font-semibold transition focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none ${
                                    active
                                        ? 'border-[var(--app-primary)]/40 bg-[var(--app-soft)] text-[var(--app-primary)] ring-1 ring-[var(--app-primary)]/10'
                                        : 'border-border bg-card text-foreground hover:bg-[var(--app-soft)]/40'
                                }`}
                            >
                                {name}
                            </button>
                        );
                    })}
                </div>
            </section>

            <div className="grid grid-cols-2 gap-2.5 min-[1400px]:grid-cols-4 sm:grid-cols-3">
                {products.map((product) => {
                    const prices = product.options.map((option) => Number(option.selling_price));
                    const minimumPrice = Math.min(...prices);
                    const maximumPrice = Math.max(...prices);
                    const criticalStock = product.options.some(isCritical);
                    const stock = Math.min(...product.options.map((option) => available(option)));

                    return (
                        <button
                            type="button"
                            key={product.id}
                            onClick={() => onChooseProduct(product)}
                            className="group min-w-0 overflow-hidden rounded-2xl border border-border bg-card text-left transition hover:border-[var(--app-primary)]/40 hover:bg-[var(--app-soft)]/20 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                        >
                            <div className="aspect-[4/3] overflow-hidden bg-[var(--app-soft)]">
                                {product.photo_url ? (
                                    <img src={product.photo_url} alt={product.name} loading="lazy" className="h-full w-full object-cover" />
                                ) : (
                                    <span className="grid h-full place-items-center text-muted-foreground">
                                        <PackageOpen className="size-8" aria-hidden="true" />
                                    </span>
                                )}
                            </div>
                            <div className="flex min-h-24 flex-col justify-between gap-2.5 p-3 sm:min-h-28 sm:p-3.5">
                                <p className="line-clamp-2 text-sm leading-snug font-bold text-foreground sm:text-base">{product.name}</p>
                                <p className="text-base font-bold tracking-[-0.02em] text-[var(--app-primary)] sm:text-lg">
                                    {formatMoney(minimumPrice)}
                                    {maximumPrice !== minimumPrice && (
                                        <span className="block text-xs leading-tight font-medium text-muted-foreground">
                                            {translate('until')} {formatMoney(maximumPrice)}
                                        </span>
                                    )}
                                </p>
                                <div className="flex flex-wrap items-center gap-1.5">
                                    {criticalStock && (
                                        <span className="rounded-md bg-destructive/10 px-2 py-0.5 text-xs font-semibold text-destructive">
                                            {translate('Critical')}
                                        </span>
                                    )}
                                    <span className={`text-xs font-medium ${criticalStock ? 'text-destructive' : 'text-muted-foreground'}`}>
                                        {translate('Stock remaining')} {formatQuantity(stock)}
                                    </span>
                                </div>
                            </div>
                        </button>
                    );
                })}
            </div>
            {products.length === 0 && (
                <div className="rounded-2xl bg-card">
                    <EmptyState
                        icon={Search}
                        title={translate('Product not found')}
                        description={translate('Try use name, SKU, or barcode that other.')}
                    />
                </div>
            )}
        </section>
    );
}
