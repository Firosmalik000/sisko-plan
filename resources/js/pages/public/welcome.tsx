import { Head, Link, usePage } from '@inertiajs/react';
import { m } from 'framer-motion';
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
    PackageSearch,
    ReceiptText,
    ScanLine,
    ShieldCheck,
    ShoppingBasket,
    Users,
    WalletCards,
    Warehouse,
    Zap,
} from 'lucide-react';
import { publicEase, publicViewport, revealClip, revealLeft, revealRight, staggerGroup, staggerItem } from '@/components/public/motion';
import { formatMoney } from '@/lib/currency';
import { translate } from '@/lib/i18n';
import { dashboard, pricing, register } from '@/routes';

const features = [
    ['01', 'Kasir cepat, tanpa banyak langkah', 'Scan atau cari barang, masukkan jumlah, lalu selesaikan pembayaran.', ScanLine],
    ['02', 'Stok berubah saat transaksi selesai', 'Penjualan dan kulakan langsung memperbarui stok, termasuk tiap varian.', Boxes],
    ['03', 'Uang toko lebih mudah diikuti', 'Kas, modal, biaya, dan utang supplier tersimpan dalam riwayat yang jelas.', WalletCards],
    [
        '04',
        'Lebih yakin saat mengambil keputusan',
        'Lihat penjualan, laba kotor, barang terlaris, dan stok yang perlu ditambah.',
        BarChart3,
    ],
] as const;

const faqs = [
    [
        'Apakah harus membeli alat scanner khusus?',
        'Tidak perlu. Kamera ponsel sudah bisa dipakai untuk scan. Jika tersedia, scanner eksternal juga tetap bisa digunakan.',
    ],
    ['Apakah produk tanpa barcode tetap bisa dijual?', 'Bisa. Cari barang lewat nama atau SKU, lalu masukkan ke transaksi seperti biasa.'],
    [
        'Apakah satu akun bisa mengelola beberapa toko?',
        'Bisa. Anda dapat menambah kapasitas ketika membutuhkan toko atau anggota tambahan. Data setiap toko tetap terpisah.',
    ],
    [
        'Apa yang berubah setelah transaksi disimpan?',
        'Stok, kas, dan laporan langsung ikut diperbarui. Anda tidak perlu mencatat hal yang sama dua kali.',
    ],
] as const;

const dailyProblems = [
    [BookOpen, 'Catatan ada di mana-mana', 'Sebagian di buku, sebagian di chat, sisanya hanya mengandalkan ingatan.'],
    [Warehouse, 'Stok habis tanpa sempat bersiap', 'Barang yang dicari pembeli habis, sementara barang lain terus menumpuk.'],
    [ClipboardList, 'Rekap selalu menunggu di akhir hari', 'Penjualan, biaya, dan laba harus dihitung ulang saat tenaga sudah habis.'],
] as const;

const comparison = [
    ['Catat penjualan', 'Scan atau cari, lalu selesai', 'Tulis dan hitung satu per satu'],
    ['Perbarui stok', 'Berubah bersama transaksi', 'Hitung ulang secara manual'],
    ['Pantau kas', 'Tersambung dengan kegiatan toko', 'Terpisah dari catatan penjualan'],
    ['Lihat laporan', 'Ringkasan siap dilihat', 'Susun ulang di akhir periode'],
] as const;

function XsistenHeroVisual() {
    return (
        <m.figure
            className="xsisten-hero-visual"
            aria-label={translate('Ilustrasi pemilik toko menggunakan Xsisten')}
            initial="hidden"
            animate="visible"
            variants={revealRight}
        >
            <m.img
                className="xsisten-hero-art"
                src="/assets/xsisten-hero.png"
                alt={translate('Pemilik toko menggunakan Xsisten untuk scan produk dan mencatat transaksi')}
                draggable={false}
                initial={{ opacity: 0, y: 18, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.8, ease: publicEase, delay: 0.14 }}
            />
        </m.figure>
    );
}

