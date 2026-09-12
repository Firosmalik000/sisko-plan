import { router, useForm } from '@inertiajs/react';
import { Edit3, Plus, RotateCcw, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { FormCheckbox, FormInput, FormPhoneInput, FormSelect, FormTextarea } from '@/components/forms';
import { ResponsiveDialog } from '@/components/overlays';
import { AppPage } from '@/components/page/app-page';
import { DataToolbar } from '@/components/page/data-toolbar';
import { EmptyState } from '@/components/page/empty-state';
import { RecordList, RecordListRow } from '@/components/page/record-list';
import { Pagination } from '@/components/pagination';
import type { PaginationLink } from '@/components/pagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { translate } from '@/lib/i18n';
import { SupportingDataMenu } from './supporting-data-menu';

type FormValue = string | boolean;
type FieldOption = { value: string; label: string; disabled?: boolean };
export type ReferenceRecord = {
    public_id: string;
    name: string;
    is_active: boolean;
    [key: string]: unknown;
};
type Field = {
    name: string;
    label: string;
    type?: 'text' | 'email' | 'tel' | 'textarea' | 'select';
    placeholder?: string;
    options?: FieldOption[] | ((values: Record<string, FormValue>) => FieldOption[]);
    change?: (value: string, values: Record<string, FormValue>) => Record<string, FormValue>;
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
    displayName = (item: T) => item.name,
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
    displayName?: (item: T) => string;
}) {
    const [openCreateFromQuery] = useState(
        () => typeof window !== 'undefined' && new URL(window.location.href).searchParams.get('create') === '1',
    );
    const [editing, setEditing] = useState<T | null>(null);
    const [formOpen, setFormOpen] = useState(openCreateFromQuery);
    const [search, setSearch] = useState(initialSearch);
    const [status, setStatus] = useState(initialStatus);
    const form = useForm<Record<string, FormValue>>({
        ...initialValues,
        is_active: true,
    });

    useEffect(() => {
        if (!openCreateFromQuery) {
            return;
        }

        const url = new URL(window.location.href);
        url.searchParams.delete('create');
        window.history.replaceState({}, '', url);
    }, [openCreateFromQuery]);

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
                [...new Set([...Object.keys(initialValues), ...fields.map((field) => field.name), 'is_active'])].map((key) => [
                    key,
                    (item[key] as FormValue | null) ?? initialValues[key] ?? '',
                ]),
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
        router.get(endpoint, { search, status }, { preserveState: true, replace: true });
    };
    const resetFilters = () => {
        setSearch('');
        setStatus('');
        router.get(endpoint, {}, { preserveState: true, replace: true });
    };
    const hasFilters = search !== '' || status !== '';

    return (
        <AppPage
            title={translate(title)}
            description={
                <>
                    <strong>{items.total}</strong> data
                </>
            }
            actions={
                canManage ? (
                    <Button onClick={openCreate}>
                        <Plus /> Tambah
                    </Button>
                ) : undefined
            }
        >
            <RecordList>
                <DataToolbar
                    onSubmit={(event) => {
                        event.preventDefault();
                        applyFilters();
                    }}
                    search={
                        <div className="relative flex-1">
                            <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
                            <Input
                                value={search}
                                onChange={(event) => setSearch(event.target.value)}
                                className="h-10 bg-background pl-9"
                                placeholder={`Cari ${singular.toLowerCase()}...`}
                                aria-label={`Cari ${singular.toLowerCase()}`}
                            />
                        </div>
                    }
                    filters={
                        <select
                            value={status}
                            onChange={(event) => setStatus(event.target.value)}
                            className="h-10 min-w-36 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            aria-label={translate('Filter status')}
                        >
                            <option value="">Semua status</option>
                            <option value="active">Aktif</option>
                            <option value="inactive">Nonaktif</option>
                        </select>
                    }
                    actions={
                        <>
                            <SupportingDataMenu />
                            {hasFilters && (
                                <Button type="button" variant="ghost" onClick={resetFilters} className="h-10">
                                    <RotateCcw className="size-4" aria-hidden="true" />
                                    Reset
                                </Button>
                            )}
                            <Button type="submit" variant="outline" className="h-10">
                                Terapkan
                            </Button>
                        </>
                    }
                />

                {items.data.length === 0 ? (
                    <EmptyState
                        icon={hasFilters ? Search : Plus}
                        title={hasFilters ? translate('Data tidak ditemukan') : `Belum ada ${singular.toLowerCase()}`}
                        description={
                            hasFilters
                                ? translate('Coba ubah kata kunci atau filter yang digunakan.')
                                : translate(`Tambahkan ${singular.toLowerCase()} pertama untuk mulai mengelola data ini.`)
                        }
                        action={
                            hasFilters ? (
                                <Button type="button" variant="outline" onClick={resetFilters}>
                                    Reset filter
                                </Button>
                            ) : canManage ? (
                                <Button type="button" onClick={openCreate}>
                                    <Plus className="size-4" aria-hidden="true" />
                                    Tambah {singular}
                                </Button>
                            ) : undefined
                        }
                    />
                ) : (
                    <div>
                        {items.data.map((item) => (
                            <RecordListRow key={item.public_id} className="flex items-start justify-between gap-4">
                                <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-2">
                                        <h2 className="truncate font-bold text-foreground">{displayName(item)}</h2>
                                        <Badge
                                            variant={item.is_active ? 'secondary' : 'outline'}
                                            className="h-5 px-2 text-[10px] uppercase"
                                        >
                                            {item.is_active ? 'Aktif' : 'Nonaktif'}
                                        </Badge>
                                    </div>
                                    {details.length > 0 && (
                                        <dl className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
                                            {details.map((detail) => {
                                                const value = item[detail.key];

                                                return value !== null && value !== undefined && value !== '' ? (
                                                    <div key={detail.key} className="flex min-w-0 gap-1.5">
                                                        <dt className="text-muted-foreground">{translate(detail.label)}:</dt>
                                                        <dd className="truncate text-foreground">{String(value)}</dd>
                                                    </div>
                                                ) : null;
                                            })}
                                        </dl>
                                    )}
                                </div>
                                {canManage && (
                                    <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        onClick={() => openEdit(item)}
                                        aria-label={`Edit ${displayName(item)}`}
                                    >
                                        <Edit3 className="size-4" aria-hidden="true" />
                                    </Button>
                                )}
                            </RecordListRow>
                        ))}
                    </div>
                )}
                <div className="border-t border-border px-3 py-2 empty:hidden sm:px-4">
                    <Pagination links={items.links} />
                </div>
            </RecordList>

            {canManage && (
                <ResponsiveDialog
                    open={formOpen}
                    onOpenChange={(open) => {
                        if (!open) {
                            closeForm();
                        }
                    }}
                    title={editing ? `${translate('Edit')} ${translate(singular)}` : `${translate('Tambah')} ${translate(singular)}`}
                    size={fields.length === 1 ? 'sm' : 'md'}
                    bodyClassName="p-0"
                    footer={
                        <>
                            <Button type="button" variant="outline" onClick={closeForm} disabled={form.processing}>
                                {translate('Batal')}
                            </Button>
                            <Button type="submit" form="reference-data-form" disabled={form.processing}>
                                {form.processing
                                    ? translate('Menyimpan...')
                                    : editing
                                      ? translate('Simpan perubahan')
                                      : `${translate('Tambah')} ${translate(singular)}`}
                            </Button>
                        </>
                    }
                >
                    <form id="reference-data-form" onSubmit={submit} className="grid gap-4 px-5 py-5 sm:grid-cols-2 sm:px-6">
                        {fields.map((field) => (
                            <div key={field.name}>
                                {field.type === 'textarea' ? (
                                    <FormTextarea
                                        id={field.name}
                                        name={field.name}
                                        label={translate(field.label)}
                                        value={String(form.data[field.name] ?? '')}
                                        onChange={(event) =>
                                            form.setData((data) => ({
                                                ...data,
                                                [field.name]: event.target.value,
                                                ...field.change?.(event.target.value, data),
                                            }))
                                        }
                                        placeholder={field.placeholder}
                                        error={form.errors[field.name]}
                                    />
                                ) : field.type === 'select' ? (
                                    <FormSelect
                                        id={field.name}
                                        name={field.name}
                                        label={translate(field.label)}
                                        value={String(form.data[field.name] ?? '')}
                                        onChange={(event) =>
                                            form.setData((data) => ({
                                                ...data,
                                                [field.name]: event.target.value,
                                                ...field.change?.(event.target.value, data),
                                            }))
                                        }
                                        error={form.errors[field.name]}
                                    >
                                        {(typeof field.options === 'function' ? field.options(form.data) : field.options)?.map((option) => (
                                            <option key={option.value} value={option.value}>
                                                {translate(option.label)}
                                            </option>
                                        ))}
                                    </FormSelect>
                                ) : field.type === 'tel' ? (
                                    <FormPhoneInput
                                        id={field.name}
                                        name={field.name}
                                        label={translate(field.label)}
                                        value={String(form.data[field.name] ?? '')}
                                        onChange={(event) =>
                                            form.setData((data) => ({
                                                ...data,
                                                [field.name]: event.target.value,
                                                ...field.change?.(event.target.value, data),
                                            }))
                                        }
                                        placeholder={field.placeholder}
                                        error={form.errors[field.name]}
                                    />
                                ) : (
                                    <FormInput
                                        id={field.name}
                                        name={field.name}
                                        label={translate(field.label)}
                                        type={field.type ?? 'text'}
                                        value={
                                            field.name === 'name' && form.data.name_is_custom === false
                                                ? displayName({ ...editing, ...form.data } as T)
                                                : String(form.data[field.name] ?? '')
                                        }
                                        onChange={(event) =>
                                            form.setData((data) => ({
                                                ...data,
                                                [field.name]: event.target.value,
                                                ...field.change?.(event.target.value, data),
                                            }))
                                        }
                                        placeholder={field.placeholder}
                                        error={form.errors[field.name]}
                                    />
                                )}
                            </div>
                        ))}
                        {editing && (
                            <div className="rounded-xl border border-border bg-muted/35 p-3 sm:col-span-2">
                                <FormCheckbox
                                    id="is_active"
                                    name="is_active"
                                    label={translate('Aktif')}
                                    checked={Boolean(form.data.is_active)}
                                    onCheckedChange={(checked) => form.setData((data) => ({ ...data, is_active: checked === true }))}
                                />
                            </div>
                        )}
                    </form>
                </ResponsiveDialog>
            )}
        </AppPage>
    );
}
