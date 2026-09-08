import { Head, Link, router, usePage } from '@inertiajs/react';
import { ArrowRight, Building2, Coins, LockKeyhole, MapPin, Plus, ScanLine, ShieldCheck, Users } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { translate } from '@/lib/i18n';
import type { StoreCreationState } from '@/types';

type StoreItem = {
    public_id: string;
    name: string;
    status: 'active' | 'suspended' | 'archived';
    role: 'owner' | 'admin' | 'cashier';
    membership_status: 'active' | 'suspended';
    country: string | null;
    country_code: string | null;
    currency_code: string | null;
    currency_symbol: string | null;
};

type AccountUsage = {
    plan_name: string;
    stores_used: number;
    max_stores: number;
    members_used: number;
    max_members: number;
    scans_used: number;
    max_scans: number;
};

export default function StoresIndex({ stores, usage }: { stores: StoreItem[]; usage: AccountUsage | null }) {
    const { storeCreation } = usePage<{
        storeCreation: StoreCreationState;
    }>().props;

    return (
        <>
            <Head title="Toko & Anggota" />
            <div className="flex flex-1 flex-col gap-4 bg-[linear-gradient(180deg,#fffaf7_0%,#fff3ef_100%)] px-3 py-4 sm:px-5 lg:px-8">
                <div className="flex flex-col items-stretch justify-between gap-3 rounded-[1.35rem] border border-[var(--app-ink)]/8 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:p-5">
                    <h1 className="text-2xl font-black tracking-[-0.04em] text-[var(--app-ink)]">Toko & Anggota</h1>
                    {storeCreation.can_create ? (
                        <Button asChild className="h-11 w-full bg-emerald-700 hover:bg-emerald-800 sm:w-auto">
                            <Link href="/stores/create">
                                <Plus /> Tambah toko
                            </Link>
                        </Button>
                    ) : (
                        <Button asChild variant="outline" className="h-11 w-full sm:w-auto">
                            <Link href="/pricing?category=store_capacity#category-store_capacity">
                                <LockKeyhole /> Tambah kapasitas toko
                            </Link>
                        </Button>
                    )}
                </div>

                {usage && (
                    <section
                        className="overflow-hidden rounded-[1.35rem] border border-[var(--app-ink)]/8 bg-white shadow-sm"
                        aria-labelledby="account-capacity-title"
                    >
                        <header className="flex flex-col gap-3 border-b border-[var(--app-ink)]/8 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                            <div className="min-w-0">
                                <h2 id="account-capacity-title" className="text-lg font-black tracking-[-0.025em] text-[var(--app-ink)]">
                                    Sisa kapasitas akun
                                </h2>
                                <p className="mt-0.5 truncate text-sm font-semibold text-muted-foreground">{translate(usage.plan_name)}</p>
                            </div>
                            <Link
                                href="/subscription"
                                className="inline-flex min-h-11 items-center gap-2 self-start rounded-xl px-3 text-sm font-bold text-emerald-800 hover:bg-emerald-50 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none sm:self-auto"
                            >
                                Detail paket <ArrowRight className="size-4" />
                            </Link>
                        </header>
                        <div className="grid divide-y divide-[var(--app-ink)]/8 sm:grid-cols-3 sm:divide-x sm:divide-y-0">
                            <CapacityItem
                                icon={Building2}
                                title="Toko"
                                used={usage.stores_used}
                                limit={usage.max_stores}
                                href="/pricing?category=store_capacity#category-store_capacity"
                            />
                            <CapacityItem
                                icon={Users}
                                title="Staf"
                                used={usage.members_used}
                                limit={usage.max_members}
                                href="/pricing?category=staff_capacity#category-staff_capacity"
                            />
                            <CapacityItem
                                icon={ScanLine}
                                title="Scan bulan ini"
                                used={usage.scans_used}
                                limit={usage.max_scans}
                                href="/pricing?category=scan_capacity#category-scan_capacity"
                            />
                        </div>
                    </section>
                )}

                {stores.length === 0 ? (
                    <div className="rounded-3xl border border-dashed bg-muted/30 px-6 py-20 text-center">
                        <Building2 className="mx-auto mb-5 size-10 text-emerald-700" />
                        <h2 className="text-xl font-semibold">Belum ada toko</h2>
                        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                            Buat toko pertama untuk mengaktifkan dashboard dan mulai menyiapkan operasional.
                        </p>
                        {storeCreation.can_create && (
                            <Button asChild className="mt-6 bg-emerald-700 hover:bg-emerald-800">
                                <Link href="/stores/create">Buat toko pertama</Link>
                            </Button>
                        )}
                        {!storeCreation.can_create && (
                            <Button asChild className="mt-6">
                                <Link href="/pricing?category=store_capacity#category-store_capacity">Lihat add-on toko</Link>
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {stores.map((store) => (
                            <Card
                                key={store.public_id}
                                className="gap-3 overflow-hidden rounded-[1.25rem] border-border/70 py-4 transition-shadow hover:shadow-md"
                            >
                                <CardHeader className="border-b bg-muted/20 px-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-700 text-white">
                                            <Building2 className="size-5" />
                                        </div>
                                        <Badge
                                            variant={
                                                store.status === 'active' && store.membership_status === 'active'
                                                    ? 'secondary'
                                                    : 'destructive'
                                            }
                                        >
                                            {store.status === 'active' && store.membership_status === 'active'
                                                ? 'Aktif'
                                                : store.status === 'archived'
                                                  ? 'Diarsipkan'
                                                  : 'Nonaktif'}
                                        </Badge>
                                    </div>
                                    <CardTitle className="mt-2 text-lg">{store.name}</CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-3 px-4 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <ShieldCheck className="size-4" />
                                        <span className="capitalize">{store.role}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Users className="size-4" />
                                        Akses anggota
                                    </div>
                                    <div className="flex min-w-0 items-center gap-2 text-muted-foreground">
                                        <MapPin className="size-4 shrink-0" />
                                        <span className="truncate">{store.country ?? store.country_code ?? '-'}</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Coins className="size-4" />
                                        {store.currency_code ?? '-'} {store.currency_symbol}
                                    </div>
                                </CardContent>
                                <CardFooter className="justify-between border-t px-4 pt-3">
                                    {store.role === 'owner' ? (
                                        <Button variant="ghost" asChild className="h-11">
                                            <Link href={`/stores/${store.public_id}`}>
                                                Kelola <ArrowRight />
                                            </Link>
                                        </Button>
                                    ) : (
                                        <span className="text-xs text-muted-foreground capitalize">Akses {store.role}</span>
                                    )}
                                    {store.status === 'active' && store.membership_status === 'active' && (
                                        <Button
                                            variant="outline"
                                            className="h-11"
                                            onClick={() =>
                                                router.post(
                                                    `/stores/${store.public_id}/switch`,
                                                    {},
                                                    {
                                                        preserveState: false,
                                                        preserveScroll: false,
                                                    },
                                                )
                                            }
                                        >
                                            Pilih toko
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

StoresIndex.layout = {
    breadcrumbs: [{ title: 'Toko & Anggota', href: '/stores' }],
};

function CapacityItem({
    icon: Icon,
    title,
    used,
    limit,
    href,
}: {
    icon: typeof Building2;
    title: string;
    used: number;
    limit: number;
    href: string;
}) {
    const unlimited = limit === 0;
    const remaining = unlimited ? null : Math.max(0, limit - used);
    const percentage = unlimited ? 0 : Math.min(100, (used / limit) * 100);
    const depleted = remaining === 0;
    const low = !depleted && percentage >= 80;
    const status = unlimited ? 'Tanpa batas' : depleted ? 'Habis' : low ? 'Menipis' : 'Tersedia';
    const statusClass = depleted ? 'bg-red-100 text-red-800' : low ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800';

    return (
        <Link
            href={href}
            aria-label={`Tambah kapasitas ${title}`}
            className="group block min-w-0 p-4 transition-colors hover:bg-emerald-50/60 focus-visible:bg-emerald-50/60 focus-visible:ring-2 focus-visible:ring-emerald-700 focus-visible:outline-none focus-visible:ring-inset sm:p-5"
        >
            <div className="flex items-start justify-between gap-3">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-emerald-700 text-white">
                    <Icon className="size-5" />
                </span>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${statusClass}`}>{status}</span>
            </div>
            <p className="mt-4 text-sm font-bold text-muted-foreground">{title}</p>
            <div className="mt-1 flex items-end justify-between gap-3">
                <p className="text-2xl font-black tracking-[-0.03em] text-[var(--app-ink)] tabular-nums">
                    {unlimited ? '∞' : `Sisa ${remaining}`}
                </p>
                <ArrowRight className="mb-1 size-4 shrink-0 text-emerald-800 transition-transform group-hover:translate-x-1" />
            </div>
            <p className="mt-1 text-xs font-semibold text-muted-foreground tabular-nums">
                {unlimited ? `${used} terpakai` : `${used} dari ${limit} terpakai`}
            </p>
            {!unlimited && (
                <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
                    <div
                        className={`h-full rounded-full ${depleted ? 'bg-red-600' : low ? 'bg-amber-600' : 'bg-emerald-700'}`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>
            )}
        </Link>
    );
}
