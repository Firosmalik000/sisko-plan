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

const features = () =>
    [
        [
            '01',
            translate('Fast checkout, fewer steps'),
            translate('Scan or search for an item, enter the quantity, then complete payment.'),
            ScanLine,
        ],
        [
            '02',
            translate('Stock updates when a transaction is completed'),
            translate('Sales and purchases update stock immediately, including every variant.'),
            Boxes,
        ],
        [
            '03',
            translate('Keep track of store finances'),
            translate('Cash, capital, expenses, and supplier debt stay in one clear history.'),
            WalletCards,
        ],
        [
            '04',
            translate('Make decisions with confidence'),
            translate('See sales, gross profit, best-selling items, and stock that needs replenishment.'),
            BarChart3,
        ],
    ] as const;

const faqs = () =>
    [
        [
            translate('Do I need a dedicated barcode scanner?'),
            translate('No. You can scan with your phone camera or use an external scanner when available.'),
        ],
        [
            translate('Can I sell products without barcodes?'),
            translate('Yes. Search by product name or SKU, then add the item to the transaction as usual.'),
        ],
        [
            translate('Can one account manage multiple stores?'),
            translate('Yes. Add capacity when you need more stores or team members. Each store keeps separate data.'),
        ],
        [
            translate('What happens after a transaction is saved?'),
            translate('Stock, cash, and reports update immediately, so you never enter the same information twice.'),
        ],
    ] as const;

const dailyProblems = () =>
    [
        [
            BookOpen,
            translate('Records are scattered everywhere'),
            translate('Some are in notebooks, some in chat, and the rest rely on memory.'),
        ],
        [
            Warehouse,
            translate('Stock runs out without warning'),
            translate('Popular items sell out while other products continue to pile up.'),
        ],
        [
            ClipboardList,
            translate('Reconciliation waits until closing time'),
            translate('Sales, expenses, and profit must be recalculated at the end of a long day.'),
        ],
    ] as const;

const comparison = () =>
    [
        [translate('Record sales'), translate('Scan or search, then finish'), translate('Write and calculate each item')],
        [translate('Update stock'), translate('Updates with every transaction'), translate('Recalculate manually')],
        [translate('Track cash'), translate('Connected to store activity'), translate('Separate from sales records')],
        [translate('View reports'), translate('Summaries are ready to view'), translate('Compile them again at period end')],
    ] as const;

