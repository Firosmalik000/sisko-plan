import { normalizeLocale } from './locales.ts';
import type { AppLocale } from './locales.ts';
export type MarketCode = 'BN' | 'KH' | 'ID' | 'LA' | 'MY' | 'MM' | 'PH' | 'SG' | 'TH' | 'TL' | 'VN';

type CurrencyConfiguration = {
    currency_code?: string;
    currency_symbol?: string;
    currency_decimal_places?: number;
    currency_symbol_position?: 'before' | 'after';
} | null;

const marketDefaults: Record<MarketCode, { currency: string; symbol: string; decimals: number; position: 'before' | 'after' }> = {
    BN: { currency: 'BND', symbol: 'B$', decimals: 2, position: 'before' },
    KH: { currency: 'KHR', symbol: '៛', decimals: 0, position: 'after' },
    ID: { currency: 'IDR', symbol: 'Rp', decimals: 0, position: 'before' },
    LA: { currency: 'LAK', symbol: '₭', decimals: 0, position: 'after' },
    MY: { currency: 'MYR', symbol: 'RM', decimals: 2, position: 'before' },
    MM: { currency: 'MMK', symbol: 'K', decimals: 0, position: 'after' },
    PH: { currency: 'PHP', symbol: '₱', decimals: 2, position: 'before' },
    SG: { currency: 'SGD', symbol: 'S$', decimals: 2, position: 'before' },
    TH: { currency: 'THB', symbol: '฿', decimals: 2, position: 'before' },
    TL: { currency: 'USD', symbol: '$', decimals: 2, position: 'before' },
    VN: { currency: 'VND', symbol: '₫', decimals: 0, position: 'after' },
};

export function applyStoreCurrency(activeStore: CurrencyConfiguration, market: MarketCode) {
    if (typeof document === 'undefined') {
        return;
    }

    document.documentElement.dataset.currency = activeStore?.currency_code ?? marketDefaults[market].currency;
    document.documentElement.dataset.currencySymbol = activeStore?.currency_symbol ?? marketDefaults[market].symbol;
    document.documentElement.dataset.currencyDecimals = String(activeStore?.currency_decimal_places ?? marketDefaults[market].decimals);
    document.documentElement.dataset.currencyPosition = activeStore?.currency_symbol_position ?? marketDefaults[market].position;
}

export function currentLocale(): AppLocale {
    const locale = typeof document !== 'undefined' ? document.documentElement.lang : 'id';

    return normalizeLocale(locale);
}

export function currentMarket(): MarketCode {
    const market = typeof document !== 'undefined' ? document.documentElement.dataset.market : undefined;

    return market && market in marketDefaults ? (market as MarketCode) : 'ID';
}

export function currencyCode(market = currentMarket()) {
    const configured = typeof document !== 'undefined' ? document.documentElement.dataset.currency : undefined;

    return configured || marketDefaults[market].currency;
}

export function localeTag(locale = currentLocale(), market = currentMarket()) {
    return `${locale}-${market}`;
}

export function currencySymbol(market = currentMarket()) {
    const configured = typeof document !== 'undefined' ? document.documentElement.dataset.currencySymbol : undefined;

    return configured || marketDefaults[market].symbol;
}

const highDenominationCurrencies = new Set(['IDR', 'VND']);
const mediumDenominationCurrencies = new Set(['JPY', 'KRW']);

export function cashTenderSuggestions(total: number, limit = 3, code = currencyCode(), decimalPlaces = currencyDecimalPlaces()): number[] {
    if (!Number.isFinite(total) || total <= 0 || limit <= 0) {
        return [];
    }

    const normalizedCode = code.toUpperCase();
    const steps = highDenominationCurrencies.has(normalizedCode)
        ? [1_000, 5_000, 10_000, 20_000, 50_000, 100_000]
        : mediumDenominationCurrencies.has(normalizedCode)
          ? [100, 500, 1_000, 5_000, 10_000]
          : [1, 5, 10, 20, 50, 100];
    const precision = 10 ** Math.max(0, decimalPlaces);
    const exact = Math.ceil(total * precision) / precision;

    return Array.from(new Set([exact, ...steps.map((step) => Math.ceil(total / step) * step)]))
        .filter((amount) => amount >= total)
        .slice(0, limit);
}

