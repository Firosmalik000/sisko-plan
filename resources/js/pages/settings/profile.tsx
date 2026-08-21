import { Form, Head, Link, usePage } from '@inertiajs/react';
import {
    Bluetooth,
    Building2,
    Camera,
    Check,
    ChevronRight,
    CircleUserRound,
    CreditCard,
    Crown,
    Mail,
    MapPin,
    Palette,
    Printer,
    ReceiptText,
    Save,
    ShieldCheck,
    Sparkles,
    Store as StoreIcon,
    UserRound,
} from 'lucide-react';
import { useMemo, useState } from 'react';
import ProfileController from '@/actions/App/Http/Controllers/Settings/ProfileController';
import DeleteUser from '@/components/delete-user';
import InputError from '@/components/input-error';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { previewStoreTheme } from '@/lib/store-theme';
import { edit } from '@/routes/profile';
import { send } from '@/routes/verification';
import type { User } from '@/types';

type StoreSettings = {
    phone: string | null;
    email: string | null;
    address: string | null;
    receipt_header: string | null;
    receipt_footer: string | null;
    receipt_paper_size: '58mm' | '80mm';
    receipt_show_address: boolean;
    receipt_show_cashier: boolean;
    printer_name: string | null;
    auto_print_receipt: boolean;
    receipt_copies: number;
    theme_color: string;
};
type Store = {
    public_id: string;
    name: string;
    can_manage: boolean;
    settings: StoreSettings | null;
};
type Subscription = {
    can_write: boolean;
    reason: string | null;
    status: string;
    plan_name: string;
    max_products: number;
    max_members: number;
    products_used: number;
    members_used: number;
};
type PageProps = { auth: { user: User } };

const themePresets = [
    { name: 'Hutan', color: '#1f6653' },
    { name: 'Samudra', color: '#176b87' },
    { name: 'Nila', color: '#4f46a5' },
    { name: 'Anggur', color: '#7c3f72' },
    { name: 'Terakota', color: '#a34f32' },
    { name: 'Arang', color: '#334155' },
];

