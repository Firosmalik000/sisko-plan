import { Link, usePage } from '@inertiajs/react';
import { domAnimation, LazyMotion, MotionConfig } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import BrandMark from '@/components/brand-mark';
import LanguageSwitcher from '@/components/language-switcher';
import { useTranslation } from '@/lib/i18n';
import { dashboard, home, login, register } from '@/routes';

export default function PublicSiteLayout({ children }: { children: React.ReactNode }) {
    const page = usePage();
    const { auth, name, branding } = page.props;
    const { t } = useTranslation();
    const portalHref = dashboard();
    const portalLabel = t('Buka dashboard');
    const menu = useRef<HTMLDetailsElement>(null);
    const [isScrolled, setIsScrolled] = useState(false);
    const closeMenu = () => menu.current?.removeAttribute('open');
    const sectionHref = (id: string) => `#${id}`;

    useEffect(() => {
        const updateScrollState = () => setIsScrolled(window.scrollY > 18);

        updateScrollState();
        window.addEventListener('scroll', updateScrollState, {
            passive: true,
        });

        return () => window.removeEventListener('scroll', updateScrollState);
    }, []);

    return (
        <LazyMotion features={domAnimation} strict>
            <MotionConfig reducedMotion="user">
                <div className="ledger-landing">
                    <header className={`ledger-header${isScrolled ? 'is-scrolled' : ''}`}>
                        <div className="ledger-container ledger-nav">
                            <Brand name={name} logoUrl={branding.logo_url} />
                            <nav className="ledger-desktop-nav" aria-label={t('Navigasi utama')}>
                                <a href={sectionHref('fitur')}>{t('Fitur')}</a>
                                <a href={sectionHref('cara-kerja')}>{t('Cara kerja')}</a>
                                <a href={sectionHref('faq')}>{t('FAQ')}</a>
                            </nav>
                            <div className="ledger-nav-actions">
                                <LanguageSwitcher />
                                {auth.user ? (
                                    <Link className="ledger-button ledger-button-dark" href={portalHref}>
                                        {portalLabel}
                                    </Link>
                                ) : (
                                    <>
                                        <Link className="ledger-login" href={login()}>
                                            {t('Masuk')}
                                        </Link>
                                        <Link className="ledger-button ledger-button-dark" href={register()}>
                                            {t('Buat akun')}
                                        </Link>
                                    </>
                                )}
                            </div>
                            <details className="ledger-mobile-menu" ref={menu}>
                                <summary>
                                    <Menu className="menu-open" />
                                    <X className="menu-close" />
                                    <span className="menu-label-open sr-only">{t('Buka navigasi')}</span>
                                    <span className="menu-label-close sr-only">{t('Tutup navigasi')}</span>
                                </summary>
                                <div>
                                    <LanguageSwitcher />
                                    <a href={sectionHref('fitur')} onClick={closeMenu}>
                                        {t('Fitur')}
                                    </a>
                                    <a href={sectionHref('cara-kerja')} onClick={closeMenu}>
                                        {t('Cara kerja')}
                                    </a>
                                    <a href={sectionHref('faq')} onClick={closeMenu}>
                                        {t('FAQ')}
                                    </a>
                                    <Link href={auth.user ? portalHref : login()} onClick={closeMenu}>
                                        {auth.user ? portalLabel : t('Masuk')}
                                    </Link>
                                    {!auth.user && (
                                        <Link className="primary" href={register()} onClick={closeMenu}>
                                            {t('Buat akun')}
                                        </Link>
                                    )}
                                </div>
                            </details>
                        </div>
                    </header>

                    <main className="ledger-public-main">{children}</main>

                    <footer className="ledger-footer">
                        <div className="ledger-container">
                            <div className="ledger-footer-brand">
                                <Brand name={name} logoUrl={branding.logo_url} />
                                <p>{t(branding.tagline || 'Scan barangnya. Sisanya langsung tercatat.')}</p>
                            </div>
                            <nav aria-label="Navigasi footer" className="flex-wrap">
                                <a href="/#fitur">{t('Fitur')}</a>
                                <a href="/#faq">{t('FAQ')}</a>
                                {branding.social_links.map((social) => (
                                    <a key={`${social.platform}-${social.url}`} href={social.url} target="_blank" rel="noreferrer">
                                        {social.platform}
                                    </a>
                                ))}
                            </nav>
                            <span>
                                © {new Date().getFullYear()} {name}
                            </span>
                        </div>
                    </footer>
                </div>
            </MotionConfig>
        </LazyMotion>
    );
}

function Brand({ name, logoUrl }: { name: string; logoUrl: string | null }) {
    return (
        <Link className="ledger-brand" href={home()} aria-label={`${name}, ${translateHomeLabel()}`}>
            <span className="ledger-brand-mark">
                <BrandMark logoUrl={logoUrl} className="size-full object-contain" />
            </span>
            <span>{name}</span>
        </Link>
    );
}

function translateHomeLabel() {
    return typeof document !== 'undefined' && document.documentElement.lang === 'ms' ? 'laman utama' : 'beranda';
}
