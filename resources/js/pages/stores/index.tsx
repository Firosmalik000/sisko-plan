import { Head, Link, router, usePage } from '@inertiajs/react';
import {
    ArrowRight,
    Building2,
    LockKeyhole,
    Plus,
    ShieldCheck,
    Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import type { StoreCreationState } from '@/types';

type StoreItem = {
    public_id: string;
    name: string;
    status: 'active' | 'suspended';
    role: 'owner' | 'admin' | 'cashier';
    membership_status: 'active' | 'suspended';
};

export default function StoresIndex({ stores }: { stores: StoreItem[] }) {
    const { storeCreation } = usePage<{
        storeCreation: StoreCreationState;
    }>().props;

    return (
        <>
            <Head title="Toko & Anggota" />
            <div className="flex flex-1 flex-col gap-4 bg-[linear-gradient(180deg,#f8faf6_0%,#f2f5f0_100%)] px-3 py-4 sm:px-5 lg:px-8">
                <div className="flex flex-row items-center justify-between gap-3 rounded-[1.35rem] border border-[#173c35]/8 bg-white p-4 shadow-sm sm:p-5">
                    <h1 className="text-2xl font-black tracking-[-0.04em] text-[#173c35]">
                        Toko & Anggota
                    </h1>
                    {storeCreation.can_create ? (
                        <Button
                            asChild
                            className="bg-emerald-700 hover:bg-emerald-800"
                        >
                            <Link href="/stores/create">
                                <Plus /> Tambah toko
                            </Link>
                        </Button>
                    ) : (
                        <Button disabled variant="outline">
                            <LockKeyhole /> Batas toko tercapai
                        </Button>
                    )}
                </div>

                {stores.length === 0 ? (
                    <div className="rounded-3xl border border-dashed bg-muted/30 px-6 py-20 text-center">
                        <Building2 className="mx-auto mb-5 size-10 text-emerald-700" />
                        <h2 className="text-xl font-semibold">
                            Belum ada toko
                        </h2>
                        <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
                            Buat toko pertama untuk mengaktifkan dashboard dan
                            mulai menyiapkan operasional.
                        </p>
                        {storeCreation.can_create && (
                            <Button
                                asChild
                                className="mt-6 bg-emerald-700 hover:bg-emerald-800"
                            >
                                <Link href="/stores/create">
                                    Buat toko pertama
                                </Link>
                            </Button>
                        )}
                    </div>
                ) : (
                    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                        {stores.map((store) => (
                            <Card
                                key={store.public_id}
                                className="gap-3 overflow-hidden rounded-[1.25rem] border-border/70 py-4 transition-shadow hover:shadow-md"
                            >
                                <CardHeader className="border-b bg-muted/20 px-4">
                                    <div className="flex items-start justify-between gap-3">
                                        <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-700 text-white">
                                            <Building2 className="size-5" />
                                        </div>
                                        <Badge
                                            variant={
                                                store.status === 'active' &&
                                                store.membership_status ===
                                                    'active'
                                                    ? 'secondary'
                                                    : 'destructive'
                                            }
                                        >
                                            {store.status === 'active' &&
                                            store.membership_status === 'active'
                                                ? 'Aktif'
                                                : 'Nonaktif'}
                                        </Badge>
                                    </div>
                                    <CardTitle className="mt-2 text-lg">
                                        {store.name}
                                    </CardTitle>
                                </CardHeader>
                                <CardContent className="grid grid-cols-2 gap-3 px-4 text-sm">
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <ShieldCheck className="size-4" />
                                        <span className="capitalize">
                                            {store.role}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-2 text-muted-foreground">
                                        <Users className="size-4" />
                                        Akses anggota
                                    </div>
                                </CardContent>
                                <CardFooter className="justify-between border-t px-4 pt-3">
                                    {store.role === 'owner' ? (
                                        <Button variant="ghost" asChild>
                                            <Link
                                                href={`/stores/${store.public_id}`}
                                            >
                                                Kelola <ArrowRight />
                                            </Link>
                                        </Button>
                                    ) : (
                                        <span className="text-xs text-muted-foreground capitalize">
                                            Akses {store.role}
                                        </span>
                                    )}
                                    {store.status === 'active' &&
                                        store.membership_status ===
                                            'active' && (
                                            <Button
                                                variant="outline"
                                                onClick={() =>
                                                    router.post(
                                                        `/stores/${store.public_id}/switch`,
                                                    )
                                                }
                                            >
                                                Pilih toko
                                            </Button>
                                        )}
                                </CardFooter>
                            </Card>
                        ))}
                    </div>
                )}
            </div>
        </>
    );
}

StoresIndex.layout = {
    breadcrumbs: [{ title: 'Toko & Anggota', href: '/stores' }],
};
