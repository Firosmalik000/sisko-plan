/* eslint-disable */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const babel = require('@babel/core');
const translateUiLiterals = require('./translate-ui.cjs');

const root = process.cwd();
const sourceRoot = path.join(root, 'resources', 'js');

// Execute the real resolver so catalog composition and locale selection are covered.
const auditModules = new Map();
function loadTranslationModule(filename) {
    if (!path.extname(filename)) {
        filename = fs.existsSync(`${filename}.ts`) ? `${filename}.ts` : path.join(filename, 'index.ts');
    }
    if (auditModules.has(filename)) return auditModules.get(filename).exports;
    const module = { exports: {} };
    auditModules.set(filename, module);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (specifier) => {
        if (specifier.startsWith('@/')) return loadTranslationModule(path.join(sourceRoot, specifier.slice(2)));
        if (specifier.startsWith('.')) return loadTranslationModule(path.resolve(path.dirname(filename), specifier));
        return require(specifier);
    };
    new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
    return module.exports;
}

const { translate } = loadTranslationModule(path.join(sourceRoot, 'lib/i18n.ts'));
const { englishCatalog: referenceEnglishCatalog } = loadTranslationModule(path.join(sourceRoot, 'lang/en'));
const unitKeys = Object.keys(referenceEnglishCatalog)
    .filter((key) => key.startsWith('units.'))
    .sort();
const categoryKeys = Object.keys(referenceEnglishCatalog)
    .filter((key) => key.startsWith('categories.'))
    .sort();
if (categoryKeys.length !== 39) throw new Error('Standard category translations must cover 39 category codes.');
if (unitKeys.length < 62) throw new Error('Standard unit translations must cover at least 62 unit codes.');
for (const [locale, exportName, bottle, pack] of [
    ['id', 'indonesianCatalog', 'Botol', 'Pak'],
    ['ms', 'malayCatalog', 'Botol', 'Pek'],
    ['en', 'englishCatalog', 'Bottle', 'Pack'],
    ['vi', 'vietnameseCatalog', 'Chai', 'Lốc'],
]) {
    const catalog = loadTranslationModule(path.join(sourceRoot, 'lang', locale))[exportName];
    const localeUnitKeys = Object.keys(catalog)
        .filter((key) => key.startsWith('units.'))
        .sort();
    if (JSON.stringify(localeUnitKeys) !== JSON.stringify(unitKeys)) {
        throw new Error(`Standard unit keys differ in ${locale}.`);
    }
    for (const key of unitKeys) {
        if (!catalog[key]?.trim() || translate(key, locale) !== catalog[key] || translate(key, locale) === key) {
            throw new Error(`Standard unit translation does not resolve: ${locale}:${key}`);
        }
    }
    const localeCategoryKeys = Object.keys(catalog)
        .filter((key) => key.startsWith('categories.'))
        .sort();
    if (JSON.stringify(localeCategoryKeys) !== JSON.stringify(categoryKeys)) {
        throw new Error(`Standard category keys differ in ${locale}.`);
    }
    for (const key of categoryKeys) {
        if (!catalog[key]?.trim() || translate(key, locale) !== catalog[key] || translate(key, locale) === key) {
            throw new Error(`Standard category translation does not resolve: ${locale}:${key}`);
        }
    }
    if (translate('units.bottle', locale) !== bottle || translate('units.pack', locale) !== pack) {
        throw new Error(`Bottle and pack labels must be localized in ${locale}.`);
    }
}

const transformProbe = babel.transformSync("const menu = [{ title: 'Beranda', description: 'Ringkasan usaha' }];", {
    configFile: false,
    babelrc: false,
    plugins: [translateUiLiterals],
})?.code;

if (
    !transformProbe?.includes('get title()') ||
    !transformProbe.includes('get description()') ||
    transformProbe.includes('title: __translateUi')
) {
    throw new Error('UI metadata translations must be resolved dynamically when properties are read.');
}

const jsxDiscriminatorProbe = babel.transformSync(
    "const payment = <>{method === 'cash' ? 'Bayar tunai' : method === 'qris' ? 'Bayar QRIS' : 'Belum tersedia'}</>;",
    {
        configFile: false,
        babelrc: false,
        parserOpts: { plugins: ['jsx'] },
        plugins: [translateUiLiterals],
    },
)?.code;

