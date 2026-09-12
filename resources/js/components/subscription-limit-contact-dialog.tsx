import { usePage } from '@inertiajs/react';
import { Building2, ExternalLink, MessageCircle, PackagePlus, ScanLine, Users } from 'lucide-react';
import type { ComponentType } from 'react';
import { ResponsiveDialog } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { useTranslation } from '@/lib/i18n';

export type SubscriptionLimitKind = 'store' | 'product' | 'staff' | 'scan';

type Locale = 'id' | 'en' | 'ms' | 'vi';

type LocalizedCopy = {
    title: string;
    description: string;
    request: string;
    action: string;
    cancel: string;
    unavailable: string;
};

const copy: Record<SubscriptionLimitKind, LocalizedCopy> = {
    store: {
        title: 'Kapasitas toko sudah penuh',
        description: 'Hubungi admin untuk menambah kapasitas toko pada akun Anda.',
        request: 'saya ingin mengajukan penambahan kapasitas toko untuk akun saya',
        action: 'Hubungi admin via WhatsApp',
        cancel: 'Nanti saja',
        unavailable: 'Nomor WhatsApp dukungan belum tersedia. Silakan hubungi admin platform.',
    },
    product: {
        title: 'Kapasitas produk sudah penuh',
        description: 'Hubungi admin untuk menambah kapasitas produk pada akun Anda.',
        request: 'saya ingin mengajukan penambahan kapasitas produk untuk akun saya',
        action: 'Hubungi admin via WhatsApp',
        cancel: 'Nanti saja',
        unavailable: 'Nomor WhatsApp dukungan belum tersedia. Silakan hubungi admin platform.',
    },
    staff: {
        title: 'Kapasitas staf sudah penuh',
        description: 'Hubungi admin untuk menambah kapasitas staf pada akun Anda.',
        request: 'saya ingin mengajukan penambahan kapasitas staf untuk akun saya',
        action: 'Hubungi admin via WhatsApp',
        cancel: 'Nanti saja',
        unavailable: 'Nomor WhatsApp dukungan belum tersedia. Silakan hubungi admin platform.',
    },
    scan: {
        title: 'Kuota scan sudah habis',
        description: 'Hubungi admin untuk menambah kuota scan pada akun Anda.',
        request: 'saya ingin mengajukan penambahan kuota scan untuk akun saya',
        action: 'Hubungi admin via WhatsApp',
        cancel: 'Nanti saja',
        unavailable: 'Nomor WhatsApp dukungan belum tersedia. Silakan hubungi admin platform.',
    },
};

const icons: Record<SubscriptionLimitKind, ComponentType<{ className?: string }>> = {
    store: Building2,
    product: PackagePlus,
    staff: Users,
    scan: ScanLine,
};

export function SubscriptionLimitContactDialog({
    kind,
    open,
    onOpenChange,
}: {
    kind: SubscriptionLimitKind;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}) {
    const { branding } = usePage().props;
    const { locale, t } = useTranslation();
    const content = copy[kind];
    const Icon = icons[kind];
    const phone = normalizeWhatsAppNumber(branding.support_phone);
    const message = createMessage(locale, branding.brand_name, t(content.request));
    const whatsappUrl = phone ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}` : null;

    return (
        <ResponsiveDialog
            open={open}
            onOpenChange={onOpenChange}
            title={t(content.title)}
            size="sm"
            footer={
                <>
                    <Button type="button" variant="outline" className="h-11" onClick={() => onOpenChange(false)}>
                        {t(content.cancel)}
                    </Button>
                    {whatsappUrl && (
                        <Button asChild className="h-11 bg-[#128c4b] text-white hover:bg-[#0e773f]">
                            <a href={whatsappUrl} target="_blank" rel="noreferrer">
                                <MessageCircle className="size-4" />
                                {t(content.action)}
                                <ExternalLink className="size-3.5" />
                            </a>
                        </Button>
                    )}
                </>
            }
        >
            <div className="flex items-start gap-3">
                <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-secondary text-primary">
                    <Icon className="size-5" />
                </span>
                <p className="pt-1 text-sm leading-6 text-muted-foreground">{t(content.description)}</p>
            </div>
            {!whatsappUrl && (
                <p role="status" className="mt-4 rounded-xl bg-secondary px-4 py-3 text-sm font-semibold text-secondary-foreground">
                    {t(content.unavailable)}
                </p>
            )}
        </ResponsiveDialog>
    );
}

export function normalizeWhatsAppNumber(value: string | null): string | null {
    if (!value) {
        return null;
    }

    let digits = value.replace(/\D/gu, '');

    if (digits.startsWith('00')) {
        digits = digits.slice(2);
    } else if (digits.startsWith('0')) {
        digits = `62${digits.slice(1)}`;
    }

    return /^[1-9]\d{7,14}$/u.test(digits) ? digits : null;
}

function createMessage(locale: Locale, brandName: string, request: string): string {
    if (locale === 'en') {
        return `Hello ${brandName} Admin, ${request}. Please share the available options and the next steps. Thank you.`;
    }

    if (locale === 'ms') {
        return `Salam Pentadbir ${brandName}, ${request}. Mohon maklumat tentang pilihan yang tersedia dan proses seterusnya. Terima kasih.`;
    }

    if (locale === 'vi') {
        return `Xin chào Quản trị viên ${brandName}, ${request}. Vui lòng cho tôi biết các lựa chọn hiện có và hướng dẫn bước tiếp theo. Xin cảm ơn.`;
    }

    return `Halo Admin ${brandName}, ${request}. Mohon informasi mengenai pilihan yang tersedia dan proses selanjutnya. Terima kasih.`;
}
