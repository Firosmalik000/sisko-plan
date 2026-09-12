import { Form, usePage } from '@inertiajs/react';
import { Archive, Building2, Coins, Globe2, Mail, MapPin, RotateCcw, Shield, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { FormInput, FormSelect, FormTextarea } from '@/components/forms';
import InputError from '@/components/input-error';
import { ResponsiveDialog } from '@/components/overlays';
import { AppPage } from '@/components/page/app-page';
import { PageSection } from '@/components/page/page-section';
import { RecordList, RecordListRow } from '@/components/page/record-list';
import { SubscriptionLimitContactDialog } from '@/components/subscription-limit-contact-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { translate } from '@/lib/i18n';
import { cn } from '@/lib/utils';
import storesRoutes from '@/routes/stores';

type Member = {
    id: number;
    name: string;
    email: string;
    role: 'owner' | 'admin' | 'cashier';
    status: 'active' | 'suspended';
};

type StoreDetail = {
    public_id: string;
    name: string;
    status: string;
    owner_user_id: number;
    can_manage: boolean;
    can_archive: boolean;
    can_restore: boolean;
    can_delete: boolean;
    country_editable: boolean;
    country_code: string | null;
    country_name: string | null;
    currency_code: string | null;
    currency_symbol: string | null;
    address: string | null;
    members: Member[];
};

type CountryOption = {
    code: string;
    name: string;
    currency_code: string;
    currency_symbol: string;
    is_active: boolean;
};

type SubscriptionState = {
    can_write: boolean;
    max_members: number;
    members_used: number;
};

function StoreFact({ icon: Icon, label, value, wide = false }: { icon: typeof MapPin; label: string; value: string; wide?: boolean }) {
    return (
        <div className={cn('flex min-w-0 items-start gap-3 py-1', wide && 'sm:col-span-2')}>
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-secondary text-primary">
                <Icon className="size-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
                <p className="text-xs font-semibold text-muted-foreground">{translate(label)}</p>
                <p className="mt-0.5 font-semibold break-words text-foreground">{value}</p>
            </div>
        </div>
    );
}

export default function StoreShow({ store, countries }: { store: StoreDetail; countries: CountryOption[] }) {
    const [editOpen, setEditOpen] = useState(false);
    const [archiveOpen, setArchiveOpen] = useState(false);
    const [deleteOpen, setDeleteOpen] = useState(false);
    const [memberOpen, setMemberOpen] = useState(false);
    const [staffLimitOpen, setStaffLimitOpen] = useState(false);
    const [memberMode, setMemberMode] = useState<'create' | 'link'>('create');
    const { subscriptionState } = usePage<{ subscriptionState: SubscriptionState | null }>().props;
    const memberLimitReached = Boolean(
        subscriptionState?.can_write &&
        subscriptionState.max_members > 0 &&
        subscriptionState.members_used >= subscriptionState.max_members,
    );
    const statusLabel = store.status === 'active' ? 'Toko aktif' : store.status === 'archived' ? 'Toko diarsipkan' : 'Toko ditangguhkan';

    return (
        <>
            <AppPage
                title={store.name}
                description={translate('Detail toko dan anggota')}
                icon={Building2}
                back={{ href: storesRoutes.index.url(), label: translate('Kembali ke daftar toko') }}
                actions={<Badge variant={store.status === 'active' ? 'secondary' : 'destructive'}>{translate(statusLabel)}</Badge>}
            >
                <PageSection title={translate('Informasi toko')}>
                    <div className="grid gap-x-8 gap-y-4 p-4 sm:grid-cols-2 sm:p-5">
                        <StoreFact icon={MapPin} label="Alamat toko" value={store.address ?? '-'} wide />
                        <StoreFact icon={Globe2} label="Negara" value={store.country_name ?? store.country_code ?? '-'} />
                        <StoreFact
                            icon={Coins}
                            label="Mata uang"
                            value={`${store.currency_code ?? '-'}${store.currency_symbol ? ` (${store.currency_symbol})` : ''}`}
                        />
                    </div>
                </PageSection>

                {store.can_manage && (
                    <PageSection title={translate('Kelola toko')}>
                        <div className="flex flex-wrap gap-2 p-4 sm:justify-end sm:p-5">
                            <Button type="button" variant="outline" size="touch" onClick={() => setEditOpen(true)}>
                                {translate('Ubah identitas')}
                            </Button>
                            {memberLimitReached ? (
                                <Button type="button" variant="outline" size="touch" onClick={() => setStaffLimitOpen(true)}>
                                    <UserPlus /> {translate('Tambah kapasitas staf')}
                                </Button>
                            ) : (
                                <Button type="button" size="touch" onClick={() => setMemberOpen(true)}>
                                    <UserPlus /> {translate('Tambah anggota')}
                                </Button>
                            )}
                            {store.can_archive && (
                                <Button type="button" variant="destructive" size="touch" onClick={() => setArchiveOpen(true)}>
                                    <Archive /> {translate('Arsipkan toko')}
                                </Button>
                            )}
                        </div>
                    </PageSection>
                )}

                {store.can_restore && (
                    <PageSection>
                        <div className="grid gap-2 p-4 sm:grid-cols-2 sm:p-5">
                            <Form {...storesRoutes.restore.form(store.public_id)}>
                                {({ processing, errors }) => (
                                    <>
                                        <Button disabled={processing} size="touch" className="w-full">
                                            <RotateCcw /> {translate('Pulihkan toko')}
                                        </Button>
                                        <InputError className="mt-2" message={errors.name ?? errors.subscription} />
                                    </>
                                )}
                            </Form>
                            {store.can_delete && (
                                <Button type="button" variant="destructive" size="touch" onClick={() => setDeleteOpen(true)}>
                                    <Trash2 /> {translate('Hapus permanen')}
                                </Button>
                            )}
                        </div>
                    </PageSection>
                )}

                <PageSection title={translate('Anggota toko')} actions={<Badge variant="outline">{store.members.length}</Badge>}>
                    <RecordList className="rounded-none border-0">
                        {store.members.map((member) => (
                            <RecordListRow key={member.id} className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                                <div className="flex min-w-0 items-center gap-3">
                                    <span className="grid size-10 shrink-0 place-items-center rounded-full bg-secondary text-sm font-semibold text-primary">
                                        {member.name.slice(0, 2).toUpperCase()}
                                    </span>
                                    <div className="min-w-0">
                                        <p className="truncate font-semibold">{member.name}</p>
                                        <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
                                            <Mail className="size-3.5 shrink-0" aria-hidden="true" />
                                            {member.email}
                                        </p>
                                        <div className="mt-2 flex flex-wrap items-center gap-2 sm:hidden">
                                            <Badge variant="outline">{translate(member.role)}</Badge>
                                            <Badge variant={member.status === 'active' ? 'secondary' : 'destructive'}>
                                                {translate(member.status === 'active' ? 'Aktif' : 'Nonaktif')}
                                            </Badge>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                                    <div className="hidden items-center gap-2 sm:flex">
                                        <Shield className="size-4 text-muted-foreground" aria-hidden="true" />
                                        <Badge variant="outline">{translate(member.role)}</Badge>
                                        <Badge variant={member.status === 'active' ? 'secondary' : 'destructive'}>
                                            {translate(member.status === 'active' ? 'Aktif' : 'Nonaktif')}
                                        </Badge>
                                    </div>
                                    {store.can_manage && member.id !== store.owner_user_id && (
                                        <Form
                                            {...storesRoutes.members.update.form({ store: store.public_id, member: member.id })}
                                            className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none"
                                        >
                                            {({ processing }) => (
                                                <>
                                                    <select
                                                        aria-label={translate('Peran')}
                                                        name="role"
                                                        defaultValue={member.role}
                                                        className="h-10 min-w-0 flex-1 rounded-xl border border-input bg-background px-3 text-sm text-foreground sm:flex-none"
                                                    >
                                                        <option value="cashier">{translate('Kasir')}</option>
                                                        <option value="admin">{translate('Admin toko')}</option>
                                                    </select>
                                                    <input
                                                        type="hidden"
                                                        name="status"
                                                        value={member.status === 'active' ? 'suspended' : 'active'}
                                                    />
                                                    <Button size="sm" variant="outline" disabled={processing}>
                                                        {translate(member.status === 'active' ? 'Nonaktifkan' : 'Aktifkan')}
                                                    </Button>
                                                </>
                                            )}
                                        </Form>
                                    )}
                                </div>
                            </RecordListRow>
                        ))}
                    </RecordList>
                </PageSection>
            </AppPage>

            <ResponsiveDialog
                open={editOpen}
                onOpenChange={setEditOpen}
                title={translate('Ubah identitas toko')}
                size="md"
                footer={
                    <>
                        <Button type="button" variant="outline" size="touch" onClick={() => setEditOpen(false)}>
                            {translate('Batal')}
                        </Button>
                        <Button type="submit" form="edit-store-form" size="touch">
                            {translate('Simpan perubahan')}
                        </Button>
                    </>
                }
            >
                <Form
                    id="edit-store-form"
                    {...storesRoutes.update.form(store.public_id)}
                    className="grid gap-4"
                    onSuccess={() => setEditOpen(false)}
                >
                    {({ errors }) => (
                        <>
                            <FormInput
                                id="store-name"
                                name="name"
                                label={translate('Nama toko')}
                                defaultValue={store.name}
                                placeholder={translate('Contoh: Toko Berkah Utama')}
                                required
                                maxLength={120}
                                error={errors.name}
                            />
                            <FormTextarea
                                id="store-address"
                                name="address"
                                label={translate('Alamat toko')}
                                defaultValue={store.address ?? ''}
                                rows={3}
                                maxLength={500}
                                placeholder={translate('Contoh: Jalan Utama No. 10')}
                                error={errors.address}
                            />
                            {store.country_editable ? (
                                <FormSelect
                                    id="store-country"
                                    name="country"
                                    label={translate('Negara toko')}
                                    defaultValue={store.country_code ?? ''}
                                    error={errors.country}
                                >
                                    {countries.map((country) => (
                                        <option key={country.code} value={country.code} disabled={!country.is_active}>
                                            {country.name} · {country.currency_code} ({country.currency_symbol})
                                        </option>
                                    ))}
                                </FormSelect>
                            ) : (
                                <div>
                                    <p className="mb-1.5 text-sm font-semibold">{translate('Negara toko')}</p>
                                    <div className="flex h-11 items-center rounded-xl border border-input bg-muted/40 px-3 text-sm font-semibold">
                                        {store.country_name ?? store.country_code ?? '-'} · {store.currency_code ?? '-'} (
                                        {store.currency_symbol})
                                    </div>
                                    <p className="mt-1.5 text-xs text-muted-foreground">
                                        {translate('Negara terkunci karena toko sudah memiliki transaksi.')}
                                    </p>
                                </div>
                            )}
                        </>
                    )}
                </Form>
            </ResponsiveDialog>

            <ResponsiveDialog
                open={archiveOpen}
                onOpenChange={setArchiveOpen}
                title={translate('Arsipkan toko?')}
                size="sm"
                footer={
                    <>
                        <Button type="button" variant="outline" size="touch" onClick={() => setArchiveOpen(false)}>
                            {translate('Batal')}
                        </Button>
                        <Form {...storesRoutes.destroy.form(store.public_id)}>
                            {({ processing }) => (
                                <Button variant="destructive" size="touch" disabled={processing} className="w-full">
                                    <Archive /> {translate('Arsipkan')}
                                </Button>
                            )}
                        </Form>
                    </>
                }
            >
                <p className="text-sm leading-6 text-muted-foreground">
                    {translate('Toko tidak dapat dipakai bertransaksi, tetapi seluruh data dan riwayat tetap tersimpan.')}
                </p>
            </ResponsiveDialog>

            <ResponsiveDialog
                open={deleteOpen}
                onOpenChange={setDeleteOpen}
                title={translate('Hapus toko permanen?')}
                size="sm"
                footer={
                    <>
                        <Button type="button" variant="outline" size="touch" onClick={() => setDeleteOpen(false)}>
                            {translate('Batal')}
                        </Button>
                        <Button type="submit" form="delete-store-form" variant="destructive" size="touch">
                            <Trash2 /> {translate('Hapus permanen')}
                        </Button>
                    </>
                }
            >
                <p className="mb-4 text-sm leading-6 text-muted-foreground">
                    {translate('Semua produk, transaksi, anggota, dan riwayat toko akan dihapus dan tidak dapat dipulihkan.')}
                </p>
                <Form id="delete-store-form" {...storesRoutes.forceDestroy.form(store.public_id)}>
                    {({ errors }) => (
                        <>
                            <input type="hidden" name="confirmation" value="1" />
                            <FormInput
                                id="delete-store-name"
                                name="store_name"
                                label={translate('Ketik nama toko')}
                                placeholder={store.name}
                                autoComplete="off"
                                required
                                error={errors.store_name}
                            />
                        </>
                    )}
                </Form>
            </ResponsiveDialog>

            <ResponsiveDialog
                open={memberOpen && !memberLimitReached}
                onOpenChange={setMemberOpen}
                title={translate('Tambah anggota')}
                size="md"
                footer={
                    <>
                        <Button type="button" variant="outline" size="touch" onClick={() => setMemberOpen(false)}>
                            {translate('Batal')}
                        </Button>
                        <Button type="submit" form="member-form" size="touch">
                            {translate(memberMode === 'create' ? 'Buat akun pekerja' : 'Hubungkan akun')}
                        </Button>
                    </>
                }
            >
                <Form
                    id="member-form"
                    {...storesRoutes.members.store.form(store.public_id)}
                    className="grid gap-4"
                    resetOnSuccess
                    onSuccess={() => setMemberOpen(false)}
                >
                    {({ errors }) => (
                        <>
                            <input type="hidden" name="mode" value={memberMode} />
                            <div className="grid grid-cols-2 rounded-xl bg-muted p-1">
                                {(['create', 'link'] as const).map((mode) => (
                                    <button
                                        key={mode}
                                        type="button"
                                        aria-pressed={memberMode === mode}
                                        onClick={() => setMemberMode(mode)}
                                        className={cn(
                                            'min-h-10 rounded-lg px-3 text-sm font-semibold transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none',
                                            memberMode === mode ? 'bg-card text-foreground' : 'text-muted-foreground hover:text-foreground',
                                        )}
                                    >
                                        {translate(mode === 'create' ? 'Buat akun baru' : 'Akun sudah ada')}
                                    </button>
                                ))}
                            </div>
                            {memberMode === 'create' && (
                                <FormInput
                                    id="member-name"
                                    name="name"
                                    label={translate('Nama pekerja')}
                                    placeholder={translate('Contoh: Siti Rahma')}
                                    autoComplete="name"
                                    required
                                    maxLength={255}
                                    error={errors.name}
                                />
                            )}
                            <FormInput
                                id="member-email"
                                name="email"
                                label={translate('Email')}
                                type="email"
                                autoComplete="email"
                                placeholder="anggota@example.com"
                                required
                                error={errors.email}
                            />
                            {memberMode === 'create' && (
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <FormInput
                                        id="member-password"
                                        name="password"
                                        label={translate('Password awal')}
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder={translate('Minimal 8 karakter')}
                                        required
                                        error={errors.password}
                                    />
                                    <FormInput
                                        id="member-password-confirmation"
                                        name="password_confirmation"
                                        label={translate('Ulangi password')}
                                        type="password"
                                        autoComplete="new-password"
                                        placeholder={translate('Ketik ulang password')}
                                        required
                                        error={errors.password_confirmation}
                                    />
                                </div>
                            )}
                            <FormSelect id="member-role" name="role" label={translate('Peran')} defaultValue="cashier" error={errors.role}>
                                <option value="cashier">{translate('Kasir')}</option>
                                <option value="admin">{translate('Admin toko')}</option>
                            </FormSelect>
                        </>
                    )}
                </Form>
            </ResponsiveDialog>

            <SubscriptionLimitContactDialog kind="staff" open={staffLimitOpen} onOpenChange={setStaffLimitOpen} />
        </>
    );
}

StoreShow.layout = {
    breadcrumbs: [{ title: 'Toko & Anggota', href: storesRoutes.index.url() }],
};