if (
    !jsxDiscriminatorProbe ||
    !/method === ["']cash["']/u.test(jsxDiscriminatorProbe) ||
    !/method === ["']qris["']/u.test(jsxDiscriminatorProbe) ||
    /__translateUi\(["'](?:cash|qris)["']\)/u.test(jsxDiscriminatorProbe) ||
    !/__translateUi\(["']Bayar tunai["']\)/u.test(jsxDiscriminatorProbe) ||
    !/__translateUi\(["']Bayar QRIS["']\)/u.test(jsxDiscriminatorProbe)
) {
    throw new Error('JSX translations must preserve technical discriminator values while translating rendered copy.');
}

const dynamicLabelProbe = babel.transformSync(
    "const statusLabels = { draft: 'Sedang dihitung', posted: 'Diposting' }; const homeLabel = active ? 'Kembali ke dashboard' : 'Kembali ke beranda';",
    {
        configFile: false,
        babelrc: false,
        plugins: [translateUiLiterals],
    },
)?.code;

if (
    !dynamicLabelProbe?.includes('get draft()') ||
    !dynamicLabelProbe.includes('__translateUi("Sedang dihitung")') ||
    !dynamicLabelProbe.includes('__translateUi("Kembali ke dashboard")') ||
    !dynamicLabelProbe.includes('__translateUi("Kembali ke beranda")')
) {
    throw new Error('Dynamic label maps and computed labels must be translated when they are resolved.');
}

const catalogRoot = path.join(sourceRoot, 'lang');
const translatedProps = new Set([
    'aria-label',
    'alt',
    'buttonText',
    'caption',
    'description',
    'emptyLabel',
    'error',
    'label',
    'loadingLabel',
    'message',
    'placeholder',
    'separator',
    'submitLabel',
    'text',
    'title',
]);
const uiNames = /(?:copy|description|empty|error|heading|label|message|placeholder|status|subtitle|text|title)$/i;
const uiCalls = /^(?:alert|confirm|setError|setMessage|setStatus|toast)$/i;
const technicalValues = /^(?:[a-z0-9]*[_.:/-][a-z0-9_.:/-]*|#[0-9a-f]{3,8}|\d+(?:\.\d+)?|[A-Z0-9_]+)$/;
const uncovered = new Map();
const coveredValues = new Map();
const landingDynamicValues = new Map();
let covered = 0;

function isHumanText(value) {
    const normalized = value.trim();
    const tokens = normalized.split(/\s+/u);
    const cssClassList =
        tokens.length > 1 &&
        tokens.some((token) => /[-:[\]]/u.test(token)) &&
        tokens.every((token) => /^!?[a-z0-9:[\]./%-]+$/u.test(token));

    return normalized.length > 1 && /[A-Za-zÀ-ÿ]/u.test(normalized) && !technicalValues.test(normalized) && !cssClassList;
}

function nameOf(node) {
    if (ts.isIdentifier(node) || ts.isStringLiteral(node)) return node.text;
    if (ts.isPropertyAccessExpression(node)) return node.name.text;
    return '';
}

function report(value, file, source, node, isCovered) {
    const normalized = value.trim().replace(/\s+/gu, ' ');
    if (!isHumanText(normalized)) return;
    if (isCovered) {
        covered += 1;
        if (!coveredValues.has(normalized)) coveredValues.set(normalized, []);
        coveredValues.get(normalized).push(`${path.relative(root, file)}`);
        return;
    }

    const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    if (!uncovered.has(normalized)) uncovered.set(normalized, []);
    uncovered.get(normalized).push(`${path.relative(root, file)}:${line}`);
}

function hasJsxAncestor(node) {
    for (let current = node.parent; current; current = current.parent) {
        if (ts.isJsxExpression(current)) return true;
        if (ts.isFunctionLike(current) || ts.isSourceFile(current)) return false;
    }
    return false;
}

function isJsxChild(node) {
    for (let current = node.parent; current; current = current.parent) {
        if (ts.isJsxExpression(current)) {
            return !ts.isJsxAttribute(current.parent);
        }
        if (ts.isFunctionLike(current) || ts.isSourceFile(current)) return false;
    }
    return false;
}

function enclosingFunctionName(node) {
    for (let current = node.parent; current; current = current.parent) {
        if (ts.isFunctionDeclaration(current)) return nameOf(current.name);
        if ((ts.isArrowFunction(current) || ts.isFunctionExpression(current)) && ts.isVariableDeclaration(current.parent)) {
            return nameOf(current.parent.name);
        }
    }
    return '';
}

function enclosingVariableName(node) {
    for (let current = node.parent; current; current = current.parent) {
        if (ts.isVariableDeclaration(current)) return nameOf(current.name);
        if (ts.isSourceFile(current)) return '';
    }
    return '';
}

function visit(file, source, node) {
    if (ts.isJsxText(node)) {
        report(node.text, file, source, node, true);
    } else if (ts.isJsxAttribute(node) && node.initializer) {
        const prop = node.name.text;
        if (translatedProps.has(prop) && ts.isStringLiteral(node.initializer)) {
            report(node.initializer.text, file, source, node.initializer, translatedProps.has(prop));
        } else if (
            translatedProps.has(prop) &&
            ts.isJsxExpression(node.initializer) &&
            node.initializer.expression &&
            (ts.isNoSubstitutionTemplateLiteral(node.initializer.expression) || ts.isTemplateExpression(node.initializer.expression))
        ) {
            const expression = node.initializer.expression;
            const visibleText = ts.isTemplateExpression(expression)
                ? [expression.head.text, ...expression.templateSpans.map((span) => span.literal.text)].join(' ')
                : expression.text;

            report(visibleText, file, source, node, true);
        }
    } else if (ts.isPropertyAssignment(node)) {
        const prop = nameOf(node.name);
        if (translatedProps.has(prop) && ts.isStringLiteral(node.initializer)) {
            report(node.initializer.text, file, source, node.initializer, translatedProps.has(prop));
        }
    } else if (ts.isStringLiteral(node)) {
        const parent = node.parent;
        if (
            path.basename(file) === 'welcome.tsx' &&
            ['features', 'faqs', 'dailyProblems', 'comparison'].includes(enclosingVariableName(node)) &&
            isHumanText(node.text)
        ) {
            const value = node.text.trim().replace(/\s+/gu, ' ');
            landingDynamicValues.set(
                value,
                `${path.relative(root, file)}:${source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1}`,
            );
        }
        if (isJsxChild(node)) {
            report(node.text, file, source, node, true);
        } else if (/^(?:labels|reasons)$|(?:Labels)$/i.test(enclosingVariableName(node))) {
            report(node.text, file, source, node, true);
        } else if (ts.isVariableDeclaration(parent) && uiNames.test(nameOf(parent.name))) {
            report(node.text, file, source, node, false);
        } else if (ts.isReturnStatement(parent) && uiNames.test(enclosingFunctionName(node))) {
            const scannerMessage = file.replaceAll('\\', '/').includes('/components/product-scanner/');
            report(node.text, file, source, node, scannerMessage);
        } else if (ts.isCallExpression(parent) && uiCalls.test(nameOf(parent.expression))) {
            const scannerMessage = file.replaceAll('\\', '/').includes('/components/product-scanner/');
            report(node.text, file, source, node, scannerMessage);
        }
    } else if (ts.isTemplateExpression(node) && isJsxChild(node)) {
        report(node.head.text, file, source, node, true);
        for (const span of node.templateSpans) report(span.literal.text, file, source, span.literal, true);
    }

    ts.forEachChild(node, (child) => visit(file, source, child));
}

function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            walk(target);
        } else if (
            entry.name.endsWith('.tsx') ||
            (entry.name.endsWith('.ts') && target.replaceAll('\\', '/').includes('/components/product-scanner/'))
        ) {
            const source = ts.createSourceFile(
                target,
                fs.readFileSync(target, 'utf8'),
                ts.ScriptTarget.Latest,
                true,
                entry.name.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
            );
            visit(target, source, source);
        }
    }
}

walk(sourceRoot);

const catalogKeys = new Set();
const malayCatalog = new Map();
const malayLexiconEntries = [];
const englishCatalog = new Map();
const englishLexiconEntries = [];
const vietnameseCatalog = new Map();
const vietnameseCatalogDefinitions = new Map();
const catalogGroups = new Map();
const indonesianCoreKeys = new Set();
const indonesianCoreEnglish = new Map();

function collectKeys(node) {
    if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === 'translations' &&
        node.initializer &&
        ts.isObjectLiteralExpression(node.initializer)
    ) {
        const indonesian = node.initializer.properties.find(
            (property) =>
                ts.isPropertyAssignment(property) && nameOf(property.name) === 'id' && ts.isObjectLiteralExpression(property.initializer),
        );

        if (indonesian && ts.isObjectLiteralExpression(indonesian.initializer)) {
            for (const property of indonesian.initializer.properties) {
                if (ts.isPropertyAssignment(property) && ts.isStringLiteralLike(property.initializer)) {
                    englishCatalog.set(property.initializer.text, nameOf(property.name));
                }
            }
        }
    }
    if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === 'indonesianCore' &&
        node.initializer &&
        ts.isObjectLiteralExpression(node.initializer)
    ) {
        for (const property of node.initializer.properties) {
            if (ts.isPropertyAssignment(property) && ts.isStringLiteralLike(property.initializer)) {
                const key = nameOf(property.name);
                catalogKeys.add(key);
                indonesianCoreKeys.add(property.initializer.text);
                indonesianCoreEnglish.set(property.initializer.text, key);
            }
        }
    }
    if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        [
            'indonesianOverrides',
            'landingMalayOverrides',
            'malayCore',
            'malayOverrides',
            'reviewedMalayOverrides',
            'malayProductCatalog',
            'malayDynamicCatalog',
        ].includes(node.name.text) &&
        node.initializer &&
        ts.isObjectLiteralExpression(node.initializer)
    ) {
        const groupKeys = new Set();

        for (const property of node.initializer.properties) {
            if (ts.isPropertyAssignment(property)) {
                const key = nameOf(property.name);

                catalogKeys.add(key);
                groupKeys.add(key);
                if (!['indonesianOverrides'].includes(node.name.text) && ts.isStringLiteralLike(property.initializer)) {
                    malayCatalog.set(key, property.initializer.text);
                }
            }
        }

        catalogGroups.set(node.name.text, groupKeys);
    }
    if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        ['englishOverrides', 'englishProductCatalog', 'englishDynamicCatalog'].includes(node.name.text) &&
        node.initializer &&
        ts.isObjectLiteralExpression(node.initializer)
    ) {
        for (const property of node.initializer.properties) {
            if (ts.isSpreadAssignment(property) && property.expression.getText().includes('indonesianCore')) {
                for (const [source, output] of indonesianCoreEnglish) {
                    englishCatalog.set(source, output);
                }

                continue;
            }

            if (ts.isPropertyAssignment(property) && ts.isStringLiteralLike(property.initializer)) {
                englishCatalog.set(nameOf(property.name), property.initializer.text);
            }
        }
    }
    if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text.startsWith('vietnamese') &&
        node.initializer &&
        ts.isObjectLiteralExpression(node.initializer)
    ) {
        const entries = [];

        for (const property of node.initializer.properties) {
            if (ts.isPropertyAssignment(property) && ts.isStringLiteralLike(property.initializer)) {
                entries.push({ type: 'value', key: nameOf(property.name), value: property.initializer.text });
            } else if (ts.isSpreadAssignment(property) && ts.isIdentifier(property.expression)) {
                entries.push({ type: 'spread', name: property.expression.text });
            }
        }

        vietnameseCatalogDefinitions.set(node.name.text, entries);
    }
    if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === 'malayLexicon' &&
        node.initializer &&
        ts.isArrayLiteralExpression(node.initializer)
    ) {
        for (const element of node.initializer.elements) {
            if (
                ts.isArrayLiteralExpression(element) &&
                element.elements.length === 2 &&
                ts.isStringLiteralLike(element.elements[0]) &&
                ts.isStringLiteralLike(element.elements[1])
            ) {
                malayLexiconEntries.push([element.elements[0].text, element.elements[1].text]);
            }
        }
    }
    if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === 'englishLexicon' &&
        node.initializer &&
        ts.isArrayLiteralExpression(node.initializer)
    ) {
        for (const element of node.initializer.elements) {
            if (
                ts.isArrayLiteralExpression(element) &&
                element.elements.length === 2 &&
                ts.isStringLiteralLike(element.elements[0]) &&
                ts.isStringLiteralLike(element.elements[1])
            ) {
                englishLexiconEntries.push([element.elements[0].text, element.elements[1].text]);
            }
        }
    }
    ts.forEachChild(node, collectKeys);
}

