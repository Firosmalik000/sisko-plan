import { Head, Link, router, useForm } from '@inertiajs/react';
import {
    Barcode,
    Boxes,
    Edit3,
    PackagePlus,
    Plus,
    Search,
    Trash2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import AlertError from '@/components/alert-error';
import InputError from '@/components/input-error';
import { MasterDataNav } from '@/components/master-data-nav';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type Option = {
    public_id: string;
    name: string;
    symbol?: string;
    is_active: boolean;
};
type ProductUnit = {
    unit_public_id: string;
    name?: string;
    symbol?: string;
    conversion_factor: string;
    purchase_price: string;
    selling_price: string;
};
type Product = {
    public_id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    description: string | null;
    is_active: boolean;
    category: { public_id: string; name: string } | null;
    base_unit_public_id: string;
    units: ProductUnit[];
};
type ProductForm = {
    idempotency_key: string;
    name: string;
    sku: string;
    barcode: string;
    description: string;
    category_public_id: string;
    base_unit_public_id: string;
    is_active: boolean;
    units: ProductUnit[];
};

const createIdempotencyKey = () => {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    const bytes = new Uint8Array(16);

    if (globalThis.crypto?.getRandomValues) {
        globalThis.crypto.getRandomValues(bytes);
    } else {
        for (let index = 0; index < bytes.length; index += 1) {
            bytes[index] = Math.floor(Math.random() * 256);
        }
    }

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));

    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
};

const newProductForm = (): ProductForm => ({
    idempotency_key: createIdempotencyKey(),
    name: '',
    sku: '',
    barcode: '',
    description: '',
    category_public_id: '',
    base_unit_public_id: '',
    is_active: true,
    units: [],
});
const money = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});

