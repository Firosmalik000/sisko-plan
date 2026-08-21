import { Head, router, useForm } from '@inertiajs/react';
import { Edit3, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import type { FormEvent } from 'react';
import InputError from '@/components/input-error';
import { MasterDataNav } from '@/components/master-data-nav';
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
    const [formOpen, setFormOpen] = useState(false);
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
        setFormOpen(true);
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
        setFormOpen(true);
    };
    const closeForm = () => {
        setFormOpen(false);
        setEditing(null);
        form.clearErrors();
    };
    const submit = (event: FormEvent) => {
        event.preventDefault();
        const options = {
            preserveScroll: true,
            onSuccess: closeForm,
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
            <div className="min-h-full bg-[linear-gradient(180deg,#f8faf6_0%,#f2f5f0_100%)] px-3 py-4 sm:px-5 lg:px-8">
                <div className="mx-auto flex max-w-7xl flex-col gap-4">
                    <header className="flex flex-col gap-3 rounded-[1.35rem] border border-[#173c35]/8 bg-white p-4 shadow-sm sm:p-5">
                        <div className="flex items-center justify-between gap-3">
                            <h1 className="text-2xl font-black tracking-[-0.04em] text-[#173c35]">
                                {title}
                            </h1>
                            <div className="flex items-center gap-2">
                                <div className="rounded-xl bg-[#edf4f0] px-3 py-2 text-xs text-emerald-950">
                                    <strong>{items.total}</strong> data
                                </div>
                                {canManage && (
                                    <Button onClick={openCreate}>
                                        <Plus /> Tambah
                                    </Button>
                                )}
                            </div>
                        </div>
                        <MasterDataNav />
                    </header>

                    <div className="grid gap-4">
                        <section className="space-y-3">
                            <div className="flex flex-col gap-2 rounded-2xl border border-stone-200/80 bg-white/90 p-2 shadow-sm backdrop-blur sm:flex-row">
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
                                        className="h-10 border-0 bg-stone-50 pl-9 shadow-none"
                                        placeholder={`Cari ${singular.toLowerCase()}...`}
                                    />
                                </div>
                                <select
                                    value={status}
                                    onChange={(event) =>
                                        setStatus(event.target.value)
                                    }
                                    className="h-10 rounded-lg border-0 bg-stone-50 px-3 text-sm"
                                >
                                    <option value="">Semua status</option>
                                    <option value="active">Aktif</option>
                                    <option value="inactive">Nonaktif</option>
                                </select>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={applyFilters}
                                    className="h-10"
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
                                </div>
                            ) : (
                                <div className="grid gap-3 sm:grid-cols-2">
                                    {items.data.map((item) => (
                                        <article
                                            key={item.public_id}
                                            className="group rounded-[1.15rem] border border-stone-200/80 bg-white p-3.5 shadow-sm transition hover:border-emerald-200 hover:shadow-md"
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
                                                        className="mt-2 h-5 px-2 text-[10px] uppercase"
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
                                            {details.length > 0 && (
                                                <dl className="mt-3 space-y-1.5 border-t border-stone-100 pt-3 text-sm">
                                                    {details.map((detail) =>
                                                        item[detail.key] ? (
                                                            <div
                                                                key={detail.key}
                                                                className="flex justify-between gap-4"
                                                            >
                                                                <dt className="text-stone-500">
                                                                    {
                                                                        detail.label
                                                                    }
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
                                            )}
                                        </article>
                                    ))}
                                </div>
                            )}
                            <Pagination links={items.links} />
                        </section>

                        {canManage && (
                            <Dialog
                                open={formOpen}
                                onOpenChange={(open) => {
                                    if (!open) {
                                        closeForm();
                                    }
                                }}
                            >
                                <DialogContent
                                    className={`flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden rounded-2xl border-stone-200 bg-white p-0 shadow-2xl ${fields.length === 1 ? 'sm:max-w-md' : 'sm:max-w-xl'}`}
                                >
                                    <form
                                        onSubmit={submit}
                                        className="flex min-h-0 flex-col"
                                    >
                                        <DialogHeader className="border-b border-stone-200 px-4 py-4 pr-12 text-left sm:px-5">
                                            <DialogTitle className="text-lg font-black tracking-[-0.03em] text-[#173c35]">
                                                {editing
                                                    ? `Edit ${singular}`
                                                    : `Tambah ${singular}`}
                                            </DialogTitle>
                                        </DialogHeader>
                                        <div className="grid min-h-0 gap-4 overflow-y-auto px-4 py-4 sm:grid-cols-2 sm:px-5">
                                            {fields.map((field) => (
                                                <div
                                                    key={field.name}
                                                    className="space-y-2"
                                                >
                                                    <Label
                                                        htmlFor={field.name}
                                                        className="font-bold text-stone-700"
                                                    >
                                                        {field.label}
                                                    </Label>
                                                    {field.type ===
                                                    'textarea' ? (
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
                                                            className="min-h-24 w-full resize-y rounded-xl border border-stone-300 bg-white px-3 py-2 text-sm text-stone-900 placeholder:text-stone-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
                                                        />
                                                    ) : field.type ===
                                                      'select' ? (
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
                                                            className="h-10 w-full rounded-xl border border-stone-300 bg-white px-3 text-sm text-stone-900 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 focus:outline-none"
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
                                                                field.type ??
                                                                'text'
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
                                                            className="border-stone-300 bg-white text-stone-900 placeholder:text-stone-400"
                                                        />
                                                    )}
                                                    <InputError
                                                        message={
                                                            form.errors[
                                                                field.name
                                                            ]
                                                        }
                                                        className="text-red-600"
                                                    />
                                                </div>
                                            ))}
                                            {editing && (
                                                <label className="flex items-center gap-3 rounded-xl border border-stone-200 bg-stone-50 p-3 text-sm text-stone-700 sm:col-span-2">
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
                                                                        event
                                                                            .target
                                                                            .checked,
                                                                }),
                                                            )
                                                        }
                                                        className="size-4 accent-teal-700"
                                                    />{' '}
                                                    Aktif
                                                </label>
                                            )}
                                        </div>
                                        <div className="flex flex-col-reverse gap-2 border-t border-stone-200 px-4 py-3 min-[375px]:flex-row min-[375px]:justify-end sm:px-5">
                                            <Button
                                                type="button"
                                                variant="outline"
                                                onClick={closeForm}
                                            >
                                                Batal
                                            </Button>
                                            <Button disabled={form.processing}>
                                                {form.processing
                                                    ? 'Menyimpan...'
                                                    : editing
                                                      ? 'Simpan perubahan'
                                                      : `Tambah ${singular}`}
                                            </Button>
                                        </div>
                                    </form>
                                </DialogContent>
                            </Dialog>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
