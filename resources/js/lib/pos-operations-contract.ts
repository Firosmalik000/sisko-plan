export function visibleByCapability<T>(items: readonly T[], capabilities: readonly string[]): T[] {
    return items.filter((item) => {
        if (typeof item !== 'object' || item === null || !('capability' in item)) {
            return true;
        }

        const capability = (item as { capability?: unknown }).capability;

        return typeof capability !== 'string' || capabilities.includes(capability);
    });
}

export function shouldShowWorkspaceSwitcher(businessCount: number, storeCount: number): boolean {
    return businessCount > 1 || storeCount > 1;
}

export function paymentChoicesForChannel<TMethod, TMarketplace>(
    channel: 'in_store' | 'marketplace',
    methods: readonly TMethod[],
    marketplaces: readonly TMarketplace[],
): TMethod[] | TMarketplace[] {
    return channel === 'marketplace' ? [...marketplaces] : [...methods];
}

export function cashierContextLabel(cashier: string, register: string, shift: string): string {
    return [cashier, register, shift].filter(Boolean).join(' · ');
}
