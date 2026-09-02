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
const catalogPath = path.join(sourceRoot, 'lib', 'i18n.ts');
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
    /^(?:[a-z0-9_.:/-]+|#[0-9a-f]{3,8}|\d+(?:\.\d+)?|[A-Z0-9_]+)$/;
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

const catalogSource = ts.createSourceFile(
    catalogPath,
    fs.readFileSync(catalogPath, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TS,
);
const catalogKeys = new Set();
const malayCatalog = new Map();
const malayLexiconEntries = [];
const catalogGroups = new Map();

function collectKeys(node) {
    if (
        ts.isVariableDeclaration(node) &&
        ts.isIdentifier(node.name) &&
        [
            'indonesianOverrides',
            'landingMalayOverrides',
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
                    node.name.text !== 'indonesianOverrides' &&
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
    ts.forEachChild(node, collectKeys);
}
collectKeys(catalogSource);

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
const indonesianLandingWords =
    /\b(?:kasir|operasional|rapi|barangnya|sisanya|langsung|tercatat|menyatukan|toko|bisa|scanner|tim|terkontrol|ditemukan|keranjang|bayar|diperbarui|penjualan|ringan|butuh|merepotkan|dibuat|ingin|bekerja|memahami|kondisi|usahanya|alur|catatan|dipahami|nyaman|dipakai|ponsel|sering|terjadi|jualannya|tertinggal|berulang|membuat|sulit|dibaca|mudah|tercecer|tersimpan|diperiksa|dihitung|terlambat|menumpuk|menghabiskan|waktu|harus|disatukan|gerakan|utuh|gunakan|atau|atur|kembalian|hasilnya|cuma|pekerjaan|paham|masukkan|lalu|berpindah|layar|otomatis|kulakan|hingga|tingkat|uang|biaya|utang|ditelusuri|tebakan|laba|kritis|sampai|informasi|dibutuhkan|membingungkan|batas|kemarin|menyeluruh|tersedia|berbeda|sedikit|mencatat|melayani|perbarui|mengikuti|hitung|pantau|terhubung|terpisah|siap|periode|pertanyaan|mulai|membeli|apa|setelah|pegang|kendali)\b/iu;

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

for (const [value, files] of coveredValues) {
    landingDynamicValues.set(value, files[0]);
}

for (const [value, location] of landingDynamicValues) {
    if (
        (indonesianLandingWords.test(value) || /\bRp(?=\s?\d)/u.test(value)) &&
        !malayCatalog.has(value) &&
        translateMalayForAudit(value) === value
    ) {
        untranslatedIndonesian.set(value, location);
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

if (
    uncovered.size > 0 ||
    missingEnglish.size > 0 ||
    untranslatedIndonesian.size > 0 ||
    duplicateLandingKeys.length > 0
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
    for (const key of duplicateLandingKeys.sort()) {
        process.stderr.write(
            `Duplicate Malay landing translation ${JSON.stringify(key)}\n`,
        );
    }
    process.stderr.write(
        `\n${uncovered.size} possible UI literal(s), ${missingEnglish.size} English translation(s), ${untranslatedIndonesian.size} Indonesian UI translation(s), and ${duplicateLandingKeys.length} duplicate landing translation(s) require review.\n`,
    );
    process.exit(1);
}

process.stdout.write(
    `${covered} UI literal occurrence(s) are covered by the build transform and have Malay output coverage.\n`,
);
