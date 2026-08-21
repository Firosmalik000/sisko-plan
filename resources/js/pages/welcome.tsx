import { Head, Link, usePage } from '@inertiajs/react';
import {
    ArrowDownRight,
    ArrowRight,
    BarChart3,
    Box,
    Boxes,
    Check,
    ChevronRight,
    CircleDollarSign,
    ClipboardCheck,
    Menu,
    PackageSearch,
    ReceiptText,
    ScanLine,
    ShieldCheck,
    Store,
    Users,
    WalletCards,
    X,
} from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { dashboard, home, login, register } from '@/routes';

const workflow = [
    { label: 'Kasir', detail: 'Transaksi harian', icon: ScanLine },
    { label: 'Stok', detail: 'Ketersediaan barang', icon: Box },
    { label: 'Kas', detail: 'Arus uang', icon: WalletCards },
    { label: 'Laporan', detail: 'Ringkasan kinerja', icon: BarChart3 },
];

const services = [
    {
        title: 'Penjualan kasir',
        copy: 'Catat transaksi, pembayaran, dan bukti penjualan dari satu layar.',
        icon: ReceiptText,
    },
    {
        title: 'Stok & produk',
        copy: 'Pantau stok per varian, batas minimum, dan riwayat pergerakan.',
        icon: Boxes,
    },
    {
        title: 'Pembelian',
        copy: 'Kelola kulakan, supplier, penerimaan barang, dan utang usaha.',
        icon: PackageSearch,
    },
    {
        title: 'Kas & modal',
        copy: 'Pisahkan uang masuk, pengeluaran, modal, dan rekening toko.',
        icon: CircleDollarSign,
    },
    {
        title: 'Laporan usaha',
        copy: 'Baca penjualan bersih, laba, arus kas, dan produk terlaris.',
        icon: ClipboardCheck,
    },
    {
        title: 'Toko & tim',
        copy: 'Atur beberapa toko serta akses kerja setiap anggota dengan jelas.',
        icon: Users,
    },
];

const transactions = [
    ['09:42', 'Kopi Kapal Api 165g', 'Rp7.500'],
    ['09:41', 'Gula Pasir 1kg', 'Rp14.000'],
    ['09:40', 'Indomie Goreng', 'Rp6.000'],
    ['09:39', 'Telur Ayam 10 butir', 'Rp18.000'],
];

const stockItems = [
    ['Gula Pasir 1kg', 'sisa 3'],
    ['Minyak Goreng 2L', 'sisa 2'],
    ['Beras Premium 5kg', 'sisa 4'],
    ['Tepung Terigu 1kg', 'sisa 2'],
];

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

