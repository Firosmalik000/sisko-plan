export type AppLocale = 'en' | 'id' | 'ms';
export type MarketCode = 'id' | 'ms';

export function currentLocale(): AppLocale {
    const locale =
        typeof document !== 'undefined' ? document.documentElement.lang : 'id';

    return locale === 'en' || locale === 'ms' ? locale : 'id';
}

export function currentMarket(): MarketCode {
    return typeof document !== 'undefined' &&
        document.documentElement.dataset.market === 'ms'
        ? 'ms'
        : 'id';
}

export function currencyCode(market = currentMarket()) {
    return market === 'ms' ? 'MYR' : 'IDR';
}

export function localeTag(locale = currentLocale(), market = currentMarket()) {
    if (locale === 'en') {
        return market === 'ms' ? 'en-MY' : 'en-ID';
    }

    return locale === 'ms' ? 'ms-MY' : 'id-ID';
}

export function currencySymbol(market = currentMarket()) {
    return market === 'ms' ? 'RM' : 'Rp';
}

export function formatMoney(
    value: string | number,
    locale = currentLocale(),
    market = currentMarket(),
) {
    return new Intl.NumberFormat(localeTag(locale, market), {
        style: 'currency',
        currency: currencyCode(market),
        maximumFractionDigits: 0,
    }).format(Number(value));
}

export function formatCompactMoney(
    value: string | number,
    locale = currentLocale(),
    market = currentMarket(),
) {
    return new Intl.NumberFormat(localeTag(locale, market), {
        style: 'currency',
        currency: currencyCode(market),
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(Number(value));
}

export function formatQuantity(
    value: string | number,
    locale = currentLocale(),
    market = currentMarket(),
) {
    return new Intl.NumberFormat(localeTag(locale, market), {
        maximumFractionDigits: 6,
    }).format(Number(value));
}
