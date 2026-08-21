import { Head, router, useForm } from '@inertiajs/react';
import {
    Boxes,
    Camera,
    ChevronRight,
    Edit3,
    ImagePlus,
    PackagePlus,
    Plus,
    Search,
    Settings2,
    Trash2,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import AlertError from '@/components/alert-error';
import InputError from '@/components/input-error';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

type Option = {
    public_id: string;
    name: string;
    symbol?: string;
    is_active: boolean;
};
type UnitOption = Option & {
    symbol: string;
    unit_type: 'large' | 'retail';
};
type VariantMode = 'none' | 'separate' | 'shared';
type ProductVariant = {
    public_id?: string;
    name: string;
    purchase_price: string;
    selling_price: string;
    current_stock: string;
    minimum_stock: string;
    conversion_factor: string;
};
type Product = {
    public_id: string;
    name: string;
    is_active: boolean;
    category: { public_id: string; name: string } | null;
    retail_unit_public_id: string;
    large_unit_public_id: string;
    variant_mode: VariantMode;
    purchase_price: string;
    selling_price: string;
    current_stock: string;
    minimum_stock: string;
    photo_url: string | null;
    variants: ProductVariant[];
};
type ProductForm = {
    _method: '' | 'patch';
    idempotency_key: string;
    name: string;
    category_public_id: string;
    retail_unit_public_id: string;
    large_unit_public_id: string;
    variant_mode: VariantMode;
    purchase_price: string;
    selling_price: string;
    current_stock: string;
    minimum_stock: string;
    variants: ProductVariant[];
    photo: File | null;
    remove_photo: boolean;
    is_active: boolean;
};

const createIdempotencyKey = () => {
    if (globalThis.crypto?.randomUUID) {
        return globalThis.crypto.randomUUID();
    }

    const bytes = new Uint8Array(16);
    globalThis.crypto?.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0'));

    return `${hex.slice(0, 4).join('')}-${hex.slice(4, 6).join('')}-${hex.slice(6, 8).join('')}-${hex.slice(8, 10).join('')}-${hex.slice(10).join('')}`;
};
const blankVariant = (): ProductVariant => ({
    name: '',
    purchase_price: '',
    selling_price: '',
    current_stock: '',
    minimum_stock: '',
    conversion_factor: '',
});
const blankForm = (): ProductForm => ({
    _method: '',
    idempotency_key: createIdempotencyKey(),
    name: '',
    category_public_id: '',
    retail_unit_public_id: '',
    large_unit_public_id: '',
    variant_mode: 'none',
    purchase_price: '',
    selling_price: '',
    current_stock: '',
    minimum_stock: '',
    variants: [],
    photo: null,
    remove_photo: false,
    is_active: true,
});
const money = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
});
function Field({
    label,
    error,
    children,
    className,
}: {
    label: string;
    error?: string;
    children: React.ReactNode;
    className?: string;
}) {
    return (
        <div className={className}>
            <Label className="mb-2 block text-xs font-bold tracking-wide text-slate-700 uppercase">
                {label}
            </Label>
            {children}
            <InputError message={error} className="mt-1.5" />
        </div>
    );
}

function Section({
    number,
    title,
    action,
    children,
}: {
    number: string;
    title: string;
    action?: React.ReactNode;
    children: React.ReactNode;
}) {
    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-[0_8px_24px_rgba(15,23,42,0.04)] sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                    <span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#0f766e] text-xs font-black text-white">
                        {number}
                    </span>
                    <h3 className="font-serif text-lg font-bold text-slate-900">
                        {title}
                    </h3>
                </div>
                {action}
            </div>
            {children}
        </section>
    );
}

