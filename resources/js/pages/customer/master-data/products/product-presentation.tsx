import { MoreHorizontal, PackagePlus } from 'lucide-react';
import { useState } from 'react';
import { RecordListRow } from '@/components/page/record-list';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { formatMoney, formatQuantity } from '@/lib/currency';
import { translate } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import type { Product, VariantMode } from './product-model';

export function ProductPhoto({
    src,
    alt,
    className,
    fallbackClassName,
}: {
    src: string | null | undefined;
    alt: string;
    className: string;
    fallbackClassName: string;
}) {
    const [failedSrc, setFailedSrc] = useState<string | null>(null);

    if (!src || failedSrc === src) {
        return (
            <span
                className={fallbackClassName}
                role={src ? 'img' : undefined}
                aria-label={src ? translate('The photo cannot be displayed.') : undefined}
                aria-hidden={!src}
            >
                <PackagePlus className="size-7 text-primary" />
            </span>
        );
    }

    return <img src={src} alt={alt} className={className} onError={() => setFailedSrc(src)} />;
}

function hasLowStock(product: Product) {
    if (product.variant_mode === 'separate') {
        return product.variants.some(
            (variant) => Number(variant.minimum_stock) > 0 && Number(variant.current_stock) <= Number(variant.minimum_stock),
        );
    }

    return Number(product.minimum_stock) > 0 && Number(product.current_stock) <= Number(product.minimum_stock);
}

function modeLabel(mode: VariantMode) {
    return translate(mode === 'none' ? 'No variants' : mode === 'separate' ? 'Separate stock' : 'Shared stock');
}

export function ProductRow({
    product,
    canManage,
    onEdit,
    onDelete,
}: {
    product: Product;
    canManage: boolean;
    onEdit: (product: Product) => void;
    onDelete: (product: Product) => void;
}) {
    const lowStock = hasLowStock(product);

    return (
        <RecordListRow className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-3 md:grid-cols-[minmax(15rem,1fr)_9rem_7rem_9rem_3rem] md:gap-4">
            <div className="flex min-w-0 items-start gap-3 md:items-center">
                <div className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-secondary md:size-14">
                    <ProductPhoto
                        src={product.photo_url}
                        alt=""
                        className="size-full object-cover"
                        fallbackClassName="grid size-full place-items-center"
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 items-center gap-2">
                        <h2 className="truncate font-bold text-foreground">{product.name}</h2>
                        {!product.is_active && <Badge variant="outline">{translate('Inactive')}</Badge>}
                        {lowStock && <Badge variant="destructive">{translate('Critical')}</Badge>}
                    </div>
                    <div className="mt-1.5 flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
                        <span className="shrink-0 font-semibold text-primary">{modeLabel(product.variant_mode)}</span>
                        {(product.sku || product.barcode) && (
                            <>
                                <span aria-hidden="true">·</span>
                                <span className="truncate font-mono">{product.sku || product.barcode}</span>
                            </>
                        )}
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-xs md:hidden">
                        <span className="font-semibold text-foreground tabular-nums">
                            {product.variant_mode === 'none'
                                ? formatMoney(product.selling_price)
                                : `${product.variants.length} ${translate('prices')}`}
                        </span>
                        <span className={cn('text-muted-foreground tabular-nums', lowStock && 'font-semibold text-destructive')}>
                            {translate('Stock')}:{' '}
                            {product.variant_mode === 'separate'
                                ? `${product.variants.length} ${translate('variants')}`
                                : formatQuantity(product.current_stock)}
                        </span>
                    </div>
                </div>
            </div>

            <span className="hidden text-right text-sm font-bold text-foreground tabular-nums md:block">
                {product.variant_mode === 'none' ? formatMoney(product.selling_price) : `${product.variants.length} ${translate('prices')}`}
            </span>
            <span className={cn('hidden text-right text-sm tabular-nums md:block', lowStock && 'font-semibold text-destructive')}>
                {product.variant_mode === 'separate'
                    ? `${product.variants.length} ${translate('variants')}`
                    : formatQuantity(product.current_stock)}
            </span>
            <span className="hidden truncate text-sm text-muted-foreground md:block">
                {translate(product.category?.name ?? 'Uncategorized')}
            </span>

            {canManage && (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button
                            type="button"
                            size="icon"
                            variant="ghost"
                            className="size-11 justify-self-end"
                            aria-label={`${translate('Actions')} ${product.name}`}
                        >
                            <MoreHorizontal className="size-5" aria-hidden="true" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="min-w-40">
                        <DropdownMenuItem onSelect={() => onEdit(product)}>{translate('Edit')}</DropdownMenuItem>
                        <DropdownMenuItem variant="destructive" onSelect={() => onDelete(product)}>
                            {translate('Delete product')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )}
        </RecordListRow>
    );
}
