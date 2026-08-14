import { Head, router, useForm } from '@inertiajs/react';
import { Edit3, Plus, Search, X } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { MasterDataNav } from '@/components/master-data-nav';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

type FormValue = string | boolean;
export type ReferenceRecord = {
    public_id: string;
    name: string;
    is_active: boolean;
    [key: string]: unknown;
};
type Field = {
    name: string;
    label: string;
    type?: 'text' | 'email' | 'textarea' | 'select';
    placeholder?: string;
    options?: Array<{ value: string; label: string }>;
};
type Paginator<T> = {
    data: T[];
    links: PaginationLink[];
    total: number;
};

export function ReferenceDataPage<T extends ReferenceRecord>({
    title,
    eyebrow,
    description,
    endpoint,
    singular,
    items,
    fields,
    initialValues,
    search: initialSearch,
    status: initialStatus,
    details,
    canManage,
}: {
    title: string;
    eyebrow: string;
    description: string;
    endpoint: string;
    singular: string;
    items: Paginator<T>;
    fields: Field[];
    initialValues: Record<string, FormValue>;
    search: string;
    status: string;
    details: Array<{ key: string; label: string }>;
    canManage: boolean;
}) {
    const [editing, setEditing] = useState<T | null>(null);
    const [search, setSearch] = useState(initialSearch);
    const [status, setStatus] = useState(initialStatus);
    const form = useForm<Record<string, FormValue>>({
        ...initialValues,
        is_active: true,
    });

    const openCreate = () => {
        setEditing(null);
        form.setData({ ...initialValues, is_active: true });
        form.clearErrors();
    };
    const openEdit = (item: T) => {
        setEditing(item);
        form.setData(
            Object.fromEntries(
                [...fields.map((field) => field.name), 'is_active'].map(
                    (key) => [key, (item[key] as FormValue | null) ?? ''],
                ),
            ),
        );
        form.clearErrors();
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: () => openCreate(),
        };

        if (editing) {
            form.patch(`${endpoint}/${editing.public_id}`, options);
        } else {
            form.post(endpoint, options);
        }
    };
    const applyFilters = () => {
        router.get(
            endpoint,
            { search, status },
            { preserveState: true, replace: true },
        );
    };

    return (
        <>
            <Head title={title} />
            <div className="min-h-full bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.10),transparent_32%),linear-gradient(180deg,#fafaf7_0%,#f4f1e9_100%)] p-4 md:p-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-7">
                    <header className="flex flex-col gap-5">
                        <div>
                            <p className="text-xs font-bold tracking-[0.22em] text-emerald-700 uppercase">
                                {eyebrow}
                            </p>
                            <h1 className="mt-2 font-serif text-3xl font-semibold tracking-tight text-stone-900 md:text-4xl">
                                {title}
                            </h1>
                            <p className="mt-2 max-w-2xl text-sm leading-6 text-stone-600">
                                {description}
                            </p>
                        </div>
                        <MasterDataNav />
                    </header>

                    <div
                        className={
                            canManage
                                ? 'grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]'
                                : 'grid gap-6'
                        }
                    >
                        <section className="space-y-4">
                            <div className="flex flex-col gap-3 rounded-2xl border border-stone-200/80 bg-white/80 p-3 shadow-sm backdrop-blur md:flex-row">
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
                                        placeholder={`Cari ${singular.toLowerCase()}...`}
                                    />
                                </div>
                                <select
                                    value={status}
                                    onChange={(event) =>
                                        setStatus(event.target.value)
                                    }
                                    className="h-9 rounded-md border border-input bg-transparent px-3 text-sm"
                                >
                                    <option value="">Semua status</option>
                                    <option value="active">Aktif</option>
                                    <option value="inactive">Nonaktif</option>
                                </select>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={applyFilters}
                                >
                                    Terapkan
                                </Button>
                            </div>

                            {items.data.length === 0 ? (
                                <div className="rounded-3xl border border-dashed border-stone-300 bg-white/60 px-6 py-16 text-center">
                                    <div className="mx-auto flex size-12 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-800">
                                        <Plus />
                                    </div>
                                    <h2 className="mt-4 text-lg font-semibold">
                                        Belum ada {singular.toLowerCase()}
                                    </h2>
                                    <p className="mt-1 text-sm text-stone-500">
                                        Isi formulir di samping untuk membuat
                                        data pertama.
                                    </p>
                                </div>
                            ) : (
                                <div className="grid gap-3 md:grid-cols-2">
                                    {items.data.map((item) => (
                                        <article
                                            key={item.public_id}
                                            className="group rounded-2xl border border-stone-200/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md"
                                        >
                                            <div className="flex items-start justify-between gap-3">
                                                <div>
                                                    <h2 className="font-semibold text-stone-900">
                                                        {item.name}
                                                    </h2>
                                                    <Badge
                                                        variant={
                                                            item.is_active
                                                                ? 'secondary'
                                                                : 'outline'
                                                        }
                                                        className="mt-2"
                                                    >
                                                        {item.is_active
                                                            ? 'Aktif'
                                                            : 'Nonaktif'}
                                                    </Badge>
                                                </div>
                                                {canManage && (
                                                    <Button
                                                        type="button"
                                                        size="icon"
                                                        variant="ghost"
                                                        onClick={() =>
                                                            openEdit(item)
                                                        }
                                                        aria-label={`Edit ${item.name}`}
                                                    >
                                                        <Edit3 className="size-4" />
                                                    </Button>
                                                )}
                                            </div>
                                            <dl className="mt-4 space-y-2 border-t border-stone-100 pt-4 text-sm">
                                                {details.map((detail) =>
                                                    item[detail.key] ? (
                                                        <div
                                                            key={detail.key}
                                                            className="flex justify-between gap-4"
                                                        >
                                                            <dt className="text-stone-500">
                                                                {detail.label}
                                                            </dt>
                                                            <dd className="text-right text-stone-700">
                                                                {String(
                                                                    item[
                                                                        detail
                                                                            .key
                                                                    ],
                                                                )}
                                                            </dd>
                                                        </div>
                                                    ) : null,
                                                )}
                                            </dl>
                                        </article>
                                    ))}
                                </div>
                            )}
                            <Pagination links={items.links} />
                        </section>

                        {canManage && (
                            <aside className="xl:sticky xl:top-6 xl:self-start">
                                <form
                                    onSubmit={submit}
                                    className="rounded-3xl border border-stone-200 bg-[#173f3a] p-6 text-white shadow-xl shadow-emerald-950/10"
                                >
                                    <div className="flex items-start justify-between gap-3">
                                        <div>
                                            <p className="text-xs font-semibold tracking-widest text-emerald-200 uppercase">
                                                {editing
                                                    ? 'Ubah data'
                                                    : 'Data baru'}
                                            </p>
                                            <h2 className="mt-1 text-xl font-semibold">
                                                {editing
                                                    ? editing.name
                                                    : `Tambah ${singular}`}
                                            </h2>
                                        </div>
                                        {editing && (
                                            <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                className="text-white hover:bg-white/10 hover:text-white"
                                                onClick={openCreate}
                                            >
                                                <X />
                                            </Button>
                                        )}
                                    </div>
                                    <div className="mt-6 space-y-4">
                                        {fields.map((field) => (
                                            <div
                                                key={field.name}
                                                className="space-y-2"
                                            >
                                                <Label
                                                    htmlFor={field.name}
                                                    className="text-emerald-50"
                                                >
                                                    {field.label}
                                                </Label>
                                                {field.type === 'textarea' ? (
                                                    <textarea
                                                        id={field.name}
                                                        value={String(
                                                            form.data[
                                                                field.name
                                                            ] ?? '',
                                                        )}
                                                        onChange={(event) =>
                                                            form.setData(
                                                                (data) => ({
                                                                    ...data,
                                                                    [field.name]:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        placeholder={
                                                            field.placeholder
                                                        }
                                                        className="min-h-24 w-full rounded-md border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-emerald-100/50 focus:ring-2 focus:ring-emerald-300 focus:outline-none"
                                                    />
                                                ) : field.type === 'select' ? (
                                                    <select
                                                        id={field.name}
                                                        value={String(
                                                            form.data[
                                                                field.name
                                                            ] ?? '',
                                                        )}
                                                        onChange={(event) =>
                                                            form.setData(
                                                                (data) => ({
                                                                    ...data,
                                                                    [field.name]:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        className="h-10 w-full rounded-md border border-white/20 bg-[#173f3a] px-3 text-sm"
                                                    >
                                                        {field.options?.map(
                                                            (option) => (
                                                                <option
                                                                    key={
                                                                        option.value
                                                                    }
                                                                    value={
                                                                        option.value
                                                                    }
                                                                >
                                                                    {
                                                                        option.label
                                                                    }
                                                                </option>
                                                            ),
                                                        )}
                                                    </select>
                                                ) : (
                                                    <Input
                                                        id={field.name}
                                                        type={
                                                            field.type ?? 'text'
                                                        }
                                                        value={String(
                                                            form.data[
                                                                field.name
                                                            ] ?? '',
                                                        )}
                                                        onChange={(event) =>
                                                            form.setData(
                                                                (data) => ({
                                                                    ...data,
                                                                    [field.name]:
                                                                        event
                                                                            .target
                                                                            .value,
                                                                }),
                                                            )
                                                        }
                                                        placeholder={
                                                            field.placeholder
                                                        }
                                                        className="border-white/20 bg-white/10 text-white placeholder:text-emerald-100/50"
                                                    />
                                                )}
                                                <InputError
                                                    message={
                                                        form.errors[field.name]
                                                    }
                                                    className="text-amber-200"
                                                />
                                            </div>
                                        ))}
                                        {editing && (
                                            <label className="flex items-center gap-3 rounded-xl bg-white/10 p-3 text-sm">
                                                <input
                                                    type="checkbox"
                                                    checked={Boolean(
                                                        form.data.is_active,
                                                    )}
                                                    onChange={(event) =>
                                                        form.setData(
                                                            (data) => ({
                                                                ...data,
                                                                is_active:
                                                                    event.target
                                                                        .checked,
                                                            }),
                                                        )
                                                    }
                                                    className="size-4 accent-emerald-400"
                                                />{' '}
                                                Data aktif dan dapat dipakai
                                            </label>
                                        )}
                                        <Button
                                            disabled={form.processing}
                                            className="w-full bg-amber-300 text-emerald-950 hover:bg-amber-200"
                                        >
                                            {form.processing
                                                ? 'Menyimpan...'
                                                : editing
                                                  ? 'Simpan perubahan'
                                                  : `Tambah ${singular}`}
                                        </Button>
                                    </div>
                                </form>
                            </aside>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
