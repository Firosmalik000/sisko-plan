export function decimalInput(
    value: string | number | null | undefined,
): string {
    if (value === null || value === undefined) {
        return '';
    }

    const decimal = String(value).trim();

    if (!decimal.includes('.')) {
        return decimal;
    }

    const trimmed = decimal.replace(/0+$/, '').replace(/\.$/, '');

    return trimmed === '-0' ? '0' : trimmed;
}
