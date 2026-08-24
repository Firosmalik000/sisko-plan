import { Link, usePage } from '@inertiajs/react';
import { domAnimation, LazyMotion, MotionConfig } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import { useRef } from 'react';
import AppLogoIcon from '@/components/app-logo-icon';
import { dashboard, home, login, register } from '@/routes';

export default function PublicSiteLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const page = usePage();
    const { auth, name } = page.props;
    const subscriptionState = page.props.subscriptionState as
        { can_write: boolean } | null | undefined;
    const portalHref =
        subscriptionState !== null && subscriptionState?.can_write === false
            ? '/pricing'
            : dashboard();
    const portalLabel =
        portalHref === '/pricing' ? 'Pilih paket' : 'Buka dashboard';
    const activePage = page.url.startsWith('/pricing') ? 'pricing' : 'home';
    const menu = useRef<HTMLDetailsElement>(null);
    const closeMenu = () => menu.current?.removeAttribute('open');
    const sectionHref = (id: string) =>
        activePage === 'home' ? `#${id}` : `/#${id}`;

    return (
        <LazyMotion features={domAnimation} strict>
            <MotionConfig reducedMotion="user">
                <div
                    className={`ledger-landing ${activePage === 'pricing' ? 'pricing-page' : ''}`.trim()}
                >
                    <header className="ledger-header">
                        <div className="ledger-container ledger-nav">
                            <Brand name={name} />
                            <nav
                                className="ledger-desktop-nav"
                                aria-label="Navigasi utama"
                            >
                                <a href={sectionHref('fitur')}>Fitur</a>
                                <a href={sectionHref('cara-kerja')}>
                                    Cara kerja
                                </a>
                                <Link
                                    href="/pricing"
                                    aria-current={
                                        activePage === 'pricing'
                                            ? 'page'
                                            : undefined
                                    }
                                >
                                    Paket
                                </Link>
                                <a href={sectionHref('faq')}>FAQ</a>
                            </nav>
                            <div className="ledger-nav-actions">
                                {auth.user ? (
                                    <Link
                                        className="ledger-button ledger-button-dark"
                                        href={portalHref}
                                    >
                                        {portalLabel}
                                    </Link>
                                ) : (
                                    <>
                                        <Link
                                            className="ledger-login"
                                            href={login()}
                                        >
                                            Masuk
                                        </Link>
                                        <Link
                                            className="ledger-button ledger-button-dark"
                                            href={register()}
                                        >
                                            Buat akun
                                        </Link>
                                    </>
                                )}
                            </div>
                            <details className="ledger-mobile-menu" ref={menu}>
                                <summary>
                                    <Menu className="menu-open" />
                                    <X className="menu-close" />
                                    <span className="menu-label-open sr-only">
                                        Buka navigasi
                                    </span>
                                    <span className="menu-label-close sr-only">
                                        Tutup navigasi
                                    </span>
                                </summary>
                                <div>
                                    <a
                                        href={sectionHref('fitur')}
                                        onClick={closeMenu}
                                    >
                                        Fitur
                                    </a>
                                    <a
                                        href={sectionHref('cara-kerja')}
                                        onClick={closeMenu}
                                    >
                                        Cara kerja
                                    </a>
                                    <Link href="/pricing" onClick={closeMenu}>
                                        Paket
                                    </Link>
                                    <a
                                        href={sectionHref('faq')}
                                        onClick={closeMenu}
                                    >
                                        FAQ
                                    </a>
                                    <Link
                                        href={auth.user ? portalHref : login()}
                                        onClick={closeMenu}
                                    >
                                        {auth.user ? portalLabel : 'Masuk'}
                                    </Link>
                                    {!auth.user && (
                                        <Link
                                            className="primary"
                                            href={register()}
                                            onClick={closeMenu}
                                        >
                                            Buat akun
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
                                <Brand name={name} />
                                <p>
                                    Scan barangnya. Sisanya langsung tercatat.
                                </p>
                            </div>
                            <nav aria-label="Navigasi footer">
                                <a href="/#fitur">Fitur</a>
                                <Link href="/pricing">Paket</Link>
                                <a href="/#faq">FAQ</a>
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

function Brand({ name }: { name: string }) {
    return (
        <Link
            className="ledger-brand"
            href={home()}
            aria-label={`${name}, beranda`}
        >
            <span className="ledger-brand-mark">
                <AppLogoIcon className="size-5 fill-current" />
            </span>
            <span>{name}</span>
        </Link>
    );
}
