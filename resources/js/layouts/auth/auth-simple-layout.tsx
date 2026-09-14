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
        <div className="relative min-h-svh overflow-hidden bg-[linear-gradient(116deg,#ee4d2d_0%,#fb5b41_50%,#ffe8df_80%,#fff8f5_100%)] font-sans text-[#2d2928]">
            <div className="absolute -top-36 -left-32 size-[30rem] rounded-full bg-white/10 blur-3xl" />
            <div className="absolute -right-32 -bottom-40 size-[34rem] rounded-full bg-[#ffb6a5]/25 blur-3xl" />

            <div className="relative grid min-h-svh lg:grid-cols-[1.5fr_0.9fr]">
                <aside className="relative isolate hidden overflow-hidden border-r border-white/15 bg-transparent p-10 text-white lg:flex lg:flex-col xl:p-14">
                    <div className="absolute -top-28 -right-28 size-80 rounded-full border-[62px] border-white/[0.04]" />
                    <div className="absolute -bottom-28 -left-24 size-72 rounded-full bg-[#8f2412]/25 blur-3xl" />
                    <div className="absolute top-1/3 right-14 size-3 rounded-full bg-[#ffd6cb]" />
                    <div className="pointer-events-none absolute right-0 bottom-0 z-0 hidden w-[50%] max-w-[38rem] lg:block">
                        <img
                            src="/images/login-mascot-xsisten.png"
                            alt=""
                            aria-hidden="true"
                            className="block h-auto w-full object-contain object-bottom drop-shadow-[0_26px_32px_rgba(102,25,12,0.2)]"
                        />
                    </div>

                    <div className="relative z-20 flex h-full flex-col">
                        <div className="flex items-center justify-between gap-4">
                            <Link href={home()} className="inline-flex w-fit items-center gap-3">
                                <span className="flex size-11 items-center justify-center overflow-hidden rounded-2xl bg-white/10 text-white ring-1 ring-white/10">
                                    {brandLogo ? (
                                        <img src={brandLogo} alt="" className="size-full object-contain p-2" />
                                    ) : (
                                        <BrandMark className="size-6 object-contain" />
                                    )}
                                </span>
                                <span className="text-lg font-bold tracking-[-0.03em]">{brandName}</span>
                            </Link>
                            <LanguageSwitcher />
                        </div>

                        <div className="my-auto max-w-[25rem] py-10">
                            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3.5 py-2 text-[11px] font-bold tracking-[0.14em] text-white uppercase">
                                <Store className="size-3.5" />
                                {t('Your store workspace')}
                            </div>
                            <h1 className="mt-6 max-w-[25rem] text-4xl leading-[1.04] font-bold tracking-[-0.045em] xl:text-[3.1rem]">
                                {t('Keep every store task on track.')}
                            </h1>
                            <p className="mt-5 max-w-[20rem] text-[15px] leading-7 text-white">
                                {t('Manage transactions, stock, and business performance in one place.')}
                            </p>

                            <div className="relative z-10 mt-8 grid max-w-[21rem] grid-cols-3 gap-2">
                                {highlights.map((item) => (
                                    <div key={item.label} className="rounded-2xl border border-white/10 bg-white/[0.06] p-3.5">
                                        <item.icon className="size-5 text-[#ffd6cb]" />
                                        <div className="mt-4 text-[11px] font-bold text-white">{t(item.label)}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="flex items-center gap-3 border-t border-white/15 pt-6 text-xs text-white">
                            <ShieldCheck className="size-4 text-[#ffd6cb]" />
                            {t('Secure, controlled access for every role.')}
                        </div>
                    </div>
                </aside>

                <main className="relative flex items-center justify-center overflow-hidden bg-transparent px-5 py-8 sm:px-10 lg:px-12">
                    <div className="absolute -top-28 -right-24 size-80 rounded-full border-[56px] border-white/[0.06]" />
                    <div className="absolute -bottom-36 left-1/4 size-96 rounded-full bg-[#ffd4c7]/45 blur-3xl" />

                    <div className="relative z-10 w-full max-w-md">
                        <div className="mb-8 flex items-center justify-between lg:hidden">
                            <Link href={home()} className="inline-flex items-center gap-3">
                                <span className="flex size-11 items-center justify-center overflow-hidden rounded-2xl bg-[#ee4d2d] text-white shadow-lg shadow-[#a8321b]/20">
                                    {brandLogo ? (
                                        <img src={brandLogo} alt="" className="size-full object-contain p-2" />
                                    ) : (
                                        <BrandMark className="size-6 object-contain" />
                                    )}
                                </span>
                                <span className="font-bold tracking-[-0.03em] text-[#3b211b]">{brandName}</span>
                            </Link>
                            <div className="flex items-center gap-2">
                                <LanguageSwitcher />
                                <Link
                                    href={home()}
                                    aria-label={t('Back to home')}
                                    className="flex size-10 items-center justify-center rounded-full border border-[#efcfc4] bg-white text-[#ee4d2d] shadow-lg shadow-[#a8321b]/10"
                                >
                                    <ArrowLeft className="size-4" />
                                </Link>
                            </div>
                        </div>

                        <div className="rounded-[2rem] border border-[#f1d8d0] bg-white p-6 shadow-[0_30px_80px_-34px_rgba(111,34,19,0.38)] sm:p-9 lg:max-w-[34rem]">
                            <div className="mb-8">
                                <div className="inline-flex items-center gap-2 rounded-full bg-[#fff0eb] px-3 py-1.5 text-[10px] font-bold tracking-[0.08em] text-[#b83219] uppercase">
                                    <BadgeCheck className="size-3.5" />
                                    {t('Secure access')}
                                </div>
                                <h1 className="mt-5 text-3xl font-bold tracking-[-0.04em] text-[#3b211b]">{title}</h1>
                                <p className="mt-3 text-sm leading-6 text-[#765f59] sm:text-base">{description}</p>
                            </div>

                            <div className="[--color-accent-foreground:#b83219] [--color-accent:#fff0eb] [--color-background:#ffffff] [--color-border:#efd9d2] [--color-foreground:#3b211b] [--color-input:#e8c8be] [--color-muted-foreground:#765f59] [--color-primary-foreground:#ffffff] [--color-primary:#ee4d2d] [--color-ring:#ee4d2d]">
                                {children}
                            </div>
                        </div>

                        <div className="pointer-events-none mt-5 flex justify-center lg:hidden">
                            <img
                                src="/images/login-mascot-xsisten.png"
                                alt=""
                                aria-hidden="true"
                                className="h-auto max-h-44 w-auto max-w-[88%] object-contain drop-shadow-[0_18px_24px_rgba(102,25,12,0.24)]"
                            />
                        </div>

                        <p className="mt-6 text-center text-[11px] leading-5 text-[#806963]">
                            {t('By continuing, you agree to the service terms')} {brandName}.
                        </p>
                    </div>
                </main>
            </div>
        </div>
    );
}
