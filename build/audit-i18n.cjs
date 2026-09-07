/* eslint-disable */
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const babel = require('@babel/core');
const translateUiLiterals = require('./translate-ui.cjs');

const root = process.cwd();
const sourceRoot = path.join(root, 'resources', 'js');

const transformProbe = babel.transformSync(
    "const menu = [{ title: 'Beranda', description: 'Ringkasan usaha' }];",
    {
        configFile: false,
        babelrc: false,
        plugins: [translateUiLiterals],
    },
)?.code;

if (
    !transformProbe?.includes('get title()') ||
    !transformProbe.includes('get description()') ||
    transformProbe.includes('title: __translateUi')
) {
    throw new Error(
        'UI metadata translations must be resolved dynamically when properties are read.',
    );
}
const catalogRoot = path.join(sourceRoot, 'lang');
const translatedProps = new Set([
    'aria-label',
    'alt',
    'buttonText',
    'caption',
    'description',
    'emptyLabel',
    'label',
    'loadingLabel',
    'message',
    'placeholder',
    'separator',
    'submitLabel',
    'text',
    'title',
]);
const uiNames =
    /(?:copy|description|empty|error|heading|label|message|placeholder|status|subtitle|text|title)$/i;
const uiCalls = /^(?:alert|confirm|setError|setMessage|setStatus|toast)$/i;
const technicalValues =
    /^(?:[a-z0-9]*[_.:/-][a-z0-9_.:/-]*|#[0-9a-f]{3,8}|\d+(?:\.\d+)?|[A-Z0-9_]+)$/;
const uncovered = new Map();
const coveredValues = new Map();
const landingDynamicValues = new Map();
let covered = 0;

function isHumanText(value) {
    const normalized = value.trim();
    return (
        normalized.length > 1 &&
        /[A-Za-zÀ-ÿ]/u.test(normalized) &&
        !technicalValues.test(normalized)
    );
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

    const line =
        source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
    if (!uncovered.has(normalized)) uncovered.set(normalized, []);
    uncovered.get(normalized).push(`${path.relative(root, file)}:${line}`);
}

function hasJsxAncestor(node) {
    for (let current = node.parent; current; current = current.parent) {
        if (ts.isJsxExpression(current)) return true;
        if (ts.isFunctionLike(current) || ts.isSourceFile(current))
            return false;
    }
    return false;
}

function isJsxChild(node) {
    for (let current = node.parent; current; current = current.parent) {
        if (ts.isJsxExpression(current)) {
            return !ts.isJsxAttribute(current.parent);
        }
        if (ts.isFunctionLike(current) || ts.isSourceFile(current))
            return false;
    }
    return false;
}

function enclosingFunctionName(node) {
    for (let current = node.parent; current; current = current.parent) {
        if (ts.isFunctionDeclaration(current)) return nameOf(current.name);
        if (
            (ts.isArrowFunction(current) || ts.isFunctionExpression(current)) &&
            ts.isVariableDeclaration(current.parent)
        ) {
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
            report(
                node.initializer.text,
                file,
                source,
                node.initializer,
                translatedProps.has(prop),
            );
        } else if (
            translatedProps.has(prop) &&
            ts.isJsxExpression(node.initializer) &&
            node.initializer.expression &&
            (ts.isNoSubstitutionTemplateLiteral(node.initializer.expression) ||
                ts.isTemplateExpression(node.initializer.expression))
        ) {
            const expression = node.initializer.expression;
            const visibleText = ts.isTemplateExpression(expression)
                ? [
                      expression.head.text,
                      ...expression.templateSpans.map(
                          (span) => span.literal.text,
                      ),
                  ].join(' ')
                : expression.text;

            report(visibleText, file, source, node, true);
        }
    } else if (ts.isPropertyAssignment(node)) {
        const prop = nameOf(node.name);
        if (translatedProps.has(prop) && ts.isStringLiteral(node.initializer)) {
            report(
                node.initializer.text,
                file,
                source,
                node.initializer,
                translatedProps.has(prop),
            );
        }
    } else if (ts.isStringLiteral(node)) {
        const parent = node.parent;
        if (
            path.basename(file) === 'welcome.tsx' &&
            ['features', 'faqs', 'dailyProblems', 'comparison'].includes(
                enclosingVariableName(node),
            ) &&
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
        } else if (
            ts.isVariableDeclaration(parent) &&
            uiNames.test(nameOf(parent.name))
        ) {
            report(node.text, file, source, node, false);
        } else if (
            ts.isReturnStatement(parent) &&
            uiNames.test(enclosingFunctionName(node))
        ) {
            report(node.text, file, source, node, false);
        } else if (
            ts.isCallExpression(parent) &&
            uiCalls.test(nameOf(parent.expression))
        ) {
            report(node.text, file, source, node, false);
        }
    } else if (ts.isTemplateExpression(node) && isJsxChild(node)) {
        report(node.head.text, file, source, node, true);
        for (const span of node.templateSpans)
            report(span.literal.text, file, source, span.literal, true);
    }

    ts.forEachChild(node, (child) => visit(file, source, child));
}

function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) {
            walk(target);
        } else if (entry.name.endsWith('.tsx')) {
            const source = ts.createSourceFile(
                target,
                fs.readFileSync(target, 'utf8'),
                ts.ScriptTarget.Latest,
                true,
                ts.ScriptKind.TSX,
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
const catalogGroups = new Map();

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
                ts.isPropertyAssignment(property) &&
                nameOf(property.name) === 'id' &&
                ts.isObjectLiteralExpression(property.initializer),
        );

        if (
            indonesian &&
            ts.isObjectLiteralExpression(indonesian.initializer)
        ) {
            for (const property of indonesian.initializer.properties) {
                if (
                    ts.isPropertyAssignment(property) &&
                    ts.isStringLiteralLike(property.initializer)
                ) {
                    englishCatalog.set(
                        property.initializer.text,
                        nameOf(property.name),
                    );
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
            if (
                ts.isPropertyAssignment(property) &&
                ts.isStringLiteralLike(property.initializer)
            ) {
                const key = nameOf(property.name);
                catalogKeys.add(key);
                englishCatalog.set(property.initializer.text, key);
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
                if (
                    !['indonesianOverrides'].includes(node.name.text) &&
                    ts.isStringLiteralLike(property.initializer)
                ) {
                    malayCatalog.set(key, property.initializer.text);
                }
            }
        }

        catalogGroups.set(node.name.text, groupKeys);
    }
    if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        node.name.text === 'englishOverrides' &&
        node.initializer &&
        ts.isObjectLiteralExpression(node.initializer)
    ) {
        for (const property of node.initializer.properties) {
            if (
                ts.isPropertyAssignment(property) &&
                ts.isStringLiteralLike(property.initializer)
            ) {
                englishCatalog.set(
                    nameOf(property.name),
                    property.initializer.text,
                );
            }
        }
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
                malayLexiconEntries.push([
                    element.elements[0].text,
                    element.elements[1].text,
                ]);
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
                englishLexiconEntries.push([
                    element.elements[0].text,
                    element.elements[1].text,
                ]);
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

const catalogOrder = [
    'common.ts',
    'public.ts',
    'application.ts',
    'reviewed.ts',
    'lexicon.ts',
];
for (const target of catalogFiles(catalogRoot).sort((left, right) => {
    const leftOrder = catalogOrder.indexOf(path.basename(left));
    const rightOrder = catalogOrder.indexOf(path.basename(right));

    return leftOrder - rightOrder || left.localeCompare(right);
})) {
    const source = ts.createSourceFile(
        target,
        fs.readFileSync(target, 'utf8'),
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TS,
    );
    collectKeys(source);
}

const duplicateLandingKeys = [
    ...(catalogGroups.get('landingMalayOverrides') ?? []),
].filter((key) => catalogGroups.get('malayOverrides')?.has(key));

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
const indonesianLandingWords =
    /\b(?:kasir|operasional|rapi|barangnya|sisanya|langsung|tercatat|menyatukan|toko|bisa|tim|terkontrol|ditemukan|keranjang|bayar|diperbarui|penjualan|ringan|butuh|merepotkan|dibuat|ingin|bekerja|memahami|kondisi|usahanya|alur|catatan|dipahami|nyaman|dipakai|ponsel|sering|terjadi|jualannya|tertinggal|berulang|membuat|sulit|dibaca|mudah|tercecer|tersimpan|diperiksa|dihitung|terlambat|menumpuk|menghabiskan|waktu|harus|disatukan|gerakan|utuh|gunakan|atau|atur|kembalian|hasilnya|cuma|pekerjaan|paham|masukkan|lalu|berpindah|layar|otomatis|kulakan|hingga|tingkat|uang|biaya|utang|ditelusuri|tebakan|laba|kritis|sampai|informasi|dibutuhkan|membingungkan|batas|kemarin|menyeluruh|tersedia|berbeda|sedikit|mencatat|melayani|perbarui|mengikuti|hitung|pantau|terhubung|terpisah|siap|periode|pertanyaan|mulai|membeli|apa|setelah|pegang|kendali)\b/iu;
const indonesianOnlyWords =
    /\b(?:akun|autentikasi|bagian|barcode|berhasil|berikutnya|biaya|bisnis|cash|cocokkan|dikirim|ditemukan|diskon|duplikat|email|environment|foto|hapus|informasi|inventory|invoice|karena|kasir|keamanan|kelola|kemarin|kembalian|kode|kondisi|konfirmasi|kuantitas|kulakan|laba|lanjutkan|layar|maksimal|minimal|mode|nominal|nomor|notifikasi|otomatis|package|paket|password|pemasok|pengaturan|pengelola|penjualan|perbarui|performa|periode|ponsel|posisi|produksi|rekap|refund|rentang|retur|riwayat|saldo|satuan|scanner|silakan|subscription|supplier|tanggal|tambahkan|tebakan|terbaru|tercecer|terdaftar|tampilkan|tersedia|toko|tren|trial|utang|valid|verifikasi)\b/iu;
const englishIndonesianWords =
    /\b(?:Anda|ada|akun|belum|bersih|biaya|bisnis|buka|bulanan|diskon|hapus|kasir|keamanan|kelola|komposisi|kontribusi|kuantitas|laba|lanjutkan|lengkap|masuk|navigasi|nilai|nominal|notifikasi|operasional|paket|pemulihan|penjualan|performa|periode|posisi|potensi|produk|riwayat|saldo|satuan|silakan|tanggal|tampilkan|tetap|terdaftar|terjual|terlaris|toko|transaksi|tren|usaha|utang)\b/iu;

function translateMalayForAudit(value) {
    if (malayCatalog.has(value)) return malayCatalog.get(value);

    let translated = value.replace(/\bRp(?=\s?\d)/gu, 'RM');
    for (const [source, replacement] of malayLexiconEntries) {
        const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        translated = translated.replace(
            new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'giu'),
            replacement,
        );
    }

    return translated;
}

function translateEnglishForAudit(value) {
    if (englishCatalog.has(value)) return englishCatalog.get(value);

    let translated = value;
    for (const [source, replacement] of englishLexiconEntries) {
        const escaped = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        translated = translated.replace(
            new RegExp(`(?<![\\p{L}])${escaped}(?![\\p{L}])`, 'giu'),
            replacement,
        );
    }

    return translated;
}

function isCustomerUiFile(file) {
    const normalized = file.replaceAll('\\', '/');

    return ![
        'resources/js/pages/public/',
        'resources/js/pages/auth/',
        'resources/js/pages/platform/',
        'resources/js/layouts/auth/',
        'resources/js/components/public/',
    ].some((excluded) => normalized.includes(excluded));
}

for (const [value, files] of coveredValues) {
    landingDynamicValues.set(value, files[0]);
}

for (const [value, location] of landingDynamicValues) {
    const malayOutput = translateMalayForAudit(value);
    if (
        (indonesianLandingWords.test(value) || /\bRp(?=\s?\d)/u.test(value)) &&
        !malayCatalog.has(value) &&
        malayOutput === value
    ) {
        untranslatedIndonesian.set(value, location);
    }

    if (indonesianOnlyWords.test(malayOutput)) {
        untranslatedIndonesian.set(
            value,
            `${location} -> ${JSON.stringify(malayOutput)}`,
        );
    }
}

for (const [value, files] of coveredValues) {
    const customerFile = files.find(isCustomerUiFile);
    if (!customerFile) continue;

    const englishOutput = translateEnglishForAudit(value);
    if (englishIndonesianWords.test(englishOutput)) {
        untranslatedEnglish.set(
            value,
            `${customerFile} -> ${JSON.stringify(englishOutput)}`,
        );
    }
}

for (const [value, files] of coveredValues) {
    if (
        englishWords.test(value) &&
        !catalogKeys.has(value) &&
        !dynamicEnglish.some((pattern) => pattern.test(value))
    ) {
        missingEnglish.set(value, files);
    }
}

const serverMalayIssues = new Map();
const serverMalayCatalog = JSON.parse(
    fs.readFileSync(path.join(root, 'lang', 'ms.json'), 'utf8'),
);

for (const [source, output] of Object.entries(serverMalayCatalog)) {
    if (indonesianOnlyWords.test(output)) {
        serverMalayIssues.set(source, output);
    }
}

if (
    uncovered.size > 0 ||
    missingEnglish.size > 0 ||
    untranslatedIndonesian.size > 0 ||
    untranslatedEnglish.size > 0 ||
    duplicateLandingKeys.length > 0 ||
    serverMalayIssues.size > 0
) {
    for (const [value, locations] of [...uncovered].sort()) {
        process.stderr.write(
            `${JSON.stringify(value)} ${locations.join(', ')}\n`,
        );
    }
    for (const [value, files] of [...missingEnglish].sort()) {
        process.stderr.write(
            `Missing English translation ${JSON.stringify(value)} ${[...new Set(files)].join(', ')}\n`,
        );
    }
    for (const [value, location] of [...untranslatedIndonesian].sort()) {
        process.stderr.write(
            `Untranslated Indonesian UI copy ${JSON.stringify(value)} ${location}\n`,
        );
    }
    for (const [value, location] of [...untranslatedEnglish].sort()) {
        process.stderr.write(
            `Untranslated English customer copy ${JSON.stringify(value)} ${location}\n`,
        );
    }
    for (const key of duplicateLandingKeys.sort()) {
        process.stderr.write(
            `Duplicate Malay landing translation ${JSON.stringify(key)}\n`,
        );
    }
    for (const [source, output] of [...serverMalayIssues].sort()) {
        process.stderr.write(
            `Indonesian server copy in Malay catalog ${JSON.stringify(source)} -> ${JSON.stringify(output)}\n`,
        );
    }
    process.stderr.write(
        `\n${uncovered.size} possible UI literal(s), ${missingEnglish.size} English translation(s), ${untranslatedIndonesian.size} Malay output issue(s), ${untranslatedEnglish.size} English output issue(s), ${duplicateLandingKeys.length} duplicate landing translation(s), and ${serverMalayIssues.size} Malay server copy issue(s) require review.\n`,
    );
    process.exit(1);
}

process.stdout.write(
    `${covered} UI literal occurrence(s) are covered by the build transform and have Malay and English output coverage.\n`,
);
