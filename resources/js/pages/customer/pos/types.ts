export type ProductOption = {
    catalog_product_id: string;
    catalog_product_name: string;
    category_public_id: string | null;
    category_name: string | null;
    photo_url: string | null;
    product_id: string;
    product_name: string;
    variant_name: string | null;
    sku: string | null;
    barcode: string | null;
    unit_id: string;
    unit_name: string;
    unit_symbol: string;
    conversion_factor: string;
    selling_price: string;
    stock_quantity: string;
    minimum_quantity: string;
    is_base_unit: boolean | number;
};

export type CatalogProduct = {
    id: string;
    name: string;
    photo_url: string | null;
    sku: string | null;
    barcode: string | null;
    category_public_id: string | null;
    category_name: string | null;
    options: ProductOption[];
};

export type PaymentMethod = {
    method: 'cash' | 'qris' | 'qr_payment' | 'bank_transfer' | 'e_wallet';
    label: string;
    account_id: string;
    brand: string | null;
};

export type Marketplace = {
    code: string;
    label: string;
};

export type CartItem = ProductOption & {
    quantity: string;
    discount_amount: string;
};

export type SaleForm = {
    account_id: string;
    transaction_discount_amount: string;
    paid_amount: string;
    payment_proof: File | null;
    customer_name: string;
    customer_phone: string;
    customer_email: string;
    sales_channel: 'in_store' | 'marketplace';
    payment_method: PaymentMethod['method'] | 'marketplace';
    marketplace_code: string;
    external_order_number: string;
    occurred_at: string;
    notes: string;
    idempotency_key: string;
    items: CartItem[];
};
