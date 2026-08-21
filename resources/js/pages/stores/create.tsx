import { Form, Head, Link } from '@inertiajs/react';
import { ArrowLeft } from 'lucide-react';
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
            <div className="min-h-full bg-[linear-gradient(180deg,#f8faf6_0%,#f2f5f0_100%)] px-3 py-4 sm:px-5 lg:px-8">
                <div className="mx-auto w-full max-w-xl">
                    <Card className="rounded-[1.35rem] border-[#173c35]/8 py-5 shadow-sm">
                        <CardContent className="space-y-5 px-4 sm:px-5">
                            <div>
                                <Link
                                    href="/stores"
                                    className="mb-4 inline-flex items-center gap-2 text-xs font-bold text-muted-foreground hover:text-foreground"
                                >
                                    <ArrowLeft className="size-4" />
                                    Daftar toko
                                </Link>
                                <h1 className="text-2xl font-black tracking-[-0.04em] text-[#173c35]">
                                    Buat Toko
                                </h1>
                            </div>
                            <Form
                                action="/stores"
                                method="post"
                                className="space-y-4"
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
                                                className="h-10"
                                            />
                                            <InputError message={errors.name} />
                                        </div>
                                        <Button
                                            disabled={processing}
                                            className="h-10 w-full bg-emerald-700 hover:bg-emerald-800"
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
