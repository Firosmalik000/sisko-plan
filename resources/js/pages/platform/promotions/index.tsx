import { Form, Head, router, useForm } from '@inertiajs/react';
import { CalendarClock, ImagePlus, Images, Pause, Pencil, Play, Plus, Search, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { localeTag } from '@/lib/currency';
import { translate } from '@/lib/i18n';
import { cn } from '@/lib/utils';

type Promotion = {
    public_id: string;
    name: string;
    placement: 'dashboard_banner' | 'app_open';
    image_url: string;
    destination_url: string | null;
    locale: 'all' | 'id' | 'ms' | 'vi' | 'en';
    starts_at: string;
    ends_at: string;
    sort_order: number;
    status: 'draft' | 'active' | 'paused';
    runtime_status: 'draft' | 'scheduled' | 'live' | 'paused' | 'expired';
    frequency: 'once_per_session' | 'once_per_day' | 'once_per_campaign' | 'every_app_open' | null;
};

type Props = {
    promotions: {
        data: Promotion[];
        total: number;
        current_page: number;
        last_page: number;
        links: PaginationLink[];
    };
    filters: { search: string; placement: string; status: string; locale: string };
    summary: { live: number; scheduled: number; paused: number; expired: number };
    can_manage: boolean;
};

type FormData = {
    name: string;
    placement: Promotion['placement'];
    locale: Promotion['locale'];
    image: File | null;
    destination_url: string;
    starts_at: string;
    ends_at: string;
    sort_order: number;
    status: Promotion['status'];
    frequency: NonNullable<Promotion['frequency']> | '';
};

const placementLabels = { dashboard_banner: 'Spanduk Beranda', app_open: 'Promosi Saat Aplikasi Dibuka' };
const localeLabels = { all: 'Semua Bahasa', id: 'Indonesia', ms: 'Malaysia', vi: 'Vietnam', en: 'English' };
const statusLabels = { draft: 'Draft', scheduled: 'Terjadwal', live: 'Sedang Tayang', paused: 'Dijeda', expired: 'Berakhir' };
const frequencyLabels = {
    once_per_session: 'Sekali per sesi',
    once_per_day: 'Sekali per hari',
    once_per_campaign: 'Sekali selama promo',
    every_app_open: 'Setiap membuka aplikasi',
};

const blankForm = (): FormData => ({
    name: '',
    placement: 'dashboard_banner',
    locale: 'all',
    image: null,
    destination_url: '',
    starts_at: '',
    ends_at: '',
    sort_order: 0,
    status: 'draft',
    frequency: '',
});

export default function PromotionsIndex({ promotions, filters, summary, can_manage }: Props) {
    const [editing, setEditing] = useState<Promotion | null | undefined>(undefined);
    const form = useForm<FormData>(blankForm());
    const imageInput = useRef<HTMLInputElement>(null);
    const [preview, setPreview] = useState<string | null>(null);

    useEffect(
        () => () => {
            if (preview?.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
        },
        [preview],
    );

    const openCreate = () => {
        form.clearErrors();
        form.setData(blankForm());
        setPreview(null);
        setEditing(null);
    };

    const openEdit = (promotion: Promotion) => {
        form.clearErrors();
        form.setData({
            name: promotion.name,
            placement: promotion.placement,
            locale: promotion.locale,
            image: null,
            destination_url: promotion.destination_url ?? '',
            starts_at: dateTimeInput(promotion.starts_at),
            ends_at: dateTimeInput(promotion.ends_at),
            sort_order: promotion.sort_order,
            status: promotion.status,
            frequency: promotion.frequency ?? '',
        });
        setPreview(promotion.image_url);
        setEditing(promotion);
    };

    const closeForm = () => {
        setEditing(undefined);
        form.reset();
        form.clearErrors();

        if (imageInput.current) {
            imageInput.current.value = '';
        }
    };

    const selectImage = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;

        if (preview?.startsWith('blob:')) {
            URL.revokeObjectURL(preview);
        }

        form.setData('image', file);
        setPreview(file ? URL.createObjectURL(file) : (editing?.image_url ?? null));
    };

    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = { forceFormData: true, preserveScroll: true, onSuccess: closeForm };
        const withUtcDates = (data: FormData) => ({
            ...data,
            starts_at: data.starts_at ? new Date(data.starts_at).toISOString() : '',
            ends_at: data.ends_at ? new Date(data.ends_at).toISOString() : '',
        });

        if (editing) {
            form.transform((data) => ({ ...withUtcDates(data), _method: 'patch' }));
            form.post(`/super-admin/promotions/${editing.public_id}`, options);
        } else {
            form.transform(withUtcDates);
            form.post('/super-admin/promotions', options);
        }
    };

    return (
        <div className="platform-enter pb-16">
            <Head title="Konten & Promosi" />
            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <p className="platform-kicker">Materi platform</p>
                    <h1 className="mt-1 text-3xl font-black tracking-tight text-[#3b211b]">Konten & Promosi</h1>
                    <p className="mt-2 text-sm text-slate-600">Kelola gambar promosi yang tampil di Portal Pelanggan.</p>
                </div>
                {can_manage && (
                    <Button onClick={openCreate} className="bg-[#d83f22] text-white hover:bg-[#b83219]">
                        <Plus className="size-4" /> Tambah Konten
                    </Button>
                )}
            </header>

            <section className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Summary label="Sedang Tayang" value={summary.live} tone="live" />
                <Summary label="Terjadwal" value={summary.scheduled} tone="scheduled" />
                <Summary label="Dijeda" value={summary.paused} tone="paused" />
                <Summary label="Berakhir" value={summary.expired} tone="expired" />
            </section>

            <section className="platform-panel mt-5 overflow-hidden">
                <Form
                    action="/super-admin/promotions"
                    method="get"
                    className="grid gap-3 border-b border-[#3b211b]/10 p-4 lg:grid-cols-[1.4fr_.8fr_.8fr_.8fr_auto]"
                >
                    <div className="relative">
                        <Search className="absolute top-3 left-3 size-4 text-slate-400" />
                        <Input
                            name="search"
                            aria-label={translate('Cari nama internal')}
                            defaultValue={filters.search}
                            placeholder="Cari nama internal"
                            className="bg-white pl-9"
                        />
                    </div>
                    <FilterSelect
                        name="placement"
                        label="Penempatan"
                        value={filters.placement}
                        options={[
                            ['', 'Semua penempatan'],
                            ['dashboard_banner', 'Spanduk Beranda'],
                            ['app_open', 'Promosi Saat Aplikasi Dibuka'],
                        ]}
                    />
                    <FilterSelect
                        name="status"
                        label="Status"
                        value={filters.status}
                        options={[['', 'Semua status'], ...Object.entries(statusLabels)]}
                    />
                    <FilterSelect
                        name="locale"
                        label="Bahasa sasaran"
                        value={filters.locale}
                        options={[
                            ['', 'Semua Bahasa'],
                            ['id', 'Indonesia'],
                            ['ms', 'Malaysia'],
                            ['vi', 'Vietnam'],
                            ['en', 'English'],
                        ]}
                    />
                    <Button className="bg-[#d83f22] text-white hover:bg-[#b83219]">Terapkan</Button>
                </Form>

                <div className="hidden overflow-x-auto md:block">
                    <table className="w-full min-w-[1050px] text-left text-sm">
                        <thead className="platform-table-head">
                            <tr>
                                <th className="px-4 py-4">Poster</th>
                                <th className="px-4 py-4">Nama internal</th>
                                <th className="px-4 py-4">Placement</th>
                                <th className="px-4 py-4">Bahasa</th>
                                <th className="px-4 py-4">Periode</th>
                                <th className="px-4 py-4">Urutan</th>
                                <th className="px-4 py-4">Status</th>
                                <th className="px-4 py-4 text-right">Aksi</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-[#3b211b]/8">
                            {promotions.data.map((promotion) => (
                                <PromotionRow key={promotion.public_id} promotion={promotion} canManage={can_manage} onEdit={openEdit} />
                            ))}
                        </tbody>
                    </table>
                </div>
                <div className="divide-y divide-[#3b211b]/8 md:hidden">
                    {promotions.data.map((promotion) => (
                        <PromotionCard key={promotion.public_id} promotion={promotion} canManage={can_manage} onEdit={openEdit} />
                    ))}
                </div>
                {promotions.data.length === 0 && (
                    <div className="py-16 text-center text-sm text-slate-500">Belum ada konten pada filter ini.</div>
                )}
                <footer className="flex flex-col gap-3 border-t border-[#3b211b]/8 px-5 py-4 text-xs text-slate-500 sm:flex-row sm:items-center sm:justify-between">
                    <span>{promotions.total} konten</span>
                    <Pagination links={promotions.links} />
                </footer>
            </section>

            <Dialog open={editing !== undefined} onOpenChange={(open) => !open && closeForm()}>
                <DialogContent className="max-h-[92svh] overflow-y-auto sm:max-w-3xl">
                    <DialogHeader>
                        <DialogTitle>{editing ? 'Edit Konten' : 'Tambah Konten'}</DialogTitle>
                        <DialogDescription>
                            Gambar adalah materi kreatif akhir; teks promosi tetap berada di dalam gambar.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={submit} className="grid gap-5 lg:grid-cols-[1fr_280px]">
                        <div className="space-y-4">
                            <Field label="Nama internal" error={form.errors.name}>
                                <Input
                                    aria-label={translate('Nama internal')}
                                    value={form.data.name}
                                    onChange={(e) => form.setData('name', e.target.value)}
                                />
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <SelectField
                                    label="Penempatan"
                                    value={form.data.placement}
                                    onChange={(value) =>
                                        form.setData((data) => ({
                                            ...data,
                                            placement: value as Promotion['placement'],
                                            frequency: value === 'app_open' ? data.frequency || 'once_per_day' : '',
                                        }))
                                    }
                                    options={Object.entries(placementLabels)}
                                    error={form.errors.placement}
                                />
                                <SelectField
                                    label="Bahasa sasaran"
                                    value={form.data.locale}
                                    onChange={(value) => form.setData('locale', value as Promotion['locale'])}
                                    options={Object.entries(localeLabels)}
                                    error={form.errors.locale}
                                />
                            </div>
                            <Field
                                label="Gambar promosi"
                                error={form.errors.image}
                                hint={
                                    form.data.placement === 'dashboard_banner'
                                        ? 'Rekomendasi 1600 × 900 (16:9), minimum lebar 1280px.'
                                        : 'Rekomendasi 1080 × 1350 (4:5), minimum lebar 900px.'
                                }
                            >
                                <Input
                                    ref={imageInput}
                                    type="file"
                                    aria-label={translate('Gambar promosi')}
                                    accept="image/jpeg,image/png,image/webp"
                                    onChange={selectImage}
                                />
                            </Field>
                            <Field
                                label="Tujuan klik"
                                error={form.errors.destination_url}
                                hint="Opsional. Gunakan path internal seperti /pricing atau URL http/https."
                            >
                                <Input
                                    aria-label={translate('Tujuan klik')}
                                    value={form.data.destination_url}
                                    onChange={(e) => form.setData('destination_url', e.target.value)}
                                    placeholder="/pricing atau https://example.com/promo"
                                />
                            </Field>
                            <div className="grid gap-4 sm:grid-cols-2">
                                <Field label="Mulai tayang" error={form.errors.starts_at}>
                                    <Input
                                        type="datetime-local"
                                        aria-label={translate('Mulai tayang')}
                                        value={form.data.starts_at}
                                        onChange={(e) => form.setData('starts_at', e.target.value)}
                                    />
                                </Field>
                                <Field label="Selesai tayang" error={form.errors.ends_at}>
                                    <Input
                                        type="datetime-local"
                                        aria-label={translate('Selesai tayang')}
                                        value={form.data.ends_at}
                                        onChange={(e) => form.setData('ends_at', e.target.value)}
                                    />
                                </Field>
                                <Field label="Urutan tampil" error={form.errors.sort_order}>
                                    <Input
                                        type="number"
                                        aria-label={translate('Urutan tampil')}
                                        min={0}
                                        value={form.data.sort_order}
                                        onChange={(e) => form.setData('sort_order', Number(e.target.value))}
                                    />
                                </Field>
                                <SelectField
                                    label="Status"
                                    value={form.data.status}
                                    onChange={(value) => form.setData('status', value as Promotion['status'])}
                                    options={[
                                        ['draft', 'Draft'],
                                        ['active', 'Aktif'],
                                        ['paused', 'Dijeda'],
                                    ]}
                                    error={form.errors.status}
                                />
                            </div>
                            {form.data.placement === 'app_open' && (
                                <SelectField
                                    label="Frekuensi"
                                    value={form.data.frequency}
                                    onChange={(value) => form.setData('frequency', value as FormData['frequency'])}
                                    options={Object.entries(frequencyLabels)}
                                    error={form.errors.frequency}
                                />
                            )}
                        </div>
                        <div>
                            <p className="mb-2 text-xs font-bold tracking-wide text-slate-500 uppercase">Pratinjau gambar promosi</p>
                            <div
                                className={cn(
                                    'grid place-items-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50',
                                    form.data.placement === 'dashboard_banner'
                                        ? 'aspect-video lg:mt-8'
                                        : 'mx-auto aspect-[4/5] max-w-[240px]',
                                )}
                            >
                                {preview ? (
                                    <img src={preview} alt="Pratinjau gambar promosi" className="size-full object-contain" />
                                ) : (
                                    <ImagePlus className="size-10 text-slate-300" />
                                )}
                            </div>
                        </div>
                        <DialogFooter className="lg:col-span-2">
                            <Button type="button" variant="outline" onClick={closeForm}>
                                Batal
                            </Button>
                            <Button disabled={form.processing} className="bg-[#d83f22] text-white hover:bg-[#b83219]">
                                {editing ? 'Simpan Perubahan' : 'Tambah Konten'}
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </div>
    );
}

function PromotionRow({
    promotion,
    canManage,
    onEdit,
}: {
    promotion: Promotion;
    canManage: boolean;
    onEdit: (promotion: Promotion) => void;
}) {
    return (
        <tr className="hover:bg-[#ee4d2d]/[.025]">
            <td className="px-4 py-3">
                <Poster promotion={promotion} />
            </td>
            <td className="px-4 py-3 font-bold text-[#3b211b]">{promotion.name}</td>
            <td className="px-4 py-3">{translate(placementLabels[promotion.placement])}</td>
            <td className="px-4 py-3">{translate(localeLabels[promotion.locale])}</td>
            <td className="px-4 py-3 text-xs text-slate-600">{period(promotion)}</td>
            <td className="px-4 py-3">{promotion.sort_order}</td>
            <td className="px-4 py-3">
                <StatusBadge status={promotion.runtime_status} />
            </td>
            <td className="px-4 py-3">
                <Actions promotion={promotion} canManage={canManage} onEdit={onEdit} />
            </td>
        </tr>
    );
}

function PromotionCard({
    promotion,
    canManage,
    onEdit,
}: {
    promotion: Promotion;
    canManage: boolean;
    onEdit: (promotion: Promotion) => void;
}) {
    return (
        <article className="space-y-3 p-4">
            <div className="flex gap-3">
                <Poster promotion={promotion} />
                <div className="min-w-0 flex-1">
                    <p className="truncate font-bold text-[#3b211b]">{promotion.name}</p>
                    <p className="mt-1 text-xs text-slate-500">
                        {translate(placementLabels[promotion.placement])} · {translate(localeLabels[promotion.locale])}
                    </p>
                    <div className="mt-2">
                        <StatusBadge status={promotion.runtime_status} />
                    </div>
                </div>
            </div>
            <p className="text-xs text-slate-500">
                {period(promotion)} · {translate('Urutan')} {promotion.sort_order}
            </p>
            <Actions promotion={promotion} canManage={canManage} onEdit={onEdit} />
        </article>
    );
}

function Poster({ promotion }: { promotion: Promotion }) {
    return (
        <div
            className={cn(
                'grid w-24 place-items-center overflow-hidden rounded-lg bg-slate-100 ring-1 ring-slate-900/10',
                promotion.placement === 'dashboard_banner' ? 'aspect-video' : 'mx-auto aspect-[4/5] w-16',
            )}
        >
            <img src={promotion.image_url} alt={promotion.name} className="size-full object-contain" />
        </div>
    );
}
function StatusBadge({ status }: { status: Promotion['runtime_status'] }) {
    const tone = {
        draft: 'bg-slate-100 text-slate-700',
        scheduled: 'bg-blue-50 text-blue-700',
        live: 'bg-emerald-50 text-emerald-700',
        paused: 'bg-amber-50 text-amber-700',
        expired: 'bg-rose-50 text-rose-700',
    }[status];

    return <Badge className={tone}>{translate(statusLabels[status])}</Badge>;
}
function Actions({ promotion, canManage, onEdit }: { promotion: Promotion; canManage: boolean; onEdit: (promotion: Promotion) => void }) {
    if (!canManage) {
        return null;
    }

    const active = promotion.status === 'active';

    return (
        <div className="flex justify-end gap-1">
            <Button size="icon" variant="ghost" aria-label="Edit konten" onClick={() => onEdit(promotion)}>
                <Pencil className="size-4" />
            </Button>
            <Button
                size="icon"
                variant="ghost"
                aria-label={active ? 'Jeda konten' : 'Aktifkan konten'}
                onClick={() =>
                    router.patch(
                        `/super-admin/promotions/${promotion.public_id}/status`,
                        { status: active ? 'paused' : 'active' },
                        { preserveScroll: true },
                    )
                }
            >
                {active ? <Pause className="size-4" /> : <Play className="size-4" />}
            </Button>
            <Button
                size="icon"
                variant="ghost"
                className="text-destructive"
                aria-label="Hapus konten"
                onClick={() =>
                    window.confirm(translate('Hapus konten promosi ini?')) &&
                    router.delete(`/super-admin/promotions/${promotion.public_id}`, { preserveScroll: true })
                }
            >
                <Trash2 className="size-4" />
            </Button>
        </div>
    );
}
function Summary({ label, value, tone }: { label: string; value: number; tone: string }) {
    return (
        <article className="platform-panel flex items-center gap-3 p-4">
            <span
                className={cn(
                    'grid size-10 place-items-center rounded-xl',
                    tone === 'live' ? 'bg-emerald-50 text-emerald-700' : 'bg-orange-50 text-orange-700',
                )}
            >
                {tone === 'scheduled' ? <CalendarClock className="size-5" /> : <Images className="size-5" />}
            </span>
            <div>
                <p className="text-xs font-semibold text-slate-500">{translate(label)}</p>
                <p className="text-xl font-black text-[#3b211b]">{value}</p>
            </div>
        </article>
    );
}
function FilterSelect({ name, label, value, options }: { name: string; label: string; value: string; options: string[][] }) {
    return (
        <select name={name} aria-label={translate(label)} defaultValue={value} className="h-10 rounded-md border bg-white px-3 text-sm">
            {options.map(([optionValue, label]) => (
                <option key={`${optionValue}-${label}`} value={optionValue}>
                    {translate(label)}
                </option>
            ))}
        </select>
    );
}
function SelectField({
    label,
    value,
    onChange,
    options,
    error,
}: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    options: Array<[string, string]>;
    error?: string;
}) {
    return (
        <Field label={label} error={error}>
            <select
                aria-label={translate(label)}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="h-10 w-full rounded-md border bg-white px-3 text-sm"
            >
                {options.map(([optionValue, optionLabel]) => (
                    <option key={optionValue} value={optionValue}>
                        {translate(optionLabel)}
                    </option>
                ))}
            </select>
        </Field>
    );
}
function Field({ label, error, hint, children }: { label: string; error?: string; hint?: string; children: React.ReactNode }) {
    return (
        <div className="space-y-2">
            <Label>{translate(label)}</Label>
            {children}
            {hint && <p className="text-xs text-slate-500">{translate(hint)}</p>}
            <InputError message={error} />
        </div>
    );
}
function period(promotion: Promotion) {
    const formatter = new Intl.DateTimeFormat(localeTag(), { dateStyle: 'medium', timeStyle: 'short' });

    return `${formatter.format(new Date(promotion.starts_at))} – ${formatter.format(new Date(promotion.ends_at))}`;
}
function dateTimeInput(value: string) {
    const date = new Date(value);
    const offset = date.getTimezoneOffset() * 60_000;

    return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}
