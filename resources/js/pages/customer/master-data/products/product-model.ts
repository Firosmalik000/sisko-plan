export type ProductOption = {
    public_id: string;
    name: string;
    symbol?: string;
    is_active: boolean;
    reference_code?: string | null;
    name_is_custom?: boolean;
};

export type UnitOption = ProductOption & {
    symbol: string;
    unit_type: 'large' | 'retail';
    reference_code: string | null;
};

export type VariantMode = 'none' | 'separate' | 'shared';
export type TrackingMode = 'standard' | 'serial';
export type AgentPosition = 'prefix' | 'suffix' | 'none';

export type ProductVariant = {
    client_id?: string;
    public_id?: string;
    name: string;
    purchase_price: string;
    selling_price: string;
    current_stock: string;
    minimum_stock: string;
    conversion_factor: string;
    sku: string;
    barcode: string;
    photo: File | null;
    photo_url?: string | null;
    remove_photo: boolean;
};

export type ProductSerialNumberItem = {
    public_id: string;
    serial_number: string;
    full_serial_number: string | null;
    agent_number: string | null;
    agent_name: string | null;
    agent_position: AgentPosition;
    status: 'available' | 'sold';
    sold_at: string | null;
};

export type Product = {
    public_id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    category: {
        public_id: string;
        name: string;
        reference_code?: string | null;
        name_is_custom?: boolean;
    } | null;
    retail_unit_public_id: string;
    large_unit_public_id: string | null;
    variant_mode: VariantMode;
    quantity_mode: 'fixed' | 'variable';
    tracking_mode: TrackingMode;
    serial_agent_number?: string | null;
    serial_agent_name?: string | null;
    serial_agent_position?: AgentPosition;
    serial_numbers?: ProductSerialNumberItem[];
    purchase_price: string;
    selling_price: string;
    current_stock: string;
    minimum_stock: string;
    photo_url: string | null;
    sku: string | null;
    barcode: string | null;
    variants: ProductVariant[];
};

export type StoreAgent = {
    agent_number: string;
    agent_name: string | null;
};

export type ProductForm = {
    _method: '' | 'patch';
    idempotency_key: string;
    name: string;
    description: string;
    sku: string;
    barcode: string;
    category_public_id: string;
    retail_unit_public_id: string;
    large_unit_public_id: string;
    variant_mode: VariantMode;
    quantity_mode: 'fixed' | 'variable';
    tracking_mode: TrackingMode;
    serial_agent_number: string;
    serial_agent_name: string;
    serial_agent_position: 'prefix' | 'suffix' | 'none';
    serial_range_start: string;
    serial_range_end: string;
    purchase_price: string;
    selling_price: string;
    current_stock: string;
    minimum_stock: string;
    variants: ProductVariant[];
    photo: File | null;
    remove_photo: boolean;
    is_active: boolean;
};

export type SubscriptionState = {
    can_write: boolean;
    max_products: number;
    products_used: number;
};

function createIdempotencyKey() {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    const bytes = new Uint8Array(16);
    globalThis.crypto?.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));

    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
}

export function generateProductSku(name: string): string {
    const prefix = name
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/gu, '')
        .toUpperCase()
        .replace(/[^A-Z0-9]+/gu, '-')
        .replace(/^-|-$/gu, '')
        .slice(0, 20);
    const suffix = createIdempotencyKey().replaceAll('-', '').slice(-6).toUpperCase();

    return `${prefix || 'PRD'}-${suffix}`;
}

export function generateInternalBarcode(): string {
    const source = createIdempotencyKey().replaceAll('-', '');
    const digits = Array.from(source.slice(-12), (character) => String(Number.parseInt(character, 16) % 10));
    const sum = digits.reduce((total, digit, index) => total + Number(digit) * (index % 2 === 0 ? 1 : 3), 0);

    return `${digits.join('')}${(10 - (sum % 10)) % 10}`;
}

export function createBlankVariant(): ProductVariant {
    return {
        client_id: createIdempotencyKey(),
        name: '',
        purchase_price: '',
        selling_price: '',
        current_stock: '',
        minimum_stock: '',
        conversion_factor: '',
        sku: '',
        barcode: '',
        photo: null,
        photo_url: null,
        remove_photo: false,
    };
}

