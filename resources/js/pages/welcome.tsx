import { Head, Link, usePage } from '@inertiajs/react';
import { m, useInView, useReducedMotion } from 'framer-motion';
import {
    ArrowRight,
    BarChart3,
    BookOpen,
    Boxes,
    Camera,
    Check,
    ChevronRight,
    ClipboardList,
    CircleDollarSign,
    PackageCheck,
    PackageSearch,
    ReceiptText,
    ScanLine,
    ShieldCheck,
    ShoppingBasket,
    Store,
    Users,
    WalletCards,
    Warehouse,
    Zap,
} from 'lucide-react';
import { useRef } from 'react';
import {
    publicEase,
    publicViewport,
    revealClip,
    revealLeft,
    revealRight,
    revealUp,
    staggerGroup,
    staggerItem,
} from '@/components/public-motion';
import { dashboard, register } from '@/routes';

const features = [
    [
        '01',
        'Kasir yang langsung paham barang',
        'Scan barcode, masukkan jumlah, lalu selesaikan pembayaran tanpa berpindah layar.',
        ScanLine,
    ],
    [
        '02',
        'Stok ikut bergerak otomatis',
        'Setiap penjualan dan kulakan memperbarui persediaan hingga tingkat varian.',
        Boxes,
    ],
    [
        '03',
        'Uang toko tetap terbaca',
        'Kas, modal, biaya, dan utang supplier tercatat dalam alur yang bisa ditelusuri.',
        WalletCards,
    ],
    [
        '04',
        'Keputusan tidak lagi pakai tebakan',
        'Lihat penjualan bersih, laba kotor, produk terlaris, dan stok kritis.',
        BarChart3,
    ],
] as const;

const faqs = [
    [
        'Apakah harus membeli alat scanner khusus?',
        'Tidak. Barcode dapat dimasukkan dari perangkat yang Anda gunakan. Scanner eksternal tetap dapat dipakai untuk alur kasir yang lebih cepat.',
    ],
    [
        'Apakah produk tanpa barcode tetap bisa dijual?',
        'Bisa. Cari produk berdasarkan nama atau SKU, lalu tambahkan ke keranjang seperti biasa.',
    ],
    [
        'Apakah satu akun bisa mengelola beberapa toko?',
        'Bisa, sesuai kapasitas paket. Data, anggota, dan operasional setiap toko tetap terpisah.',
    ],
    [
        'Apa yang berubah setelah transaksi disimpan?',
        'Penjualan, stok, kas, dan ringkasan laporan diperbarui dalam satu alur yang saling terhubung.',
    ],
] as const;

const dailyProblems = [
    [
        BookOpen,
        'Catatan mudah tercecer',
        'Transaksi tersimpan di banyak tempat dan sulit diperiksa kembali.',
    ],
    [
        Warehouse,
        'Stok baru dihitung saat terlambat',
        'Barang laris habis tanpa tanda, barang lambat justru terus menumpuk.',
    ],
    [
        ClipboardList,
        'Rekap menghabiskan waktu',
        'Angka penjualan, pengeluaran, dan laba harus disatukan ulang secara manual.',
    ],
] as const;

const comparison = [
    [
        'Catat penjualan',
        'Scan atau cari, lalu simpan',
        'Tulis dan hitung satu per satu',
    ],
    ['Perbarui stok', 'Mengikuti transaksi', 'Hitung ulang secara manual'],
    [
        'Pantau kas',
        'Terhubung dengan operasional',
        'Terpisah dari catatan penjualan',
    ],
    [
        'Baca laporan',
        'Ringkasan siap dilihat',
        'Rekap kembali di akhir periode',
    ],
] as const;

function ProductPacket({ small = false }: { small?: boolean }) {
    return (
        <span className={`scan-product-packet ${small ? 'is-small' : ''}`}>
            <span className="scan-product-brand">KOPI</span>
            <span className="scan-product-name">Pagi</span>
            <span className="scan-product-weight">165 g</span>
        </span>
    );
}

