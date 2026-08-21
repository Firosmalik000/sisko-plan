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

    return (
        <div className="relative min-h-svh overflow-hidden bg-[#f5f7f2] font-sans text-[#173c35]">
            <div className="absolute -top-36 -left-32 size-[30rem] rounded-full bg-[#f5b942]/15 blur-3xl" />
            <div className="absolute -right-32 -bottom-40 size-[34rem] rounded-full bg-[#71b6a3]/15 blur-3xl" />

            <div className="relative grid min-h-svh lg:grid-cols-[1.04fr_0.96fr]">
                <aside className="relative hidden overflow-hidden bg-[#153f36] p-10 text-white lg:flex lg:flex-col xl:p-14">
                    <div className="absolute -top-28 -right-28 size-80 rounded-full border-[62px] border-white/[0.04]" />
                    <div className="absolute -bottom-28 -left-24 size-72 rounded-full bg-[#e2793c]/20 blur-3xl" />
                    <div className="absolute top-1/3 right-14 size-3 rounded-full bg-[#f5b942]" />

                    <div className="relative z-10 flex h-full flex-col">
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

                        <div className="my-auto max-w-xl py-12">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-3.5 py-2 text-[11px] font-bold tracking-[0.14em] text-[#f5d177] uppercase">
                                <Sparkles className="size-3.5" />
                                Ruang kerja toko Anda
                            </div>
                            <h1 className="mt-7 text-4xl leading-[1.08] font-bold tracking-[-0.055em] xl:text-[3.5rem]">
                                Semua pekerjaan toko, terasa lebih terarah.
                            </h1>
                            <p className="mt-6 max-w-lg text-base leading-8 text-white/60">
                                Masuk untuk melanjutkan transaksi, memantau
                                stok, dan melihat perkembangan usaha dari satu
                                tempat.
                            </p>

                            <div className="mt-10 grid grid-cols-3 gap-3">
                                {highlights.map((item) => (
                                    <div
                                        key={item.label}
                                        className="rounded-2xl border border-white/10 bg-white/[0.06] p-4"
                                    >
                                        <item.icon className="size-5 text-[#f5b942]" />
                                        <div className="mt-5 text-xs font-bold text-white/85">
                                            {item.label}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 border-t border-white/10 pt-6 text-xs text-white/45">
                            <ShieldCheck className="size-4 text-[#78c1ad]" />
                            Akses aman dan terkontrol untuk setiap peran.
                        </div>
                    </div>
                </aside>

                <main className="flex items-center justify-center px-5 py-8 sm:px-10 lg:px-12">
                    <div className="w-full max-w-md">
                        <div className="mb-8 flex items-center justify-between lg:hidden">
                            <Link
                                href={home()}
                                className="inline-flex items-center gap-3"
                            >
                                <span className="flex size-11 items-center justify-center rounded-2xl bg-[#153f36] text-white">
                                    <AppLogoIcon className="size-6 fill-current" />
                                </span>
                                <span className="font-bold tracking-[-0.03em]">
                                    {name}
                                </span>
                            </Link>
                            <Link
                                href={home()}
                                aria-label="Kembali ke halaman utama"
                                className="flex size-10 items-center justify-center rounded-full border border-[#153f36]/10 bg-white text-[#153f36]"
                            >
                                <ArrowLeft className="size-4" />
                            </Link>
                        </div>

                        <div className="rounded-[2rem] border border-[#153f36]/10 bg-white p-6 shadow-[0_30px_80px_-42px_rgba(18,60,52,0.48)] sm:p-8">
                            <div className="mb-8">
                                <div className="inline-flex items-center gap-2 rounded-full bg-[#e9f3ee] px-3 py-1.5 text-[10px] font-bold tracking-[0.08em] text-[#276b5a] uppercase">
                                    <BadgeCheck className="size-3.5" />
                                    Akses aman
                                </div>
                                <h1 className="mt-5 text-3xl font-bold tracking-[-0.045em] text-[#153b33]">
                                    {title}
                                </h1>
                                <p className="mt-3 text-sm leading-6 text-[#6a7e77] sm:text-base">
                                    {description}
                                </p>
                            </div>

                            <div className="[--color-accent-foreground:#153f36] [--color-accent:#e9f3ee] [--color-background:#ffffff] [--color-border:#dfe5e1] [--color-foreground:#173c35] [--color-input:#d7dfdb] [--color-muted-foreground:#6a7e77] [--color-primary-foreground:#ffffff] [--color-primary:#153f36] [--color-ring:#71b6a3]">
                                {children}
                            </div>

                            <div className="mt-8 border-t border-[#153f36]/8 pt-6 text-center text-xs text-[#7a8b85]">
                                <Link
                                    href={home()}
                                    className="inline-flex items-center gap-2 font-bold text-[#315f54] transition-colors hover:text-[#d8672f]"
                                >
                                    <ArrowLeft className="size-3.5" />
                                    Kembali ke halaman utama
                                </Link>
                            </div>
                        </div>

                        <p className="mt-6 text-center text-[11px] leading-5 text-[#8a9994]">
                            Dengan melanjutkan, Anda menyetujui kebijakan
                            penggunaan layanan {name}.
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
