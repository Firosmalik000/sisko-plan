export const appLocales = ['en', 'id', 'ms', 'vi', 'th', 'fil', 'km', 'lo', 'my', 'tet'] as const;

export type AppLocale = (typeof appLocales)[number];
export type AppLocaleOption = { code: AppLocale; label: string };

export const appLocaleOptions: AppLocaleOption[] = [
    { code: 'en', label: 'English' },
    { code: 'id', label: 'Bahasa Indonesia' },
    { code: 'ms', label: 'Bahasa Melayu' },
    { code: 'vi', label: 'Tiếng Việt' },
    { code: 'th', label: 'ไทย' },
    { code: 'fil', label: 'Filipino' },
    { code: 'km', label: 'ភាសាខ្មែរ' },
    { code: 'lo', label: 'ພາສາລາວ' },
    { code: 'my', label: 'မြန်မာဘာသာ' },
    { code: 'tet', label: 'Tetum' },
];

const appLocaleSet = new Set<string>(appLocales);

export function isAppLocale(locale: unknown): locale is AppLocale {
    return typeof locale === 'string' && appLocaleSet.has(locale);
}

export function normalizeLocale(locale: unknown): AppLocale {
    return isAppLocale(locale) ? locale : 'id';
}
