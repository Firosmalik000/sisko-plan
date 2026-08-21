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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

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
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-[#0b292f]">
                        Riwayat pembayaran
                    </h1>
                    <p className="mt-2 text-sm text-slate-600">
                        Seluruh penerimaan subscription yang dicatat oleh admin
                        platform.
                    </p>
                </div>
                <Badge className="w-fit bg-[#0b292f] px-3 py-1.5 text-white">
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
                    className="grid gap-3 border-b border-[#0b292f]/10 p-4 md:grid-cols-[1.4fr_.7fr_.7fr_.7fr_auto]"
                >
                    <div className="relative">
                        <Search className="absolute top-3 left-3 size-4 text-slate-400" />
                        <Input
                            name="search"
                            defaultValue={filters.search}
                            placeholder="Receipt, referensi, atau toko"
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
                    <Button className="bg-[#0b292f] text-white hover:bg-[#16434c]">
                        Terapkan
                    </Button>
                </Form>

                <div className="overflow-x-auto">
                    <table className="w-full min-w-[980px] text-left text-sm">
                        <thead className="platform-table-head">
                            <tr>
                                <th className="px-5 py-4">Pembayaran</th>
                                <th className="px-5 py-4">Tenant</th>
                                <th className="px-5 py-4">Periode</th>
                                <th className="px-5 py-4">Metode</th>
                                <th className="px-5 py-4">Dicatat oleh</th>
                                <th className="px-5 py-4 text-right">
                                    Nominal
                                </th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#0b292f]/8">
                            {payments.data.map((payment) => (
                                <tr
                                    key={payment.public_id}
                                    className="transition hover:bg-[#0b292f]/[.025]"
                                >
                                    <td className="px-5 py-4">
                                        <p className="font-mono font-bold text-[#0b292f]">
                                            {payment.receipt_number}
                                        </p>
                                        <p className="mt-1 text-xs text-slate-500">
                                            {dateTime(payment.paid_at)}
                                        </p>
                                    </td>
                                    <td className="px-5 py-4 font-semibold">
                                        {payment.store.name}
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
                                    <td className="px-5 py-4 text-right text-base font-black text-[#0b292f]">
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
                <footer className="flex flex-col gap-3 border-t border-[#0b292f]/8 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
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
            className={`platform-panel flex items-center gap-4 p-4 ${accent ? 'border-[#e3b84f]/60 bg-[#fff9e8]' : ''}`}
        >
            <span
                className={`flex size-11 items-center justify-center rounded-xl ${accent ? 'bg-[#e3b84f] text-[#0b292f]' : 'bg-[#0b292f] text-white'}`}
            >
                <Icon className="size-5" />
            </span>
            <div>
                <p className="text-xs font-semibold text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-black tracking-tight text-[#0b292f]">
                    {value}
                </p>
            </div>
        </article>
    );
}

function shortDate(value: string) {
    return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium' }).format(
        new Date(value),
    );
}
function dateTime(value: string) {
    return new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}
