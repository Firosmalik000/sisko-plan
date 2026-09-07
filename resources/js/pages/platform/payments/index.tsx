import { Form, Head } from '@inertiajs/react';
import {
    CalendarDays,
    CreditCard,
    ReceiptText,
    Search,
    WalletCards,
} from 'lucide-react';
import { money } from '@/components/operations-shell';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import {
    paginatedRowNumber,
    PlatformTableLeadCell,
    PlatformTableLeadHeader,
} from '@/components/platform-table-lead-cell';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { localeTag } from '@/lib/currency';

type Payment = {
    public_id: string;
    receipt_number: string;
    amount: string;
    period_start: string;
    period_end: string;
    payment_method: string;
    external_reference: string | null;
    paid_at: string;
    notes: string | null;
    store: { public_id: string; name: string };
    account: { name: string; email: string } | null;
    created_by: string | null;
};

type Props = {
    summary: {
        transactions: number;
        amount: string | number;
        this_month: string | number;
    };
    payments: {
        data: Payment[];
        total: number;
        current_page: number;
        per_page: number;
        last_page: number;
        links: PaginationLink[];
    };
    filters: {
        search: string;
        method: string;
        from: string | null;
        to: string | null;
    };
};

const methodLabels: Record<string, string> = {
    bank_transfer: 'Transfer bank',
    qris: 'QRIS',
    cash: 'Tunai',
    other: 'Lainnya',
};

export default function PaymentHistory({ summary, payments, filters }: Props) {
    return (
        <div className="platform-enter">
            <Head title="Riwayat Pembayaran" />
            <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div>
                    <p className="platform-kicker">Commercial ledger</p>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-[#3b211b]">
                        Riwayat pembayaran
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Seluruh penerimaan subscription yang dicatat oleh admin
                        platform.
                    </p>
                </div>
                <Badge className="w-fit bg-[#d83f22] px-3 py-1.5 text-white">
                    {payments.total} transaksi
                </Badge>
            </header>

            <section className="mt-6 grid gap-3 md:grid-cols-3">
                <SummaryCard
                    icon={ReceiptText}
                    label="Transaksi terfilter"
                    value={String(summary.transactions)}
                />
                <SummaryCard
                    icon={WalletCards}
                    label="Nilai terfilter"
                    value={money(summary.amount)}
                />
                <SummaryCard
                    icon={CreditCard}
                    label="Penerimaan bulan ini"
                    value={money(summary.this_month)}
                    accent
                />
            </section>

            <section className="platform-panel mt-5 overflow-hidden">
                <Form
                    action="/super-admin/payments"
                    method="get"
                    className="grid gap-3 border-b border-[#3b211b]/10 p-4 md:grid-cols-[1.4fr_.7fr_.7fr_.7fr_auto]"
                >
                    <div className="relative">
                        <Search className="absolute top-3 left-3 size-4 text-slate-400" />
                        <Input
                            name="search"
                            defaultValue={filters.search}
                            placeholder="Receipt, akun, atau referensi"
                            className="bg-white pl-9"
                        />
                    </div>
                    <select
                        name="method"
                        defaultValue={filters.method}
                        className="h-10 rounded-md border bg-white px-3 text-sm"
                    >
                        <option value="">Semua metode</option>
                        {Object.entries(methodLabels).map(([value, label]) => (
                            <option key={value} value={value}>
                                {label}
                            </option>
                        ))}
                    </select>
                    <Input
                        name="from"
                        type="date"
                        defaultValue={filters.from ?? ''}
                        className="bg-white"
                        aria-label="Tanggal mulai"
                    />
                    <Input
                        name="to"
                        type="date"
                        defaultValue={filters.to ?? ''}
                        className="bg-white"
                        aria-label="Tanggal selesai"
                    />
                    <Button className="bg-[#d83f22] text-white hover:bg-[#b83219]">
                        Terapkan
                    </Button>
                </Form>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-sm">
                        <thead className="platform-table-head">
                            <tr>
                                <PlatformTableLeadHeader withActions={false} />
                                <th className="px-5 py-4">Pembayaran</th>
                                <th className="px-5 py-4">Akun</th>
                                <th className="px-5 py-4">Periode</th>
                                <th className="px-5 py-4">Metode</th>
                                <th className="px-5 py-4">Dicatat oleh</th>
                                <th className="px-5 py-4 text-right">
                                    Nominal
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3b211b]/8">
                            {payments.data.map((payment, index) => (
                                <tr
                                    key={payment.public_id}
                                    className="transition hover:bg-[#ee4d2d]/[.025]"
                                >
                                    <PlatformTableLeadCell
                                        index={paginatedRowNumber(
                                            payments.current_page,
                                            payments.per_page,
                                            index,
                                        )}
                                        label={payment.receipt_number}
                                    />
                                    <td className="px-5 py-4">
                                        <p className="font-mono font-bold text-[#3b211b]">
                                            {payment.receipt_number}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {dateTime(payment.paid_at)}
                                        </p>
                                    </td>
                                    <td className="px-5 py-4">
                                        <p className="font-semibold">
                                            {payment.account?.name ??
                                                payment.store.name}
                                        </p>
                                        {payment.account && (
                                            <p className="mt-1 text-xs text-slate-500">
                                                {payment.account.email}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-4">
                                        <span className="inline-flex items-center gap-2 text-slate-600">
                                            <CalendarDays className="size-4" />
                                            {shortDate(
                                                payment.period_start,
                                            )} - {shortDate(payment.period_end)}
                                        </span>
                                    </td>
                                    <td className="px-5 py-4">
                                        <Badge variant="outline">
                                            {methodLabels[
                                                payment.payment_method
                                            ] ?? payment.payment_method}
                                        </Badge>
                                        {payment.external_reference && (
                                            <p className="mt-1 text-xs text-slate-500">
                                                {payment.external_reference}
                                            </p>
                                        )}
                                    </td>
                                    <td className="px-5 py-4 text-slate-600">
                                        {payment.created_by ?? '-'}
                                    </td>
                                    <td className="px-5 py-4 text-right text-base font-black text-[#3b211b]">
                                        {money(payment.amount)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {payments.data.length === 0 && (
                    <div className="py-16 text-center text-sm text-slate-500">
                        Belum ada pembayaran pada filter ini.
                    </div>
                )}
                <footer className="flex flex-col gap-3 border-t border-[#3b211b]/8 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>
                        Halaman {payments.current_page} dari{' '}
                        {payments.last_page}
                    </span>
                    <Pagination links={payments.links} />
                </footer>
            </section>
        </div>
    );
}

function SummaryCard({
    icon: Icon,
    label,
    value,
    accent = false,
}: {
    icon: typeof ReceiptText;
    label: string;
    value: string;
    accent?: boolean;
}) {
    return (
        <article
            className={`platform-panel flex items-center gap-4 p-4 ${accent ? 'border-[#ee4d2d]/60 bg-[#fff7f4]' : ''}`}
        >
            <span
                className={`flex size-11 items-center justify-center rounded-xl ${accent ? 'bg-[#ee4d2d] text-[#3b211b]' : 'bg-[#ee4d2d] text-white'}`}
            >
                <Icon className="size-5" />
            </span>
            <div>
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-black tracking-tight text-[#3b211b]">
                    {value}
                </p>
            </div>
        </article>
    );
}

function shortDate(value: string) {
    return new Intl.DateTimeFormat(localeTag(), { dateStyle: 'medium' }).format(
        new Date(value),
    );
}
function dateTime(value: string) {
    return new Intl.DateTimeFormat(localeTag(), {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}