export default function ProductsIndex({
    products,
    categories,
    units,
    search: initialSearch,
    status: initialStatus,
    canManage,
}: {
    products: { data: Product[]; links: PaginationLink[]; total: number };
    categories: Option[];
    units: Option[];
    search: string;
    status: string;
    canManage: boolean;
}) {
    const [editing, setEditing] = useState<Product | null>(null);
    const [search, setSearch] = useState(initialSearch);
    const [status, setStatus] = useState(initialStatus);
    const form = useForm<ProductForm>(newProductForm());
    const errorFor = (key: string) =>
        (form.errors as Record<string, string | undefined>)[key];

    const reset = () => {
        setEditing(null);
        form.setData(newProductForm());
        form.clearErrors();
    };
    const edit = (product: Product) => {
        setEditing(product);
        form.setData({
            idempotency_key: '',
            name: product.name,
            sku: product.sku ?? '',
            barcode: product.barcode ?? '',
            description: product.description ?? '',
            category_public_id: product.category?.public_id ?? '',
            base_unit_public_id: product.base_unit_public_id,
            is_active: product.is_active,
            units: product.units.map((unit) => ({ ...unit })),
        });
        form.clearErrors();
    };
    const chooseBaseUnit = (publicId: string) => {
        const existing = form.data.units.some(
            (unit) => unit.unit_public_id === publicId,
        );
        const nextUnits =
            existing || publicId === ''
                ? form.data.units
                : [
                      ...form.data.units,
                      {
                          unit_public_id: publicId,
                          conversion_factor: '1',
                          purchase_price: '0',
                          selling_price: '0',
                      },
                  ];
        form.setData({
            ...form.data,
            base_unit_public_id: publicId,
            units: nextUnits.map((unit) =>
                unit.unit_public_id === publicId
                    ? { ...unit, conversion_factor: '1' }
                    : unit,
            ),
        });
    };
    const addUnit = () => {
        const available = units.find(
            (unit) =>
                unit.is_active &&
                !form.data.units.some(
                    (row) => row.unit_public_id === unit.public_id,
                ),
        );

        if (!available) {
            return;
        }

        form.setData('units', [
            ...form.data.units,
            {
                unit_public_id: available.public_id,
                conversion_factor: '1',
                purchase_price: '0',
                selling_price: '0',
            },
        ]);
    };
    const updateUnit = (
        index: number,
        key: keyof ProductUnit,
        value: string,
    ) => {
        form.setData(
            'units',
            form.data.units.map((unit, current) =>
                current === index ? { ...unit, [key]: value } : unit,
            ),
        );
    };
    const removeUnit = (index: number) => {
        const target = form.data.units[index];

        if (target?.unit_public_id === form.data.base_unit_public_id) {
            return;
        }

        form.setData(
            'units',
            form.data.units.filter((_, current) => current !== index),
        );
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = { preserveScroll: true, onSuccess: reset };

        if (editing) {
            form.patch(`/master-data/products/${editing.public_id}`, options);
        } else {
            form.post('/master-data/products', options);
        }
    };
    const applyFilters = () =>
        router.get(
            '/master-data/products',
            { search, status },
            { preserveState: true, replace: true },
        );
    const productUsesUnit = (publicId: string) =>
        editing?.units.some((unit) => unit.unit_public_id === publicId) ??
        false;

    return (
        <>
            <Head title="Produk" />
            <div className="min-h-full bg-[radial-gradient(circle_at_10%_0%,rgba(245,158,11,0.13),transparent_26%),linear-gradient(180deg,#fafaf7_0%,#f1eee5_100%)] p-4 md:p-8">
                <div className="mx-auto flex max-w-[1500px] flex-col gap-7">
                    <header className="flex flex-col gap-5">
                        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
                            <div>
                                <p className="text-xs font-bold tracking-[0.22em] text-emerald-700 uppercase">
                                    Katalog / Barang dagang
                                </p>
                                <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
                                    Produk & harga satuan
                                </h1>
                                <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                                    Satu produk dapat dijual dalam beberapa
                                    ukuran. Harga dan konversi disiapkan
                                    sekarang, stok mulai dicatat pada Phase 3.
                                </p>
                            </div>
                            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                                <strong>{products.total}</strong> produk
                                tersimpan
                            </div>
                        </div>
                        <MasterDataNav />
                    </header>

                    <div
                        className={
                            canManage
                                ? 'grid gap-6 2xl:grid-cols-[minmax(0,1fr)_480px]'
                                : 'grid gap-6'
                        }
                    >
                        <section className="space-y-4">
                            <div className="flex flex-col gap-3 rounded-2xl border border-stone-200 bg-white/80 p-3 md:flex-row">
                                <div className="relative flex-1">
                                    <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-stone-400" />
                                    <Input
                                        value={search}
                                        onChange={(event) =>
                                            setSearch(event.target.value)
                                        }
                                        onKeyDown={(event) =>
                                            event.key === 'Enter' &&
                                            applyFilters()
                                        }
                                        className="pl-9"
                                        placeholder="Cari nama, SKU, atau barcode..."
                                    />
                                </div>
                                <select
                                    value={status}
                                    onChange={(event) =>
                                        setStatus(event.target.value)
                                    }
                                    className="h-9 rounded-md border border-input bg-white px-3 text-sm"
                                >
                                    <option value="">Semua status</option>
                                    <option value="active">Aktif</option>
                                    <option value="inactive">Nonaktif</option>
                                </select>
                                <Button
                                    variant="outline"
                                    onClick={applyFilters}
                                >
                                    Terapkan
                                </Button>
                            </div>

                            {products.data.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-stone-300 bg-white/60 px-6 py-20 text-center">
                                    <PackagePlus className="mx-auto size-11 text-emerald-700" />
                                    <h2 className="mt-4 text-xl font-semibold">
                                        Belum ada produk
                                    </h2>
                                    <p className="mt-2 text-sm text-stone-500">
                                        Siapkan satuan terlebih dahulu, lalu isi
                                        editor produk.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-4 lg:grid-cols-2">
                                    {products.data.map((product) => {
                                        const base = product.units.find(
                                            (unit) =>
                                                unit.unit_public_id ===
                                                product.base_unit_public_id,
                                        );

                                        return (
                                            <article
                                                key={product.public_id}
                                                className="rounded-3xl border border-stone-200 bg-white/90 p-5 shadow-sm transition hover:shadow-md"
                                            >
                                                <div className="flex items-start justify-between gap-4">
                                                    <div className="flex min-w-0 gap-3">
                                                        <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                                                            <Boxes />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <h2 className="truncate font-semibold text-stone-900">
                                                                {product.name}
                                                            </h2>
                                                            <p className="mt-1 text-xs text-stone-500">
                                                                {product
                                                                    .category
                                                                    ?.name ??
                                                                    'Tanpa kategori'}{' '}
                                                                ·{' '}
                                                                {product.sku ||
                                                                    'Tanpa SKU'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    {canManage && (
                                                        <Button
                                                            size="icon"
                                                            variant="ghost"
                                                            onClick={() =>
                                                                edit(product)
                                                            }
                                                        >
                                                            <Edit3 className="size-4" />
                                                        </Button>
                                                    )}
                                                </div>
                                                <div className="mt-5 grid grid-cols-2 gap-3 rounded-2xl bg-stone-50 p-4">
                                                    <div>
                                                        <p className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
                                                            Harga jual dasar
                                                        </p>
                                                        <p className="mt-1 font-semibold text-emerald-800">
                                                            {money.format(
                                                                Number(
                                                                    base?.selling_price ??
                                                                        0,
                                                                ),
                                                            )}
                                                        </p>
                                                    </div>
                                                    <div>
                                                        <p className="text-[11px] font-semibold tracking-wider text-stone-400 uppercase">
                                                            Kemasan
                                                        </p>
                                                        <p className="mt-1 font-medium">
                                                            {
                                                                product.units
                                                                    .length
                                                            }{' '}
                                                            satuan
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="mt-4 flex items-center justify-between">
                                                    <Badge
                                                        variant={
                                                            product.is_active
                                                                ? 'secondary'
                                                                : 'outline'
                                                        }
                                                    >
                                                        {product.is_active
                                                            ? 'Aktif dijual'
                                                            : 'Nonaktif'}
                                                    </Badge>
                                                    {product.barcode && (
                                                        <span className="flex items-center gap-1 text-xs text-stone-500">
                                                            <Barcode className="size-3" />{' '}
                                                            {product.barcode}
                                                        </span>
                                                    )}
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                            <Pagination links={products.links} />
                        </section>

                        {canManage && (
                            <aside className="2xl:sticky 2xl:top-5 2xl:self-start">
                                {units.length === 0 ? (
                                    <div className="rounded-3xl bg-[#173f3a] p-7 text-white">
                                        <Boxes className="size-10 text-amber-300" />
                                        <h2 className="mt-5 text-xl font-semibold">
                                            Buat satuan dahulu
                                        </h2>
                                        <p className="mt-2 text-sm leading-6 text-emerald-100">
                                            Produk membutuhkan minimal satu
                                            satuan dasar seperti pcs, kg, atau
                                            liter.
                                        </p>
                                        <Button
                                            asChild
                                            className="mt-6 bg-amber-300 text-emerald-950 hover:bg-amber-200"
                                        >
                                            <Link href="/master-data/units">
                                                Buka master satuan
                                            </Link>
                                        </Button>
                                    </div>
                                ) : (
                                    <form
                                        onSubmit={submit}
                                        className="rounded-3xl border border-stone-200 bg-[#173f3a] p-6 text-white shadow-xl"
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <p className="text-xs font-semibold tracking-widest text-emerald-200 uppercase">
                                                    {editing
                                                        ? 'Editor produk'
                                                        : 'Produk baru'}
                                                </p>
                                                <h2 className="mt-1 text-xl font-semibold">
                                                    {editing?.name ??
                                                        'Isi informasi barang'}
                                                </h2>
                                            </div>
                                            {editing && (
                                                <Button
                                                    type="button"
                                                    size="icon"
                                                    variant="ghost"
                                                    className="text-white hover:bg-white/10 hover:text-white"
                                                    onClick={reset}
                                                >
                                                    <X />
                                                </Button>
                                            )}
                                        </div>
                                        {Object.keys(form.errors).length >
                                            0 && (
                                            <div className="mt-5">
                                                <AlertError
                                                    title="Produk belum dapat disimpan"
                                                    errors={Object.values(
                                                        form.errors,
                                                    )}
                                                />
                                            </div>
                                        )}
                                        <div className="mt-6 grid gap-4 sm:grid-cols-2">
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label htmlFor="name">
                                                    Nama produk
                                                </Label>
                                                <Input
                                                    id="name"
                                                    value={form.data.name}
                                                    onChange={(event) =>
                                                        form.setData(
                                                            'name',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="border-white/20 bg-white/10 text-white"
                                                />
                                                <InputError
                                                    message={form.errors.name}
                                                    className="text-amber-200"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="sku">SKU</Label>
                                                <Input
                                                    id="sku"
                                                    value={form.data.sku}
                                                    onChange={(event) =>
                                                        form.setData(
                                                            'sku',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="border-white/20 bg-white/10 text-white"
                                                />
                                                <InputError
                                                    message={form.errors.sku}
                                                    className="text-amber-200"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="barcode">
                                                    Barcode
                                                </Label>
                                                <Input
                                                    id="barcode"
                                                    value={form.data.barcode}
                                                    onChange={(event) =>
                                                        form.setData(
                                                            'barcode',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="border-white/20 bg-white/10 text-white"
                                                />
                                                <InputError
                                                    message={
                                                        form.errors.barcode
                                                    }
                                                    className="text-amber-200"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="category">
                                                    Kategori
                                                </Label>
                                                <select
                                                    id="category"
                                                    value={
                                                        form.data
                                                            .category_public_id
                                                    }
                                                    onChange={(event) =>
                                                        form.setData(
                                                            'category_public_id',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="h-10 w-full rounded-md border border-white/20 bg-[#173f3a] px-3 text-sm"
                                                >
                                                    <option value="">
                                                        Tanpa kategori
                                                    </option>
                                                    {categories.map(
                                                        (category) => (
                                                            <option
                                                                key={
                                                                    category.public_id
                                                                }
                                                                value={
                                                                    category.public_id
                                                                }
                                                                disabled={
                                                                    !category.is_active &&
                                                                    editing
                                                                        ?.category
                                                                        ?.public_id !==
                                                                        category.public_id
                                                                }
                                                            >
                                                                {category.name}
                                                                {!category.is_active &&
                                                                    ' (nonaktif)'}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                                <InputError
                                                    message={
                                                        form.errors
                                                            .category_public_id
                                                    }
                                                    className="text-amber-200"
                                                />
                                            </div>
                                            <div className="space-y-2">
                                                <Label htmlFor="base-unit">
                                                    Satuan dasar
                                                </Label>
                                                <select
                                                    id="base-unit"
                                                    value={
                                                        form.data
                                                            .base_unit_public_id
                                                    }
                                                    onChange={(event) =>
                                                        chooseBaseUnit(
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="h-10 w-full rounded-md border border-white/20 bg-[#173f3a] px-3 text-sm"
                                                >
                                                    <option value="">
                                                        Pilih satuan
                                                    </option>
                                                    {units.map((unit) => (
                                                        <option
                                                            key={unit.public_id}
                                                            value={
                                                                unit.public_id
                                                            }
                                                            disabled={
                                                                !unit.is_active &&
                                                                !productUsesUnit(
                                                                    unit.public_id,
                                                                )
                                                            }
                                                        >
                                                            {unit.name} (
                                                            {unit.symbol})
                                                            {!unit.is_active &&
                                                                ' - nonaktif'}
                                                        </option>
                                                    ))}
                                                </select>
                                                <InputError
                                                    message={
                                                        form.errors
                                                            .base_unit_public_id
                                                    }
                                                    className="text-amber-200"
                                                />
                                            </div>
                                            <div className="space-y-2 sm:col-span-2">
                                                <Label htmlFor="description">
                                                    Keterangan
                                                </Label>
                                                <textarea
                                                    id="description"
                                                    value={
                                                        form.data.description
                                                    }
                                                    onChange={(event) =>
                                                        form.setData(
                                                            'description',
                                                            event.target.value,
                                                        )
                                                    }
                                                    className="min-h-20 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm"
                                                />
                                                <InputError
                                                    message={
                                                        form.errors.description
                                                    }
                                                    className="text-amber-200"
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-6 border-t border-white/15 pt-5">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h3 className="font-semibold">
                                                        Satuan & harga
                                                    </h3>
                                                    <p className="text-xs text-emerald-100">
                                                        Harga berlaku per satuan
                                                        yang dipilih.
                                                    </p>
                                                </div>
                                                <Button
                                                    type="button"
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={addUnit}
                                                    disabled={
                                                        !units.some(
                                                            (unit) =>
                                                                unit.is_active &&
                                                                !form.data.units.some(
                                                                    (row) =>
                                                                        row.unit_public_id ===
                                                                        unit.public_id,
                                                                ),
                                                        )
                                                    }
                                                    className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
                                                >
                                                    <Plus /> Satuan
                                                </Button>
                                            </div>
                                            <div className="mt-4 max-h-[350px] space-y-3 overflow-y-auto pr-1">
                                                {form.data.units.map(
                                                    (row, index) => {
                                                        const isBase =
                                                            row.unit_public_id ===
                                                            form.data
                                                                .base_unit_public_id;

                                                        return (
                                                            <div
                                                                key={`${row.unit_public_id}-${index}`}
                                                                className="rounded-2xl bg-white/10 p-3"
                                                            >
                                                                <div className="flex gap-2">
                                                                    <select
                                                                        value={
                                                                            row.unit_public_id
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            updateUnit(
                                                                                index,
                                                                                'unit_public_id',
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        className="h-9 min-w-0 flex-1 rounded-md border border-white/20 bg-[#173f3a] px-2 text-sm"
                                                                    >
                                                                        {units.map(
                                                                            (
                                                                                unit,
                                                                            ) => (
                                                                                <option
                                                                                    key={
                                                                                        unit.public_id
                                                                                    }
                                                                                    value={
                                                                                        unit.public_id
                                                                                    }
                                                                                    disabled={
                                                                                        !unit.is_active &&
                                                                                        !productUsesUnit(
                                                                                            unit.public_id,
                                                                                        )
                                                                                    }
                                                                                >
                                                                                    {
                                                                                        unit.name
                                                                                    }{' '}
                                                                                    (
                                                                                    {
                                                                                        unit.symbol
                                                                                    }

                                                                                    )
                                                                                    {!unit.is_active &&
                                                                                        ' - nonaktif'}
                                                                                </option>
                                                                            ),
                                                                        )}
                                                                    </select>
                                                                    <Button
                                                                        type="button"
                                                                        size="icon"
                                                                        variant="ghost"
                                                                        disabled={
                                                                            isBase
                                                                        }
                                                                        onClick={() =>
                                                                            removeUnit(
                                                                                index,
                                                                            )
                                                                        }
                                                                        className="text-white hover:bg-white/10 hover:text-white"
                                                                    >
                                                                        <Trash2 className="size-4" />
                                                                    </Button>
                                                                </div>
                                                                <div className="mt-3 grid grid-cols-3 gap-2">
                                                                    <label className="text-[11px] text-emerald-100">
                                                                        Konversi
                                                                        <Input
                                                                            inputMode="decimal"
                                                                            value={
                                                                                isBase
                                                                                    ? '1'
                                                                                    : row.conversion_factor
                                                                            }
                                                                            disabled={
                                                                                isBase
                                                                            }
                                                                            onChange={(
                                                                                event,
                                                                            ) =>
                                                                                updateUnit(
                                                                                    index,
                                                                                    'conversion_factor',
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            className="mt-1 border-white/20 bg-white/10 text-white"
                                                                        />
                                                                        <InputError
                                                                            message={errorFor(
                                                                                `units.${index}.conversion_factor`,
                                                                            )}
                                                                            className="mt-1 text-amber-200"
                                                                        />
                                                                    </label>
                                                                    <label className="text-[11px] text-emerald-100">
                                                                        Harga
                                                                        beli
                                                                        <Input
                                                                            inputMode="decimal"
                                                                            value={
                                                                                row.purchase_price
                                                                            }
                                                                            onChange={(
                                                                                event,
                                                                            ) =>
                                                                                updateUnit(
                                                                                    index,
                                                                                    'purchase_price',
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            className="mt-1 border-white/20 bg-white/10 text-white"
                                                                        />
                                                                        <InputError
                                                                            message={errorFor(
                                                                                `units.${index}.purchase_price`,
                                                                            )}
                                                                            className="mt-1 text-amber-200"
                                                                        />
                                                                    </label>
                                                                    <label className="text-[11px] text-emerald-100">
                                                                        Harga
                                                                        jual
                                                                        <Input
                                                                            inputMode="decimal"
                                                                            value={
                                                                                row.selling_price
                                                                            }
                                                                            onChange={(
                                                                                event,
                                                                            ) =>
                                                                                updateUnit(
                                                                                    index,
                                                                                    'selling_price',
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            className="mt-1 border-white/20 bg-white/10 text-white"
                                                                        />
                                                                        <InputError
                                                                            message={errorFor(
                                                                                `units.${index}.selling_price`,
                                                                            )}
                                                                            className="mt-1 text-amber-200"
                                                                        />
                                                                    </label>
                                                                </div>
                                                            </div>
                                                        );
                                                    },
                                                )}
                                            </div>
                                            <InputError
                                                message={form.errors.units}
                                                className="mt-2 text-amber-200"
                                            />
                                            {form.data.units.map((_, index) => (
                                                <InputError
                                                    key={index}
                                                    message={errorFor(
                                                        `units.${index}.unit_public_id`,
                                                    )}
                                                    className="mt-2 text-amber-200"
                                                />
                                            ))}
                                        </div>
                                        {editing && (
                                            <label className="mt-5 flex items-center gap-3 rounded-xl bg-white/10 p-3 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={
                                                        form.data.is_active
                                                    }
                                                    onChange={(event) =>
                                                        form.setData(
                                                            'is_active',
                                                            event.target
                                                                .checked,
                                                        )
                                                    }
                                                    className="size-4 accent-emerald-400"
                                                />{' '}
                                                Produk aktif dan dapat dipakai
                                            </label>
                                        )}
                                        <Button
                                            disabled={form.processing}
                                            className="mt-5 w-full bg-amber-300 text-emerald-950 hover:bg-amber-200"
                                        >
                                            {form.processing
                                                ? 'Menyimpan...'
                                                : editing
                                                  ? 'Simpan perubahan'
                                                  : 'Tambah produk'}
                                        </Button>
                                    </form>
                                )}
                            </aside>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}

ProductsIndex.layout = {
    breadcrumbs: [
        { title: 'Master Data', href: '/master-data/products' },
        { title: 'Produk', href: '/master-data/products' },
    ],
};
