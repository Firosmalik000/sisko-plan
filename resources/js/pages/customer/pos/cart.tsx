import { Minus, PackageOpen, Plus, Trash2, X } from 'lucide-react';
import { FormCurrencyInput } from '@/components/forms';
import { formatMoney, formatQuantity } from '@/lib/currency';
import { translate } from '@/lib/i18n';
import type { CartItem } from './types';

type PosCartItemsProps = {
    items: CartItem[];
    onRemove: (index: number) => void;
    onUpdate: (index: number, changes: Partial<CartItem>) => void;
    onRemoveSerial?: (itemIndex: number, serialPublicId: string) => void;
    onAddSerial?: (item: CartItem) => void;
};

const available = (item: CartItem) => Number(item.stock_quantity) / Number(item.conversion_factor);
const isCritical = (item: CartItem) => available(item) <= Number(item.minimum_quantity) / Number(item.conversion_factor);

export function PosCartItems({ items, onRemove, onUpdate, onRemoveSerial, onAddSerial }: PosCartItemsProps) {
    if (items.length === 0) {
        return (
            <div className="grid place-items-center rounded-2xl border border-dashed border-input px-4 py-9 text-center">
                <PackageOpen className="size-7 text-muted-foreground" aria-hidden="true" />
                <p className="mt-2 text-sm text-muted-foreground">{translate('Select a product to start.')}</p>
            </div>
        );
    }

    return items.map((item, index) => {
        const lineTotal = Math.max(0, Number(item.quantity) * Number(item.selling_price) - Number(item.discount_amount || 0));
        const isSerial = item.tracking_mode === 'serial' || (item.selected_serials?.length ?? 0) > 0;

        return (
            <article key={`${item.product_id}:${item.unit_id}`} className="rounded-xl bg-muted/35 p-3.5 ring-1 ring-border">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <p className="truncate text-sm font-bold text-foreground">{item.catalog_product_name}</p>
                        <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            <span className="rounded-md bg-background px-2 py-0.5 font-semibold text-[var(--app-primary)] ring-1 ring-border">
                                {item.variant_name || item.unit_name}
                            </span>
                            <span>{formatMoney(item.selling_price)}</span>
                            <span className={`font-medium ${isCritical(item) ? 'text-destructive' : 'text-muted-foreground'}`}>
                                {isCritical(item) && `${translate('Critical')} · `}
                                {translate('Stock')} {formatQuantity(available(item))}
                            </span>
                        </div>
                        {item.selected_serials && item.selected_serials.length > 0 && (
                            <div className="mt-1.5 flex flex-wrap gap-1">
                                {item.selected_serials.map((serial) => (
                                    <span
                                        key={serial.public_id}
                                        className="inline-flex items-center gap-1 rounded bg-primary/10 py-0.5 pr-1 pl-2 font-mono text-[11px] font-semibold text-primary ring-1 ring-primary/20"
                                    >
                                        <span>SN: {serial.serial_number}</span>
                                        {serial.agent_name ? (
                                            <span className="font-sans text-muted-foreground">• {serial.agent_name}</span>
                                        ) : serial.agent_number ? (
                                            <span className="font-sans text-muted-foreground">({serial.agent_number})</span>
                                        ) : null}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();

                                                if (onRemoveSerial) {
                                                    onRemoveSerial(index, serial.public_id);
                                                } else {
                                                    const remaining = (item.selected_serials || []).filter(
                                                        (s) => s.public_id !== serial.public_id,
                                                    );

                                                    if (remaining.length === 0) {
                                                        onRemove(index);
                                                    } else {
                                                        onUpdate(index, {
                                                            quantity: String(remaining.length),
                                                            selected_serials: remaining,
                                                            serial_number_ids: remaining.map((s) => s.public_id),
                                                        });
                                                    }
                                                }
                                            }}
                                            aria-label={`${translate('Remove serial')} ${serial.serial_number}`}
                                            className="ml-0.5 grid size-4 place-items-center rounded-full text-primary/70 transition hover:bg-destructive hover:text-destructive-foreground focus-visible:outline-none"
                                        >
                                            <X className="size-2.5" />
                                        </button>
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex shrink-0 items-start gap-2">
                        <strong className="pt-1 text-sm text-foreground">{formatMoney(lineTotal)}</strong>
                        <button
                            type="button"
                            onClick={() => onRemove(index)}
                            aria-label={`${translate('Delete')} ${item.catalog_product_name}`}
                            className="grid size-10 place-items-center rounded-lg text-destructive transition hover:bg-destructive/10 focus-visible:ring-2 focus-visible:ring-destructive/40 focus-visible:outline-none"
                        >
                            <Trash2 className="size-4" aria-hidden="true" />
                        </button>
                    </div>
                </div>

                <div className="mt-3 grid gap-3 sm:grid-cols-[auto_minmax(0,1fr)]">
                    <div>
                        <span className="mb-1.5 block text-xs font-semibold text-muted-foreground">{translate('Amount')}</span>
                        <div className="flex w-full items-center overflow-hidden rounded-xl border border-input bg-card sm:w-fit">
                            <button
                                type="button"
                                aria-label={`${translate('Reduce')} ${item.catalog_product_name}`}
                                className="grid size-11 shrink-0 place-items-center transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                                onClick={() => {
                                    if (isSerial) {
                                        const serials = item.selected_serials || [];

                                        if (serials.length <= 1) {
                                            onRemove(index);
                                        } else {
                                            const lastSerial = serials[serials.length - 1];

                                            if (onRemoveSerial) {
                                                onRemoveSerial(index, lastSerial.public_id);
                                            } else {
                                                const remaining = serials.slice(0, -1);
                                                onUpdate(index, {
                                                    quantity: String(remaining.length),
                                                    selected_serials: remaining,
                                                    serial_number_ids: remaining.map((s) => s.public_id),
                                                });
                                            }
                                        }
                                    } else {
                                        onUpdate(index, { quantity: String(Math.max(0.000001, Number(item.quantity) - 1)) });
                                    }
                                }}
                            >
                                <Minus className="size-4" aria-hidden="true" />
                            </button>
                            <input
                                aria-label={`${translate('Amount')} ${item.catalog_product_name}`}
                                className={`h-11 min-w-0 flex-1 border-x border-border bg-card px-1 text-center text-base outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:w-16 sm:flex-none sm:text-sm ${
                                    isSerial ? 'cursor-default bg-muted/20 select-none' : ''
                                }`}
                                type="number"
                                min={isSerial ? '1' : '0.000001'}
                                max={available(item)}
                                step={isSerial ? '1' : '0.000001'}
                                readOnly={isSerial}
                                value={item.quantity}
                                onChange={(event) => {
                                    if (!isSerial) {
                                        onUpdate(index, { quantity: event.target.value });
                                    }
                                }}
                            />
                            <button
                                type="button"
                                aria-label={`${translate('Add')} ${item.catalog_product_name}`}
                                className="grid size-11 shrink-0 place-items-center transition hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none focus-visible:ring-inset"
                                onClick={() => {
                                    if (isSerial) {
                                        onAddSerial?.(item);
                                    } else {
                                        onUpdate(index, { quantity: String(Math.min(available(item), Number(item.quantity) + 1)) });
                                    }
                                }}
                            >
                                <Plus className="size-4" aria-hidden="true" />
                            </button>
                        </div>
                    </div>
                    <FormCurrencyInput
                        id={`item-discount-${index}`}
                        name={`items.${index}.discount_amount`}
                        label={translate('Discount item')}
                        value={item.discount_amount}
                        onValueChange={(value) => onUpdate(index, { discount_amount: value })}
                        min="0"
                        placeholder="0"
                    />
                </div>
            </article>
        );
    });
}
