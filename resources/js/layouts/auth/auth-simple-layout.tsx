import { Link, usePage } from '@inertiajs/react';
import {
    ArrowLeft,
    BadgeCheck,
    BarChart3,
    Boxes,
    ReceiptText,
    ShieldCheck,
    Sparkles,
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import LanguageSwitcher from '@/components/language-switcher';
import { useTranslation } from '@/lib/i18n';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

const highlights = [
    { icon: ReceiptText, label: 'Kasir cepat' },
    { icon: Boxes, label: 'Stok real-time' },
    { icon: BarChart3, label: 'Laporan ringkas' },
];

export default function AuthSimpleLayout({
    children,
    title,
    description,
}: AuthLayoutProps) {
    const { name } = usePage().props;
    const { t } = useTranslation();

    return (
        <div className="relative min-h-svh overflow-hidden bg-[#ee4d2d] font-sans text-[#2d2928]">
            <div className="absolute -top-36 -left-32 size-[30rem] rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -right-32 -bottom-40 size-[34rem] rounded-full bg-[#ffb6a5]/25 blur-3xl" />

            <div className="relative grid min-h-svh lg:grid-cols-[1.04fr_0.96fr]">
                <aside className="relative hidden overflow-hidden border-r border-white/15 bg-[linear-gradient(145deg,#d94326_0%,#ee4d2d_55%,#ff704f_100%)] p-10 text-white lg:flex lg:flex-col xl:p-14">
                    <div className="absolute -top-28 -right-28 size-80 rounded-full border-[62px] border-white/[0.04]" />
                    <div className="absolute -bottom-28 -left-24 size-72 rounded-full bg-[#8f2412]/25 blur-3xl" />
                    <div className="absolute top-1/3 right-14 size-3 rounded-full bg-[#ffd6cb]" />

                    <div className="relative z-10 flex h-full flex-col">
                        <div className="flex items-center justify-between gap-4">
                            <Link
                                href={home()}
                                className="inline-flex w-fit items-center gap-3"
                            >
                                <span className="flex size-11 items-center justify-center rounded-2xl bg-white/10 text-white ring-1 ring-white/10">
                                    <AppLogoIcon className="size-6 fill-current" />
                                </span>
                                <span className="text-lg font-bold tracking-[-0.03em]">
                                    {name}
                                </span>
                            </Link>
                            <LanguageSwitcher />
                        </div>

                        <div className="my-auto max-w-xl py-12">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[11px] font-bold tracking-[0.14em] text-white uppercase">
                                <Sparkles className="size-3.5" />
                                {t('Ruang kerja toko Anda')}
                            </div>
                            <h1 className="mt-7 text-4xl leading-[1.08] font-bold tracking-[-0.055em] xl:text-[3.5rem]">
                                {t(
                                    'Semua pekerjaan toko, terasa lebih terarah.',
                                )}
                            </h1>
                            <p className="mt-6 max-w-lg text-base leading-8 text-white">
                                {t(
                                    'Masuk untuk melanjutkan transaksi, memantau stok, dan melihat perkembangan usaha dari satu tempat.',
                                )}
                            </p>

                            <div className="mt-10 grid grid-cols-3 gap-3">
                                {highlights.map((item) => (
                                    <div
                                        key={item.label}
                                        className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                                    >
                                        <item.icon className="size-5 text-[#ffd6cb]" />
                                        <div className="mt-5 text-xs font-bold text-white">
                                            {t(item.label)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 border-t border-white/15 pt-6 text-xs text-white">
                            <ShieldCheck className="size-4 text-[#ffd6cb]" />
                            {t('Akses aman dan terkontrol untuk setiap peran.')}
                        </div>
                    </div>
                </aside>

                <main className="relative flex items-center justify-center overflow-hidden bg-[#ee4d2d] px-5 py-8 sm:px-10 lg:px-12">
                    <div className="absolute -top-28 -right-24 size-80 rounded-full border-[56px] border-white/[0.06]" />
                    <div className="absolute -bottom-36 left-1/4 size-96 rounded-full bg-[#ff9d86]/25 blur-3xl" />

                    <div className="relative z-10 w-full max-w-md">
                        <div className="mb-8 flex items-center justify-between lg:hidden">
                            <Link
                                href={home()}
                                className="inline-flex items-center gap-3"
                            >
                                <span className="flex size-11 items-center justify-center rounded-2xl bg-white text-[#ee4d2d] shadow-lg shadow-[#a8321b]/20">
                                    <AppLogoIcon className="size-6 fill-current" />
                                </span>
                                <span className="font-bold tracking-[-0.03em] text-white">
                                    {name}
                                </span>
                            </Link>
                            <div className="flex items-center gap-2">
                                <LanguageSwitcher />
                                <Link
                                    href={home()}
                                    aria-label={t('Kembali ke halaman utama')}
                                    className="flex size-10 items-center justify-center rounded-full border border-white/35 bg-white text-[#ee4d2d] shadow-lg shadow-[#a8321b]/15"
                                >
                                    <ArrowLeft className="size-4" />
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-white/45 bg-white p-6 shadow-[0_32px_90px_-38px_rgba(111,34,19,0.58)] sm:p-8">
                            <div className="mb-8">
                                <div className="inline-flex items-center gap-2 rounded-full bg-[#fff0eb] px-3 py-1.5 text-[10px] font-bold tracking-[0.08em] text-[#b83219] uppercase">
                                    <BadgeCheck className="size-3.5" />
                                    {t('Akses aman')}
                                </div>
                                <h1 className="mt-5 text-3xl font-bold tracking-[-0.04em] text-[#3b211b]">
                                    {title}
                                </h1>
                                <p className="mt-3 text-sm leading-6 text-[#765f59] sm:text-base">
                                    {description}
                                </p>
                            </div>

                            <div className="[--color-accent-foreground:#b83219] [--color-accent:#fff0eb] [--color-background:#ffffff] [--color-border:#efd9d2] [--color-foreground:#3b211b] [--color-input:#e8c8be] [--color-muted-foreground:#765f59] [--color-primary-foreground:#ffffff] [--color-primary:#ee4d2d] [--color-ring:#ee4d2d]">
                                {children}
                            </div>

                            <div className="mt-8 border-t border-[#ee4d2d]/10 pt-6 text-center text-xs text-[#806963]">
                                <Link
                                    href={home()}
                                    className="inline-flex items-center gap-2 font-bold text-[#b83219] transition-colors hover:text-[#ee4d2d]"
                                >
                                    <ArrowLeft className="size-3.5" />
                                    {t('Kembali ke halaman utama')}
                                </Link>
                            </div>
                        </div>

                        <p className="mt-6 text-center text-[11px] leading-5 text-white/80">
                            {t(
                                'Dengan melanjutkan, Anda menyetujui kebijakan penggunaan layanan',
                            )}{' '}
                            {name}.
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