function ReferenceManager({
    open,
    type,
    categories,
    units,
    onOpenChange,
}: {
    open: boolean;
    type: 'category' | 'unit';
    categories: Option[];
    units: UnitOption[];
    onOpenChange: (open: boolean) => void;
}) {
    const categoryForm = useForm({ name: '' });
    const unitForm = useForm({ name: '', symbol: '', unit_type: 'retail' });
    const isCategory = type === 'category';
    const submit = (event: FormEvent) => {
        event.preventDefault();

        if (isCategory) {
            categoryForm.post('/master-data/categories', {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => categoryForm.reset(),
            });
        } else {
            unitForm.post('/master-data/units', {
                preserveScroll: true,
                preserveState: true,
                onSuccess: () => unitForm.reset(),
            });
        }
    };
    const toggleCategory = (item: Option) =>
        router.patch(
            `/master-data/categories/${item.public_id}`,
            { name: item.name, is_active: !item.is_active },
            { preserveScroll: true, preserveState: true },
        );
    const toggleUnit = (item: UnitOption) =>
        router.patch(
            `/master-data/units/${item.public_id}`,
            {
                name: item.name,
                symbol: item.symbol,
                unit_type: item.unit_type,
                is_active: !item.is_active,
            },
            { preserveScroll: true, preserveState: true },
        );
    const items = isCategory ? categories : units;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-h-[88svh] overflow-y-auto border-slate-200 bg-white p-0 shadow-2xl sm:max-w-xl">
                <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-teal-50 to-white px-5 py-4 text-left">
                    <DialogTitle className="font-serif text-xl text-slate-900">
                        Kelola {isCategory ? 'Kategori' : 'Satuan'}
                    </DialogTitle>
                </DialogHeader>
                <div className="space-y-5 p-5">
                    <form
                        onSubmit={submit}
                        className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4"
                    >
                        <div className="grid gap-3 sm:grid-cols-2">
                            <Field
                                label={
                                    isCategory ? 'Nama kategori' : 'Nama satuan'
                                }
                                error={
                                    isCategory
                                        ? categoryForm.errors.name
                                        : unitForm.errors.name
                                }
                            >
                                <Input
                                    value={
                                        isCategory
                                            ? categoryForm.data.name
                                            : unitForm.data.name
                                    }
                                    onChange={(event) =>
                                        isCategory
                                            ? categoryForm.setData(
                                                  'name',
                                                  event.target.value,
                                              )
                                            : unitForm.setData(
                                                  'name',
                                                  event.target.value,
                                              )
                                    }
                                    className="border-slate-200 bg-white"
                                />
                            </Field>
                            {!isCategory && (
                                <Field
                                    label="Singkatan"
                                    error={unitForm.errors.symbol}
                                >
                                    <Input
                                        value={unitForm.data.symbol}
                                        onChange={(event) =>
                                            unitForm.setData(
                                                'symbol',
                                                event.target.value,
                                            )
                                        }
                                        className="border-slate-200 bg-white"
                                    />
                                </Field>
                            )}
                        </div>
                        {!isCategory && (
                            <div className="mt-3 grid grid-cols-2 gap-2">
                                {(['retail', 'large'] as const).map((group) => (
                                    <button
                                        key={group}
                                        type="button"
                                        onClick={() =>
                                            unitForm.setData('unit_type', group)
                                        }
                                        className={cn(
                                            'h-10 rounded-xl border text-sm font-semibold',
                                            unitForm.data.unit_type === group
                                                ? 'border-[#0f766e] bg-[#e3f3ef] text-[#0f5f59]'
                                                : 'border-slate-200 bg-white text-slate-600',
                                        )}
                                    >
                                        {group === 'retail' ? 'Ecer' : 'Besar'}
                                    </button>
                                ))}
                            </div>
                        )}
                        <Button
                            disabled={
                                isCategory
                                    ? categoryForm.processing
                                    : unitForm.processing
                            }
                            className="mt-4 w-full bg-[#0f766e] hover:bg-[#0b5f59]"
                        >
                            <Plus className="size-4" /> Tambah
                        </Button>
                    </form>
                    <div className="space-y-2">
                        {items.map((item) => (
                            <div
                                key={item.public_id}
                                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2.5 shadow-sm"
                            >
                                <div className="min-w-0">
                                    <p className="truncate text-sm font-semibold text-slate-800">
                                        {item.name}
                                        {'symbol' in item &&
                                            ` (${item.symbol})`}
                                    </p>
                                    {'unit_type' in item && (
                                        <p className="text-xs text-slate-500">
                                            {item.unit_type === 'retail'
                                                ? 'Ecer'
                                                : 'Besar'}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() =>
                                        isCategory
                                            ? toggleCategory(item)
                                            : toggleUnit(item as UnitOption)
                                    }
                                    className={cn(
                                        'shrink-0',
                                        !item.is_active &&
                                            'border-[#0f766e] text-[#0f766e]',
                                    )}
                                >
                                    {item.is_active
                                        ? 'Nonaktifkan'
                                        : 'Aktifkan'}
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}

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
    units: UnitOption[];
    search: string;
    status: string;
    canManage: boolean;
}) {
    const [editing, setEditing] = useState<Product | null>(null);
    const [formOpen, setFormOpen] = useState(false);
    const [manager, setManager] = useState<'category' | 'unit' | null>(null);
    const [search, setSearch] = useState(initialSearch);
    const [status, setStatus] = useState(initialStatus);
    const [preview, setPreview] = useState<string | null>(null);
    const form = useForm<ProductForm>(blankForm());
    const errorFor = (key: string) =>
        (form.errors as Record<string, string | undefined>)[key];
    const retailUnits = units.filter((unit) => unit.unit_type === 'retail');
    const largeUnits = units.filter((unit) => unit.unit_type === 'large');

    useEffect(() => {
        return () => {
            if (preview?.startsWith('blob:')) {
                URL.revokeObjectURL(preview);
            }
        };
    }, [preview]);

    const closeForm = () => {
        setFormOpen(false);
        setEditing(null);
        setPreview(null);
        form.clearErrors();
    };
    const openCreate = () => {
        setEditing(null);
        setPreview(null);
        form.setData(blankForm());
        form.clearErrors();
        setFormOpen(true);
    };
    const openEdit = (product: Product) => {
        setEditing(product);
        setPreview(product.photo_url);
        form.setData({
            _method: 'patch',
            idempotency_key: '',
            name: product.name,
            category_public_id: product.category?.public_id ?? '',
            retail_unit_public_id: product.retail_unit_public_id,
            large_unit_public_id: product.large_unit_public_id,
            variant_mode: product.variant_mode,
            purchase_price: product.purchase_price,
            selling_price: product.selling_price,
            current_stock: product.current_stock,
            minimum_stock: product.minimum_stock,
            variants: product.variants.map((variant) => ({ ...variant })),
            photo: null,
            remove_photo: false,
            is_active: product.is_active,
        });
        form.clearErrors();
        setFormOpen(true);
    };
    const setMode = (mode: VariantMode) => {
        form.setData({
            ...form.data,
            variant_mode: mode,
            variants:
                mode === 'none'
                    ? []
                    : form.data.variants.length
                      ? form.data.variants
                      : [blankVariant()],
        });
    };
    const updateVariant = (
        index: number,
        key: keyof ProductVariant,
        value: string,
    ) =>
        form.setData(
            'variants',
            form.data.variants.map((variant, current) =>
                current === index ? { ...variant, [key]: value } : variant,
            ),
        );
    const removeVariant = (index: number) =>
        form.setData(
            'variants',
            form.data.variants.filter((_, current) => current !== index),
        );
    const submit = (event: FormEvent) => {
        event.preventDefault();
        form.post(
            editing
                ? `/master-data/products/${editing.public_id}`
                : '/master-data/products',
            {
                forceFormData: true,
                preserveScroll: true,
                onSuccess: closeForm,
            },
        );
    };
    const applyFilters = () =>
        router.get(
            '/master-data/products',
            { search, status },
            { preserveState: true, replace: true },
        );
    const modeLabel = (mode: VariantMode) =>
        mode === 'none'
            ? 'Tanpa varian'
            : mode === 'separate'
              ? 'Stok terpisah'
              : 'Stok gabungan';

    return (
        <>
            <Head title="Produk" />
            <div className="min-h-full bg-[linear-gradient(180deg,#f8faf6_0%,#f2f5f0_100%)] px-3 py-4 sm:px-5 lg:px-8">
                <div className="mx-auto max-w-7xl space-y-4">
                    <div className="rounded-[1.35rem] border border-[#173c35]/8 bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <h1 className="text-2xl font-black tracking-[-0.04em] text-[#173c35]">
                                Produk
                            </h1>
                            {canManage && (
                                <Button
                                    onClick={openCreate}
                                    className="h-10 bg-[#173f35] px-4 font-bold text-white hover:bg-[#245c4f]"
                                >
                                    <PackagePlus className="size-5" /> Tambah
                                    produk
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col gap-3 rounded-2xl border border-[#e4ded5] bg-white/90 p-3 shadow-sm sm:flex-row">
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" />
                            <Input
                                value={search}
                                onChange={(event) =>
                                    setSearch(event.target.value)
                                }
                                onKeyDown={(event) =>
                                    event.key === 'Enter' && applyFilters()
                                }
                                placeholder="Cari produk"
                                className="h-11 border-[#ded7cd] bg-[#fbfaf7] pl-9"
                            />
                        </div>
                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                            className="h-11 rounded-md border border-[#ded7cd] bg-[#fbfaf7] px-3 text-sm"
                        >
                            <option value="">Semua status</option>
                            <option value="active">Aktif</option>
                            <option value="inactive">Nonaktif</option>
                        </select>
                        <Button
                            onClick={applyFilters}
                            variant="outline"
                            className="h-11"
                        >
                            Terapkan
                        </Button>
                    </div>

                    {products.data.length === 0 ? (
                        <div className="rounded-3xl border border-dashed border-[#cfc5b8] bg-white/70 py-16 text-center">
                            <Boxes className="mx-auto size-10 text-[#0f766e]" />
                            <p className="mt-3 font-serif text-xl font-bold text-slate-800">
                                Belum ada produk
                            </p>
                            {canManage && (
                                <Button
                                    onClick={openCreate}
                                    className="mt-5 bg-[#0f766e]"
                                >
                                    Tambah produk
                                </Button>
                            )}
                        </div>
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {products.data.map((product) => (
                                <article
                                    key={product.public_id}
                                    className="group overflow-hidden rounded-2xl border border-[#e2dbd1] bg-white shadow-sm transition duration-300 hover:-translate-y-0.5 hover:shadow-lg"
                                >
                                    <div className="flex gap-4 p-4">
                                        <div className="grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl bg-[#edf4f1]">
                                            {product.photo_url ? (
                                                <img
                                                    src={product.photo_url}
                                                    alt=""
                                                    className="size-full object-cover"
                                                />
                                            ) : (
                                                <PackagePlus className="size-8 text-[#0f766e]" />
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-start justify-between gap-2">
                                                <div className="min-w-0">
                                                    <p className="truncate font-serif text-lg font-bold text-slate-900">
                                                        {product.name}
                                                    </p>
                                                    <p className="truncate text-sm text-slate-500">
                                                        {product.category
                                                            ?.name ??
                                                            'Tanpa kategori'}
                                                    </p>
                                                </div>
                                                <Badge
                                                    variant={
                                                        product.is_active
                                                            ? 'default'
                                                            : 'secondary'
                                                    }
                                                    className={cn(
                                                        product.is_active &&
                                                            'bg-[#dff2eb] text-[#126455]',
                                                    )}
                                                >
                                                    {product.is_active
                                                        ? 'Aktif'
                                                        : 'Nonaktif'}
                                                </Badge>
                                            </div>
                                            <div className="mt-3 flex flex-wrap gap-1.5 text-xs">
                                                <span className="rounded-full bg-[#fff0e6] px-2.5 py-1 font-semibold text-[#a44b25]">
                                                    {modeLabel(
                                                        product.variant_mode,
                                                    )}
                                                </span>
                                                {product.variants.length >
                                                    0 && (
                                                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
                                                        {
                                                            product.variants
                                                                .length
                                                        }{' '}
                                                        varian
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/70 px-4 py-3">
                                        <span className="text-sm font-bold text-slate-700">
                                            {product.variant_mode === 'none'
                                                ? money.format(
                                                      Number(
                                                          product.selling_price,
                                                      ),
                                                  )
                                                : `${product.variants.length} harga`}
                                        </span>
                                        {canManage && (
                                            <Button
                                                size="sm"
                                                variant="ghost"
                                                onClick={() =>
                                                    openEdit(product)
                                                }
                                                className="text-[#0f766e] hover:bg-[#e3f3ef] hover:text-[#0b5f59]"
                                            >
                                                <Edit3 className="size-4" />{' '}
                                                Edit
                                            </Button>
                                        )}
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                    <Pagination links={products.links} />
                </div>
            </div>

            <Dialog
                open={formOpen}
                onOpenChange={(open) =>
                    open ? setFormOpen(true) : closeForm()
                }
            >
                <DialogContent className="flex max-h-[94svh] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden border-slate-200 bg-white p-0 shadow-[0_28px_80px_rgba(15,23,42,0.24)] sm:w-full sm:max-w-4xl sm:rounded-3xl">
                    <DialogHeader className="relative overflow-hidden border-b border-slate-200 bg-white px-5 py-5 text-left sm:px-7">
                        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-[#0f766e] via-[#2dd4bf] to-[#f4a261]" />
                        <div className="absolute top-0 right-8 size-24 rounded-full bg-teal-100/70 blur-2xl" />
                        <p className="relative text-xs font-black tracking-[0.16em] text-[#b4532d] uppercase">
                            {editing ? 'Perbarui katalog' : 'Produk baru'}
                        </p>
                        <DialogTitle className="relative mt-1 font-serif text-2xl font-black text-[#173c3a] sm:text-3xl">
                            {editing ? editing.name : 'Tambah Produk'}
                        </DialogTitle>
                    </DialogHeader>

                    <form
                        onSubmit={submit}
                        className="flex min-h-0 flex-1 flex-col"
                    >
                        <div className="min-h-0 flex-1 space-y-4 overflow-x-hidden overflow-y-auto bg-slate-50/60 p-3 sm:p-5">
                            {Object.keys(form.errors).length > 0 && (
                                <AlertError
                                    errors={Object.values(form.errors)}
                                />
                            )}
                            <Section number="1" title="Informasi Produk">
                                <div className="grid gap-4 sm:grid-cols-[1fr_180px]">
                                    <div className="space-y-4">
                                        <Field
                                            label="Nama produk"
                                            error={form.errors.name}
                                        >
                                            <Input
                                                autoFocus
                                                value={form.data.name}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'name',
                                                        event.target.value,
                                                    )
                                                }
                                                className="h-11 border-slate-200 bg-white shadow-sm"
                                            />
                                        </Field>
                                        <Field
                                            label="Kategori"
                                            error={
                                                form.errors.category_public_id
                                            }
                                        >
                                            <div className="flex gap-2">
                                                <select
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
                                                    className="h-11 min-w-0 flex-1 rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm"
                                                >
                                                    <option value="">
                                                        Pilih kategori
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
                                                                    !category.is_active
                                                                }
                                                            >
                                                                {category.name}
                                                            </option>
                                                        ),
                                                    )}
                                                </select>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    onClick={() =>
                                                        setManager('category')
                                                    }
                                                    className="size-11 shrink-0 border-[#b8ccc7] text-[#0f766e]"
                                                    aria-label="Kelola kategori"
                                                >
                                                    <Settings2 className="size-4" />
                                                </Button>
                                            </div>
                                        </Field>
                                    </div>
                                    <Field
                                        label="Foto produk"
                                        error={form.errors.photo}
                                    >
                                        <label className="group relative grid aspect-square cursor-pointer place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 transition hover:border-[#0f766e] hover:bg-teal-50/40">
                                            {preview ? (
                                                <img
                                                    src={preview}
                                                    alt="Pratinjau produk"
                                                    className="size-full object-cover"
                                                />
                                            ) : (
                                                <div className="text-center text-slate-500">
                                                    <ImagePlus className="mx-auto size-7 text-[#0f766e]" />
                                                    <span className="mt-2 block text-xs font-semibold">
                                                        Pilih foto
                                                    </span>
                                                </div>
                                            )}
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                className="sr-only"
                                                onChange={(event) => {
                                                    const file =
                                                        event.target
                                                            .files?.[0] ?? null;
                                                    form.setData('photo', file);
                                                    form.setData(
                                                        'remove_photo',
                                                        false,
                                                    );

                                                    if (file) {
                                                        setPreview(
                                                            URL.createObjectURL(
                                                                file,
                                                            ),
                                                        );
                                                    }
                                                }}
                                            />
                                            {preview && (
                                                <span className="absolute right-2 bottom-2 rounded-full bg-white/90 p-2 text-[#0f766e] shadow">
                                                    <Camera className="size-4" />
                                                </span>
                                            )}
                                        </label>
                                        {preview && (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setPreview(null);
                                                    form.setData('photo', null);
                                                    form.setData(
                                                        'remove_photo',
                                                        true,
                                                    );
                                                }}
                                                className="mt-2 text-xs font-semibold text-red-600"
                                            >
                                                Hapus foto
                                            </button>
                                        )}
                                    </Field>
                                </div>
                            </Section>

                            <Section
                                number="2"
                                title="Satuan Penjualan"
                                action={
                                    <Button
                                        type="button"
                                        size="sm"
                                        variant="ghost"
                                        onClick={() => setManager('unit')}
                                        className="text-[#0f766e]"
                                    >
                                        <Settings2 className="size-4" />
                                        <span className="hidden sm:inline">
                                            Kelola satuan
                                        </span>
                                    </Button>
                                }
                            >
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <Field
                                        label="Satuan besar"
                                        error={form.errors.large_unit_public_id}
                                    >
                                        <select
                                            value={
                                                form.data.large_unit_public_id
                                            }
                                            onChange={(event) =>
                                                form.setData(
                                                    'large_unit_public_id',
                                                    event.target.value,
                                                )
                                            }
                                            className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm"
                                        >
                                            <option value="">
                                                Pilih satuan besar
                                            </option>
                                            {largeUnits.map((unit) => (
                                                <option
                                                    key={unit.public_id}
                                                    value={unit.public_id}
                                                    disabled={!unit.is_active}
                                                >
                                                    {unit.name} ({unit.symbol})
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                    <Field
                                        label="Satuan ecer"
                                        error={
                                            form.errors.retail_unit_public_id
                                        }
                                    >
                                        <select
                                            value={
                                                form.data.retail_unit_public_id
                                            }
                                            onChange={(event) =>
                                                form.setData(
                                                    'retail_unit_public_id',
                                                    event.target.value,
                                                )
                                            }
                                            className="h-11 w-full rounded-md border border-slate-200 bg-white px-3 text-sm shadow-sm"
                                        >
                                            <option value="">
                                                Pilih satuan ecer
                                            </option>
                                            {retailUnits.map((unit) => (
                                                <option
                                                    key={unit.public_id}
                                                    value={unit.public_id}
                                                    disabled={!unit.is_active}
                                                >
                                                    {unit.name} ({unit.symbol})
                                                </option>
                                            ))}
                                        </select>
                                    </Field>
                                </div>
                            </Section>

                            <Section number="3" title="Harga dan Stok">
                                <button
                                    type="button"
                                    role="switch"
                                    aria-checked={
                                        form.data.variant_mode !== 'none'
                                    }
                                    onClick={() =>
                                        setMode(
                                            form.data.variant_mode === 'none'
                                                ? 'separate'
                                                : 'none',
                                        )
                                    }
                                    className="flex w-full items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-left"
                                >
                                    <span>
                                        <span className="block text-sm font-bold text-slate-800">
                                            Varian ukuran / jenis
                                        </span>
                                        <span className="text-xs text-slate-500">
                                            {form.data.variant_mode === 'none'
                                                ? 'Tidak aktif'
                                                : 'Aktif'}
                                        </span>
                                    </span>
                                    <span
                                        className={cn(
                                            'relative h-7 w-12 rounded-full transition',
                                            form.data.variant_mode === 'none'
                                                ? 'bg-slate-300'
                                                : 'bg-[#0f766e]',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'absolute top-1 size-5 rounded-full bg-white shadow transition',
                                                form.data.variant_mode ===
                                                    'none'
                                                    ? 'left-1'
                                                    : 'left-6',
                                            )}
                                        />
                                    </span>
                                </button>

                                {form.data.variant_mode === 'none' ? (
                                    <div className="mt-4 grid gap-4 sm:grid-cols-2">
                                        <Field
                                            label="HPP per 1 ecer"
                                            error={form.errors.purchase_price}
                                        >
                                            <Input
                                                inputMode="decimal"
                                                value={form.data.purchase_price}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'purchase_price',
                                                        event.target.value,
                                                    )
                                                }
                                                className="h-11 border-slate-200 bg-white shadow-sm"
                                            />
                                        </Field>
                                        <Field
                                            label="Harga jual per 1 ecer"
                                            error={form.errors.selling_price}
                                        >
                                            <Input
                                                inputMode="decimal"
                                                value={form.data.selling_price}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'selling_price',
                                                        event.target.value,
                                                    )
                                                }
                                                className="h-11 border-slate-200 bg-white shadow-sm"
                                            />
                                        </Field>
                                        <Field
                                            label="Stok saat ini"
                                            error={form.errors.current_stock}
                                        >
                                            <Input
                                                inputMode="decimal"
                                                value={form.data.current_stock}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'current_stock',
                                                        event.target.value,
                                                    )
                                                }
                                                className="h-11 border-slate-200 bg-white shadow-sm"
                                            />
                                        </Field>
                                        <Field
                                            label="Ingatkan saat stok tinggal"
                                            error={form.errors.minimum_stock}
                                        >
                                            <Input
                                                inputMode="decimal"
                                                value={form.data.minimum_stock}
                                                onChange={(event) =>
                                                    form.setData(
                                                        'minimum_stock',
                                                        event.target.value,
                                                    )
                                                }
                                                className="h-11 border-slate-200 bg-white shadow-sm"
                                            />
                                        </Field>
                                    </div>
                                ) : (
                                    <div className="mt-4 space-y-4">
                                        <div className="grid gap-2 sm:grid-cols-2">
                                            {(
                                                ['separate', 'shared'] as const
                                            ).map((mode) => (
                                                <button
                                                    type="button"
                                                    key={mode}
                                                    onClick={() =>
                                                        setMode(mode)
                                                    }
                                                    className={cn(
                                                        'flex items-center gap-3 rounded-2xl border p-3 text-left',
                                                        form.data
                                                            .variant_mode ===
                                                            mode
                                                            ? 'border-[#0f766e] bg-[#e4f3ef] text-[#0d5d57]'
                                                            : 'border-slate-200 bg-white text-slate-700',
                                                    )}
                                                >
                                                    <span
                                                        className={cn(
                                                            'size-4 rounded-full border-4',
                                                            form.data
                                                                .variant_mode ===
                                                                mode
                                                                ? 'border-[#0f766e] bg-white'
                                                                : 'border-slate-300',
                                                        )}
                                                    />
                                                    <span>
                                                        <span className="block text-sm font-bold">
                                                            {mode === 'separate'
                                                                ? 'Beda rasa / jenis'
                                                                : 'Beda satuan / grosir'}
                                                        </span>
                                                        <span className="text-xs opacity-70">
                                                            {mode === 'separate'
                                                                ? 'Stok terpisah'
                                                                : 'Stok gabungan'}
                                                        </span>
                                                    </span>
                                                </button>
                                            ))}
                                        </div>

                                        <div className="space-y-3">
                                            {form.data.variants.map(
                                                (variant, index) => (
                                                    <div
                                                        key={
                                                            variant.public_id ??
                                                            index
                                                        }
                                                        className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3 shadow-sm sm:p-4"
                                                    >
                                                        <div className="mb-3 flex items-center justify-between">
                                                            <p className="font-serif font-bold text-slate-800">
                                                                Varian{' '}
                                                                {index + 1}
                                                            </p>
                                                            <Button
                                                                type="button"
                                                                size="icon"
                                                                variant="ghost"
                                                                onClick={() =>
                                                                    removeVariant(
                                                                        index,
                                                                    )
                                                                }
                                                                className="size-9 text-red-600"
                                                            >
                                                                <Trash2 className="size-4" />
                                                            </Button>
                                                        </div>
                                                        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                                            <Field
                                                                label="Nama varian"
                                                                error={errorFor(
                                                                    `variants.${index}.name`,
                                                                )}
                                                                className="sm:col-span-2 lg:col-span-1"
                                                            >
                                                                <Input
                                                                    value={
                                                                        variant.name
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        updateVariant(
                                                                            index,
                                                                            'name',
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="border-slate-200 bg-white"
                                                                />
                                                            </Field>
                                                            <Field
                                                                label="HPP varian"
                                                                error={errorFor(
                                                                    `variants.${index}.purchase_price`,
                                                                )}
                                                            >
                                                                <Input
                                                                    inputMode="decimal"
                                                                    value={
                                                                        variant.purchase_price
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        updateVariant(
                                                                            index,
                                                                            'purchase_price',
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="border-slate-200 bg-white"
                                                                />
                                                            </Field>
                                                            <Field
                                                                label="Harga jual varian"
                                                                error={errorFor(
                                                                    `variants.${index}.selling_price`,
                                                                )}
                                                            >
                                                                <Input
                                                                    inputMode="decimal"
                                                                    value={
                                                                        variant.selling_price
                                                                    }
                                                                    onChange={(
                                                                        event,
                                                                    ) =>
                                                                        updateVariant(
                                                                            index,
                                                                            'selling_price',
                                                                            event
                                                                                .target
                                                                                .value,
                                                                        )
                                                                    }
                                                                    className="border-slate-200 bg-white"
                                                                />
                                                            </Field>
                                                            {form.data
                                                                .variant_mode ===
                                                            'separate' ? (
                                                                <>
                                                                    <Field
                                                                        label="Stok saat ini"
                                                                        error={errorFor(
                                                                            `variants.${index}.current_stock`,
                                                                        )}
                                                                    >
                                                                        <Input
                                                                            inputMode="decimal"
                                                                            value={
                                                                                variant.current_stock
                                                                            }
                                                                            onChange={(
                                                                                event,
                                                                            ) =>
                                                                                updateVariant(
                                                                                    index,
                                                                                    'current_stock',
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            className="border-slate-200 bg-white"
                                                                        />
                                                                    </Field>
                                                                    <Field
                                                                        label="Batas stok minimal"
                                                                        error={errorFor(
                                                                            `variants.${index}.minimum_stock`,
                                                                        )}
                                                                    >
                                                                        <Input
                                                                            inputMode="decimal"
                                                                            value={
                                                                                variant.minimum_stock
                                                                            }
                                                                            onChange={(
                                                                                event,
                                                                            ) =>
                                                                                updateVariant(
                                                                                    index,
                                                                                    'minimum_stock',
                                                                                    event
                                                                                        .target
                                                                                        .value,
                                                                                )
                                                                            }
                                                                            className="border-slate-200 bg-white"
                                                                        />
                                                                    </Field>
                                                                </>
                                                            ) : (
                                                                <Field
                                                                    label="Isi per kemasan"
                                                                    error={errorFor(
                                                                        `variants.${index}.conversion_factor`,
                                                                    )}
                                                                >
                                                                    <Input
                                                                        inputMode="decimal"
                                                                        value={
                                                                            variant.conversion_factor
                                                                        }
                                                                        onChange={(
                                                                            event,
                                                                        ) =>
                                                                            updateVariant(
                                                                                index,
                                                                                'conversion_factor',
                                                                                event
                                                                                    .target
                                                                                    .value,
                                                                            )
                                                                        }
                                                                        className="border-slate-200 bg-white"
                                                                    />
                                                                </Field>
                                                            )}
                                                        </div>
                                                    </div>
                                                ),
                                            )}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="outline"
                                            onClick={() =>
                                                form.setData('variants', [
                                                    ...form.data.variants,
                                                    blankVariant(),
                                                ])
                                            }
                                            className="w-full border-dashed border-[#0f766e] text-[#0f766e]"
                                        >
                                            <Plus className="size-4" /> Tambah
                                            varian
                                        </Button>
                                        <InputError
                                            message={form.errors.variants}
                                        />

                                        {form.data.variant_mode ===
                                            'shared' && (
                                            <div className="grid gap-4 rounded-2xl border border-[#bcd8d1] bg-[#eff8f5] p-4 sm:grid-cols-2">
                                                <Field
                                                    label="Stok gabungan saat ini"
                                                    error={
                                                        form.errors
                                                            .current_stock
                                                    }
                                                >
                                                    <Input
                                                        inputMode="decimal"
                                                        value={
                                                            form.data
                                                                .current_stock
                                                        }
                                                        onChange={(event) =>
                                                            form.setData(
                                                                'current_stock',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        className="h-11 border-[#afd0c8] bg-white"
                                                    />
                                                </Field>
                                                <Field
                                                    label="Ingatkan saat stok tinggal"
                                                    error={
                                                        form.errors
                                                            .minimum_stock
                                                    }
                                                >
                                                    <Input
                                                        inputMode="decimal"
                                                        value={
                                                            form.data
                                                                .minimum_stock
                                                        }
                                                        onChange={(event) =>
                                                            form.setData(
                                                                'minimum_stock',
                                                                event.target
                                                                    .value,
                                                            )
                                                        }
                                                        className="h-11 border-[#afd0c8] bg-white"
                                                    />
                                                </Field>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </Section>

                            {editing && (
                                <label className="flex min-h-12 cursor-pointer items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 shadow-sm">
                                    Produk aktif
                                    <input
                                        type="checkbox"
                                        checked={form.data.is_active}
                                        onChange={(event) =>
                                            form.setData(
                                                'is_active',
                                                event.target.checked,
                                            )
                                        }
                                        className="size-5 accent-[#0f766e]"
                                    />
                                </label>
                            )}
                        </div>

                        <div className="flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white px-4 py-3 shadow-[0_-10px_30px_rgba(15,23,42,0.04)] sm:flex-row sm:justify-end sm:px-6">
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={closeForm}
                                className="h-11 sm:min-w-28"
                            >
                                Batal
                            </Button>
                            <Button
                                disabled={form.processing}
                                className="h-11 bg-[#0f766e] px-6 font-bold hover:bg-[#0b5f59] sm:min-w-44"
                            >
                                {form.processing
                                    ? 'Menyimpan...'
                                    : editing
                                      ? 'Simpan perubahan'
                                      : 'Tambah produk'}
                                {!form.processing && (
                                    <ChevronRight className="size-4" />
                                )}
                            </Button>
                        </div>
                    </form>
                </DialogContent>
            </Dialog>

            <ReferenceManager
                open={manager !== null}
                type={manager ?? 'category'}
                categories={categories}
                units={units}
                onOpenChange={(open) => !open && setManager(null)}
            />
        </>
    );
}

ProductsIndex.layout = {
    breadcrumbs: [
        { title: 'Master Data', href: '/master-data/products' },
        { title: 'Produk', href: '/master-data/products' },
    ],
};
