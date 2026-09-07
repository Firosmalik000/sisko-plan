import { Head, useForm } from '@inertiajs/react';
import {
    ImageUp,
    ExternalLink,
    Globe2,
    Link2,
    Mail,
    Plus,
    Search,
    Share2,
    Trash2,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { translate } from '@/lib/i18n';

type SocialLink = {
    platform: string;
    url: string;
};

type Settings = {
    brand_name: string;
    logo_url: string | null;
    tagline: string | null;
    site_url: string | null;
    support_email: string | null;
    support_phone: string | null;
    social_links: SocialLink[];
    seo_title: string;
    seo_description: string | null;
    seo_keywords: string | null;
    social_image_url: string | null;
    robots_index: boolean;
};

const socialPlatforms = [
    'Instagram',
    'Facebook',
    'TikTok',
    'YouTube',
    'X (Twitter)',
    'LinkedIn',
    'WhatsApp',
    'Telegram',
    'Threads',
    'Pinterest',
    'Snapchat',
    'Reddit',
    'Discord',
    'Twitch',
    'Bluesky',
    'Mastodon',
    'Facebook Messenger',
    'LINE',
    'WeChat',
    'KakaoTalk',
    'Viber',
    'Spotify',
    'SoundCloud',
    'Apple Music',
    'YouTube Music',
    'Vimeo',
    'Dailymotion',
    'GitHub',
    'GitLab',
    'Behance',
    'Dribbble',
    'Medium',
    'Substack',
    'Tumblr',
    'Quora',
    'Patreon',
    'VK',
    'Clubhouse',
    'Google Business Profile',
    'Shopee',
    'Tokopedia',
    'Lazada',
    'Bukalapak',
    'Website',
];

export default function BrandSeoIndex({
    settings,
    can_manage,
}: {
    settings: Settings;
    can_manage: boolean;
}) {
    const form = useForm({
        brand_name: settings.brand_name,
        tagline: settings.tagline ?? '',
        site_url: settings.site_url ?? '',
        support_email: settings.support_email ?? '',
        support_phone: settings.support_phone ?? '',
        social_links: settings.social_links,
        seo_title: settings.seo_title,
        seo_description: settings.seo_description ?? '',
        seo_keywords: settings.seo_keywords ?? '',
        social_image_url: settings.social_image_url ?? '',
        robots_index: settings.robots_index,
    });
    const logoForm = useForm<{ logo: File | null }>({ logo: null });
    const logoInput = useRef<HTMLInputElement>(null);
    const [selectedLogoPreview, setSelectedLogoPreview] = useState<
        string | null
    >(null);
    const errors = form.errors as Record<string, string | undefined>;

    useEffect(
        () => () => {
            if (selectedLogoPreview) {
                URL.revokeObjectURL(selectedLogoPreview);
            }
        },
        [selectedLogoPreview],
    );

    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.patch('/super-admin/brand-seo', { preserveScroll: true });
    };

    const addSocialLink = () => {
        if (form.data.social_links.length < 25) {
            form.setData('social_links', [
                ...form.data.social_links,
                { platform: 'Instagram', url: '' },
            ]);
        }
    };

    const selectLogo = (event: ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0] ?? null;
        logoForm.setData('logo', file);
        setSelectedLogoPreview(file ? URL.createObjectURL(file) : null);
    };

    const saveLogo = () => {
        logoForm.post('/super-admin/brand-seo/logo', {
            forceFormData: true,
            preserveScroll: true,
            onSuccess: () => {
                logoForm.reset();

                if (logoInput.current) {
                    logoInput.current.value = '';
                }

                setSelectedLogoPreview(null);
            },
        });
    };

    const removeLogo = () => {
        if (!window.confirm(translate('Hapus logo platform?'))) {
            return;
        }

        logoForm.delete('/super-admin/brand-seo/logo', {
            preserveScroll: true,
            onSuccess: () => setSelectedLogoPreview(null),
        });
    };

    const updateSocialLink = (
        index: number,
        field: keyof SocialLink,
        value: string,
    ) => {
        form.setData(
            'social_links',
            form.data.social_links.map((link, itemIndex) =>
                itemIndex === index ? { ...link, [field]: value } : link,
            ),
        );
    };

    const removeSocialLink = (index: number) => {
        form.setData(
            'social_links',
            form.data.social_links.filter(
                (_, itemIndex) => itemIndex !== index,
            ),
        );
    };

    return (
        <div className="platform-enter pb-24 lg:pb-8">
            <Head title="Brand & SEO" />

            <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                <div>
                    <h1 className="text-2xl font-black tracking-tight text-[#3b211b] sm:text-3xl">
                        Brand & SEO
                    </h1>
                    <p className="mt-2 text-sm text-slate-500">
                        Identitas publik, kanal resmi, dan metadata pencarian.
                    </p>
                </div>
                <span className="inline-flex w-fit items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    <Globe2 className="size-4" />
                    Berlaku untuk seluruh platform
                </span>
            </header>

            <form
                onSubmit={submit}
                className="mt-6 grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_340px]"
            >
                <div className="space-y-5">
                    <section className="platform-panel overflow-hidden">
                        <SectionHeader
                            icon={Globe2}
                            title="Identitas brand"
                            description="Nama dan kontak utama yang tampil di platform."
                        />
                        <div className="grid gap-4 p-4 sm:grid-cols-2 sm:p-6">
                            <div className="flex flex-col gap-4 rounded-xl bg-slate-50 p-4 sm:col-span-2 sm:flex-row sm:items-center">
                                <span className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl bg-[#ee4d2d] text-white">
                                    {selectedLogoPreview ||
                                    settings.logo_url ? (
                                        <img
                                            src={
                                                selectedLogoPreview ??
                                                settings.logo_url ??
                                                undefined
                                            }
                                            alt="Pratinjau logo"
                                            className="size-full object-contain"
                                        />
                                    ) : (
                                        <Globe2 className="size-8" />
                                    )}
                                </span>
                                <div className="min-w-0 flex-1">
                                    <Label htmlFor="platform-logo">Logo</Label>
                                    <p className="mt-1 text-xs text-slate-500">
                                        PNG, JPG, atau WebP, maksimal 2 MB.
                                    </p>
                                    <InputError
                                        message={logoForm.errors.logo}
                                        className="mt-1"
                                    />
                                </div>
                                {can_manage && (
                                    <div className="flex flex-wrap gap-2">
                                        <input
                                            ref={logoInput}
                                            id="platform-logo"
                                            type="file"
                                            accept="image/png,image/jpeg,image/webp"
                                            onChange={selectLogo}
                                            className="sr-only"
                                        />
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                logoInput.current?.click()
                                            }
                                            disabled={logoForm.processing}
                                        >
                                            <ImageUp className="size-4" />
                                            Pilih logo
                                        </Button>
                                        {logoForm.data.logo && (
                                            <Button
                                                type="button"
                                                onClick={saveLogo}
                                                disabled={logoForm.processing}
                                                className="bg-[#d83f22] text-white hover:bg-[#b83219]"
                                            >
                                                {logoForm.processing
                                                    ? 'Mengunggah...'
                                                    : 'Simpan logo'}
                                            </Button>
                                        )}
                                        {settings.logo_url &&
                                            !logoForm.data.logo && (
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={removeLogo}
                                                    disabled={
                                                        logoForm.processing
                                                    }
                                                    className="text-rose-700"
                                                >
                                                    <Trash2 className="size-4" />
                                                    Hapus
                                                </Button>
                                            )}
                                    </div>
                                )}
                            </div>
                            <Field
                                label="Nama brand"
                                error={errors.brand_name}
                                className="sm:col-span-2"
                            >
                                <Input
                                    value={form.data.brand_name}
                                    onChange={(event) =>
                                        form.setData(
                                            'brand_name',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={100}
                                    disabled={!can_manage}
                                />
                            </Field>
                            <Field
                                label="Tagline"
                                error={errors.tagline}
                                className="sm:col-span-2"
                            >
                                <Input
                                    value={form.data.tagline}
                                    onChange={(event) =>
                                        form.setData(
                                            'tagline',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={160}
                                    disabled={!can_manage}
                                />
                            </Field>
                            <Field label="URL situs" error={errors.site_url}>
                                <Input
                                    type="url"
                                    inputMode="url"
                                    value={form.data.site_url}
                                    onChange={(event) =>
                                        form.setData(
                                            'site_url',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="https://contoh.id"
                                    disabled={!can_manage}
                                />
                            </Field>
                            <Field
                                label="Email dukungan"
                                error={errors.support_email}
                            >
                                <Input
                                    type="email"
                                    value={form.data.support_email}
                                    onChange={(event) =>
                                        form.setData(
                                            'support_email',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="halo@contoh.id"
                                    disabled={!can_manage}
                                />
                            </Field>
                            <Field
                                label="Nomor dukungan"
                                error={errors.support_phone}
                                className="sm:col-span-2"
                            >
                                <Input
                                    type="tel"
                                    value={form.data.support_phone}
                                    onChange={(event) =>
                                        form.setData(
                                            'support_phone',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="+62 812 3456 7890"
                                    disabled={!can_manage}
                                />
                            </Field>
                        </div>
                    </section>

                    <section className="platform-panel overflow-hidden">
                        <SectionHeader
                            icon={Share2}
                            title="Sosial media"
                            description="Tautan resmi yang tampil di footer publik."
                            action={
                                can_manage ? (
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addSocialLink}
                                        disabled={
                                            form.data.social_links.length >= 25
                                        }
                                        className="min-h-10"
                                    >
                                        <Plus className="size-4" />
                                        Tambah
                                    </Button>
                                ) : null
                            }
                        />
                        <div className="p-4 sm:p-6">
                            {form.data.social_links.length === 0 ? (
                                <div className="flex min-h-28 flex-col items-center justify-center rounded-xl bg-slate-50 px-4 text-center">
                                    <Link2 className="size-5 text-slate-400" />
                                    <p className="mt-2 text-sm font-bold text-slate-600">
                                        Belum ada sosial media.
                                    </p>
                                    {can_manage && (
                                        <button
                                            type="button"
                                            onClick={addSocialLink}
                                            className="mt-2 text-xs font-bold text-[#b83219] underline-offset-4 hover:underline"
                                        >
                                            Tambah tautan pertama
                                        </button>
                                    )}
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {form.data.social_links.map(
                                        (link, index) => (
                                            <div
                                                key={`${index}-${link.platform}`}
                                                className="grid gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-[150px_minmax(0,1fr)_40px] sm:items-start"
                                            >
                                                <div>
                                                    <Label
                                                        htmlFor={`social-platform-${index}`}
                                                        className="sr-only"
                                                    >
                                                        Platform
                                                    </Label>
                                                    <Input
                                                        id={`social-platform-${index}`}
                                                        list={`social-platforms-${index}`}
                                                        value={link.platform}
                                                        onChange={(event) =>
                                                            updateSocialLink(
                                                                index,
                                                                'platform',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        disabled={!can_manage}
                                                        placeholder="Pilih atau ketik platform"
                                                        maxLength={40}
                                                        className="bg-white font-semibold"
                                                    />
                                                    <datalist
                                                        id={`social-platforms-${index}`}
                                                    >
                                                        {socialPlatforms.map(
                                                            (platform) => (
                                                                <option
                                                                    key={
                                                                        platform
                                                                    }
                                                                    value={
                                                                        platform
                                                                    }
                                                                />
                                                            ),
                                                        )}
                                                    </datalist>
                                                    <InputError
                                                        message={
                                                            errors[
                                                                `social_links.${index}.platform`
                                                            ]
                                                        }
                                                    />
                                                </div>
                                                <div>
                                                    <Label
                                                        htmlFor={`social-url-${index}`}
                                                        className="sr-only"
                                                    >
                                                        URL {link.platform}
                                                    </Label>
                                                    <Input
                                                        id={`social-url-${index}`}
                                                        type="url"
                                                        inputMode="url"
                                                        value={link.url}
                                                        onChange={(event) =>
                                                            updateSocialLink(
                                                                index,
                                                                'url',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        placeholder="https://"
                                                        disabled={!can_manage}
                                                    />
                                                    <InputError
                                                        message={
                                                            errors[
                                                                `social_links.${index}.url`
                                                            ]
                                                        }
                                                    />
                                                </div>
                                                {can_manage && (
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeSocialLink(
                                                                index,
                                                            )
                                                        }
                                                        className="flex size-10 items-center justify-center justify-self-end rounded-lg text-[#81716d] transition hover:bg-[#fff1f0] hover:text-[#c91c3a] focus-visible:ring-2 focus-visible:ring-[#e11d48] focus-visible:outline-none sm:justify-self-auto"
                                                        aria-label={`Hapus ${link.platform}`}
                                                    >
                                                        <Trash2 className="size-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ),
                                    )}
                                </div>
                            )}
                            <InputError
                                message={errors.social_links}
                                className="mt-2"
                            />
                        </div>
                    </section>

                    <section className="platform-panel overflow-hidden">
                        <SectionHeader
                            icon={Search}
                            title="SEO default"
                            description="Metadata utama untuk beranda dan saat tautan dibagikan."
                        />
                        <div className="grid gap-4 p-4 sm:p-6">
                            <Field
                                label="Judul beranda"
                                error={errors.seo_title}
                                count={`${form.data.seo_title.length}/60`}
                            >
                                <Input
                                    value={form.data.seo_title}
                                    onChange={(event) =>
                                        form.setData(
                                            'seo_title',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={60}
                                    disabled={!can_manage}
                                />
                            </Field>
                            <Field
                                label="Deskripsi"
                                error={errors.seo_description}
                                count={`${form.data.seo_description.length}/160`}
                            >
                                <textarea
                                    value={form.data.seo_description}
                                    onChange={(event) =>
                                        form.setData(
                                            'seo_description',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={160}
                                    rows={3}
                                    disabled={!can_manage}
                                    className="flex min-h-24 w-full resize-y rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
                                />
                            </Field>
                            <Field
                                label="Kata kunci"
                                error={errors.seo_keywords}
                            >
                                <Input
                                    value={form.data.seo_keywords}
                                    onChange={(event) =>
                                        form.setData(
                                            'seo_keywords',
                                            event.target.value,
                                        )
                                    }
                                    maxLength={500}
                                    placeholder="kasir, stok toko, laporan penjualan"
                                    disabled={!can_manage}
                                />
                            </Field>
                            <Field
                                label="URL gambar saat dibagikan"
                                error={errors.social_image_url}
                            >
                                <Input
                                    type="url"
                                    inputMode="url"
                                    value={form.data.social_image_url}
                                    onChange={(event) =>
                                        form.setData(
                                            'social_image_url',
                                            event.target.value,
                                        )
                                    }
                                    placeholder="https://contoh.id/preview.jpg"
                                    disabled={!can_manage}
                                />
                            </Field>
                            <label className="flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-4">
                                <input
                                    type="checkbox"
                                    checked={form.data.robots_index}
                                    onChange={(event) =>
                                        form.setData(
                                            'robots_index',
                                            event.target.checked,
                                        )
                                    }
                                    disabled={!can_manage}
                                    className="mt-0.5 size-4 rounded border-slate-300 text-[#d83f22] focus:ring-[#ee4d2d]"
                                />
                                <span>
                                    <span className="block text-sm font-bold text-slate-700">
                                        Izinkan mesin pencari mengindeks situs
                                    </span>
                                    <span className="mt-1 block text-xs leading-5 text-slate-500">
                                        Nonaktifkan hanya saat situs belum siap
                                        ditampilkan di hasil pencarian.
                                    </span>
                                </span>
                            </label>
                            <InputError message={errors.robots_index} />
                        </div>
                    </section>
                </div>

                <aside className="space-y-5 xl:sticky xl:top-8">
                    <section className="overflow-hidden rounded-2xl bg-[#3b211b] text-white shadow-xl shadow-[#3b211b]/15">
                        <div className="border-b border-white/10 p-5">
                            <p className="text-sm font-black">
                                Pratinjau pencarian
                            </p>
                        </div>
                        <div className="p-5">
                            <p className="truncate text-xs text-emerald-300">
                                {form.data.site_url ||
                                    'https://alamat-situs.id'}
                            </p>
                            <p className="mt-2 text-lg leading-snug font-bold text-[#ffb5a3]">
                                {form.data.seo_title || 'Judul beranda'}
                            </p>
                            <p className="mt-2 line-clamp-3 text-xs leading-5 text-white/65">
                                {form.data.seo_description ||
                                    'Deskripsi halaman akan tampil di sini.'}
                            </p>
                        </div>
                    </section>

                    <section className="platform-panel p-5">
                        <p className="text-sm font-black text-[#3b211b]">
                            Identitas aktif
                        </p>
                        <div className="mt-4 flex items-center gap-3">
                            <span className="flex size-11 items-center justify-center overflow-hidden rounded-xl bg-[#ee4d2d] text-white">
                                {selectedLogoPreview || settings.logo_url ? (
                                    <img
                                        src={
                                            selectedLogoPreview ??
                                            settings.logo_url ??
                                            undefined
                                        }
                                        alt=""
                                        className="size-full object-contain"
                                    />
                                ) : (
                                    <Globe2 className="size-5" />
                                )}
                            </span>
                            <div className="min-w-0">
                                <p className="truncate text-sm font-black text-[#3b211b]">
                                    {form.data.brand_name || 'Nama brand'}
                                </p>
                                <p className="truncate text-xs text-slate-500">
                                    {form.data.tagline || 'Tanpa tagline'}
                                </p>
                            </div>
                        </div>
                        <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-xs text-slate-500">
                            {form.data.support_email && (
                                <p className="flex items-center gap-2 truncate">
                                    <Mail className="size-3.5 shrink-0" />
                                    {form.data.support_email}
                                </p>
                            )}
                            <p className="flex items-center gap-2">
                                <Share2 className="size-3.5" />
                                {form.data.social_links.length} kanal sosial
                            </p>
                            <p className="flex items-center gap-2">
                                <ExternalLink className="size-3.5" />
                                {form.data.robots_index
                                    ? 'Indeks pencarian aktif'
                                    : 'Indeks pencarian nonaktif'}
                            </p>
                        </div>
                    </section>
                </aside>

                {can_manage && (
                    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_30px_rgba(59,33,27,.08)] backdrop-blur md:left-72 xl:static xl:col-span-2 xl:border-0 xl:bg-transparent xl:p-0 xl:shadow-none xl:backdrop-blur-none">
                        <div className="mx-auto flex max-w-[1500px] items-center justify-end gap-3">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => form.reset()}
                                disabled={!form.isDirty || form.processing}
                            >
                                Batalkan perubahan
                            </Button>
                            <Button
                                type="submit"
                                disabled={!form.isDirty || form.processing}
                                className="bg-[#d83f22] text-white hover:bg-[#b83219]"
                            >
                                {form.processing ? 'Menyimpan...' : 'Simpan'}
                            </Button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}

function SectionHeader({
    icon: Icon,
    title,
    description,
    action,
}: {
    icon: typeof Globe2;
    title: string;
    description: string;
    action?: React.ReactNode;
}) {
    return (
        <div className="flex items-center gap-3 border-b border-slate-100 px-4 py-4 sm:px-6">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-[#fff0eb] text-[#c43b21]">
                <Icon className="size-5" />
            </span>
            <div className="min-w-0 flex-1">
                <h2 className="text-base font-black text-[#3b211b]">{title}</h2>
                <p className="mt-0.5 text-xs text-slate-500">{description}</p>
            </div>
            {action}
        </div>
    );
}

function Field({
    label,
    error,
    count,
    className,
    children,
}: {
    label: string;
    error?: string;
    count?: string;
    className?: string;
    children: React.ReactNode;
}) {
    return (
        <div className={`space-y-1.5 ${className ?? ''}`.trim()}>
            <div className="flex items-center justify-between gap-3">
                <Label>{label}</Label>
                {count && (
                    <span className="text-[11px] text-slate-400 tabular-nums">
                        {count}
                    </span>
                )}
            </div>
            {children}
            <InputError message={error} />
        </div>
    );
}
