import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import test from 'node:test';

const require = createRequire(import.meta.url);
const fs = require('node:fs');
const path = require('node:path');
const babel = require('@babel/core');
const ts = require('typescript');
const translateUiLiterals = require('../../build/translate-ui.cjs');

function loadTypeScriptModule(relativePath) {
    const filename = path.resolve(import.meta.dirname, relativePath);
    const compiled = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
        compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText;
    const module = { exports: {} };
    new Function('module', 'exports', compiled)(module, module.exports);

    return module.exports;
}

test('explicit translation calls are not translated a second time by the build transform', () => {
    const output = babel.transformSync("const label = translate('Riwayat transaksi');", {
        configFile: false,
        babelrc: false,
        plugins: [translateUiLiterals],
    })?.code;

    assert.match(output, /translate\(["']Riwayat transaksi["']\)/u);
    assert.doesNotMatch(output, /translate\(__translateUi/u);
});

test('technical options are never treated as interface copy', () => {
    const output = babel.transformSync(
        "const ToggleGroupContext = createContext({ size: 'default' }); function dateLabel() { return new Intl.DateTimeFormat('en', { day: 'numeric', month: 'short', timeZone: 'UTC' }); }",
        {
            configFile: false,
            babelrc: false,
            plugins: [translateUiLiterals],
        },
    )?.code;

    assert.doesNotMatch(output, /__translateUi/u);
    assert.match(output, /size:\s*["']default["']/u);
    assert.match(output, /day:\s*["']numeric["']/u);
});

test('native language names remain data instead of being translated', () => {
    const output = babel.transformSync("export const appLocaleOptions = [{ code: 'id', label: 'Bahasa Indonesia' }];", {
        filename: '/app/resources/js/lib/locales.ts',
        configFile: false,
        babelrc: false,
        plugins: [translateUiLiterals],
    })?.code;

    assert.doesNotMatch(output, /__translateUi/u);
    assert.match(output, /Bahasa Indonesia/u);
});

test('translation parameters preserve translated sentence order and repeated placeholders', () => {
    const { interpolateTranslation } = loadTypeScriptModule('../../resources/js/lib/translation-parameters.ts');

    assert.equal(
        interpolateTranslation(':count photos captured for :store. :count ready.', { count: 2, store: 'Toko Demo' }),
        '2 photos captured for Toko Demo. 2 ready.',
    );
    assert.equal(interpolateTranslation('Hello :name', {}), 'Hello :name');
});