function OperationsBoard() {
    const chart = [38, 54, 47, 69, 58, 82, 67];

    return (
        <div
            className="ledger-board-wrap"
            aria-label="Contoh tampilan Sisko Plan"
        >
            <div className="ledger-board-label">Data contoh</div>
            <div className="ledger-board">
                <div className="ledger-workflow">
                    {workflow.map(({ label, detail, icon: Icon }, index) => (
                        <div className="ledger-workflow-item" key={label}>
                            <span className="ledger-workflow-icon">
                                <Icon />
                            </span>
                            <span>
                                <strong>{label}</strong>
                                <small>{detail}</small>
                            </span>
                            {index < workflow.length - 1 && (
                                <ArrowRight className="ledger-workflow-arrow" />
                            )}
                        </div>
                    ))}
                </div>

                <div className="ledger-board-grid">
                    <section className="ledger-board-column">
                        <div className="ledger-board-heading">
                            <h3>Transaksi terbaru</h3>
                            <span className="ledger-live">Live</span>
                        </div>
                        <div className="ledger-list">
                            {transactions.map(([time, product, price]) => (
                                <div
                                    className="ledger-transaction"
                                    key={`${time}-${product}`}
                                >
                                    <time>{time}</time>
                                    <span>{product}</span>
                                    <strong>{price}</strong>
                                </div>
                            ))}
                        </div>
                        <div className="ledger-today">
                            <div className="ledger-board-heading">
                                <h3>Ringkasan hari ini</h3>
                                <small>per 10:00</small>
                            </div>
                            <div className="ledger-stat-pair">
                                <span>
                                    Total transaksi<strong>28</strong>
                                </span>
                                <span>
                                    Omzet<strong>Rp682.500</strong>
                                </span>
                                <span>
                                    Item terjual<strong>48</strong>
                                </span>
                                <span>
                                    Rata-rata<strong>Rp24.375</strong>
                                </span>
                            </div>
                        </div>
                    </section>

                    <section className="ledger-board-column">
                        <div className="ledger-board-heading">
                            <h3>Stok menipis</h3>
                            <span className="ledger-alert">8 item</span>
                        </div>
                        <div className="ledger-list">
                            {stockItems.map(([product, stock]) => (
                                <div className="ledger-stock" key={product}>
                                    <span>{product}</span>
                                    <strong>{stock}</strong>
                                </div>
                            ))}
                        </div>
                        <div className="ledger-ranking">
                            <h3>Stok terlaris</h3>
                            {[
                                'Beras Premium 5kg',
                                'Minyak Goreng 2L',
                                'Indomie Goreng',
                            ].map((item, index) => (
                                <div key={item}>
                                    <span>{index + 1}</span>
                                    <p>{item}</p>
                                    <strong>{96 - index * 12} pcs</strong>
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="ledger-board-column">
                        <div className="ledger-board-heading">
                            <h3>Posisi kas</h3>
                            <small>per 10:00</small>
                        </div>
                        <p className="ledger-cash-label">Saldo kas</p>
                        <strong className="ledger-cash-value">
                            Rp1.245.000
                        </strong>
                        <div className="ledger-cash-lines">
                            <span>
                                Masuk hari ini<strong>Rp2.350.000</strong>
                            </span>
                            <span>
                                Keluar hari ini<strong>Rp1.105.000</strong>
                            </span>
                        </div>
                        <div className="ledger-chart">
                            <div className="ledger-chart-head">
                                <h3>Arus kas</h3>
                                <small>7 hari</small>
                            </div>
                            <div className="ledger-bars">
                                {chart.map((height, index) => (
                                    <span key={index}>
                                        <i style={{ height: `${height}%` }} />
                                        <b
                                            style={{
                                                height: `${Math.max(22, height - 18)}%`,
                                            }}
                                        />
                                    </span>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="ledger-board-column ledger-report-column">
                        <div className="ledger-board-heading">
                            <h3>Kinerja 30 hari</h3>
                        </div>
                        <div className="ledger-report-list">
                            <span>
                                Omzet<strong>Rp18.750.000</strong>
                            </span>
                            <span>
                                Laba kotor<strong>Rp5.620.000</strong>
                            </span>
                            <span>
                                Transaksi<strong>742</strong>
                            </span>
                        </div>
                        <div className="ledger-line-chart" aria-hidden="true">
                            <svg viewBox="0 0 240 100">
                                <path d="M2 79 C20 64 26 66 42 73 S67 44 82 58 S110 75 123 61 S145 48 157 55 S181 26 194 38 S218 32 238 7" />
                                <circle cx="238" cy="7" r="4" />
                            </svg>
                        </div>
                        <div className="ledger-category">
                            <span className="ledger-donut" />
                            <div>
                                <p>
                                    <i />
                                    Sembako <strong>45%</strong>
                                </p>
                                <p>
                                    <i />
                                    Makanan <strong>25%</strong>
                                </p>
                                <p>
                                    <i />
                                    Minuman <strong>15%</strong>
                                </p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}

export default function Welcome() {
    const { auth, name } = usePage().props;
    const primaryHref = auth.user ? dashboard() : register();

    return (
        <>
            <Head title="Operasional Toko dalam Satu Alur" />
            <div className="ledger-landing">
                <header className="ledger-header">
                    <div className="ledger-container ledger-nav">
                        <Brand name={name} />
                        <nav
                            className="ledger-desktop-nav"
                            aria-label="Navigasi utama"
                        >
                            <a href="#fitur">Fitur</a>
                            <a href="#cara-kerja">Cara kerja</a>
                            <a href="#tentang">Tentang</a>
                        </nav>
                        <div className="ledger-nav-actions">
                            {auth.user ? (
                                <Link
                                    className="ledger-button ledger-button-dark"
                                    href={dashboard()}
                                >
                                    Buka dashboard
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
                        <details className="ledger-mobile-menu">
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
                                <a href="#fitur">Fitur</a>
                                <a href="#cara-kerja">Cara kerja</a>
                                <a href="#tentang">Tentang</a>
                                <Link href={auth.user ? dashboard() : login()}>
                                    {auth.user ? 'Dashboard' : 'Masuk'}
                                </Link>
                                {!auth.user && (
                                    <Link className="primary" href={register()}>
                                        Buat akun
                                    </Link>
                                )}
                            </div>
                        </details>
                    </div>
                </header>

                <main>
                    <section className="ledger-hero">
                        <div className="ledger-container ledger-hero-grid">
                            <div className="ledger-hero-copy">
                                <h1>
                                    Kelola toko dalam satu alur yang tenang.
                                </h1>
                                <p className="ledger-lead">
                                    Dari kasir hingga laporan, semua tercatat
                                    rapi. Stok terjaga, kas terbaca, keputusan
                                    lebih mudah.
                                </p>
                                <div className="ledger-hero-actions">
                                    <Link
                                        className="ledger-button ledger-button-orange"
                                        href={primaryHref}
                                    >
                                        {auth.user
                                            ? 'Buka dashboard'
                                            : 'Mulai sekarang'}
                                        <ArrowRight />
                                    </Link>
                                    <a
                                        className="ledger-text-link"
                                        href="#fitur"
                                    >
                                        Lihat fiturnya <ArrowDownRight />
                                    </a>
                                </div>
                                <div className="ledger-assurance">
                                    <span>
                                        <Check /> Data contoh ditandai jelas
                                    </span>
                                    <span>
                                        <ShieldCheck /> Akses tim terkontrol
                                    </span>
                                </div>
                            </div>
                            <OperationsBoard />
                        </div>
                    </section>

                    <section
                        className="ledger-flow-strip"
                        aria-label="Cakupan sistem"
                    >
                        <div className="ledger-container">
                            {workflow.map(({ label, icon: Icon }, index) => (
                                <div key={label}>
                                    <Icon />
                                    <span>{label}</span>
                                    {index < workflow.length - 1 && (
                                        <ChevronRight />
                                    )}
                                </div>
                            ))}
                        </div>
                    </section>

                    <section className="ledger-section" id="fitur">
                        <div className="ledger-container">
                            <div className="ledger-section-head">
                                <h2>
                                    Semua yang toko butuhkan untuk berjalan
                                    rapi.
                                </h2>
                                <p>
                                    Setiap transaksi memperbarui stok, kas, dan
                                    laporan secara otomatis.
                                </p>
                            </div>
                            <div className="ledger-services">
                                {services.map(({ title, copy, icon: Icon }) => (
                                    <article key={title}>
                                        <span className="ledger-service-icon">
                                            <Icon />
                                        </span>
                                        <h3>{title}</h3>
                                        <p>{copy}</p>
                                        <ArrowRight className="ledger-service-arrow" />
                                    </article>
                                ))}
                            </div>
                        </div>
                    </section>

                    <section className="ledger-method" id="cara-kerja">
                        <div className="ledger-container ledger-method-layout">
                            <div className="ledger-method-intro">
                                <h2>
                                    Mulai hari ini. Rapikan sambil berjalan.
                                </h2>
                                <Link
                                    className="ledger-text-link"
                                    href={primaryHref}
                                >
                                    Siapkan toko <ArrowRight />
                                </Link>
                            </div>
                            <ol className="ledger-steps">
                                <li>
                                    <span>01</span>
                                    <div>
                                        <h3>Buat toko</h3>
                                        <p>
                                            Atur identitas toko dan anggota tim.
                                        </p>
                                    </div>
                                </li>
                                <li>
                                    <span>02</span>
                                    <div>
                                        <h3>Masukkan produk</h3>
                                        <p>
                                            Tambahkan harga, varian, dan stok
                                            awal.
                                        </p>
                                    </div>
                                </li>
                                <li>
                                    <span>03</span>
                                    <div>
                                        <h3>Mulai bertransaksi</h3>
                                        <p>
                                            Gunakan kasir dan pantau hasilnya
                                            langsung.
                                        </p>
                                    </div>
                                </li>
                            </ol>
                        </div>
                    </section>

                    <section className="ledger-about" id="tentang">
                        <div className="ledger-container ledger-about-grid">
                            <div className="ledger-about-visual">
                                <div className="ledger-about-topline">
                                    <span>
                                        <Store /> Toko Maju Jaya
                                    </span>
                                    <b>Hari ini</b>
                                </div>
                                <div className="ledger-about-total">
                                    <p>Uang masuk</p>
                                    <strong>Rp2.350.000</strong>
                                    <span>Naik 12% dari kemarin</span>
                                </div>
                                <div className="ledger-about-rows">
                                    <span>
                                        <i />
                                        Penjualan bersih
                                        <strong>Rp2.180.000</strong>
                                    </span>
                                    <span>
                                        <i />
                                        Laba kotor<strong>Rp654.000</strong>
                                    </span>
                                    <span>
                                        <i />
                                        Transaksi<strong>86</strong>
                                    </span>
                                </div>
                            </div>
                            <div className="ledger-about-copy">
                                <h2>Dibuat untuk keputusan toko yang nyata.</h2>
                                <p>
                                    Sisko Plan menyatukan pekerjaan harian dan
                                    ringkasan usaha, supaya pemilik toko tidak
                                    perlu menebak kondisi bisnisnya.
                                </p>
                                <div className="ledger-about-points">
                                    <span>
                                        <Check /> Data setiap toko terpisah
                                    </span>
                                    <span>
                                        <Check /> Tampilan ringkas untuk ponsel
                                    </span>
                                    <span>
                                        <Check /> Hak akses sesuai peran
                                    </span>
                                </div>
                            </div>
                        </div>
                    </section>

                    <section className="ledger-cta">
                        <div className="ledger-container ledger-cta-inner">
                            <div>
                                <h2>
                                    Satu tempat untuk menjaga alur toko tetap
                                    terkendali.
                                </h2>
                            </div>
                            <Link
                                className="ledger-button ledger-button-orange"
                                href={primaryHref}
                            >
                                {auth.user
                                    ? 'Masuk ke dashboard'
                                    : 'Buat akun toko'}
                                <ArrowRight />
                            </Link>
                        </div>
                    </section>
                </main>

                <footer className="ledger-footer">
                    <div className="ledger-container">
                        <Brand name={name} />
                        <p>Kasir, stok, kas, dan laporan dalam satu alur.</p>
                        <span>
                            © {new Date().getFullYear()} {name}
                        </span>
                    </div>
                </footer>
            </div>
        </>
    );
}