export default function Profile({
    mustVerifyEmail,
    status,
    store,
    subscription,
}: {
    mustVerifyEmail: boolean;
    status?: string;
    store: Store | null;
    subscription: Subscription | null;
}) {
    const { auth } = usePage<PageProps>().props;
    const settings = store?.settings;
    const [avatarPreview, setAvatarPreview] = useState<string>();
    const [themeColor, setThemeColor] = useState(
        settings?.theme_color ?? '#1f6653',
    );
    const [paperSize, setPaperSize] = useState<'58mm' | '80mm'>(
        settings?.receipt_paper_size ?? '58mm',
    );
    const [storeName, setStoreName] = useState(store?.name ?? '');
    const [storeAddress, setStoreAddress] = useState(settings?.address ?? '');
    const [receiptHeader, setReceiptHeader] = useState(
        settings?.receipt_header ?? 'Terima kasih sudah berbelanja',
    );
    const [receiptFooter, setReceiptFooter] = useState(
        settings?.receipt_footer ??
            'Barang yang sudah dibeli tidak dapat dikembalikan.',
    );
    const [printerName, setPrinterName] = useState(
        settings?.printer_name ?? '',
    );
    const [bluetoothStatus, setBluetoothStatus] = useState<string>();
    const initials = useMemo(
        () =>
            auth.user.name
                .split(' ')
                .map((word) => word[0])
                .join('')
                .slice(0, 2)
                .toUpperCase(),
        [auth.user.name],
    );

    const changeTheme = (color: string) => {
        setThemeColor(color);
        previewStoreTheme(color);
    };
    const connectPrinter = async () => {
        const bluetooth = (
            navigator as Navigator & {
                bluetooth?: {
                    requestDevice(options: {
                        acceptAllDevices: boolean;
                    }): Promise<{ name?: string }>;
                };
            }
        ).bluetooth;

        if (!bluetooth) {
            setBluetoothStatus(
                'Bluetooth belum didukung browser ini. Isi nama printer secara manual.',
            );

            return;
        }

        try {
            const device = await bluetooth.requestDevice({
                acceptAllDevices: true,
            });
            setPrinterName(device.name ?? 'Printer Bluetooth');
            setBluetoothStatus('Printer ditemukan. Simpan untuk mengingatnya.');
        } catch {
            setBluetoothStatus('Pemilihan printer dibatalkan.');
        }
    };

    return (
        <>
            <Head title="Pengaturan akun & toko" />
            <h1 className="sr-only">Pengaturan akun dan toko</h1>

            <section className="relative overflow-hidden rounded-[1.35rem] bg-[var(--app-ink)] px-4 py-4 text-white shadow-sm sm:px-5">
                <div className="absolute -top-14 -right-10 size-48 rounded-full bg-white/6" />
                <div className="absolute -right-2 -bottom-20 size-40 rounded-full border border-white/10" />
                <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center">
                    <Form
                        action="/settings/profile/photo"
                        method="post"
                        encType="multipart/form-data"
                        className="relative w-fit shrink-0"
                    >
                        {({ processing, errors }) => (
                            <>
                                <Avatar className="size-24 border-4 border-white/15 bg-white/10 shadow-lg sm:size-28">
                                    <AvatarImage
                                        src={avatarPreview ?? auth.user.avatar}
                                        alt={auth.user.name}
                                        className="object-cover"
                                    />
                                    <AvatarFallback className="bg-white/10 text-2xl font-black text-white">
                                        {initials}
                                    </AvatarFallback>
                                </Avatar>
                                <label className="absolute -right-1 -bottom-1 flex size-10 cursor-pointer items-center justify-center rounded-full border-4 border-[var(--app-ink)] bg-white text-[var(--app-primary)] shadow-md transition hover:scale-105">
                                    <Camera className="size-4" />
                                    <span className="sr-only">
                                        Pilih foto profil
                                    </span>
                                    <input
                                        className="sr-only"
                                        type="file"
                                        name="photo"
                                        accept="image/jpeg,image/png,image/webp"
                                        disabled={processing}
                                        onChange={(event) => {
                                            const file =
                                                event.target.files?.[0];

                                            if (!file) {
                                                return;
                                            }

                                            setAvatarPreview(
                                                URL.createObjectURL(file),
                                            );
                                            event.currentTarget.form?.requestSubmit();
                                        }}
                                    />
                                </label>
                                <InputError
                                    message={errors.photo}
                                    className="absolute top-full mt-2 w-52 text-xs text-red-200"
                                />
                            </>
                        )}
                    </Form>
                    <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                            <Badge className="border-white/15 bg-white/10 text-white hover:bg-white/10">
                                {store ? 'Toko aktif' : 'Akun pribadi'}
                            </Badge>
                            {subscription && (
                                <Badge className="border-amber-300/20 bg-amber-300/15 text-amber-200 hover:bg-amber-300/15">
                                    <Crown className="mr-1 size-3" />
                                    {subscription.plan_name}
                                </Badge>
                            )}
                        </div>
                        <h2 className="mt-2 truncate text-xl font-black tracking-[-0.04em] sm:text-2xl">
                            {store?.name ?? auth.user.name}
                        </h2>
                        <p className="mt-1 flex items-center gap-2 truncate text-sm text-white/65">
                            <Mail className="size-3.5 shrink-0" />
                            {auth.user.email}
                        </p>
                    </div>
                    <Link
                        href="/settings/security"
                        className="flex min-h-11 items-center justify-between gap-3 rounded-2xl border border-white/12 bg-white/8 px-4 py-3 text-sm font-bold transition hover:bg-white/14 sm:justify-start"
                    >
                        <ShieldCheck className="size-4 text-emerald-200" />
                        Keamanan akun
                        <ChevronRight className="size-4 text-white/45" />
                    </Link>
                </div>
            </section>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(20rem,.75fr)]">
                <div className="space-y-4">
                    <SettingsCard
                        icon={CircleUserRound}
                        eyebrow="Profil"
                        title="Akun saya"
                    >
                        <Form
                            {...ProfileController.update.form()}
                            options={{ preserveScroll: true }}
                            className="grid gap-4 sm:grid-cols-2"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <Field
                                        label="Nama lengkap"
                                        icon={UserRound}
                                    >
                                        <Input
                                            id="name"
                                            name="name"
                                            defaultValue={auth.user.name}
                                            required
                                            autoComplete="name"
                                        />
                                        <InputError message={errors.name} />
                                    </Field>
                                    <Field label="Email akun" icon={Mail}>
                                        <Input
                                            id="email"
                                            type="email"
                                            name="email"
                                            defaultValue={auth.user.email}
                                            required
                                            autoComplete="username"
                                        />
                                        <InputError message={errors.email} />
                                    </Field>
                                    {mustVerifyEmail &&
                                        auth.user.email_verified_at ===
                                            null && (
                                            <div className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900 sm:col-span-2">
                                                Email belum diverifikasi.{' '}
                                                <Link
                                                    href={send()}
                                                    as="button"
                                                    className="font-bold underline underline-offset-4"
                                                >
                                                    Kirim ulang verifikasi
                                                </Link>
                                                {status ===
                                                    'verification-link-sent' && (
                                                    <span className="ml-1 font-medium text-emerald-700">
                                                        Tautan baru telah
                                                        dikirim.
                                                    </span>
                                                )}
                                            </div>
                                        )}
                                    <div className="sm:col-span-2">
                                        <Button
                                            disabled={processing}
                                            data-test="update-profile-button"
                                            className="min-h-11 w-full sm:w-auto"
                                        >
                                            <Save className="size-4" />
                                            Simpan profil
                                        </Button>
                                    </div>
                                </>
                            )}
                        </Form>
                    </SettingsCard>

                    {store ? (
                        <Form
                            action="/settings/store"
                            method="patch"
                            options={{ preserveScroll: true }}
                            className="space-y-5"
                        >
                            {({ processing, errors }) => (
                                <>
                                    <SettingsCard
                                        icon={Building2}
                                        eyebrow="Identitas"
                                        title="Data toko"
                                        badge={
                                            store.can_manage
                                                ? undefined
                                                : 'Hanya lihat'
                                        }
                                    >
                                        <div className="grid gap-4 sm:grid-cols-2">
                                            <Field
                                                label="Nama toko"
                                                icon={StoreIcon}
                                                className="sm:col-span-2"
                                            >
                                                <Input
                                                    name="store_name"
                                                    value={storeName}
                                                    onChange={(event) =>
                                                        setStoreName(
                                                            event.target.value,
                                                        )
                                                    }
                                                    disabled={!store.can_manage}
                                                />
                                                <InputError
                                                    message={errors.store_name}
                                                />
                                            </Field>
                                            <Field label="Nomor telepon">
                                                <Input
                                                    name="phone"
                                                    defaultValue={
                                                        settings?.phone ?? ''
                                                    }
                                                    inputMode="tel"
                                                    placeholder="08xxxxxxxxxx"
                                                    disabled={!store.can_manage}
                                                />
                                                <InputError
                                                    message={errors.phone}
                                                />
                                            </Field>
                                            <Field label="Email toko">
                                                <Input
                                                    name="email"
                                                    type="email"
                                                    defaultValue={
                                                        settings?.email ?? ''
                                                    }
                                                    placeholder="toko@email.com"
                                                    disabled={!store.can_manage}
                                                />
                                                <InputError
                                                    message={errors.email}
                                                />
                                            </Field>
                                            <Field
                                                label="Alamat toko"
                                                icon={MapPin}
                                                className="sm:col-span-2"
                                            >
                                                <textarea
                                                    name="address"
                                                    value={storeAddress}
                                                    onChange={(event) =>
                                                        setStoreAddress(
                                                            event.target.value,
                                                        )
                                                    }
                                                    rows={3}
                                                    disabled={!store.can_manage}
                                                    className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                                                />
                                                <InputError
                                                    message={errors.address}
                                                />
                                            </Field>
                                        </div>
                                    </SettingsCard>

                                    <SettingsCard
                                        icon={ReceiptText}
                                        eyebrow="Cetak"
                                        title="Struk penjualan"
                                    >
                                        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_17rem]">
                                            <div className="space-y-4">
                                                <Field label="Judul struk">
                                                    <Input
                                                        name="receipt_header"
                                                        value={receiptHeader}
                                                        onChange={(event) =>
                                                            setReceiptHeader(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        maxLength={120}
                                                        disabled={
                                                            !store.can_manage
                                                        }
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.receipt_header
                                                        }
                                                    />
                                                </Field>
                                                <Field label="Catatan bawah">
                                                    <textarea
                                                        name="receipt_footer"
                                                        value={receiptFooter}
                                                        onChange={(event) =>
                                                            setReceiptFooter(
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        rows={2}
                                                        maxLength={240}
                                                        disabled={
                                                            !store.can_manage
                                                        }
                                                        className="w-full resize-none rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-50"
                                                    />
                                                    <InputError
                                                        message={
                                                            errors.receipt_footer
                                                        }
                                                    />
                                                </Field>
                                                <div className="grid gap-3 sm:grid-cols-2">
                                                    <Field label="Lebar kertas">
                                                        <select
                                                            name="receipt_paper_size"
                                                            value={paperSize}
                                                            onChange={(event) =>
                                                                setPaperSize(
                                                                    event.target
                                                                        .value as
                                                                        | '58mm'
                                                                        | '80mm',
                                                                )
                                                            }
                                                            disabled={
                                                                !store.can_manage
                                                            }
                                                            className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                        >
                                                            <option value="58mm">
                                                                58 mm
                                                            </option>
                                                            <option value="80mm">
                                                                80 mm
                                                            </option>
                                                        </select>
                                                    </Field>
                                                    <Field label="Jumlah salinan">
                                                        <select
                                                            name="receipt_copies"
                                                            defaultValue={
                                                                settings?.receipt_copies ??
                                                                1
                                                            }
                                                            disabled={
                                                                !store.can_manage
                                                            }
                                                            className="h-9 w-full rounded-md border border-input bg-white px-3 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
                                                        >
                                                            <option value="1">
                                                                1 lembar
                                                            </option>
                                                            <option value="2">
                                                                2 lembar
                                                            </option>
                                                            <option value="3">
                                                                3 lembar
                                                            </option>
                                                        </select>
                                                    </Field>
                                                </div>
                                                <div className="grid gap-2 sm:grid-cols-2">
                                                    <CheckSetting
                                                        name="receipt_show_address"
                                                        label="Tampilkan alamat"
                                                        defaultChecked={
                                                            settings?.receipt_show_address ??
                                                            true
                                                        }
                                                        disabled={
                                                            !store.can_manage
                                                        }
                                                    />
                                                    <CheckSetting
                                                        name="receipt_show_cashier"
                                                        label="Tampilkan kasir"
                                                        defaultChecked={
                                                            settings?.receipt_show_cashier ??
                                                            true
                                                        }
                                                        disabled={
                                                            !store.can_manage
                                                        }
                                                    />
                                                </div>
                                            </div>
                                            <ReceiptPreview
                                                storeName={storeName}
                                                address={storeAddress}
                                                header={receiptHeader}
                                                footer={receiptFooter}
                                                paperSize={paperSize}
                                            />
                                        </div>
                                    </SettingsCard>

                                    <SettingsCard
                                        icon={Bluetooth}
                                        eyebrow="Perangkat"
                                        title="Printer Bluetooth"
                                    >
                                        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                                            <Field label="Nama printer">
                                                <Input
                                                    name="printer_name"
                                                    value={printerName}
                                                    onChange={(event) =>
                                                        setPrinterName(
                                                            event.target.value,
                                                        )
                                                    }
                                                    placeholder="Contoh: RPP02N"
                                                    disabled={!store.can_manage}
                                                />
                                                <InputError
                                                    message={
                                                        errors.printer_name
                                                    }
                                                />
                                            </Field>
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={connectPrinter}
                                                disabled={!store.can_manage}
                                                className="min-h-11"
                                            >
                                                <Bluetooth className="size-4" />
                                                Cari printer
                                            </Button>
                                        </div>
                                        {bluetoothStatus && (
                                            <p className="mt-2 text-sm text-muted-foreground">
                                                {bluetoothStatus}
                                            </p>
                                        )}
                                        <div className="mt-4">
                                            <CheckSetting
                                                name="auto_print_receipt"
                                                label="Cetak otomatis setelah transaksi berhasil"
                                                defaultChecked={
                                                    settings?.auto_print_receipt ??
                                                    false
                                                }
                                                disabled={!store.can_manage}
                                            />
                                        </div>
                                    </SettingsCard>

                                    <SettingsCard
                                        icon={Palette}
                                        eyebrow="Personalisasi"
                                        title="Warna aplikasi"
                                    >
                                        <div className="flex flex-wrap gap-3">
                                            {themePresets.map((preset) => (
                                                <button
                                                    key={preset.color}
                                                    type="button"
                                                    onClick={() =>
                                                        changeTheme(
                                                            preset.color,
                                                        )
                                                    }
                                                    disabled={!store.can_manage}
                                                    className="group min-w-20 rounded-2xl border p-2 text-center text-xs font-bold transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
                                                    aria-label={`Gunakan tema ${preset.name}`}
                                                >
                                                    <span
                                                        className="mx-auto flex size-10 items-center justify-center rounded-xl text-white shadow-sm"
                                                        style={{
                                                            backgroundColor:
                                                                preset.color,
                                                        }}
                                                    >
                                                        {themeColor.toLowerCase() ===
                                                            preset.color.toLowerCase() && (
                                                            <Check className="size-5" />
                                                        )}
                                                    </span>
                                                    <span className="mt-1.5 block">
                                                        {preset.name}
                                                    </span>
                                                </button>
                                            ))}
                                            <label className="min-w-20 cursor-pointer rounded-2xl border p-2 text-center text-xs font-bold transition hover:-translate-y-0.5 hover:shadow-md">
                                                <span
                                                    className="mx-auto flex size-10 items-center justify-center rounded-xl text-white shadow-sm"
                                                    style={{
                                                        backgroundColor:
                                                            themeColor,
                                                    }}
                                                >
                                                    <Sparkles className="size-4" />
                                                </span>
                                                <span className="mt-1.5 block">
                                                    Kustom
                                                </span>
                                                <input
                                                    type="color"
                                                    className="sr-only"
                                                    value={themeColor}
                                                    onChange={(event) =>
                                                        changeTheme(
                                                            event.target.value,
                                                        )
                                                    }
                                                    disabled={!store.can_manage}
                                                />
                                            </label>
                                        </div>
                                        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-muted/60 p-3 sm:flex-row sm:items-center">
                                            <div
                                                className="size-11 shrink-0 rounded-xl shadow-inner"
                                                style={{
                                                    backgroundColor: themeColor,
                                                }}
                                            />
                                            <div className="min-w-0 flex-1">
                                                <Label htmlFor="theme_color">
                                                    Kode warna utama
                                                </Label>
                                                <Input
                                                    id="theme_color"
                                                    name="theme_color"
                                                    value={themeColor}
                                                    onChange={(event) =>
                                                        changeTheme(
                                                            event.target.value,
                                                        )
                                                    }
                                                    pattern="#[0-9A-Fa-f]{6}"
                                                    className="mt-1 font-mono uppercase"
                                                    disabled={!store.can_manage}
                                                />
                                                <InputError
                                                    message={errors.theme_color}
                                                />
                                            </div>
                                        </div>
                                    </SettingsCard>
                                    {store.can_manage && (
                                        <div className="sticky bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-20 flex justify-end rounded-2xl border border-[var(--app-ink)]/8 bg-white/90 p-3 shadow-xl backdrop-blur-xl md:bottom-5">
                                            <Button
                                                disabled={processing}
                                                className="min-h-11 w-full px-6 sm:w-auto"
                                            >
                                                <Save className="size-4" />
                                                Simpan pengaturan toko
                                            </Button>
                                        </div>
                                    )}
                                </>
                            )}
                        </Form>
                    ) : (
                        <div className="rounded-3xl border border-dashed bg-white p-8 text-center">
                            <StoreIcon className="mx-auto size-9 text-muted-foreground" />
                            <h2 className="mt-3 font-bold">
                                Belum ada toko aktif
                            </h2>
                            <Button asChild className="mt-4">
                                <Link href="/stores/create">Buat toko</Link>
                            </Button>
                        </div>
                    )}
                </div>

                <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
                    {subscription && (
                        <SettingsCard
                            icon={CreditCard}
                            eyebrow="Langganan"
                            title={subscription.plan_name}
                        >
                            <div className="flex items-center justify-between gap-3">
                                <Badge
                                    className={
                                        subscription.can_write
                                            ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100'
                                            : 'bg-amber-100 text-amber-800 hover:bg-amber-100'
                                    }
                                >
                                    {subscription.can_write
                                        ? 'Aktif'
                                        : 'Perlu perhatian'}
                                </Badge>
                                <span className="text-xs font-bold text-muted-foreground uppercase">
                                    {subscription.status.replaceAll('_', ' ')}
                                </span>
                            </div>
                            <div className="mt-5 space-y-4">
                                <UsageRow
                                    label="Produk"
                                    used={subscription.products_used}
                                    limit={subscription.max_products}
                                />
                                <UsageRow
                                    label="Anggota"
                                    used={subscription.members_used}
                                    limit={subscription.max_members}
                                />
                            </div>
                            <Button
                                variant="outline"
                                asChild
                                className="mt-5 min-h-11 w-full"
                            >
                                <Link href="/subscription">
                                    Kelola langganan
                                    <ChevronRight className="size-4" />
                                </Link>
                            </Button>
                        </SettingsCard>
                    )}
                    <div className="rounded-3xl border border-[var(--app-ink)]/8 bg-[var(--app-soft)] p-5">
                        <div className="flex items-center gap-3">
                            <span className="flex size-10 items-center justify-center rounded-xl bg-white text-[var(--app-primary)] shadow-sm">
                                <ShieldCheck className="size-5" />
                            </span>
                            <div>
                                <p className="text-xs font-bold tracking-wider text-muted-foreground uppercase">
                                    Akun
                                </p>
                                <h2 className="font-bold">
                                    Privasi & keamanan
                                </h2>
                            </div>
                        </div>
                        <p className="mt-3 text-sm leading-6 text-muted-foreground">
                            Ubah password, aktifkan autentikasi dua langkah, dan
                            kelola passkey.
                        </p>
                        <Button
                            asChild
                            variant="outline"
                            className="mt-4 min-h-11 w-full bg-white"
                        >
                            <Link href="/settings/security">
                                Buka keamanan
                                <ChevronRight className="size-4" />
                            </Link>
                        </Button>
                    </div>
                </aside>
            </div>
            <section className="rounded-3xl border border-red-200/70 bg-white p-5 sm:p-6">
                <DeleteUser />
            </section>
        </>
    );
}

