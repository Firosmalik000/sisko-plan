export type UnitReference = {
    code: string;
    name: string;
    symbol: string;
    roles: Array<'sale' | 'measurement' | 'large'>;
    dimension: string;
    allows_fraction: boolean;
    is_active: boolean;
};

export type CategoryReference = { code: string; name: string; is_active: boolean };

type MappedCategory = { public_id: string; reference_code?: string | null; is_active: boolean };

export function resolveCategory<T extends MappedCategory>(categories: T[], code: string | null): T | undefined {
    if (!code || code === 'other') {
        return undefined;
    }

    const matches = categories.filter((category) => category.is_active && category.reference_code === code);

    return matches.length === 1 ? matches[0] : undefined;
}

/** Custom tenant names never pass through automatic translation. */
export function referenceLabel(
    record: { name: string; reference_code?: string | null; name_is_custom?: boolean },
    kind: 'categories' | 'units',
    translate: (key: string) => string,
): string {
    if (!record.reference_code || record.name_is_custom !== false) {
        return record.name;
    }

    const key = `${kind}.${record.reference_code}`;
    const label = translate(key);

    return label === key ? record.name : label;
}

type MappedUnit = {
    public_id: string;
    reference_code: string | null;
    unit_type: 'retail' | 'large';
    is_active: boolean;
};

/** Only an unambiguous active tenant mapping may be selected automatically. */
export function resolveUnit<T extends MappedUnit>(units: T[], code: string | null, role: MappedUnit['unit_type']): T | undefined {
    if (!code) {
        return undefined;
    }

    const matches = units.filter((unit) => unit.is_active && unit.reference_code === code && unit.unit_type === role);

    return matches.length === 1 ? matches[0] : undefined;
}