function ProductGallery() {
    return (
        <m.div
            className="scan-gallery-grid"
            aria-label={translate('Contoh tampilan aplikasi')}
            initial="hidden"
            whileInView="visible"
            viewport={publicViewport}
            variants={staggerGroup}
        >
            <m.article className="scan-gallery-panel scan-gallery-pos" variants={revealLeft}>
                <div className="scan-panel-head">
                    <span>{translate('Kasir')}</span>
                    <small>{translate('Data contoh')}</small>
                </div>
                <div className="scan-pos-search">
                    <ScanLine /> {translate('Scan barcode atau cari produk')}
                </div>
                {[
                    ['Beras Premium 5 kg', 72000],
                    ['Minyak Goreng 2 L', 38000],
                    ['Gula Pasir 1 kg', 14000],
                ].map(([name, price], index) => (
                    <div className="scan-product-row" key={name}>
                        <span>{index + 1}</span>
                        <p>{translate(String(name))}</p>
                        <strong>{formatMoney(Number(price))}</strong>
                        <i>+</i>
                    </div>
                ))}
            </m.article>
            <m.article className="scan-gallery-panel scan-gallery-stock" variants={staggerItem}>
                <div className="scan-panel-head">
                    <span>{translate('Stok kritis')}</span>
                    <small>{translate('8 produk')}</small>
                </div>
                <strong className="scan-stock-big">2</strong>
                <p>{translate('Minyak Goreng 2 L')}</p>
                <div className="scan-stock-meter">
                    <i />
                </div>
                <div className="scan-stock-meta">
                    <span>
                        {translate('Batas minimum')} <strong>5</strong>
                    </span>
                    <span>
                        {translate('Perlu ditambah')} <strong>3</strong>
                    </span>
                </div>
            </m.article>
            <m.article className="scan-gallery-panel scan-gallery-report" variants={revealRight}>
                <div className="scan-panel-head">
                    <span>{translate('Ringkasan hari ini')}</span>
                    <small>10:00</small>
                </div>
                <span className="scan-report-label">{translate('Penjualan bersih')}</span>
                <strong className="scan-report-value">{formatMoney(682500)}</strong>
                <span className="scan-report-growth">{translate('Naik 12% dari kemarin')}</span>
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
    const { auth, branding } = usePage().props;
    const offerBadge = translate('Gratis Selamanya');
    const primaryHref = auth.user ? dashboard() : register();
    const primaryLabel = translate(auth.user ? 'Buka dashboard' : 'Buka toko gratis');

    return (
        <>
            <Head title={translate(branding.seo_title)} />

            <section className="scan-hero">
                <div className="ledger-container scan-hero-grid">
                    <m.div className="scan-hero-copy" initial="hidden" animate="visible" variants={staggerGroup}>
                        <m.span className="scan-eyebrow" variants={staggerItem}>
                            <Zap /> {offerBadge}
                        </m.span>
                        <m.h1 variants={revealClip}>
                            {translate('Mulai dari gratis.')}
                            <span>{translate('Biar urusan toko lebih ringan.')}</span>
                        </m.h1>
                        <m.p variants={staggerItem}>
                            {translate(
                                'Catat penjualan, pantau stok, dan cek kondisi toko tanpa pindah-pindah catatan. Saat usaha berkembang, kapasitasnya bisa ikut ditambah.',
                            )}
                        </m.p>
                        <m.div className="scan-hero-actions" variants={staggerItem}>
                            <Link className="ledger-button ledger-button-orange" href={primaryHref}>
                                {primaryLabel} <ArrowRight />
                            </Link>
                            <Link className="scan-demo-link" href={pricing()}>
                                {translate('Lihat paket')} <ChevronRight />
                            </Link>
                        </m.div>
                        <m.div className="scan-trust-row" variants={staggerItem}>
                            <span>
                                <Check /> {translate('Gratis tanpa batas waktu')}
                            </span>
                            <span>
                                <ShieldCheck /> {translate('Tambah kapasitas kapan saja')}
                            </span>
                        </m.div>
                    </m.div>
                    <XsistenHeroVisual />
                </div>
            </section>

            <section className="scan-flow" aria-label={`Alur utama ${branding.brand_name}`}>
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
                        <m.div className="scan-flow-item" key={String(label)} variants={staggerItem}>
                            <span>
                                <Icon /> {translate(String(label))}
                            </span>
                            {index < 4 && <ArrowRight />}
                        </m.div>
                    ))}
                </m.div>
            </section>

            <section className="scan-promise" id="tentang">
                <div className="ledger-container scan-promise-grid">
                    <m.div initial="hidden" whileInView="visible" viewport={publicViewport} variants={revealLeft}>
                        <span className="scan-kicker">{translate('Dibuat untuk keseharian toko')}</span>
                        <h2>{translate('Tokonya boleh ramai. Catatannya tetap rapi.')}</h2>
                    </m.div>
                    <m.div
                        className="scan-promise-copy"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={revealRight}
                    >
                        <p>
                            {translate(
                                'Semua pekerjaan harian tersambung, jadi Anda bisa melayani pembeli sambil tetap tahu kondisi usaha.',
                            )}
                        </p>
                        <div>
                            <span>
                                <Check /> {translate('Satu alur, tidak perlu catat berulang')}
                            </span>
                            <span>
                                <Check /> {translate('Bahasanya mudah dipahami')}
                            </span>
                            <span>
                                <Check /> {translate('Nyaman dipakai dari ponsel')}
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
                        <span className="scan-kicker">{translate('Sering kejadian di toko')}</span>
                        <h2 id="problems-title">{translate('Jualan jalan terus, catatan malah tertinggal.')}</h2>
                        <p>{translate('Kelihatannya sepele, sampai stok dan uang toko mulai sulit dilacak.')}</p>
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
                                <h3>{translate(title)}</h3>
                                <p>{translate(copy)}</p>
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
                        <span className="scan-kicker">{translate('Cara kerja')}</span>
                        <h2>{translate('Tiga langkah, lalu semua ikut tercatat.')}</h2>
                        <p>{translate('Tidak perlu belajar lama. Mulai dari pekerjaan yang sudah biasa Anda lakukan.')}</p>
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
                                <h3>{translate('Scan atau cari barang')}</h3>
                                <p>{translate('Pakai barcode, nama produk, atau SKU.')}</p>
                            </div>
                        </m.li>
                        <m.li variants={staggerItem}>
                            <span>02</span>
                            <ShoppingBasket />
                            <div>
                                <h3>{translate('Selesaikan transaksi')}</h3>
                                <p>{translate('Masukkan jumlah, terima pembayaran, selesai.')}</p>
                            </div>
                        </m.li>
                        <m.li variants={staggerItem}>
                            <span>03</span>
                            <BarChart3 />
                            <div>
                                <h3>{translate('Lihat hasilnya')}</h3>
                                <p>{translate('Stok, kas, dan laporan ikut diperbarui.')}</p>
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
                        <span className="scan-kicker">{translate('Satu aplikasi untuk toko')}</span>
                        <h2>{translate('Bukan cuma kasir. Pekerjaan lain ikut beres.')}</h2>
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
                                <span className="scan-feature-number">{number}</span>
                                <Icon />
                                <h3>{translate(title)}</h3>
                                <p>{translate(copy)}</p>
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
                            <span className="scan-kicker">{translate('Cukup satu pandangan')}</span>
                            <h2>{translate('Dari meja kasir sampai keputusan pemilik.')}</h2>
                        </div>
                        <p>{translate('Angka penting langsung terlihat, tanpa tampilan yang membuat pusing.')}</p>
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
                        <span className="scan-kicker">{translate('Semua saling terhubung')}</span>
                        <h2>{translate('Banyak pekerjaan, tetap terasa satu alur.')}</h2>
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
                                <Icon /> {translate(String(label))}
                            </m.span>
                        ))}
                    </m.div>
                </div>
            </section>

            <section className="scan-comparison" aria-labelledby="comparison-title">
                <div className="ledger-container">
                    <m.div
                        className="scan-comparison-heading"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={revealClip}
                    >
                        <span className="scan-kicker">{translate('Lebih praktis')}</span>
                        <h2 id="comparison-title">{translate('Kurangi catat ulang. Punya lebih banyak waktu untuk pembeli.')}</h2>
                    </m.div>
                    <m.div
                        className="scan-comparison-table"
                        role="table"
                        aria-label={`Perbandingan ${branding.brand_name} dan pencatatan manual`}
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={staggerGroup}
                    >
                        <m.div className="scan-comparison-row scan-comparison-head" role="row" variants={staggerItem}>
                            <span role="columnheader">{translate('Pekerjaan')}</span>
                            <strong role="columnheader">
                                <ScanLine /> {branding.brand_name}
                            </strong>
                            <strong role="columnheader">
                                <BookOpen /> {translate('Cara manual')}
                            </strong>
                        </m.div>
                        {comparison.map(([task, sisko, manual]) => (
                            <m.div className="scan-comparison-row" role="row" key={task} variants={staggerItem}>
                                <span role="cell">{translate(task)}</span>
                                <strong role="cell">
                                    <Check /> {translate(sisko)}
                                </strong>
                                <p role="cell">{translate(manual)}</p>
                            </m.div>
                        ))}
                    </m.div>
                </div>
            </section>

            <section className="scan-faq" id="faq">
                <div className="ledger-container scan-faq-layout">
                    <m.div initial="hidden" whileInView="visible" viewport={publicViewport} variants={revealLeft}>
                        <span className="scan-kicker">{translate('Yang sering ditanyakan')}</span>
                        <h2>{translate('Masih ada yang ingin dipastikan?')}</h2>
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
                                    {translate(question)}
                                    <span>+</span>
                                </summary>
                                <p>{translate(answer)}</p>
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
                        <span className="scan-kicker">{offerBadge}</span>
                        <h2>{translate('Mulai gratis. Rapikan toko sedikit demi sedikit.')}</h2>
                    </div>
                    <div>
                        <Link className="ledger-button ledger-button-orange" href={primaryHref}>
                            {primaryLabel} <ArrowRight />
                        </Link>
                        <span>
                            <ShieldCheck /> {translate('Data setiap toko tetap terpisah')}
                        </span>
                    </div>
                </m.div>
            </section>
        </>
    );
}