function ScannerDemo() {
    const scannerRef = useRef<HTMLDivElement>(null);
    const isVisible = useInView(scannerRef, { amount: 0.28 });
    const reduceMotion = useReducedMotion();

    return (
        <m.div
            ref={scannerRef}
            className="scan-demo-wrap"
            aria-label="Data contoh pemindaian produk"
            initial="hidden"
            animate={isVisible ? 'visible' : 'hidden'}
            variants={revealRight}
        >
            <span className="scan-demo-label">Data contoh</span>
            <m.div
                className="scan-demo-shell"
                initial={{ opacity: 0.7, scale: 0.985 }}
                animate={
                    isVisible
                        ? { opacity: 1, scale: 1 }
                        : { opacity: 0.7, scale: 0.985 }
                }
                transition={{ duration: 0.65, ease: publicEase }}
            >
                <div className="scan-demo-topbar">
                    <span className="scan-demo-store">
                        <Store /> Toko Maju Jaya
                    </span>
                    <span className="scan-demo-live">
                        <i /> Kasir aktif
                    </span>
                </div>
                <div className="scan-demo-stage">
                    <div className="scan-camera-frame">
                        <span className="scan-corner top-left" />
                        <span className="scan-corner top-right" />
                        <span className="scan-corner bottom-left" />
                        <span className="scan-corner bottom-right" />
                        <ProductPacket />
                        <m.span
                            className="scan-beam"
                            style={{
                                animationPlayState:
                                    isVisible && !reduceMotion
                                        ? 'running'
                                        : 'paused',
                            }}
                        />
                    </div>
                    <m.div
                        className="scan-found-badge"
                        initial={{ opacity: 0, y: 12 }}
                        animate={
                            isVisible
                                ? { opacity: 1, y: 0 }
                                : { opacity: 0, y: 12 }
                        }
                        transition={{
                            delay: reduceMotion ? 0 : 0.42,
                            duration: 0.38,
                            ease: publicEase,
                        }}
                    >
                        <PackageCheck />
                        <span>
                            Produk ditemukan<strong>Kopi Pagi 165 g</strong>
                        </span>
                    </m.div>
                </div>
                <div className="scan-demo-cart">
                    <div className="scan-cart-head">
                        <span>Keranjang</span>
                        <strong>3 item</strong>
                    </div>
                    <div className="scan-cart-item">
                        <ProductPacket small />
                        <span>
                            <strong>Kopi Pagi 165 g</strong>
                            <small>2 × Rp7.500</small>
                        </span>
                        <b>Rp15.000</b>
                    </div>
                    <div className="scan-cart-total">
                        <span>Total bayar</span>
                        <strong>Rp33.000</strong>
                    </div>
                    <div className="scan-cart-action">
                        Selesaikan transaksi <ArrowRight />
                    </div>
                </div>
            </m.div>
            <m.div
                className="scan-demo-note note-stock"
                initial={{ opacity: 0, x: 18 }}
                animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0 }}
                transition={{ delay: 0.55, duration: 0.4, ease: publicEase }}
            >
                <Boxes />
                <span>Stok diperbarui</span>
                <strong>−2</strong>
            </m.div>
            <m.div
                className="scan-demo-note note-report"
                initial={{ opacity: 0, x: -18 }}
                animate={isVisible ? { opacity: 1, x: 0 } : { opacity: 0 }}
                transition={{ delay: 0.68, duration: 0.4, ease: publicEase }}
            >
                <BarChart3 />
                <span>Penjualan hari ini</span>
                <strong>Rp682.500</strong>
            </m.div>
        </m.div>
    );
}