function SettingsCard({
    icon: Icon,
    title,
    badge,
    children,
}: {
    icon: typeof Printer;
    eyebrow: string;
    title: string;
    badge?: string;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-[1.35rem] border border-[var(--app-ink)]/8 bg-white p-4 shadow-sm sm:p-5">
            <header className="mb-4 flex items-center gap-3">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[var(--app-soft)] text-[var(--app-primary)]">
                    <Icon className="size-5" />
                </span>
                <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-black tracking-[-0.025em]">
                        {title}
                    </h2>
                </div>
                {badge && <Badge variant="secondary">{badge}</Badge>}
            </header>
            {children}
        </section>
    );
}
function Field({
    label,
    icon: Icon,
    className,
    children,
}: {
    label: string;
    icon?: typeof Mail;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={className}>
            <Label className="mb-2 flex items-center gap-1.5">
                {Icon && <Icon className="size-3.5 text-muted-foreground" />}
                {label}
            </Label>
            {children}
        </div>
    );
}
function CheckSetting({
    name,
    label,
    defaultChecked,
    disabled,
}: {
    name: string;
    label: string;
    defaultChecked: boolean;
    disabled: boolean;
}) {
    return (
        <label className="flex min-h-11 cursor-pointer items-center gap-3 rounded-xl border px-3 py-2.5 text-sm font-medium">
            <input type="hidden" name={name} value="0" />
            <input
                type="checkbox"
                name={name}
                value="1"
                defaultChecked={defaultChecked}
                disabled={disabled}
                className="size-4 accent-[var(--app-primary)]"
            />
            {label}
        </label>
    );
}
function ReceiptPreview({
    storeName,
    address,
    header,
    footer,
    paperSize,
}: {
    storeName: string;
    address?: string | null;
    header: string;
    footer: string;
    paperSize: '58mm' | '80mm';
}) {
    return (
        <div className="rounded-2xl bg-slate-100 p-3">
            <div
                className={`mx-auto bg-white p-4 font-mono text-[10px] leading-4 text-slate-800 shadow-md transition-all ${paperSize === '58mm' ? 'max-w-48' : 'max-w-60'}`}
            >
                <div className="text-center">
                    <p className="font-black">{storeName}</p>
                    {address && <p className="mt-0.5 text-[8px]">{address}</p>}
                    {header && <p className="mt-1 text-[8px]">{header}</p>}
                </div>
                <div className="my-3 border-t border-dashed border-slate-400" />
                <div className="flex justify-between gap-2">
                    <span>Kopi Susu × 2</span>
                    <span>36.000</span>
                </div>
                <div className="flex justify-between gap-2">
                    <span>Roti Bakar × 1</span>
                    <span>15.000</span>
                </div>
                <div className="my-3 border-t border-dashed border-slate-400" />
                <div className="flex justify-between font-black">
                    <span>TOTAL</span>
                    <span>51.000</span>
                </div>
                {footer && (
                    <p className="mt-4 text-center text-[8px]">{footer}</p>
                )}
            </div>
            <div className="mt-3 flex items-center justify-center gap-2 text-xs font-bold text-slate-500">
                <Printer className="size-3.5" />
                Preview {paperSize}
            </div>
        </div>
    );
}
function UsageRow({
    label,
    used,
    limit,
}: {
    label: string;
    used: number;
    limit: number;
}) {
    const percent = limit === 0 ? 0 : Math.min(100, (used / limit) * 100);

    return (
        <div>
            <div className="mb-1.5 flex justify-between text-sm">
                <span className="font-semibold">{label}</span>
                <span className="text-muted-foreground">
                    {used} / {limit === 0 ? '∞' : limit}
                </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                    className="h-full rounded-full bg-[var(--app-primary)] transition-all"
                    style={{ width: `${percent}%` }}
                />
            </div>
        </div>
    );
}

Profile.layout = { breadcrumbs: [{ title: 'Pengaturan', href: edit() }] };
