import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft, Building2, Sparkles } from 'lucide-react';
import InputError from '@/components/input-error';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Spinner } from '@/components/ui/spinner';

export default function CreateStore() {
    return (
        <>
            <Head title="Buat Toko" />
            <div className="mx-auto flex w-full max-w-5xl flex-1 items-center px-4 py-10 md:px-8">
                <div className="grid w-full overflow-hidden rounded-3xl border bg-card shadow-sm lg:grid-cols-[1.05fr_1fr]">
                    <div className="relative hidden min-h-[560px] overflow-hidden bg-[#173f35] p-10 text-white lg:flex lg:flex-col lg:justify-between">
                        <div className="absolute -top-24 -right-24 size-72 rounded-full border border-white/15" />
                        <div className="absolute -bottom-32 -left-20 size-80 rounded-full bg-[#d8a63d]/20" />
                        <div className="relative flex size-12 items-center justify-center rounded-2xl bg-white/10">
                            <Building2 className="size-6" />
                        </div>
                        <div className="relative space-y-4">
                            <div className="flex items-center gap-2 text-sm text-emerald-100">
                                <Sparkles className="size-4" />
                                Fondasi operasional Anda
                            </div>
                            <h1 className="max-w-md text-4xl font-semibold tracking-tight">
                                Satu akun, beberapa toko, data tetap terpisah.
                            </h1>
                            <p className="max-w-md text-sm leading-6 text-emerald-50/75">
                                Toko yang dibuat akan menjadi ruang kerja aktif
                                Anda. Produk, stok, transaksi, dan laporan pada
                                fase berikutnya selalu mengikuti toko ini.
                            </p>
                        </div>
                    </div>
                    <Card className="justify-center rounded-none border-0 px-2 py-10 shadow-none md:px-8">
                        <CardContent className="space-y-8">
                            <div>
                                <Link
                                    href="/stores"
                                    className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                                >
                                    <ArrowLeft className="size-4" />
                                    Daftar toko
                                </Link>
                                <p className="mb-2 text-xs font-semibold tracking-[0.2em] text-emerald-700 uppercase">
                                    Langkah pertama
                                </p>
                                <h2 className="text-3xl font-semibold tracking-tight">
                                    Beri nama toko Anda
                                </h2>
                                <p className="mt-2 text-sm text-muted-foreground">
                                    Nama dapat diubah kembali oleh pemilik toko.
                                </p>
                            </div>
                            <Form
                                action="/stores"
                                method="post"
                                className="space-y-6"
                            >
                                {({ processing, errors }) => (
                                    <>
                                        <div className="space-y-2">
                                            <Label htmlFor="name">
                                                Nama toko
                                            </Label>
                                            <Input
                                                id="name"
                                                name="name"
                                                placeholder="Contoh: Toko Berkah Utama"
                                                autoFocus
                                                required
                                                maxLength={120}
                                                className="h-11"
                                            />
                                            <InputError message={errors.name} />
                                        </div>
                                        <Button
                                            disabled={processing}
                                            className="h-11 w-full bg-emerald-700 hover:bg-emerald-800"
                                        >
                                            {processing && <Spinner />}
                                            Buat toko dan lanjutkan
                                        </Button>
                                    </>
                                )}
                            </Form>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </>
    );
}

CreateStore.layout = {
    breadcrumbs: [{ title: 'Buat toko', href: '/stores/create' }],
};