function ProductGallery() {
    return (
        <m.div
            className="scan-gallery-grid"
            aria-label="Contoh tampilan produk"
            initial="hidden"
            whileInView="visible"
            viewport={publicViewport}
            variants={staggerGroup}
        >
            <m.article
                className="scan-gallery-panel scan-gallery-pos"
                variants={revealLeft}
            >
                <div className="scan-panel-head">
                    <span>Kasir</span>
                    <small>Data contoh</small>
                </div>
                <div className="scan-pos-search">
                    <ScanLine /> Scan barcode atau cari produk
                </div>
                {[
                    ['Beras Premium 5 kg', 'Rp72.000'],
                    ['Minyak Goreng 2 L', 'Rp38.000'],
                    ['Gula Pasir 1 kg', 'Rp14.000'],
                ].map(([name, price], index) => (
                    <div className="scan-product-row" key={name}>
                        <span>{index + 1}</span>
                        <p>{name}</p>
                        <strong>{price}</strong>
                        <i>+</i>
                    </div>
                ))}
            </m.article>
            <m.article
                className="scan-gallery-panel scan-gallery-stock"
                variants={staggerItem}
            >
                <div className="scan-panel-head">
                    <span>Stok kritis</span>
                    <small>8 produk</small>
                </div>
                <strong className="scan-stock-big">2</strong>
                <p>Minyak Goreng 2 L</p>
                <div className="scan-stock-meter">
                    <i />
                </div>
                <div className="scan-stock-meta">
                    <span>
                        Batas minimum <strong>5</strong>
                    </span>
                    <span>
                        Perlu ditambah <strong>3</strong>
                    </span>
                </div>
            </m.article>
            <m.article
                className="scan-gallery-panel scan-gallery-report"
                variants={revealRight}
            >
                <div className="scan-panel-head">
                    <span>Ringkasan hari ini</span>
                    <small>10:00</small>
                </div>
                <span className="scan-report-label">Penjualan bersih</span>
                <strong className="scan-report-value">Rp682.500</strong>
                <span className="scan-report-growth">
                    Naik 12% dari kemarin
                </span>
                <div className="scan-mini-chart" aria-hidden="true">
                    {[36, 48, 43, 65, 57, 81, 72].map((height, index) => (
                        <i key={index} style={{ height: `${height}%` }} />
                    ))}
                </div>
            </m.article>
        </m.div>
    );
}

