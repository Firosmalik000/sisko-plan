import { useForm } from '@inertiajs/react';
import { Landmark, Plus, ReceiptText } from 'lucide-react';
import { useMemo, useState } from 'react';
import { FormCurrencyInput, FormInput, FormSelect, FormTextarea } from '@/components/forms';
import { ResponsiveDialog } from '@/components/overlays';
import { AppPage } from '@/components/page/app-page';
import { Button } from '@/components/ui/button';
import { formatMoney } from '@/lib/currency';
import { currentDateTime } from '@/lib/date-time';
import { useTranslation } from '@/lib/i18n';
import { postingToken } from '@/lib/posting-token';
import salesRoutes from '@/routes/sales';

type Sale = { public_id: string; document_number: string; marketplace_code: string; marketplace_name: string; total_amount: string };
type Settlement = {
    id: number;
    public_id: string;
    currency_code: string;
    gross_amount: string;
    fee_amount: string;
    other_deduction_amount: string;
    net_amount: string;
    occurred_at: string;
    reversal_of_settlement_id: number | null;
};

export default function MarketplaceSettlements({
    sales,
    accounts,
    settlements,
    marketplaces,
    timezone,
}: {
    sales: Sale[];
    accounts: Array<{ public_id: string; name: string }>;
    settlements: { data: Settlement[] };
    marketplaces: Array<{ code: string; label: string }>;
    timezone: string;
}) {
    const { t } = useTranslation();
    const [open, setOpen] = useState(false);
    const form = useForm({
        marketplace_code: marketplaces[0]?.code ?? '',
        destination_account_id: accounts[0]?.public_id ?? '',
        sale_ids: [] as string[],
        fee_amount: '0',
        other_deduction_amount: '0',
        occurred_at: currentDateTime(timezone, true),
        notes: '',
        idempotency_key: postingToken(),
    });
    const eligible = sales.filter((sale) => sale.marketplace_code === form.data.marketplace_code);
    const gross = useMemo(
        () => sales.filter((sale) => form.data.sale_ids.includes(sale.public_id)).reduce((sum, sale) => sum + Number(sale.total_amount), 0),
        [sales, form.data.sale_ids],
    );
    const net = Math.max(0, gross - Number(form.data.fee_amount || 0) - Number(form.data.other_deduction_amount || 0));
    const toggleSale = (id: string) =>
        form.setData(
            'sale_ids',
            form.data.sale_ids.includes(id) ? form.data.sale_ids.filter((value) => value !== id) : [...form.data.sale_ids, id],
        );
    const submit = () =>
        form.post(salesRoutes.settlements.store.url(), {
            preserveScroll: true,
            onSuccess: () => {
                form.reset();
                form.setData('idempotency_key', postingToken());
                setOpen(false);
            },
        });

    return (
        <AppPage
            title={t('Marketplace settlements')}
            description={t('Reconcile marketplace balances into your bank or wallet account.')}
            icon={Landmark}
            headerSurface
            actions={
                <Button onClick={() => setOpen(true)} disabled={sales.length === 0 || accounts.length === 0}>
                    <Plus className="size-4" /> {t('Post settlement')}
                </Button>
            }
        >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {settlements.data.map((settlement) => (
                    <article key={settlement.public_id} className="rounded-2xl border border-border bg-card p-4">
                        <div className="flex items-center justify-between gap-3">
                            <ReceiptText className="size-5 text-primary" />
                            <span className="text-xs text-muted-foreground">{settlement.occurred_at}</span>
                        </div>
                        <p className="mt-4 text-2xl font-bold tabular-nums">{formatMoney(settlement.net_amount)}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                            {t('Gross')} {formatMoney(settlement.gross_amount)} · {t('Deductions')}{' '}
                            {formatMoney(Number(settlement.fee_amount) + Number(settlement.other_deduction_amount))}
                        </p>
                        {settlement.reversal_of_settlement_id && (
                            <span className="mt-3 inline-flex rounded-full bg-destructive/10 px-2.5 py-1 text-xs font-semibold text-destructive">
                                {t('Reversal')}
                            </span>
                        )}
                    </article>
                ))}
                {settlements.data.length === 0 && (
                    <p className="rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
                        {t('No marketplace settlement yet.')}
                    </p>
                )}
            </div>
            <ResponsiveDialog
                open={open}
                onOpenChange={setOpen}
                title={t('Post marketplace settlement')}
                description={t('This posting is immutable. Review the selected sales and amounts before confirming.')}
                size="lg"
                bodyClassName="space-y-5"
            >
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormSelect
                        id="settlement-marketplace"
                        name="marketplace_code"
                        label={t('Marketplace')}
                        value={form.data.marketplace_code}
                        onChange={(event) => form.setData((data) => ({ ...data, marketplace_code: event.target.value, sale_ids: [] }))}
                        error={form.errors.marketplace_code}
                        required
                    >
                        {marketplaces.map((marketplace) => (
                            <option key={marketplace.code} value={marketplace.code}>
                                {marketplace.label}
                            </option>
                        ))}
                    </FormSelect>
                    <FormSelect
                        id="settlement-account"
                        name="destination_account_id"
                        label={t('Destination account')}
                        value={form.data.destination_account_id}
                        onChange={(event) => form.setData('destination_account_id', event.target.value)}
                        error={form.errors.destination_account_id}
                        required
                    >
                        {accounts.map((account) => (
                            <option key={account.public_id} value={account.public_id}>
                                {account.name}
                            </option>
                        ))}
                    </FormSelect>
                </div>
                <fieldset>
                    <legend className="text-sm font-semibold">{t('Eligible sales')}</legend>
                    <div className="mt-2 max-h-52 space-y-2 overflow-y-auto">
                        {eligible.map((sale) => (
                            <label key={sale.public_id} className="flex min-h-12 items-center gap-3 rounded-xl border border-border px-3">
                                <input
                                    type="checkbox"
                                    checked={form.data.sale_ids.includes(sale.public_id)}
                                    onChange={() => toggleSale(sale.public_id)}
                                />
                                <span className="min-w-0 flex-1 truncate text-sm font-semibold">{sale.document_number}</span>
                                <span className="text-sm tabular-nums">{formatMoney(sale.total_amount)}</span>
                            </label>
                        ))}
                        {eligible.length === 0 && (
                            <p className="text-sm text-muted-foreground">{t('No unsettled sales for this marketplace.')}</p>
                        )}
                    </div>
                    {form.errors.sale_ids && <p className="mt-1 text-xs text-destructive">{form.errors.sale_ids}</p>}
                </fieldset>
                <div className="grid gap-4 sm:grid-cols-2">
                    <FormCurrencyInput
                        id="settlement-fee"
                        name="fee_amount"
                        label={t('Marketplace fee')}
                        value={form.data.fee_amount}
                        onValueChange={(value) => form.setData('fee_amount', value)}
                        error={form.errors.fee_amount}
                    />
                    <FormCurrencyInput
                        id="settlement-deduction"
                        name="other_deduction_amount"
                        label={t('Refund or other adjustment')}
                        value={form.data.other_deduction_amount}
                        onValueChange={(value) => form.setData('other_deduction_amount', value)}
                        error={form.errors.other_deduction_amount}
                    />
                </div>
                <FormInput
                    id="settlement-time"
                    name="occurred_at"
                    type="datetime-local"
                    step="1"
                    label={t('Settlement time')}
                    value={form.data.occurred_at}
                    onChange={(event) => form.setData('occurred_at', event.target.value)}
                    error={form.errors.occurred_at}
                    required
                />
                <FormTextarea
                    id="settlement-notes"
                    name="notes"
                    label={t('Notes')}
                    value={form.data.notes}
                    onChange={(event) => form.setData('notes', event.target.value)}
                    error={form.errors.notes}
                />
                <div className="rounded-2xl bg-secondary p-4">
                    <p className="text-xs font-semibold text-muted-foreground">{t('Net payout')}</p>
                    <p className="mt-1 text-2xl font-bold tabular-nums">{formatMoney(net)}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                        {t('Gross')} {formatMoney(gross)}
                    </p>
                </div>
                <Button
                    className="min-h-11 w-full"
                    disabled={form.processing || form.data.sale_ids.length === 0 || net <= 0}
                    onClick={submit}
                >
                    {form.processing ? t('Posting...') : t('Confirm immutable settlement')}
                </Button>
            </ResponsiveDialog>
        </AppPage>
    );
}
