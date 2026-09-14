import { localeTag } from '@/lib/currency';

export function currentDateTime(timezone: string, withSeconds = false): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: timezone,
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: withSeconds ? '2-digit' : undefined,
        hourCycle: 'h23',
    })
        .formatToParts(new Date())
        .reduce<Record<string, string>>((values, part) => {
            values[part.type] = part.value;

            return values;
        }, {});

    return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}${withSeconds ? `:${parts.second}` : ''}`;
}

export function ledgerDateTime(value: string, timezone: string): string {
    return new Intl.DateTimeFormat(localeTag(), {
        timeZone: timezone,
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(new Date(value));
}
