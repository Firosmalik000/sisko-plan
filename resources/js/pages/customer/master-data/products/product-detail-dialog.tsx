import { CheckCircle2, Clock, Edit2, Search, ShoppingBag } from 'lucide-react';
import { useMemo, useState } from 'react';
import { ResponsiveDialog } from '@/components/overlays';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { formatMoney, formatQuantity } from '@/lib/currency';
import { translate } from '@/lib/i18n';
import { referenceLabel } from '@/lib/unit-references';
import type { Product } from './product-model';
import { ProductPhoto } from './product-presentation';

type ProductDetailDialogProps = {
    product: Product | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    canManage?: boolean;
    onEdit?: (product: Product) => void;
};

export default function ProductDetailDialog({ product, open, onOpenChange, canManage = false, onEdit }: ProductDetailDialogProps) {
    const [serialFilter, setSerialFilter] = useState<'all' | 'available' | 'sold'>('all');
    const [serialSearch, setSerialSearch] = useState('');

    const serials = useMemo(() => product?.serial_numbers ?? [], [product]);

    const availableCount = useMemo(() => serials.filter((s) => s.status === 'available').length, [serials]);

    const soldCount = useMemo(() => serials.filter((s) => s.status === 'sold').length, [serials]);

    const filteredSerials = useMemo(() => {
        const query = serialSearch.trim().toLowerCase();

        return serials.filter((s) => {
            if (serialFilter === 'available' && s.status !== 'available') {
                return false;
            }

            if (serialFilter === 'sold' && s.status !== 'sold') {
                return false;
            }

            if (!query) {
                return true;
            }

            const matchSn = s.serial_number.toLowerCase().includes(query);
            const matchFull = (s.full_serial_number ?? '').toLowerCase().includes(query);
            const matchAgentNum = (s.agent_number ?? '').toLowerCase().includes(query);
            const matchAgentName = (s.agent_name ?? '').toLowerCase().includes(query);

            return matchSn || matchFull || matchAgentNum || matchAgentName;
        });
    }, [serials, serialFilter, serialSearch]);

    if (!product) {
        return null;
    }

    const isSerialMode = product.tracking_mode === 'serial';

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title={product.name}
            description={
                product.category ? `${translate('Category')}: ${referenceLabel(product.category, 'categories', translate)}` : undefined
            }
            size="lg"
            bodyClassName="space-y-5"
            footer={
                <div className="flex w-full items-center justify-between gap-2">
                    <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                        {translate('Close')}
                    </Button>
                    {canManage && onEdit && (
                        <Button
                            type="button"
                            onClick={() => {
                                onOpenChange(false);
                                onEdit(product);
                            }}
                        >
                            <Edit2 className="mr-1.5 size-4" />
                            {translate('Edit')}
                        </Button>
                    )}
                </div>
            }
        >
            {/* Header info card */}
            <div className="flex items-start gap-4 rounded-xl border border-border bg-card p-4 shadow-xs">
                <div className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary">
                    <ProductPhoto
                        src={product.photo_url}
                        alt={product.name}
                        className="size-full object-cover"
                        fallbackClassName="grid size-full place-items-center"
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <h3 className="truncate text-base font-bold text-foreground">{product.name}</h3>
                        <Badge variant={product.is_active ? 'default' : 'outline'}>
                            {translate(product.is_active ? 'Active' : 'Inactive')}
                        </Badge>
                        {isSerialMode ? (
                            <Badge variant="secondary" className="border-primary/20 bg-primary/10 text-primary">
                                {translate('Serial / SIM Card')}
                            </Badge>
                        ) : (
                            <Badge variant="secondary">{translate('Standard product')}</Badge>
                        )}
                    </div>
                    <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        {product.sku && (
                            <span>
                                SKU <span className="font-mono">{product.sku}</span>
                            </span>
                        )}
                        {product.barcode && (
                            <span>
                                {translate('Barcodes / QR')}: {product.barcode}
                            </span>
                        )}
                        <span>
                            {translate('Selling price')}: {formatMoney(product.selling_price)}
                        </span>
                        <span>
                            {translate('Stock')}: {formatQuantity(product.current_stock)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Serial Number Section */}
            {isSerialMode ? (
                <div className="space-y-4">
                    {/* Stat Badges */}
                    <div className="grid grid-cols-3 gap-3">
                        <div className="rounded-xl border border-border bg-card p-3 text-center shadow-2xs">
                            <span className="text-xs font-medium text-muted-foreground">{translate('Total serials')}</span>
                            <p className="mt-1 text-xl font-bold text-foreground">{serials.length}</p>
                        </div>
                        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3 text-center shadow-2xs">
                            <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">{translate('Available')}</span>
                            <p className="mt-1 text-xl font-bold text-emerald-600 dark:text-emerald-400">{availableCount}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-muted/40 p-3 text-center shadow-2xs">
                            <span className="text-xs font-medium text-muted-foreground">{translate('Sold')}</span>
                            <p className="mt-1 text-xl font-bold text-muted-foreground">{soldCount}</p>
                        </div>
                    </div>

                    {/* Filter and Search */}
                    <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
                        <div className="flex rounded-lg bg-secondary p-1">
                            <button
                                type="button"
                                onClick={() => setSerialFilter('all')}
                                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                                    serialFilter === 'all'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {translate('All')} ({serials.length})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSerialFilter('available')}
                                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                                    serialFilter === 'available'
                                        ? 'bg-background text-emerald-600 shadow-xs dark:text-emerald-400'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {translate('Available')} ({availableCount})
                            </button>
                            <button
                                type="button"
                                onClick={() => setSerialFilter('sold')}
                                className={`rounded-md px-3 py-1 text-xs font-semibold transition-colors ${
                                    serialFilter === 'sold'
                                        ? 'bg-background text-foreground shadow-xs'
                                        : 'text-muted-foreground hover:text-foreground'
                                }`}
                            >
                                {translate('Sold')} ({soldCount})
                            </button>
                        </div>

                        <div className="relative flex-1 sm:max-w-xs">
                            <Search className="pointer-events-none absolute top-1/2 left-3 size-3.5 -translate-y-1/2 text-muted-foreground" />
                            <Input
                                type="search"
                                value={serialSearch}
                                onChange={(e) => setSerialSearch(e.target.value)}
                                placeholder={translate('Search serial or agent...')}
                                className="h-8 pl-8 text-xs"
                            />
                        </div>
                    </div>

                    {/* Serial Numbers Table / List */}
                    <div className="max-h-72 overflow-y-auto rounded-xl border border-border">
                        {filteredSerials.length === 0 ? (
                            <div className="py-8 text-center text-xs text-muted-foreground">
                                {serials.length === 0
                                    ? translate('No serial numbers found for this product.')
                                    : translate('No serial numbers match the filter.')}
                            </div>
                        ) : (
                            <div className="divide-y divide-border">
                                {filteredSerials.map((item) => (
                                    <div
                                        key={item.public_id}
                                        className="flex items-center justify-between gap-3 p-3 transition-colors hover:bg-muted/30"
                                    >
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-mono text-sm font-bold text-foreground">{item.serial_number}</span>
                                                {item.full_serial_number && item.full_serial_number !== item.serial_number && (
                                                    <span className="font-mono text-xs text-muted-foreground">
                                                        ({item.full_serial_number})
                                                    </span>
                                                )}
                                            </div>
                                            {(item.agent_number || item.agent_name) && (
                                                <p className="mt-0.5 text-xs text-muted-foreground">
                                                    {translate('Agent name')}:{' '}
                                                    <span className="font-medium text-foreground">
                                                        {item.agent_name ? `${item.agent_name} (${item.agent_number})` : item.agent_number}
                                                    </span>
                                                </p>
                                            )}
                                        </div>

                                        <div className="flex shrink-0 flex-col items-end gap-1">
                                            {item.status === 'available' ? (
                                                <Badge
                                                    variant="outline"
                                                    className="border-emerald-500/20 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                                                >
                                                    <CheckCircle2 className="mr-1 size-3" />
                                                    {translate('Available')}
                                                </Badge>
                                            ) : (
                                                <Badge variant="secondary" className="bg-muted text-muted-foreground">
                                                    <ShoppingBag className="mr-1 size-3" />
                                                    {translate('Sold')}
                                                </Badge>
                                            )}
                                            {item.sold_at && (
                                                <span className="flex items-center text-[10px] text-muted-foreground">
                                                    <Clock className="mr-0.5 size-2.5" />
                                                    {new Date(item.sold_at).toLocaleDateString()}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            ) : (
                /* Standard Product Detail Section */
                <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                            <span className="text-xs text-muted-foreground">{translate('Selling price')}</span>
                            <p className="mt-1 font-bold text-foreground">{formatMoney(product.selling_price)}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                            <span className="text-xs text-muted-foreground">{translate('Cost price')}</span>
                            <p className="mt-1 font-bold text-foreground">{formatMoney(product.purchase_price)}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                            <span className="text-xs text-muted-foreground">{translate('Current stock')}</span>
                            <p className="mt-1 font-bold text-foreground">{formatQuantity(product.current_stock)}</p>
                        </div>
                        <div className="rounded-xl border border-border bg-card p-3 shadow-2xs">
                            <span className="text-xs text-muted-foreground">{translate('Minimum stock')}</span>
                            <p className="mt-1 font-bold text-foreground">{formatQuantity(product.minimum_stock)}</p>
                        </div>
                    </div>

                    {(product.variants?.length ?? 0) > 0 && (
                        <div className="space-y-2">
                            <h4 className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                {translate('variants')} ({product.variants?.length ?? 0})
                            </h4>
                            <div className="overflow-hidden rounded-xl border border-border">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-secondary/60 text-muted-foreground">
                                        <tr>
                                            <th className="p-2.5 font-semibold">{translate('variant')}</th>
                                            <th className="p-2.5 font-semibold">SKU</th>
                                            <th className="p-2.5 text-right font-semibold">{translate('Selling price')}</th>
                                            <th className="p-2.5 text-right font-semibold">{translate('Stock')}</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border">
                                        {product.variants?.map((v) => (
                                            <tr key={v.public_id ?? v.name} className="hover:bg-muted/30">
                                                <td className="p-2.5 font-medium text-foreground">{v.name}</td>
                                                <td className="p-2.5 font-mono text-muted-foreground">{v.sku || '-'}</td>
                                                <td className="p-2.5 text-right font-semibold text-foreground">
                                                    {formatMoney(v.selling_price)}
                                                </td>
                                                <td className="p-2.5 text-right text-foreground tabular-nums">
                                                    {v.current_stock ? formatQuantity(v.current_stock) : '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </ResponsiveDialog>
    );
}
