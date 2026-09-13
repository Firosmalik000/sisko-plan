import { useSyncExternalStore } from 'react';
import { englishCatalog } from '@/lang/en';
import type { AppLocale } from '@/lib/locales';
import { interpolateTranslation } from '@/lib/translation-parameters';
import type { TranslationParameters } from '@/lib/translation-parameters';

const catalogs: Partial<Record<AppLocale, Record<string, string>>> = {
    en: englishCatalog,
};
const catalogLoaders: Record<Exclude<AppLocale, 'en'>, () => Promise<Record<string, string>>> = {
    fil: () => import('@/lang/fil').then(({ filipinoCatalog }) => filipinoCatalog),
    id: () => import('@/lang/id').then(({ indonesianCatalog }) => indonesianCatalog),
    km: () => import('@/lang/km').then(({ khmerCatalog }) => khmerCatalog),
    lo: () => import('@/lang/lo').then(({ laoCatalog }) => laoCatalog),
    ms: () => import('@/lang/ms').then(({ malayCatalog }) => malayCatalog),
    my: () => import('@/lang/my').then(({ burmeseCatalog }) => burmeseCatalog),
    tet: () => import('@/lang/tet').then(({ tetumCatalog }) => tetumCatalog),
    th: () => import('@/lang/th').then(({ thaiCatalog }) => thaiCatalog),
    vi: () => import('@/lang/vi').then(({ vietnameseCatalog }) => vietnameseCatalog),
};
const catalogPromises = new Map<AppLocale, Promise<void>>();

let activeLocale: AppLocale = 'id';
const localeListeners = new Set<() => void>();

function subscribeLocale(listener: () => void): () => void {
    localeListeners.add(listener);

    return () => localeListeners.delete(listener);
}

function getLocaleSnapshot(): AppLocale {
    return activeLocale;
}

export function setActiveLocale(locale: AppLocale): void {
    if (activeLocale === locale) {
        return;
    }

    activeLocale = locale;
    localeListeners.forEach((listener) => listener());
}

export function loadLocaleCatalog(locale: AppLocale): Promise<void> {
    if (catalogs[locale]) {
        return Promise.resolve();
    }

    const pending = catalogPromises.get(locale);

    if (pending) {
        return pending;
    }

    const promise = catalogLoaders[locale as Exclude<AppLocale, 'en'>]()
        .then((catalog) => {
            catalogs[locale] = catalog;
        })
        .catch((error: unknown) => {
            catalogPromises.delete(locale);

            throw error;
        });
    catalogPromises.set(locale, promise);

    return promise;
}

export function translate(text: string, locale?: AppLocale): string;
export function translate(text: string, parameters: TranslationParameters, locale?: AppLocale): string;
export function translate(
    text: string,
    localeOrParameters: AppLocale | TranslationParameters = activeLocale,
    parameterLocale: AppLocale = activeLocale,
): string {
    const locale = typeof localeOrParameters === 'string' ? localeOrParameters : parameterLocale;
    const parameters = typeof localeOrParameters === 'string' ? {} : localeOrParameters;
    const source = text.trim();
    const key = source.replace(/\s+/gu, ' ');
    const translated = catalogs[locale]?.[key] ?? englishCatalog[key] ?? key;

    return text.replace(source, interpolateTranslation(translated, parameters));
}

export function useTranslation() {
    const currentLocale = useSyncExternalStore(subscribeLocale, getLocaleSnapshot, getLocaleSnapshot);

    return {
        locale: currentLocale,
        t: (text: string, parameters: TranslationParameters = {}) => translate(text, parameters, currentLocale),
    };
}
