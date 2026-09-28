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
        <div className="relative min-h-svh w-full overflow-hidden bg-[linear-gradient(116deg,#ee4d2d_0%,#fb5b41_50%,#ffe8df_80%,#fff8f5_100%)] font-sans text-[#2d2928] lg:h-screen lg:max-h-screen">
            <div className="pointer-events-none absolute -top-36 -left-32 size-[30rem] rounded-full bg-white/10 blur-3xl" />
            <div className="pointer-events-none absolute -right-32 -bottom-40 size-[34rem] rounded-full bg-[#ffb6a5]/25 blur-3xl" />

            <div className="relative grid min-h-svh w-full lg:h-full lg:grid-cols-[1.25fr_1fr] xl:grid-cols-[1.3fr_1fr]">
                <aside className="relative isolate hidden overflow-hidden border-r border-white/15 bg-transparent p-6 text-white lg:flex lg:h-full lg:flex-col lg:justify-between xl:p-10">
                    <div className="pointer-events-none absolute -top-28 -right-28 size-80 rounded-full border-[62px] border-white/[0.04]" />
                    <div className="pointer-events-none absolute -bottom-28 -left-24 size-72 rounded-full bg-[#8f2412]/25 blur-3xl" />
                    <div className="pointer-events-none absolute top-1/3 right-14 size-3 rounded-full bg-[#ffd6cb]" />

                    {/* Mascot Illustration with table anchored flush to bottom */}
                    <div className="pointer-events-none absolute right-2 bottom-0 z-10 hidden w-[46%] max-w-[20rem] lg:block xl:max-w-[23rem]">
                        <img
                            src="/images/login-mascot-xsisten.png"
                            alt=""
                            aria-hidden="true"
                            className="block h-auto w-full object-contain object-bottom drop-shadow-[0_20px_28px_rgba(102,25,12,0.22)]"
                        />
                    </div>

                    <div className="relative z-20 flex items-center justify-between gap-4">
                        <Link href={home()} className="inline-flex w-fit items-center gap-2.5 transition-transform active:scale-95">
                            <span className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-white/10 text-white shadow-sm ring-1 ring-white/10">
                                {brandLogo ? (
                                    <img src={brandLogo} alt="" className="size-full object-contain p-1.5" />
                                ) : (
                                    <BrandMark className="size-4.5 object-contain" />
                                )}
                            </span>
                            <span className="text-sm font-bold tracking-tight xl:text-base">{brandName}</span>
                        </Link>
                        <LanguageSwitcher />
                    </div>

                    <div className="relative z-20 my-auto max-w-[22rem] py-4 xl:max-w-[24rem]">
                        <div className="inline-flex items-center gap-1.5 rounded-full border border-white/20 bg-white/10 px-2.5 py-1 text-[9px] font-bold tracking-[0.12em] text-white uppercase">
                            <Store className="size-2.5" />
                            {t('Your store workspace')}
                        </div>
                        <h1 className="mt-3 text-xl leading-tight font-bold tracking-tight text-white sm:text-2xl xl:text-3xl">
                            {t('Keep every store task on track.')}
                        </h1>
                        <p className="mt-2 text-xs leading-relaxed text-white/90 xl:text-sm">
                            {t('Manage transactions, stock, and business performance in one place.')}
                        </p>
                    </div>

                    <div className="relative z-20 flex items-center gap-2 border-t border-white/15 pt-3 text-[11px] text-white/85">
                        <ShieldCheck className="size-3.5 shrink-0 text-[#ffd6cb]" />
                        <span>{t('Secure, controlled access for every role.')}</span>
                    </div>
                </aside>

                <main className="relative flex min-h-svh items-center justify-center overflow-y-auto bg-transparent px-4 py-6 sm:px-6 lg:h-full lg:min-h-0 lg:overflow-hidden lg:p-4 xl:p-6">
                    <div className="pointer-events-none absolute -top-28 -right-24 size-80 rounded-full border-[56px] border-white/[0.06]" />
                    <div className="pointer-events-none absolute -bottom-36 left-1/4 size-96 rounded-full bg-[#ffd4c7]/45 blur-3xl" />

                    <div className="relative z-10 w-full max-w-[23.5rem] xl:max-w-[25rem]">
                        <div className="mb-4 flex items-center justify-between lg:hidden">
                            <Link href={home()} className="inline-flex items-center gap-2 transition-transform active:scale-95">
                                <span className="flex size-9 items-center justify-center overflow-hidden rounded-xl bg-[#ee4d2d] text-white shadow-md shadow-[#a8321b]/20">
                                    {brandLogo ? (
                                        <img src={brandLogo} alt="" className="size-full object-contain p-1.5" />
                                    ) : (
                                        <BrandMark className="size-4.5 object-contain" />
                                    )}
                                </span>
                                <span className="text-sm font-bold tracking-tight text-[#3b211b]">{brandName}</span>
                            </Link>
                            <div className="flex items-center gap-2">
                                <LanguageSwitcher />
                                <Link
                                    href={home()}
                                    aria-label={t('Back to home')}
                                    className="flex size-8 items-center justify-center rounded-full border border-[#efcfc4] bg-white text-[#ee4d2d] shadow-sm transition-transform active:scale-95"
                                >
                                    <ArrowLeft className="size-3.5" />
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-2xl border border-[#f0dad2]/90 bg-white/95 p-4 shadow-[0_16px_40px_-16px_rgba(111,34,19,0.2)] backdrop-blur-md sm:p-5 xl:p-6">
                            <div className="mb-3 sm:mb-3.5">
                                <div className="inline-flex items-center gap-1 rounded-full bg-[#fff0eb] px-2 py-0.5 text-[9px] font-bold tracking-[0.08em] text-[#b83219] uppercase">
                                    <BadgeCheck className="size-2.5" />
                                    {t('Secure access')}
                                </div>
                                <h2 className="mt-1.5 text-lg font-bold tracking-tight text-[#2d2928] sm:text-xl">{title}</h2>
                                <p className="mt-0.5 text-xs text-[#765f59]">{description}</p>
                            </div>

                            <div className="[--color-accent-foreground:#b83219] [--color-accent:#fff0eb] [--color-background:#ffffff] [--color-border:#efd9d2] [--color-foreground:#3b211b] [--color-input:#e8c8be] [--color-muted-foreground:#765f59] [--color-primary-foreground:#ffffff] [--color-primary:#ee4d2d] [--color-ring:#ee4d2d]">
                                {children}
                            </div>
                        </div>

                        <p className="mt-2.5 text-center text-[10px] leading-relaxed text-[#806963]">
                            {t('By continuing, you agree to the service terms')} {brandName}.
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
