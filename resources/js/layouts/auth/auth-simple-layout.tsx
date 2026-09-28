import { Link, usePage } from '@inertiajs/react';
import { ArrowLeft, BadgeCheck, BarChart3, Boxes, ReceiptText, ShieldCheck, Store } from 'lucide-react';
import BrandMark from '@/components/brand-mark';
import LanguageSwitcher from '@/components/language-switcher';
import { useTranslation } from '@/lib/i18n';
import { home } from '@/routes';
import type { AuthLayoutProps } from '@/types';

const highlights = [
    { icon: ReceiptText, label: 'Quick actions' },
    { icon: Boxes, label: 'Real-time stock' },
    { icon: BarChart3, label: 'Concise reports' },
];

export default function AuthSimpleLayout({ children, title, description }: AuthLayoutProps) {
    const { branding } = usePage().props;
    const { t } = useTranslation();
    const brandName = branding?.brand_name?.trim() || 'xsisten';
    const brandLogo = branding?.logo_url;

    return (
        <div className="relative min-h-svh bg-[linear-gradient(116deg,#ee4d2d_0%,#fb5b41_50%,#ffe8df_80%,#fff8f5_100%)] font-sans text-[#2d2928] lg:h-screen lg:max-h-screen lg:overflow-hidden">
            <div className="pointer-events-none absolute -top-36 -left-32 size-[30rem] rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-32 -bottom-40 size-[34rem] rounded-full bg-[#ffb6a5]/25 blur-3xl" />

            <div className="relative grid min-h-svh lg:h-full lg:grid-cols-[1.25fr_1fr] xl:grid-cols-[1.3fr_1fr]">
                <aside className="relative isolate hidden overflow-hidden border-r border-white/15 bg-transparent p-8 text-white lg:flex lg:h-full lg:flex-col lg:justify-between xl:p-12">
                    <div className="pointer-events-none absolute -top-28 -right-28 size-80 rounded-full border-[62px] border-white/[0.04]" />
                    <div className="pointer-events-none absolute -bottom-28 -left-24 size-72 rounded-full bg-[#8f2412]/25 blur-3xl" />
                    <div className="pointer-events-none absolute top-1/3 right-14 size-3 rounded-full bg-[#ffd6cb]" />
                    <div className="pointer-events-none absolute right-3 bottom-0 z-0 hidden max-h-[46%] w-[42%] max-w-[22rem] lg:block">
                        <img
                            src="/images/login-mascot-xsisten.png"
                            alt=""
                            aria-hidden="true"
                            className="block h-auto w-full object-contain object-bottom drop-shadow-[0_20px_28px_rgba(102,25,12,0.22)]"
                        />
                    </div>

                    <div className="relative z-20 flex items-center justify-between gap-4">
                        <Link href={home()} className="inline-flex w-fit items-center gap-3 transition-transform active:scale-95">
                            <span className="flex size-10 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-white shadow-sm ring-1 ring-white/10">
                                {brandLogo ? (
                                    <img src={brandLogo} alt="" className="size-full object-contain p-2" />
                                ) : (
                                    <BrandMark className="size-5 object-contain" />
                                )}
                            </span>
                            <span className="text-base font-bold tracking-tight">{brandName}</span>
                        </Link>
                        <LanguageSwitcher />
                    </div>

                    <div className="relative z-20 my-auto max-w-[24rem] py-6">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-[10px] font-bold tracking-[0.12em] text-white uppercase">
                            <Store className="size-3" />
                            {t('Your store workspace')}
                        </div>
                        <h1 className="mt-4 text-2xl leading-snug font-extrabold tracking-tight xl:text-3xl">
                            {t('Keep every store task on track.')}
                        </h1>
                        <p className="mt-2.5 text-xs leading-relaxed text-white/90 xl:text-sm">
                            {t('Manage transactions, stock, and business performance in one place.')}
                        </p>

                        <div className="relative z-10 mt-6 grid grid-cols-3 gap-2">
                            {highlights.map((item) => (
                                <div key={item.label} className="rounded-xl border border-white/10 bg-white/[0.08] p-2.5 backdrop-blur-sm">
                                    <item.icon className="size-4 text-[#ffd6cb]" />
                                    <div className="mt-2 text-[10px] leading-tight font-bold text-white">{t(item.label)}</div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="relative z-20 flex items-center gap-2.5 border-t border-white/15 pt-4 text-xs text-white/90">
                        <ShieldCheck className="size-4 shrink-0 text-[#ffd6cb]" />
                        <span>{t('Secure, controlled access for every role.')}</span>
                    </div>
                </aside>

                <main className="relative flex min-h-svh items-center justify-center overflow-y-auto bg-transparent px-4 py-6 sm:px-8 lg:h-full lg:min-h-0 lg:p-6 xl:p-8">
                    <div className="pointer-events-none absolute -top-28 -right-24 size-80 rounded-full border-[56px] border-white/[0.06]" />
                    <div className="pointer-events-none absolute -bottom-36 left-1/4 size-96 rounded-full bg-[#ffd4c7]/45 blur-3xl" />

                    <div className="relative z-10 w-full max-w-[25rem] xl:max-w-[26.5rem]">
                        <div className="mb-5 flex items-center justify-between lg:hidden">
                            <Link href={home()} className="inline-flex items-center gap-2.5 transition-transform active:scale-95">
                                <span className="flex size-10 items-center justify-center overflow-hidden rounded-xl bg-[#ee4d2d] text-white shadow-md shadow-[#a8321b]/20">
                                    {brandLogo ? (
                                        <img src={brandLogo} alt="" className="size-full object-contain p-2" />
                                    ) : (
                                        <BrandMark className="size-5 object-contain" />
                                    )}
                                </span>
                                <span className="text-base font-bold tracking-tight text-[#3b211b]">{brandName}</span>
                            </Link>
                            <div className="flex items-center gap-2">
                                <LanguageSwitcher />
                                <Link
                                    href={home()}
                                    aria-label={t('Back to home')}
                                    className="flex size-9 items-center justify-center rounded-full border border-[#efcfc4] bg-white text-[#ee4d2d] shadow-sm transition-transform active:scale-95"
                                >
                                    <ArrowLeft className="size-4" />
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[#f0dad2]/90 bg-white/95 p-5 shadow-[0_20px_50px_-20px_rgba(111,34,19,0.22)] backdrop-blur-md sm:rounded-3xl sm:p-7">
                            <div className="mb-5">
                                <div className="inline-flex items-center gap-1.5 rounded-full bg-[#fff0eb] px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] text-[#b83219] uppercase">
                                    <BadgeCheck className="size-3" />
                                    {t('Secure access')}
                                </div>
                                <h2 className="mt-2.5 text-xl font-bold tracking-tight text-[#2d2928] sm:text-2xl">{title}</h2>
                                <p className="mt-1 text-xs leading-relaxed text-[#765f59] sm:text-sm">{description}</p>
                            </div>

                            <div className="[--color-accent-foreground:#b83219] [--color-accent:#fff0eb] [--color-background:#ffffff] [--color-border:#efd9d2] [--color-foreground:#3b211b] [--color-input:#e8c8be] [--color-muted-foreground:#765f59] [--color-primary-foreground:#ffffff] [--color-primary:#ee4d2d] [--color-ring:#ee4d2d]">
                                {children}
                            </div>
                        </div>

                        <p className="mt-4 text-center text-[11px] leading-relaxed text-[#806963]">
                            {t('By continuing, you agree to the service terms')} {brandName}.
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
