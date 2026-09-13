/* eslint-disable */
const babel = require('@babel/core');
const traverse = require('@babel/traverse').default;
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const translateUiLiterals = require('./translate-ui.cjs');

const root = process.cwd();
const sourceRoot = path.join(root, 'resources', 'js');
const localeModules = [
    ['en', 'englishCatalog'], ['fil', 'filipinoCatalog'], ['id', 'indonesianCatalog'], ['km', 'khmerCatalog'],
    ['lo', 'laoCatalog'], ['ms', 'malayCatalog'], ['my', 'burmeseCatalog'], ['tet', 'tetumCatalog'],
    ['th', 'thaiCatalog'], ['vi', 'vietnameseCatalog'],
];

function loadModule(filename, modules = new Map()) {
    if (!path.extname(filename)) filename = fs.existsSync(`${filename}.ts`) ? `${filename}.ts` : path.join(filename, 'index.ts');
    if (modules.has(filename)) return modules.get(filename).exports;
    const module = { exports: {} };
    modules.set(filename, module);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const localRequire = (specifier) => {
        if (specifier.startsWith('@/')) return loadModule(path.join(sourceRoot, specifier.slice(2)), modules);
        if (specifier.startsWith('.')) return loadModule(path.resolve(path.dirname(filename), specifier), modules);
        return require(specifier);
    };
    new Function('require', 'module', 'exports', compiled)(localRequire, module, module.exports);
    return module.exports;
}

const catalogs = Object.fromEntries(localeModules.map(([locale, exportName]) => [locale, loadModule(path.join(sourceRoot, 'lang', locale))[exportName]]));
const englishKeys = Object.keys(catalogs.en).sort();
const errors = [];
const placeholderPattern = /:\w+|\{\{?[^{}]+\}?\}/gu;

for (const [locale] of localeModules) {
    const keys = Object.keys(catalogs[locale]).sort();
    if (JSON.stringify(keys) !== JSON.stringify(englishKeys)) errors.push(`${locale}: catalog keys differ from English`);
    for (const key of englishKeys) {
        const value = catalogs[locale][key];
        if (typeof value !== 'string' || value.trim() === '') {
            errors.push(`${locale}: empty translation for ${JSON.stringify(key)}`);
            continue;
        }
        const sourcePlaceholders = [...key.matchAll(placeholderPattern)].map((match) => match[0]).sort();
        const targetPlaceholders = [...value.matchAll(placeholderPattern)].map((match) => match[0]).sort();
        if (JSON.stringify(sourcePlaceholders) !== JSON.stringify(targetPlaceholders)) {
            errors.push(`${locale}: placeholder mismatch for ${JSON.stringify(key)}`);
        }
        if (/^(?:categories|units)\./u.test(key) && value === key) errors.push(`${locale}: unresolved reference label ${key}`);
    }
}

function walk(directory) {
    return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const target = path.join(directory, entry.name);
        if (entry.isDirectory()) return target.includes(`${path.sep}lang`) ? [] : walk(target);
        return /\.(?:ts|tsx)$/u.test(entry.name) && !target.endsWith(`${path.sep}lib${path.sep}i18n.ts`) ? [target] : [];
    });
}

function isRenderedValue(nodePath, argument) {
    if (nodePath === argument) return true;
    let current = nodePath;
    while (current.parentPath && current !== argument) {
        const parent = current.parentPath;
        if (parent.isConditionalExpression() && current.key === 'test') return false;
        if (parent.isLogicalExpression() && current.key === 'left') return false;
        if (
            !parent.isConditionalExpression() && !parent.isLogicalExpression() && !parent.isParenthesizedExpression() &&
            !parent.isTSAsExpression() && !parent.isTSNonNullExpression() && parent !== argument
        ) return false;
        current = parent;
    }
    return current === argument;
}

const activeMessages = new Map();
for (const filename of walk(sourceRoot)) {
    const transformed = babel.transformSync(fs.readFileSync(filename, 'utf8'), {
        filename,
        configFile: false,
        babelrc: false,
        parserOpts: { plugins: ['jsx', 'typescript'] },
        plugins: [translateUiLiterals],
    }).code;
    const ast = babel.parseSync(transformed, { filename, configFile: false, babelrc: false, parserOpts: { plugins: ['jsx', 'typescript'] } });
    traverse(ast, {
        StringLiteral(stringPath) {
            const call = stringPath.findParent(
                (candidate) => candidate.isCallExpression() && candidate.get('callee').isIdentifier() && ['__translateUi', 'translate', 't'].includes(candidate.node.callee.name),
            );
            if (!call) return;
            const argument = call.get('arguments.0');
            if (!argument?.node || !isRenderedValue(stringPath, argument)) return;
            const key = stringPath.node.value.trim().replace(/\s+/gu, ' ');
            if (!key || /^(?:[a-z0-9_.:/-]+|#[0-9a-f]{3,8}|\d+(?:\.\d+)?)$/u.test(key)) return;
            const locations = activeMessages.get(key) ?? [];
            locations.push(path.relative(root, filename));
            activeMessages.set(key, locations);
        },
    });
}

for (const [message, locations] of activeMessages) {
    if (!(message in catalogs.en)) errors.push(`Missing catalog message ${JSON.stringify(message)} in ${[...new Set(locations)].join(', ')}`);
}

if (errors.length > 0) {
    console.error(errors.join('\n'));
    console.error(`\n${errors.length} i18n issue(s) require review.`);
    process.exitCode = 1;
} else {
    console.log(`${activeMessages.size} active UI messages and ${englishKeys.length} catalog keys have complete ten-locale coverage.`);
}
