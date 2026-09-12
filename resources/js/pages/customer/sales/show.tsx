import { useForm, usePage } from '@inertiajs/react';
import { FileCheck2, Printer, ReceiptText, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef } from 'react';
import type { FormEvent } from 'react';
import { AppPage } from '@/components/page/app-page';
import { Button } from '@/components/ui/button';
import { formatMoney as money, formatQuantity as quantity } from '@/lib/currency';
import { currentLocale } from '@/lib/currency';
import { currentDateTime, ledgerDateTime } from '@/lib/date-time';
import { translate } from '@/lib/i18n';
import { postingToken } from '@/lib/posting-token';
import { buildAndroidPrinterIntent, readReceiptPrintPreferences, receiptPrintStyles } from '@/lib/receipt-printing';
import { index as salesIndex } from '@/routes/sales';
import { store as storeReturn } from '@/routes/sales/returns';

type Sale = {
    public_id: string;
    document_number: string;
    customer_name: string | null;
    customer_phone: string | null;
    customer_email: string | null;
    sales_channel: 'in_store' | 'marketplace';
    marketplace_code: string | null;
    marketplace_label: string | null;
    external_order_number: string | null;
    subtotal: string;
    item_discount_amount: string;
    transaction_discount_amount: string;
    total_amount: string;
    paid_amount: string;
    change_amount: string;
    occurred_at: string;
    notes: string | null;
    cashier_name: string;
};
type Item = {
    public_id: string;
    product_name: string;
    sku: string | null;
    unit_symbol: string;
    quantity: string;
    unit_price: string;
    gross_subtotal: string;
    item_discount_amount: string;
    allocated_transaction_discount: string;
    net_total: string;
    returned_quantity: string;
    returnable_quantity: string;
    cogs_amount?: string;
    gross_profit?: string;
};
type Payment = {
    amount: string;
    tendered_amount: string;
    change_amount: string;
    payment_method: 'cash' | 'qris' | 'qr_payment' | 'bank_transfer' | 'e_wallet' | 'marketplace';
    account_name: string;
    proof_url: string | null;
};
type SaleReturn = {
    public_id: string;
    document_number: string;
    refund_amount: string;
    cogs_reversed: string;
    gross_profit_reversed: string;
    occurred_at: string;
    notes: string | null;
    account_name: string;
};
type Account = { public_id: string; name: string };
type ReturnForm = {
    account_id: string;
    occurred_at: string;
    notes: string;
    idempotency_key: string;
    items: { sale_item_id: string; quantity: string }[];
};
type ReceiptSettings = {
    store_name: string;
    address: string | null;
    header: string;
    footer: string;
    paper_size: '58mm' | '80mm';
    show_address: boolean;
    show_cashier: boolean;
};
const fieldClass =
    'h-11 w-full rounded-xl border border-input bg-background px-3 text-sm text-foreground outline-none focus:border-ring focus:ring-2 focus:ring-ring/15';

