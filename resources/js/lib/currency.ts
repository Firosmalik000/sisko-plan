export type AppLocale = 'id' | 'ms';

export function currentLocale(): AppLocale {
    return typeof document !== 'undefined' &&
        document.documentElement.lang === 'ms'
        ? 'ms'
        : 'id';
}

export function currencyCode(locale = currentLocale()) {
    return locale === 'ms' ? 'MYR' : 'IDR';
}

export function localeTag(locale = currentLocale()) {
    return locale === 'ms' ? 'ms-MY' : 'id-ID';
}

export function currencySymbol(locale = currentLocale()) {
    return locale === 'ms' ? 'RM' : 'Rp';
}

export function formatMoney(value: string | number, locale = currentLocale()) {
    return new Intl.NumberFormat(localeTag(locale), {
        style: 'currency',
        currency: currencyCode(locale),
        maximumFractionDigits: 0,
    }).format(Number(value));
}

export function formatCompactMoney(
    value: string | number,
    locale = currentLocale(),
) {
    return new Intl.NumberFormat(localeTag(locale), {
        style: 'currency',
        currency: currencyCode(locale),
        notation: 'compact',
        maximumFractionDigits: 1,
    }).format(Number(value));
}

export function formatQuantity(
    value: string | number,
    locale = currentLocale(),
) {
    return new Intl.NumberFormat(localeTag(locale), {
        maximumFractionDigits: 6,
    }).format(Number(value));
}