function catalogFiles(directory) {
    const files = [];

    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            files.push(...catalogFiles(target));
        } else if (entry.name.endsWith('.ts')) {
            files.push(target);
        }
    }

    return files;
}

const catalogOrder = ['common.ts', 'public.ts', 'application.ts', 'reviewed.ts', 'lexicon.ts'];
for (const target of catalogFiles(catalogRoot).sort((left, right) => {
    const leftOrder = catalogOrder.indexOf(path.basename(left));
    const rightOrder = catalogOrder.indexOf(path.basename(right));

    return leftOrder - rightOrder || left.localeCompare(right);
})) {
    const source = ts.createSourceFile(target, fs.readFileSync(target, 'utf8'), ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
    collectKeys(source);
}

function resolveVietnameseCatalog(name, resolving = new Set()) {
    if (resolving.has(name)) throw new Error(`Circular Vietnamese catalog spread: ${name}`);

    const resolved = new Map();
    const entries = vietnameseCatalogDefinitions.get(name) ?? [];
    const nextResolving = new Set(resolving).add(name);

    for (const entry of entries) {
        if (entry.type === 'spread') {
            for (const [key, value] of resolveVietnameseCatalog(entry.name, nextResolving)) resolved.set(key, value);
        } else {
            resolved.set(entry.key, entry.value);
        }
    }

    return resolved;
}

for (const [key, value] of resolveVietnameseCatalog('vietnameseCatalog')) vietnameseCatalog.set(key, value);

const duplicateLandingKeys = [...(catalogGroups.get('landingMalayOverrides') ?? [])].filter((key) =>
    catalogGroups.get('malayOverrides')?.has(key),
);

const englishWords =
    /\b(?:added|admin(?:istration)?|are|authentication|back|close|code|codes|confirm|continue|default|device|documentation|enable|enabled|for|from|hide|inventory|is|loading|now|of|on|or|recovery|regenerate|remove|repository|save|security|the|to|view|with|you|your)\b/i;
const dynamicEnglish = [
    /^Are you sure you want to remove the .+ passkey\?/u,
    /^Are you sure you want to remove the "$/u,
    /^" passkey\? You will no longer/u,
];
const missingEnglish = new Map();
const untranslatedIndonesian = new Map();
const untranslatedEnglish = new Map();
const untranslatedVietnamese = new Map();
const mixedEnglish = new Map();
const mixedVietnamese = new Map();
const indonesianLandingWords =
    /\b(?:kasir|operasional|rapi|barangnya|sisanya|langsung|tercatat|menyatukan|toko|bisa|tim|terkontrol|ditemukan|keranjang|bayar|diperbarui|penjualan|ringan|butuh|merepotkan|dibuat|ingin|bekerja|memahami|kondisi|usahanya|alur|catatan|dipahami|nyaman|dipakai|ponsel|sering|terjadi|jualannya|tertinggal|berulang|membuat|sulit|dibaca|mudah|tercecer|tersimpan|diperiksa|dihitung|terlambat|menumpuk|menghabiskan|waktu|harus|disatukan|gerakan|utuh|gunakan|atau|atur|kembalian|hasilnya|cuma|pekerjaan|paham|masukkan|lalu|berpindah|layar|otomatis|kulakan|hingga|tingkat|uang|biaya|utang|ditelusuri|tebakan|laba|kritis|sampai|informasi|dibutuhkan|membingungkan|batas|kemarin|menyeluruh|tersedia|berbeda|sedikit|mencatat|melayani|perbarui|mengikuti|hitung|pantau|terhubung|terpisah|siap|periode|pertanyaan|mulai|membeli|apa|setelah|pegang|kendali)\b/iu;
const indonesianOnlyWords =
    /\b(?:akun|autentikasi|bagian|barcode|berhasil|berikutnya|biaya|bisnis|cash|cocokkan|dikirim|ditemukan|diskon|duplikat|email|environment|foto|hapus|informasi|inventory|invoice|karena|kasir|keamanan|kelola|kemarin|kembalian|kode|kondisi|konfirmasi|kuantitas|kulakan|laba|lanjutkan|layar|maksimal|minimal|mode|nominal|nomor|notifikasi|otomatis|package|paket|password|pemasok|pengaturan|pengelola|penjualan|perbarui|performa|periode|ponsel|posisi|produksi|rekap|refund|rentang|retur|riwayat|saldo|satuan|scanner|silakan|subscription|supplier|tanggal|tambahkan|tebakan|terbaru|tercecer|terdaftar|tampilkan|tersedia|toko|tren|trial|utang|valid|verifikasi)\b/iu;
const englishIndonesianWords =
    /\b(?:Anda|ada|akun|belum|bersih|biaya|bisnis|buka|bulanan|diskon|hapus|kasir|keamanan|kelola|komposisi|kontribusi|kuantitas|laba|lanjutkan|lengkap|masuk|navigasi|nilai|nominal|notifikasi|operasional|paket|pemulihan|penjualan|performa|periode|posisi|potensi|produk|riwayat|saldo|satuan|silakan|tanggal|tampilkan|tetap|terdaftar|terjual|terlaris|toko|transaksi|tren|usaha|utang)\b/iu;
const englishResidualWords =
    /\b(?:yang|ini|bulan|foto|barang|ke|tanpa|hasil|satu|sedang|perlu|ambil|hari|jenis|awal|tidak|cara|dokumen|baru|lagi|daftar|mata|alur|kerja|keluar|akan|pekerjaan|pemilik|ruang|beranda|utama|cepat|penerimaan|langsung|nomor|verifikasi|kuota|catat|kondisi|dikirim|seluruh|setelah|setiap|layanan|banyak|negara|ecer|akhir|tautan|varian|ikut|muncul|sisanya|besar|bukan|melanjutkan|membuat|sampai|penuh|masukkan|atur|memiliki|penting|lama|konfirmasi|kirim|perhatian|menunggu|sesi|periksa|nanti|terpisah|dipilih|tersisa|terpakai|terjadwal|terfilter|dibatalkan|ditangguhkan|pencatatan|pengambilan|penarikan|selisih|barangnya|dibuat|tercecer|terkontrol|mencatat|perkembangan|penggunaan|peran|usahanya|utuh|umum|ponsel|terhubung|penjualannya|pertanyaan|tingkatkan|perluas|pindai|ulang|aman|rapi|ditemukan|tercatat)\b/iu;
const vietnameseIndonesianWords =
    /\b(?:Anda|ada|akses|aktif|akun|akhir|ambil|anggota|arus|awal|barang|batal|belum|beranda|bersih|biaya|bisnis|buka|bulan|bulanan|bukti|cari|catat|coba|daftar|dapur|dari|dengan|detail|dibatalkan|ditangguhkan|diterapkan|diskon|dokumen|ecer|fitur|foto|gratis|gunakan|habis|hapus|harga|hari|hasil|ingat|informasi|jenis|jatuh|kapasitas|kas|kasir|kategori|keamanan|kelola|keluar|kembali|kembalian|keterangan|kebutuhan|kerja|kritis|kuota|lagi|laporan|laba|manual|masuk|mata|modal|mulai|nilai|nominal|nonaktif|operasional|paket|pembayaran|pemilik|penjualan|periksa|periode|perlu|pilih|posisi|potensi|produk|rekening|retur|riwayat|saldo|satuan|scan|sedang|selamanya|semua|simpan|staf|stok|supplier|tanggal|tambah|tanpa|tempo|terakhir|terbaru|terbesar|terfilter|terjadwal|terjual|tersedia|tersisa|terpakai|toko|transaksi|tren|uang|ulang|usaha|utang|waktu)\b/iu;
const sharedTechnicalWords = new Set([
    '2fa',
    'add-on',
    'admin',
    'administrator',
    'android',
    'app',
    'authenticator',
    'auto',
    'barcode',
    'bank',
    'bluetooth',
    'browser',
    'brand',
    'cash',
    'checkout',
    'code',
    'dashboard',
    'data',
    'default',
    'debit',
    'digit',
    'diagram',
    'edit',
    'email',
    'error',
    'esc',
    'e-wallet',
    'faq',
    'filter',
    'file',
    'footer',
    'form',
    'format',
    'google',
    'id',
    'https',
    'hpp',
    'invoice',
    'indonesia',
    'inggris',
    'internal',
    'input',
    'item',
    'jpg',
    'key',
    'lan',
    'login',
    'logo',
    'manual',
    'media',
    'menu',
    'metadata',
    'marketplace',
    'master',
    'minimum',
    'mode',
    'ms',
    'online',
    'offline',
    'owner',
    'pdf',
    'png',
    'portal',
    'passkey',
    'password',
    'per',
    'platform',
    'pos',
    'printer',
    'product',
    'profit',
    'qris',
    'qr',
    'recovery',
    'receipt',
    'refund',
    'reset',
    'scan',
    'scanner',
    'seo',
    'sisko-plan',
    'sku',
    'status',
    'stock',
    'subtotal',
    'store',
    'subscription',
    'supplier',
    'tagline',
    'trial',
    'transfer',
    'transaction',
    'total',
    'top',
    'tenant',
    'super',
    'url',
    'usb',
    'vi',
    'verification',
    'valid',
    'whatsapp',
    'webp',
    'wi-fi',
    'xsisten',
    'berkah',
    'com',
    'example',
    'halo',
    'melayu',
    'quantity',
    'real-time',
    'rpp02n',
    'saas',
    'rupiah',
    'two-factor',
    'authentication',
    'enabled',
    'enter',
    'now',
    'setup',
    'the',
    'your',
    'utama',
]);

function suspiciousSharedWords(source, output) {
    if (source === output) return [];

    const outputWords = new Set(output.toLocaleLowerCase('id').match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) ?? []);

    return [...new Set(source.toLocaleLowerCase('id').match(/[\p{L}\p{N}]+(?:-[\p{L}\p{N}]+)*/gu) ?? [])].filter(
        (word) => word.length > 2 && outputWords.has(word) && !sharedTechnicalWords.has(word),
    );
}

