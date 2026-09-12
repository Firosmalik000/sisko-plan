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

export type Product = {
    public_id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    category: { public_id: string; name: string } | null;
    retail_unit_public_id: string;
    large_unit_public_id: string | null;
    variant_mode: VariantMode;
    quantity_mode: 'fixed' | 'variable';
    purchase_price: string;
    selling_price: string;
    current_stock: string;
    minimum_stock: string;
    photo_url: string | null;
    sku: string | null;
    barcode: string | null;
    variants: ProductVariant[];
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