export function calculateSerialRange(start: string, end: string): { valid: boolean; count: number; items: string[]; error?: string } {
    const trimmedStart = start.trim();
    const trimmedEnd = end.trim();

    if (!trimmedStart) {
        return { valid: false, count: 0, items: [] };
    }

    // Single item when end is empty
    if (!trimmedEnd) {
        return { valid: true, count: 1, items: [trimmedStart] };
    }

    const startMatch = trimmedStart.match(/^(.*?)(\d+)$/);
    const endMatch = trimmedEnd.match(/^(.*?)(\d+)$/);

    if (!startMatch || !endMatch) {
        return { valid: false, count: 0, items: [], error: 'Format must end with numeric digits (e.g. 001)' };
    }

    if (startMatch[1] !== endMatch[1]) {
        return { valid: false, count: 0, items: [], error: 'Prefix must match' };
    }

    const prefix = startMatch[1];
    const numStart = parseInt(startMatch[2], 10);
    const numEnd = parseInt(endMatch[2], 10);
    const padding = Math.max(startMatch[2].length, endMatch[2].length);

    if (numStart > numEnd) {
        return { valid: false, count: 0, items: [], error: 'Start number must be less than or equal to end number' };
    }

    const count = numEnd - numStart + 1;

    if (count > 1000) {
        return { valid: false, count, items: [], error: 'Maximum batch range is 1,000 items' };
    }

    const items: string[] = [];

    for (let i = numStart; i <= Math.min(numEnd, numStart + 9); i++) {
        items.push(prefix + String(i).padStart(padding, '0'));
    }

    return { valid: true, count, items };
}

export function createBlankProductForm(): ProductForm {
    return {
        _method: '',
        idempotency_key: createIdempotencyKey(),
        name: '',
        description: '',
        sku: '',
        barcode: '',
        category_public_id: '',
        retail_unit_public_id: '',
        large_unit_public_id: '',
        variant_mode: 'none',
        quantity_mode: 'variable',
        tracking_mode: 'standard',
        serial_agent_number: '',
        serial_agent_name: '',
        serial_agent_position: 'prefix',
        serial_range_start: '',
        serial_range_end: '',
        purchase_price: '',
        selling_price: '',
        current_stock: '',
        minimum_stock: '',
        variants: [],
        photo: null,
        remove_photo: false,
        is_active: true,
    };
}

export function formatProductDecimal(value: string | number | null | undefined) {
    if (value === null || value === undefined || value === '') {
        return '';
    }

    const numeric = Number(value);

    return Number.isFinite(numeric) ? numeric.toFixed(2) : String(value);
}

export function mapProductToForm(product: Product): ProductForm {
    return {
        _method: 'patch',
        idempotency_key: '',
        name: product.name,
        description: product.description ?? '',
        sku: product.sku ?? '',
        barcode: product.barcode ?? '',
        category_public_id: product.category?.public_id ?? '',
        retail_unit_public_id: product.retail_unit_public_id,
        large_unit_public_id: product.large_unit_public_id ?? '',
        variant_mode: product.variant_mode,
        quantity_mode: product.quantity_mode,
        tracking_mode: product.tracking_mode ?? 'standard',
        serial_agent_number: product.serial_agent_number ?? '',
        serial_agent_name: product.serial_agent_name ?? '',
        serial_agent_position: product.serial_agent_position ?? 'prefix',
        serial_range_start: '',
        serial_range_end: '',
        purchase_price: formatProductDecimal(product.purchase_price),
        selling_price: formatProductDecimal(product.selling_price),
        current_stock: formatProductDecimal(product.current_stock),
        minimum_stock: formatProductDecimal(product.minimum_stock),
        variants: product.variants.map((variant) => ({
            ...variant,
            client_id: variant.public_id ?? createIdempotencyKey(),
            sku: variant.sku ?? '',
            barcode: variant.barcode ?? '',
            purchase_price: formatProductDecimal(variant.purchase_price),
            selling_price: formatProductDecimal(variant.selling_price),
            current_stock: formatProductDecimal(variant.current_stock),
            minimum_stock: formatProductDecimal(variant.minimum_stock),
            conversion_factor: formatProductDecimal(variant.conversion_factor),
            photo: null,
            remove_photo: false,
        })),
        photo: null,
        remove_photo: false,
        is_active: product.is_active,
    };
}