function XsistenHeroVisual() {
    return (
        <m.figure
            className="xsisten-hero-visual"
            aria-label={translate('Illustration of a store owner using Xsisten')}
            initial="hidden"
            animate="visible"
            variants={revealRight}
        >
            <span className="scan-demo-label">{translate('Sample data')}</span>
            <m.img
                className="xsisten-hero-art"
                src="/assets/xsisten-hero.png"
                alt={translate('A store owner uses Xsisten to scan products and record transactions')}
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
            aria-label={translate('Application preview')}
            initial="hidden"
            whileInView="visible"
            viewport={publicViewport}
            variants={staggerGroup}
        >
            <m.article className="scan-gallery-panel scan-gallery-pos" variants={revealLeft}>
                <div className="scan-panel-head">
                    <span>{translate('Point of sale')}</span>
                    <small>{translate('Sample data')}</small>
                </div>
                <div className="scan-pos-search">
                    <ScanLine /> {translate('Scan a barcode or find a product')}
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
                    <span>{translate('Critical stock')}</span>
                    <small>{translate('8 products')}</small>
                </div>
                <strong className="scan-stock-big">2</strong>
                <p>{translate('Cooking Oil 2 L')}</p>
                <div className="scan-stock-meter">
                    <i />
                </div>
                <div className="scan-stock-meta">
                    <span>
                        {translate('Minimum stock')} <strong>5</strong>
                    </span>
                    <span>
                        {translate('To restock')} <strong>3</strong>
                    </span>
                </div>
            </m.article>
            <m.article className="scan-gallery-panel scan-gallery-report" variants={revealRight}>
                <div className="scan-panel-head">
                    <span>{translate("Today's summary")}</span>
                    <small>10:00</small>
                </div>
                <span className="scan-report-label">{translate('Net sales')}</span>
                <strong className="scan-report-value">{formatMoney(682500)}</strong>
                <span className="scan-report-growth">{translate('Up 12% from yesterday')}</span>
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
    const offerBadge = translate('Free forever');
    const primaryHref = auth.user ? dashboard() : register();
    const primaryLabel = translate(auth.user ? 'Open dashboard' : 'Open your store for free');

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
                            {translate('Start for free.')}
                            <span>{translate('Make running your store feel lighter.')}</span>
                        </m.h1>
                        <m.p variants={staggerItem}>
                            {translate(
                                'Record sales, keep an eye on stock, and see how your store is doing without juggling separate notes. Add more capacity whenever your business needs it.',
                            )}
                        </m.p>
                        <m.div className="scan-hero-actions" variants={staggerItem}>
                            <Link className="ledger-button ledger-button-orange" href={primaryHref}>
                                {primaryLabel} <ArrowRight />
                            </Link>
                            <Link className="scan-demo-link" href={pricing()}>
                                {translate('See plans')} <ChevronRight />
                            </Link>
                        </m.div>
                        <m.div className="scan-trust-row" variants={staggerItem}>
                            <span>
                                <Check /> {translate('Free, with no expiry')}
                            </span>
                            <span>
                                <ShieldCheck /> {translate('Add capacity anytime')}
                            </span>
                        </m.div>
                    </m.div>
                    <XsistenHeroVisual />
                </div>
            </section>

            <section className="scan-flow" aria-label={`Flow main${branding.brand_name}`}>
                <m.div
                    className="ledger-container"
                    initial="hidden"
                    whileInView="visible"
                    viewport={publicViewport}
                    variants={staggerGroup}
                >
                    {[
                        [ScanLine, 'Scan'],
                        [ReceiptText, 'Transactions'],
                        [Boxes, 'Stock'],
                        [CircleDollarSign, 'Cash'],
                        [BarChart3, 'Reports'],
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
                        <span className="scan-kicker">{translate('Made for everyday store work')}</span>
                        <h2>{translate("A busy store doesn't need messy records.")}</h2>
                    </m.div>
                    <m.div
                        className="scan-promise-copy"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={revealRight}
                    >
                        <p>
                            {translate('Everything stays connected, so you can focus on customers and still know how business is going.')}
                        </p>
                        <div>
                            <span>
                                <Check /> {translate('One flow, no repeated entry')}
                            </span>
                            <span>
                                <Check /> {translate('Language that makes sense')}
                            </span>
                            <span>
                                <Check /> {translate('Easy to use on mobile')}
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
                        <span className="scan-kicker">{translate('Happens in stores every day')}</span>
                        <h2 id="problems-title">{translate('Sales keep moving. The records fall behind.')}</h2>
                        <p>{translate('It seems small, until stock and cash become hard to trace.')}</p>
                    </m.div>
                    <m.div
                        className="scan-problem-list"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={staggerGroup}
                    >
                        {dailyProblems().map(([Icon, title, copy], index) => (
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
                        <span className="scan-kicker">{translate('How it works')}</span>
                        <h2>{translate('Three simple steps. Everything stays recorded.')}</h2>
                        <p>{translate('No long setup or steep learning curve. Start with the work you already do.')}</p>
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
                                <h3>{translate('Scan or find an item')}</h3>
                                <p>{translate('Use a barcode, product name, or SKU.')}</p>
                            </div>
                        </m.li>
                        <m.li variants={staggerItem}>
                            <span>02</span>
                            <ShoppingBasket />
                            <div>
                                <h3>{translate('Complete the sale')}</h3>
                                <p>{translate('Enter the quantity, take payment, done.')}</p>
                            </div>
                        </m.li>
                        <m.li variants={staggerItem}>
                            <span>03</span>
                            <BarChart3 />
                            <div>
                                <h3>{translate('See the result')}</h3>
                                <p>{translate('Stock, cash, and reports update automatically.')}</p>
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
                        <span className="scan-kicker">{translate('One app for your store')}</span>
                        <h2>{translate('More than checkout. The rest of your store stays organized.')}</h2>
                    </m.div>
                    <m.div
                        className="scan-feature-list"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={staggerGroup}
                    >
                        {features().map(([number, title, copy, Icon]) => (
                            <m.article key={number} variants={staggerItem}>
                                <span className="scan-feature-number">{number}</span>
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
                            <span className="scan-kicker">{translate('At a glance')}</span>
                            <h2>{translate('From checkout to every decision you make.')}</h2>
                        </div>
                        <p>{translate('See what matters without digging through a crowded screen.')}</p>
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
                        <span className="scan-kicker">{translate('Everything works together')}</span>
                        <h2>{translate('Many store tasks, one connected flow.')}</h2>
                    </m.div>
                    <m.div
                        className="scan-coverage-list"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={staggerGroup}
                    >
                        {[
                            [ReceiptText, translate('Sales & returns')],
                            [PackageSearch, translate('Purchases & suppliers')],
                            [Boxes, translate('Stock & stock counts')],
                            [CircleDollarSign, translate('Cash, capital & expenses')],
                            [Users, translate('Stores & team members')],
                            [BarChart3, translate('Operational reports')],
                        ].map(([Icon, label]) => (
                            <m.span key={String(label)} variants={staggerItem}>
                                <Icon /> {String(label)}
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
                        <span className="scan-kicker">{translate('Simply easier')}</span>
                        <h2 id="comparison-title">{translate('Spend less time entering things twice, and more time with customers.')}</h2>
                    </m.div>
                    <m.div
                        className="scan-comparison-table"
                        role="table"
                        aria-label={`Comparison${branding.brand_name}and recording manual`}
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={staggerGroup}
                    >
                        <m.div className="scan-comparison-row scan-comparison-head" role="row" variants={staggerItem}>
                            <span role="columnheader">{translate('Task')}</span>
                            <strong role="columnheader">
                                <ScanLine /> {branding.brand_name}
                            </strong>
                            <strong role="columnheader">
                                <BookOpen /> {translate('Manual method')}
                            </strong>
                        </m.div>
                        {comparison().map(([task, sisko, manual]) => (
                            <m.div className="scan-comparison-row" role="row" key={task} variants={staggerItem}>
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
                    <m.div initial="hidden" whileInView="visible" viewport={publicViewport} variants={revealLeft}>
                        <span className="scan-kicker">{translate('Common questions')}</span>
                        <h2>{translate('Still have something in mind?')}</h2>
                    </m.div>
                    <m.div
                        className="scan-faq-list"
                        initial="hidden"
                        whileInView="visible"
                        viewport={publicViewport}
                        variants={staggerGroup}
                    >
                        {faqs().map(([question, answer]) => (
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
                        <span className="scan-kicker">{offerBadge}</span>
                        <h2>{translate('Start for free. Get your store organized at your own pace.')}</h2>
                    </div>
                    <div>
                        <Link className="ledger-button ledger-button-orange" href={primaryHref}>
                            {primaryLabel} <ArrowRight />
                        </Link>
                        <span>
                            <ShieldCheck /> {translate('Each store keeps its own separate data')}
                        </span>
                    </div>
                </m.div>
            </section>
        </>
    );
}