function translateMalayForAudit(value) {
    if (malayCatalog.has(value)) return malayCatalog.get(value);

    let translated = value.replace(/\bRp(?=\s?\d)/gu, 'RM');
    for (const [source, replacement] of malayLexiconEntries) {
        const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        translated = translated.replace(new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'giu'), replacement);
    }

    return translated;
}

function translateEnglishForAudit(value) {
    if (englishCatalog.has(value)) return englishCatalog.get(value);

    let translated = value;
    for (const [source, replacement] of englishLexiconEntries) {
        const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        translated = translated.replace(new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'giu'), replacement);
    }

    return translated;
}

const indonesianSourceWords = new RegExp(
    `${indonesianLandingWords.source}|${indonesianOnlyWords.source}|${vietnameseIndonesianWords.source}`,
    'iu',
);

function isDynamicTranslation(value) {
    return [
        /^Alur utama .+$/u,
        /^Perbandingan .+ dan pencatatan manual$/u,
        /^.+, beranda$/u,
        /^\d+ foto diambil$/u,
        /^Buka tindakan untuk .+$/u,
        /^Catat pembayaran .+$/u,
        /^Edit subscription .+$/u,
        /^Hapus Produk .+ dari antrean$/u,
        /^Kapasitas .+$/u,
        /^Hapus .+$/u,
        /^Kurangi .+$/u,
        /^Jumlah .+$/u,
        /^Tambah .+$/u,
        /^Edit .+$/u,
        /^Kode error .+$/u,
        /^Hasil stock opname .+$/u,
    ].some((pattern) => pattern.test(value));
}