export default function SaleShow({
    storeId,
    sale,
    items,
    payment,
    returns,
    accounts,
    canReturn,
    canViewProfit,
    timezone,
    receipt,
    showReturnForm = false,
    openPrintDialog = false,
    nativePrintUrl,
}: {
    storeId: string;
    sale: Sale;
    items: Item[];
    payment: Payment;
    returns: SaleReturn[];
    accounts: Account[];
    canReturn: boolean;
    canViewProfit: boolean;
    timezone: string;
    receipt: ReceiptSettings;
    showReturnForm?: boolean;
    openPrintDialog?: boolean;
    nativePrintUrl: string;
}) {
    const pageUrl = usePage().url;
    const query = pageUrl.includes('?') ? pageUrl.slice(pageUrl.indexOf('?')) : '';
    const salesIndexUrl = `${salesIndex.url()}${query}`;
    const returnableItems = items.filter((item) => Number(item.returnable_quantity) > 0);
    const returnForm = useForm<ReturnForm>({
        account_id: accounts[0]?.public_id ?? '',
        occurred_at: currentDateTime(timezone),
        notes: '',
        idempotency_key: postingToken(),
        items: returnableItems.map((item) => ({
            sale_item_id: item.public_id,
            quantity: '0',
        })),
    });
    const estimatedRefund = returnForm.data.items.reduce((sum, input) => {
        const item = items.find((candidate) => candidate.public_id === input.sale_item_id);

        return sum + (item ? (Number(item.net_total) * Number(input.quantity || 0)) / Number(item.quantity) : 0);
    }, 0);
    const submitReturn = (event: FormEvent) => {
        event.preventDefault();
        returnForm.transform((data) => ({
            ...data,
            items: data.items.filter((item) => Number(item.quantity) > 0),
        }));
        returnForm.post(storeReturn.url(sale.public_id), {
            preserveScroll: true,
            preserveState: false,
        });
    };
    const cogs = items.reduce((sum, item) => sum + Number(item.cogs_amount ?? 0), 0);
    const profit = items.reduce((sum, item) => sum + Number(item.gross_profit ?? 0), 0);

    const automaticPrintOpened = useRef(false);
    const printPreferences = useMemo(
        () => readReceiptPrintPreferences(storeId, typeof window === 'undefined' ? undefined : window.localStorage),
        [storeId],
    );
    const printReceipt = useCallback(() => {
        if (printPreferences.mode === 'android-direct') {
            window.location.href = buildAndroidPrinterIntent('print', storeId, nativePrintUrl, currentLocale());

            return;
        }

        window.print();
    }, [nativePrintUrl, printPreferences.mode, storeId]);
    useEffect(() => {
        if (openPrintDialog && !automaticPrintOpened.current && printPreferences.autoPrint) {
            automaticPrintOpened.current = true;
            const automaticPrintKey = `xsisten.printed.${sale.public_id}`;

            if (window.sessionStorage.getItem(automaticPrintKey)) {
                return;
            }

            window.sessionStorage.setItem(automaticPrintKey, '1');
            printReceipt();
        }
    }, [openPrintDialog, printPreferences.autoPrint, printReceipt, sale.public_id]);

    return (
        <>
            <style>{receiptPrintStyles(receipt.paper_size)}</style>
            <AppPage
                title={translate(showReturnForm ? 'Retur penjualan' : 'Detail transaksi')}
                description={sale.document_number}
                icon={showReturnForm ? RotateCcw : ReceiptText}
                back={{ href: salesIndexUrl, label: translate('Daftar transaksi') }}
                size="wide"
                className="print:bg-card print:p-0 [&>div>header]:print:hidden"
                actions={
                    <>
                        {printPreferences.mode === 'android-direct' && (
                            <Button type="button" size="touch" variant="outline" onClick={() => window.print()}>
                                {translate('Cetak sistem')}
                            </Button>
                        )}
                        <Button type="button" size="touch" onClick={printReceipt}>
                            <Printer className="size-4" />
                            {translate(printPreferences.mode === 'android-direct' ? 'Cetak langsung' : 'Cetak struk')}
                        </Button>
                    </>
                }
            >
                <div className={showReturnForm ? 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]' : 'mx-auto w-full max-w-4xl'}>
                    <div className="space-y-5">
                        <section data-print-receipt className="rounded-2xl bg-card p-6 shadow-xl shadow-black/8 md:p-9">
                            <header className="border-b-2 border-dashed border-border pb-6 text-center">
                                <p className="font-bold tracking-wide text-foreground uppercase">{receipt.store_name}</p>
                                {receipt.show_address && receipt.address && (
                                    <p className="mx-auto mt-1 max-w-sm text-xs text-muted-foreground">{receipt.address}</p>
                                )}
                                <p className="text-xs font-bold tracking-[0.24em] text-primary uppercase">{receipt.header}</p>
                                <h1 className="mt-2 font-sans text-3xl text-foreground">{sale.document_number}</h1>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    {ledgerDateTime(sale.occurred_at, timezone)}
                                    {receipt.show_cashier && ` · Kasir ${sale.cashier_name}`}
                                </p>
                                {sale.sales_channel === 'marketplace' && (
                                    <p className="mt-1 text-xs font-bold text-primary">
                                        {sale.marketplace_label ?? 'Marketplace'}
                                        {sale.external_order_number && ` · ${translate('Pesanan')} ${sale.external_order_number}`}
                                    </p>
                                )}
                                {sale.customer_name && sale.customer_phone && (
                                    <div className="mt-1 text-xs font-semibold text-muted-foreground">
                                        <p>
                                            Pelanggan {sale.customer_name} · {sale.customer_phone}
                                        </p>
                                        {sale.customer_email && <p>{sale.customer_email}</p>}
                                    </div>
                                )}
                            </header>
                            <div className="divide-y divide-border">
                                {items.map((item) => (
                                    <div key={item.public_id} className="grid grid-cols-[1fr_auto] gap-3 py-4">
                                        <div>
                                            <p className="font-bold text-foreground">{item.product_name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {quantity(item.quantity)} {item.unit_symbol} × {money(item.unit_price)}
                                                {Number(item.returned_quantity) > 0 ? ` · diretur ${quantity(item.returned_quantity)}` : ''}
                                            </p>
                                        </div>
                                        <p className="font-semibold">{money(item.net_total)}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="space-y-2 border-t-2 border-dashed border-border pt-5 text-sm">
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Subtotal</span>
                                    <span>{money(sale.subtotal)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Diskon item</span>
                                    <span>-{money(sale.item_discount_amount)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Diskon transaksi</span>
                                    <span>-{money(sale.transaction_discount_amount)}</span>
                                </div>
                                <div className="flex justify-between pt-2 text-xl font-bold text-[var(--app-ink)]">
                                    <span>Total</span>
                                    <span>{money(sale.total_amount)}</span>
                                </div>
                                <div className="flex justify-between text-muted-foreground">
                                    <span>Dibayar via {payment.account_name}</span>
                                    <span>{money(payment.tendered_amount)}</span>
                                </div>
                                <div className="flex justify-between font-bold text-primary">
                                    <span>Kembalian</span>
                                    <span>{money(payment.change_amount)}</span>
                                </div>
                            </div>
                            {sale.notes && (
                                <p className="mt-5 rounded-xl bg-muted p-3 text-xs text-muted-foreground">Catatan: {sale.notes}</p>
                            )}
                            {payment.proof_url && (
                                <Button asChild size="touch" variant="outline" className="mt-4 w-full print:hidden">
                                    <a href={payment.proof_url} target="_blank" rel="noreferrer">
                                        <FileCheck2 className="size-4" />
                                        {translate('Lihat bukti pembayaran')}
                                    </a>
                                </Button>
                            )}
                            <p className="mt-7 text-center text-xs text-muted-foreground">{receipt.footer}</p>
                        </section>
                        {canViewProfit && (
                            <section className="grid gap-3 sm:grid-cols-2 print:hidden">
                                <div className="rounded-2xl bg-[var(--app-primary)] p-5 text-[var(--app-primary-foreground)]">
                                    <p className="text-xs text-[var(--app-primary-foreground)]/70">HPP penjualan</p>
                                    <p className="mt-1 text-2xl font-bold">{money(cogs)}</p>
                                </div>
                                <div className="rounded-2xl bg-secondary p-5 text-secondary-foreground">
                                    <p className="text-xs text-muted-foreground">Laba kotor</p>
                                    <p className="mt-1 text-2xl font-bold">{money(profit)}</p>
                                </div>
                            </section>
                        )}
                        {returns.length > 0 && (
                            <section className="rounded-2xl border border-border bg-card p-6 print:hidden">
                                <h2 className="font-sans text-2xl">Riwayat retur</h2>
                                <div className="mt-4 divide-y divide-border">
                                    {returns.map((entry) => (
                                        <div key={entry.public_id} className="flex justify-between gap-4 py-3">
                                            <div>
                                                <p className="font-bold">{entry.document_number}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {ledgerDateTime(entry.occurred_at, timezone)} · {entry.account_name}
                                                </p>
                                            </div>
                                            <p className="font-bold text-destructive">-{money(entry.refund_amount)}</p>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        )}
                    </div>
                    {showReturnForm && canReturn && (
                        <form
                            onSubmit={submitReturn}
                            className="h-fit rounded-2xl border border-border bg-card p-6 shadow-sm xl:sticky xl:top-5 print:hidden"
                        >
                            <div className="flex items-start gap-3">
                                <span className="grid size-11 place-items-center rounded-2xl bg-destructive/10 text-destructive">
                                    <RotateCcw className="size-5" />
                                </span>
                                <div>
                                    <h2 className="font-sans text-2xl">Retur penjualan</h2>
                                    <p className="text-xs leading-5 text-muted-foreground">
                                        Refund dan pemulihan stok diposting bersamaan.
                                    </p>
                                </div>
                            </div>
                            {returnableItems.length > 0 ? (
                                <>
                                    <div className="mt-5 space-y-3">
                                        {returnableItems.map((item, index) => (
                                            <label key={item.public_id} className="block rounded-2xl bg-muted p-3 text-sm font-semibold">
                                                <span className="flex justify-between gap-3">
                                                    <span>{item.product_name}</span>
                                                    <span className="text-xs text-muted-foreground">
                                                        Maks. {quantity(item.returnable_quantity)} {item.unit_symbol}
                                                    </span>
                                                </span>
                                                <input
                                                    className={`${fieldClass} mt-2`}
                                                    type="number"
                                                    min="0"
                                                    max={item.returnable_quantity}
                                                    step="0.000001"
                                                    value={returnForm.data.items[index]?.quantity ?? '0'}
                                                    onChange={(event) =>
                                                        returnForm.setData(
                                                            'items',
                                                            returnForm.data.items.map((input, itemIndex) =>
                                                                itemIndex === index
                                                                    ? {
                                                                          ...input,
                                                                          quantity: event.target.value,
                                                                      }
                                                                    : input,
                                                            ),
                                                        )
                                                    }
                                                />
                                            </label>
                                        ))}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="link"
                                        className="mt-3 h-auto px-0 text-xs"
                                        onClick={() =>
                                            returnForm.setData(
                                                'items',
                                                returnableItems.map((item) => ({
                                                    sale_item_id: item.public_id,
                                                    quantity: item.returnable_quantity,
                                                })),
                                            )
                                        }
                                    >
                                        Pilih semua sisa untuk retur penuh
                                    </Button>
                                    <div className="mt-5 grid gap-3">
                                        <label className="text-sm font-semibold">
                                            Akun refund
                                            <select
                                                className={`${fieldClass} mt-1`}
                                                value={returnForm.data.account_id}
                                                onChange={(event) => returnForm.setData('account_id', event.target.value)}
                                            >
                                                {accounts.map((account) => (
                                                    <option key={account.public_id} value={account.public_id}>
                                                        {account.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </label>
                                        <label className="text-sm font-semibold">
                                            Waktu retur
                                            <input
                                                className={`${fieldClass} mt-1`}
                                                type="datetime-local"
                                                value={returnForm.data.occurred_at}
                                                onChange={(event) => returnForm.setData('occurred_at', event.target.value)}
                                            />
                                        </label>
                                        <input
                                            className={fieldClass}
                                            placeholder="Alasan / catatan retur"
                                            value={returnForm.data.notes}
                                            onChange={(event) => returnForm.setData('notes', event.target.value)}
                                            maxLength={500}
                                        />
                                    </div>
                                    <div className="mt-5 flex justify-between rounded-2xl bg-destructive/10 p-4 font-bold text-destructive">
                                        <span>Estimasi refund</span>
                                        <span>{money(estimatedRefund)}</span>
                                    </div>
                                    {Object.keys(returnForm.errors).length > 0 && (
                                        <p className="mt-3 text-sm text-destructive">
                                            Retur gagal. Periksa quantity, akun refund, saldo, dan waktu transaksi.
                                        </p>
                                    )}
                                    <Button
                                        type="submit"
                                        size="checkout"
                                        variant="destructive"
                                        disabled={
                                            returnForm.processing ||
                                            estimatedRefund < 0 ||
                                            !returnForm.data.items.some((item) => Number(item.quantity) > 0)
                                        }
                                        className="mt-4 w-full"
                                    >
                                        Posting retur
                                    </Button>
                                </>
                            ) : (
                                <p className="mt-6 rounded-2xl bg-muted p-5 text-sm text-muted-foreground">
                                    Semua item pada penjualan ini sudah diretur.
                                </p>
                            )}
                        </form>
                    )}
                </div>
            </AppPage>
        </>
    );
}
