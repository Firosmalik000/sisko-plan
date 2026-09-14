export type TranslationParameters = Record<string, string | number>;

export function interpolateTranslation(message: string, parameters: TranslationParameters): string {
    return message.replace(/:([A-Za-z_][A-Za-z0-9_]*)/gu, (placeholder, key: string) =>
        Object.hasOwn(parameters, key) ? String(parameters[key]) : placeholder,
    );
}