for (const [value, files] of coveredValues) {
    landingDynamicValues.set(value, files[0]);
}

for (const [value, location] of landingDynamicValues) {
    const malayOutput = translateMalayForAudit(value);
    if (/\bRp(?=\s?\d)/u.test(value) && malayOutput === value) {
        untranslatedIndonesian.set(value, location);
    }

    if (indonesianOnlyWords.test(malayOutput)) {
        untranslatedIndonesian.set(value, `${location} -> ${JSON.stringify(malayOutput)}`);
    }
}

for (const [value, files] of coveredValues) {
    const englishOutput = translateEnglishForAudit(value);
    if (
        (indonesianCoreKeys.has(value) || englishIndonesianWords.test(value) || englishResidualWords.test(value)) &&
        !englishCatalog.has(value) &&
        !isDynamicTranslation(value) &&
        englishOutput === value
    ) {
        untranslatedEnglish.set(value, `${files[0]} -> ${JSON.stringify(englishOutput)}`);
    } else if (englishIndonesianWords.test(englishOutput) || englishResidualWords.test(englishOutput)) {
        untranslatedEnglish.set(value, `${files[0]} -> ${JSON.stringify(englishOutput)}`);
    }

    const sharedWords = suspiciousSharedWords(value, englishOutput);
    if (sharedWords.length > 0) {
        mixedEnglish.set(value, `${files[0]} -> ${JSON.stringify(englishOutput)} [${sharedWords.join(', ')}]`);
    }
}