export default function Welcome() {
    const { auth } = usePage().props;
    const primaryHref = auth.user ? dashboard() : register();
    const primaryLabel = auth.user ? 'Buka dashboard' : 'Mulai kelola toko';

    return (
        <>
            <Head title="Scan Barang, Kelola Toko Lebih Cepat">
                <meta
                    name="description"
                    content="Scan barang, catat transaksi, perbarui stok, dan pantau laporan toko dalam satu alur bersama Sisko Plan."
                />
            </Head>

            <section className="scan-hero">
                <div className="ledger-container scan-hero-grid">
                    <m.div
                        className="scan-hero-copy"
                        initial="hidden"
                        animate="visible"
                        variants={staggerGroup}
                    >
                        <m.span className="scan-eyebrow" variants={staggerItem}>
                            <Zap /> Kasir cepat, operasional rapi
                        </m.span>
                        <m.h1 variants={revealClip}>
                            Scan barangnya.
                            <span>Sisanya langsung tercatat.</span>
                        </m.h1>
                        <m.p variants={staggerItem}>
                            Dari transaksi ke stok, kas, dan laporan. Sisko Plan
                            menyatukan semuanya agar toko bergerak lebih cepat
                            tanpa catatan yang tercecer.
                        </m.p>
                        <m.div
                            className="scan-hero-actions"
                            variants={staggerItem}
                        >
                            <Link
                                className="ledger-button ledger-button-orange"
                                href={primaryHref}
                            >
                                {primaryLabel} <ArrowRight />
                            </Link>
                            <a className="scan-demo-link" href="#cara-kerja">
                                Lihat cara kerjanya <ChevronRight />
                            </a>
                        </m.div>
                        <m.div
                            className="scan-trust-row"
                            variants={staggerItem}
                        >
                            <span>
                                <Check /> Bisa tanpa scanner khusus
                            </span>
                            <span>
                                <ShieldCheck /> Akses tim terkontrol
                            </span>
                        </m.div>
                    </m.div>
                    <ScannerDemo />
                </div>
            </section>

            <section className="scan-flow" aria-label="Alur utama Sisko Plan">
                <m.div
                    className="ledger-container"
                    initial="hidden"
                    whileInView="visible"
                    viewport={publicViewport}
                    variants={staggerGroup}
                >
                    {[
                        [ScanLine, 'Scan'],
                        [ReceiptText, 'Transaksi'],
                        [Boxes, 'Stok'],
                        [CircleDollarSign, 'Kas'],
                        [BarChart3, 'Laporan'],
                    ].map(([Icon, label], index) => (
                        <m.div
                            className="scan-flow-item"
                            key={String(label)}
                            variants={staggerItem}
                        >
                            <span>
                                <Icon /> {String(label)}
                            </span>
                            {index < 4 && <ArrowRight />}
                        </m.div>
                    ))}
                </m.div>
            </section>

            <section className="scan-promise" id="tentang">
                <div className="ledger-container scan-promise-grid">
                    <m.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={revealLeft}
                    >
                        <span className="scan-kicker">
                            Lebih ringan setiap hari
                        </span>
                        <h2>
                            Toko sibuk tidak butuh aplikasi yang ikut
                            merepotkan.
                        </h2>
                    </m.div>
                    <m.div
                        className="scan-promise-copy"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={revealRight}
                    >
                        <p>
                            Sisko Plan dibuat untuk pemilik toko yang ingin
                            bekerja cepat sekaligus tetap memahami kondisi
                            usahanya.
                        </p>
                        <div>
                            <span>
                                <Check /> Satu alur, bukan banyak catatan
                            </span>
                            <span>
                                <Check /> Istilah yang mudah dipahami
                            </span>
                            <span>
                                <Check /> Nyaman dipakai dari ponsel
                            </span>
                        </div>
                    </m.div>
                </div>
            </section>

            <section className="scan-problems" aria-labelledby="problems-title">
                <div className="ledger-container">
                    <m.div
                        className="scan-problems-heading"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={revealClip}
                    >
                        <span className="scan-kicker">Yang sering terjadi</span>
                        <h2 id="problems-title">
                            Jualannya jalan. Catatannya tertinggal.
                        </h2>
                        <p>
                            Masalah kecil yang berulang bisa membuat kondisi
                            toko sulit dibaca.
                        </p>
                    </m.div>
                    <m.div
                        className="scan-problem-list"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={staggerGroup}
                    >
                        {dailyProblems.map(([Icon, title, copy], index) => (
                            <m.article key={title} variants={staggerItem}>
                                <span>0{index + 1}</span>
                                <Icon />
                                <h3>{title}</h3>
                                <p>{copy}</p>
                            </m.article>
                        ))}
                    </m.div>
                </div>
            </section>

            <section className="scan-how" id="cara-kerja">
                <div className="ledger-container scan-how-layout">
                    <m.div
                        className="scan-how-intro"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={revealLeft}
                    >
                        <span className="scan-kicker">Cara kerja</span>
                        <h2>Tiga gerakan. Satu catatan yang utuh.</h2>
                        <p>
                            Barang masuk, transaksi selesai, kondisi toko
                            langsung terbaca.
                        </p>
                    </m.div>
                    <m.ol
                        className="scan-how-steps"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={staggerGroup}
                    >
                        <m.li variants={staggerItem}>
                            <span>01</span>
                            <Camera />
                            <div>
                                <h3>Scan atau cari barang</h3>
                                <p>Gunakan barcode, nama produk, atau SKU.</p>
                            </div>
                        </m.li>
                        <m.li variants={staggerItem}>
                            <span>02</span>
                            <ShoppingBasket />
                            <div>
                                <h3>Selesaikan transaksi</h3>
                                <p>Atur jumlah, pembayaran, dan kembalian.</p>
                            </div>
                        </m.li>
                        <m.li variants={staggerItem}>
                            <span>03</span>
                            <BarChart3 />
                            <div>
                                <h3>Pantau hasilnya</h3>
                                <p>Stok, kas, dan laporan ikut diperbarui.</p>
                            </div>
                        </m.li>
                    </m.ol>
                </div>
            </section>

            <section className="scan-features" id="fitur">
                <div className="ledger-container">
                    <m.div
                        className="scan-section-heading"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={revealClip}
                    >
                        <span className="scan-kicker">Satu sistem toko</span>
                        <h2>
                            Bukan cuma kasir. Semua pekerjaan penting ikut rapi.
                        </h2>
                    </m.div>
                    <m.div
                        className="scan-feature-list"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={staggerGroup}
                    >
                        {features.map(([number, title, copy, Icon]) => (
                            <m.article key={number} variants={staggerItem}>
                                <span className="scan-feature-number">
                                    {number}
                                </span>
                                <Icon />
                                <h3>{title}</h3>
                                <p>{copy}</p>
                                <ArrowRight />
                            </m.article>
                        ))}
                    </m.div>
                </div>
            </section>

            <section className="scan-gallery">
                <div className="ledger-container">
                    <m.div
                        className="scan-gallery-head"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={revealClip}
                    >
                        <div>
                            <span className="scan-kicker">Satu pandangan</span>
                            <h2>Dari meja kasir sampai keputusan pemilik.</h2>
                        </div>
                        <p>
                            Informasi penting muncul saat dibutuhkan, tanpa
                            layar yang penuh dan membingungkan.
                        </p>
                    </m.div>
                    <ProductGallery />
                </div>
            </section>

            <section className="scan-coverage">
                <div className="ledger-container scan-coverage-grid">
                    <m.div
                        className="scan-coverage-copy"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={revealLeft}
                    >
                        <span className="scan-kicker">
                            Operasional menyeluruh
                        </span>
                        <h2>Satu toko, banyak pekerjaan. Tetap satu alur.</h2>
                        <Link className="scan-inline-link" href="/pricing">
                            Lihat paket yang tersedia <ArrowRight />
                        </Link>
                    </m.div>
                    <m.div
                        className="scan-coverage-list"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={staggerGroup}
                    >
                        {[
                            [ReceiptText, 'Penjualan & retur'],
                            [PackageSearch, 'Pembelian & supplier'],
                            [Boxes, 'Stok & opname'],
                            [CircleDollarSign, 'Kas, modal & biaya'],
                            [Users, 'Toko & anggota'],
                            [BarChart3, 'Laporan operasional'],
                        ].map(([Icon, label]) => (
                            <m.span key={String(label)} variants={staggerItem}>
                                <Icon /> {String(label)}
                            </m.span>
                        ))}
                    </m.div>
                </div>
            </section>

            <section
                className="scan-comparison"
                aria-labelledby="comparison-title"
            >
                <div className="ledger-container">
                    <m.div
                        className="scan-comparison-heading"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={revealClip}
                    >
                        <span className="scan-kicker">
                            Cara kerja yang berbeda
                        </span>
                        <h2 id="comparison-title">
                            Lebih sedikit mencatat ulang. Lebih banyak waktu
                            untuk melayani.
                        </h2>
                    </m.div>
                    <m.div
                        className="scan-comparison-table"
                        role="table"
                        aria-label="Perbandingan Sisko Plan dan pencatatan manual"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={staggerGroup}
                    >
                        <m.div
                            className="scan-comparison-row scan-comparison-head"
                            role="row"
                            variants={staggerItem}
                        >
                            <span role="columnheader">Pekerjaan</span>
                            <strong role="columnheader">
                                <ScanLine /> Sisko Plan
                            </strong>
                            <strong role="columnheader">
                                <BookOpen /> Cara manual
                            </strong>
                        </m.div>
                        {comparison.map(([task, sisko, manual]) => (
                            <m.div
                                className="scan-comparison-row"
                                role="row"
                                key={task}
                                variants={staggerItem}
                            >
                                <span role="cell">{task}</span>
                                <strong role="cell">
                                    <Check /> {sisko}
                                </strong>
                                <p role="cell">{manual}</p>
                            </m.div>
                        ))}
                    </m.div>
                </div>
            </section>

            <section className="scan-faq" id="faq">
                <div className="ledger-container scan-faq-layout">
                    <m.div
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={revealLeft}
                    >
                        <span className="scan-kicker">Pertanyaan umum</span>
                        <h2>Sebelum mulai, pastikan semuanya jelas.</h2>
                    </m.div>
                    <m.div
                        className="scan-faq-list"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={staggerGroup}
                    >
                        {faqs.map(([question, answer]) => (
                            <m.details key={question} variants={staggerItem}>
                                <summary>
                                    {question}
                                    <span>+</span>
                                </summary>
                                <p>{answer}</p>
                            </m.details>
                        ))}
                    </m.div>
                </div>
            </section>

            <section className="scan-final-cta">
                <m.div
                    className="ledger-container scan-final-card"
                    initial="hidden"
                    whileInView="visible"
                    viewport={publicViewport}
                    variants={revealClip}
                >
                    <div>
                        <span className="scan-kicker">Mulai lebih rapi</span>
                        <h2>Scan penjualannya. Pegang kendali tokonya.</h2>
                    </div>
                    <div>
                        <Link
                            className="ledger-button ledger-button-orange"
                            href={primaryHref}
                        >
                            {primaryLabel} <ArrowRight />
                        </Link>
                        <span>
                            <ShieldCheck /> Data setiap toko tetap terpisah
                        </span>
                    </div>
                </m.div>
            </section>
        </>
    );
}