export function currencyDecimalPlaces(): number {
    const configured = typeof document !== 'undefined' ? Number(document.documentElement.dataset.currencyDecimals) : 0;

    return Number.isInteger(configured) && configured >= 0 ? configured : 0;
}

export function currencySymbolPosition(): 'before' | 'after' {
    return typeof document !== 'undefined' && document.documentElement.dataset.currencyPosition === 'after' ? 'after' : 'before';
}

export function formatCurrencyNumber(value: string | number, locale = currentLocale(), market = currentMarket()) {
    const numeric = Number(value);

    if (!Number.isFinite(numeric)) {
        return String(value);
    }

    return new Intl.NumberFormat(localeTag(locale, market), {
        minimumFractionDigits: currencyDecimalPlaces(),
        maximumFractionDigits: currencyDecimalPlaces(),
    }).format(numeric);
}

export function formatCurrencyInput(value: string, locale = currentLocale(), market = currentMarket()): string {
    if (value === '') {
        return '';
    }

    const decimals = currencyDecimalPlaces();

    if (decimals === 0) {
        const numeric = Number(value);

        return Number.isFinite(numeric)
            ? new Intl.NumberFormat(localeTag(locale, market), { maximumFractionDigits: 0 }).format(numeric)
            : value;
    }

    const [whole = '0', fraction] = value.split('.');
    const integer = Number(whole || '0');
    const formattedWhole = Number.isFinite(integer)
        ? new Intl.NumberFormat(localeTag(locale, market), { maximumFractionDigits: 0 }).format(integer)
        : whole;

    if (fraction === undefined) {
        return formattedWhole;
    }

    const decimal =
        new Intl.NumberFormat(localeTag(locale, market)).formatToParts(1.1).find((part) => part.type === 'decimal')?.value ?? '.';

    return `${formattedWhole}${decimal}${fraction.slice(0, decimals)}`;
}

export function parseCurrencyInput(value: string, locale = currentLocale(), market = currentMarket()): string {
    const parts = new Intl.NumberFormat(localeTag(locale, market)).formatToParts(12345.6);
    const group = parts.find((part) => part.type === 'group')?.value ?? ',';
    const decimal = parts.find((part) => part.type === 'decimal')?.value ?? '.';
    const decimals = currencyDecimalPlaces();
    let normalized = value.trim().replaceAll(group, '');

    if (decimal !== '.') {
        normalized = normalized.replaceAll(decimal, '.');
    }

    normalized = normalized.replace(/[^0-9.-]/g, '').replace(/(?!^)-/g, '');

    if (decimals === 0) {
        return normalized.replaceAll('.', '');
    }

    const [whole = '', ...fractionParts] = normalized.split('.');
    const fraction = fractionParts.join('').slice(0, decimals);

    return fractionParts.length > 0 ? `${whole || '0'}.${fraction}` : whole;
}

function withCurrencySymbol(value: string, market: MarketCode): string {
    const symbol = currencySymbol(market);
    const position = currencySymbolPosition();

    return position === 'after' ? `${value} ${symbol}` : `${symbol}${value}`;
}

export function formatMoney(value: string | number, locale = currentLocale(), market = currentMarket()) {
    const formatted = formatCurrencyNumber(value, locale, market);

    return withCurrencySymbol(formatted, market);
}

export function formatCompactMoney(value: string | number, locale = currentLocale(), market = currentMarket()) {
    const formatted = new Intl.NumberFormat(localeTag(locale, market), {
        notation: 'compact',
        maximumFractionDigits: Math.max(1, currencyDecimalPlaces()),
    }).format(Number(value));

    return withCurrencySymbol(formatted, market);
}

export function formatQuantity(value: string | number, locale = currentLocale(), market = currentMarket()) {
    return new Intl.NumberFormat(localeTag(locale, market), {
        maximumFractionDigits: 2,
    }).format(Number(value));
}