for (const [value, files] of coveredValues) {
    if (/\S+@\S+/u.test(value) || technicalValues.test(value) || /^[#/]\S+$/u.test(value)) continue;

    const vietnameseOutput = vietnameseCatalog.get(value) ?? value;
    const strictTechnicalValues = new Set([
        '(x',
        'alert',
        '08xxxxxxxxxx',
        '58 mm',
        '80 mm',
        'active',
        'analyzing',
        'any',
        'archived',
        'button',
        'btl',
        'cancelled',
        'checkbox',
        'counted',
        'country',
        'create',
        'custom',
        'date',
        'decimal',
        'destructive',
        'draft',
        'failed',
        'file',
        'ghost',
        'icon',
        'idle',
        'image/jpeg,image/png,image/webp,application/pdf',
        'img',
        'in',
        'increase',
        'lazy',
        'large',
        'marketplace',
        'name',
        'noreferrer',
        'none',
        'number',
        'outline',
        'photo',
        'patch',
        'polite',
        'post',
        'posted',
        'purchase',
        'qris',
        'reading',
        'ready',
        'recognized',
        'recognizing',
        'retail',
        'round',
        'sale',
        'secondary',
        'separate',
        'shared',
        'sm',
        'status',
        'success',
        'symbol',
        'tabpanel',
        'tel',
        'true',
        'uncertain',
        'url(#sales-area)',
        'waiting',
        'Kopi Susu × 2',
        'Roti Bakar × 1',
    ]);
    const looksLikeCss =
        value.includes('var(--') ||
        value.includes('!important') ||
        value.startsWith('@page') ||
        value.startsWith('; max-width:') ||
        value.startsWith('auto; margin:') ||
        /^(?:absolute|block|border-|flex|font-|grid|h-|inline-flex|max-w-|mb-|min-h-|min-w-|mt-|mx-|relative|rounded-|shrink-|size-|space-|text-|truncate|w-)\b/u.test(
            value,
        );
    const requiresExplicitVietnamese =
        !strictTechnicalValues.has(value) &&
        !looksLikeCss &&
        files.some((file) =>
            ['resources\\js\\pages\\customer\\', 'resources\\js\\components\\product-scanner\\'].some((scope) => file.includes(scope)),
        );
    const hasExistingLocalization = translateMalayForAudit(value) !== value || translateEnglishForAudit(value) !== value;
    const needsVietnameseTranslation = vietnameseIndonesianWords.test(value) || hasExistingLocalization;

    if (
        (needsVietnameseTranslation || requiresExplicitVietnamese) &&
        (!vietnameseCatalog.has(value) || vietnameseIndonesianWords.test(vietnameseOutput))
    ) {
        untranslatedVietnamese.set(value, `${files[0]} -> ${JSON.stringify(vietnameseOutput)}`);
    }

    const sharedWords = suspiciousSharedWords(value, vietnameseOutput);
    if (needsVietnameseTranslation && sharedWords.length > 0) {
        mixedVietnamese.set(value, `${files[0]} -> ${JSON.stringify(vietnameseOutput)} [${sharedWords.join(', ')}]`);
    }
}

for (const [value, files] of coveredValues) {
    if (
        englishWords.test(value) &&
        !catalogKeys.has(value) &&
        !englishCatalog.has(value) &&
        !dynamicEnglish.some((pattern) => pattern.test(value))
    ) {
        missingEnglish.set(value, files);
    }
}

const serverMalayIssues = new Map();
const serverMalayCatalog = JSON.parse(fs.readFileSync(path.join(root, 'lang', 'ms.json'), 'utf8'));
const serverEnglishIssues = new Map();
const serverEnglishCatalog = JSON.parse(fs.readFileSync(path.join(root, 'lang', 'en.json'), 'utf8'));
const serverVietnameseIssues = new Map();
const serverVietnameseCatalog = JSON.parse(fs.readFileSync(path.join(root, 'lang', 'vi.json'), 'utf8'));
const authContractIssues = [];

const authTranslationContract = {
    'Ruang kerja toko Anda': ['Your store workspace', 'Ruang kerja kedai anda', 'Không gian làm việc của cửa hàng'],
    'Semua pekerjaan toko, terasa lebih terarah.': [
        'Keep every store task on track.',
        'Semua kerja kedai terasa lebih tersusun.',
        'Mọi công việc cửa hàng trở nên có định hướng hơn.',
    ],
    'Kelola transaksi, stok, dan perkembangan usaha dari satu tempat.': [
        'Manage transactions, stock, and business performance in one place.',
        'Urus transaksi, stok dan perkembangan perniagaan dari satu tempat.',
        'Quản lý giao dịch, tồn kho và tình hình kinh doanh tại một nơi.',
    ],
    'Masuk ke akun Anda': ['Sign in to your account', 'Log masuk ke akaun anda', 'Đăng nhập vào tài khoản'],
    'Gunakan Google atau email Anda': ['Use Google or your email', 'Gunakan Google atau e-mel anda', 'Sử dụng Google hoặc email của bạn'],
    'Masuk dengan Google': ['Sign in with Google', 'Log masuk dengan Google', 'Đăng nhập bằng Google'],
    'Lupa kata sandi?': ['Forgot password?', 'Lupa kata laluan?', 'Quên mật khẩu?'],
    'Tampilkan kata sandi': ['Show password', 'Tunjukkan kata laluan', 'Hiện mật khẩu'],
    'Sembunyikan kata sandi': ['Hide password', 'Sembunyikan kata laluan', 'Ẩn mật khẩu'],
    Masuk: ['Sign in', 'Log masuk', 'Đăng nhập'],
    'Belum memiliki akun?': ["Don't have an account yet?", 'Belum mempunyai akaun?', 'Chưa có tài khoản?'],
    Daftar: ['Register', 'Daftar', 'Đăng ký'],
};

for (const [source, expected] of Object.entries(authTranslationContract)) {
    const actual = [englishCatalog.get(source), malayCatalog.get(source), vietnameseCatalog.get(source)];

    for (const [index, locale] of ['en', 'ms', 'vi'].entries()) {
        if (actual[index] !== expected[index]) {
            authContractIssues.push(`${locale} ${JSON.stringify(source)} -> ${JSON.stringify(actual[index])}`);
        }
    }
}

for (const [source, output] of Object.entries(serverMalayCatalog)) {
    if (indonesianOnlyWords.test(output)) {
        serverMalayIssues.set(source, output);
    }
}

for (const [source, output] of Object.entries(serverEnglishCatalog)) {
    if (englishIndonesianWords.test(output) || englishResidualWords.test(output)) {
        serverEnglishIssues.set(source, output);
    }
}

for (const [source, output] of Object.entries(serverVietnameseCatalog)) {
    if (vietnameseIndonesianWords.test(output)) {
        serverVietnameseIssues.set(source, output);
    }
}

if (
    uncovered.size > 0 ||
    missingEnglish.size > 0 ||
    untranslatedIndonesian.size > 0 ||
    untranslatedEnglish.size > 0 ||
    untranslatedVietnamese.size > 0 ||
    mixedEnglish.size > 0 ||
    mixedVietnamese.size > 0 ||
    duplicateLandingKeys.length > 0 ||
    serverMalayIssues.size > 0 ||
    serverEnglishIssues.size > 0 ||
    serverVietnameseIssues.size > 0 ||
    authContractIssues.length > 0
) {
    for (const [value, locations] of [...uncovered].sort()) {
        process.stderr.write(`${JSON.stringify(value)} ${locations.join(', ')}\n`);
    }
    for (const [value, files] of [...missingEnglish].sort()) {
        process.stderr.write(`Missing English translation ${JSON.stringify(value)} ${[...new Set(files)].join(', ')}\n`);
    }
    for (const [value, location] of [...untranslatedIndonesian].sort()) {
        process.stderr.write(`Untranslated Indonesian UI copy ${JSON.stringify(value)} ${location}\n`);
    }
    for (const [value, location] of [...untranslatedEnglish].sort()) {
        process.stderr.write(`Untranslated English customer copy ${JSON.stringify(value)} ${location}\n`);
    }
    for (const [value, location] of [...untranslatedVietnamese].sort()) {
        process.stderr.write(`Untranslated Vietnamese UI copy ${JSON.stringify(value)} ${location}\n`);
    }
    for (const [value, location] of [...mixedEnglish].sort()) {
        process.stderr.write(`Mixed English UI copy ${JSON.stringify(value)} ${location}\n`);
    }
    for (const [value, location] of [...mixedVietnamese].sort()) {
        process.stderr.write(`Mixed Vietnamese UI copy ${JSON.stringify(value)} ${location}\n`);
    }
    for (const key of duplicateLandingKeys.sort()) {
        process.stderr.write(`Duplicate Malay landing translation ${JSON.stringify(key)}\n`);
    }
    for (const [source, output] of [...serverMalayIssues].sort()) {
        process.stderr.write(`Indonesian server copy in Malay catalog ${JSON.stringify(source)} -> ${JSON.stringify(output)}\n`);
    }
    for (const [source, output] of [...serverEnglishIssues].sort()) {
        process.stderr.write(`Indonesian server copy in English catalog ${JSON.stringify(source)} -> ${JSON.stringify(output)}\n`);
    }
    for (const [source, output] of [...serverVietnameseIssues].sort()) {
        process.stderr.write(`Indonesian server copy in Vietnamese catalog ${JSON.stringify(source)} -> ${JSON.stringify(output)}\n`);
    }
    for (const issue of authContractIssues.sort()) {
        process.stderr.write(`Invalid authentication translation ${issue}\n`);
    }
    process.stderr.write(
        `\n${uncovered.size} possible UI literal(s), ${missingEnglish.size} English translation(s), ${untranslatedIndonesian.size} Malay output issue(s), ${untranslatedEnglish.size} English output issue(s), ${untranslatedVietnamese.size} Vietnamese output issue(s), ${mixedEnglish.size} mixed English issue(s), ${mixedVietnamese.size} mixed Vietnamese issue(s), ${duplicateLandingKeys.length} duplicate landing translation(s), ${serverMalayIssues.size} Malay server copy issue(s), ${serverEnglishIssues.size} English server copy issue(s), and ${serverVietnameseIssues.size} Vietnamese server copy issue(s) require review.\n`,
    );
    process.exit(1);
}

process.stdout.write(
    `${covered} UI literal occurrence(s) are covered by the build transform and have Malay, English, and Vietnamese output coverage.\n`,
);
