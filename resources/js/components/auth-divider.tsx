import { useTranslation } from '@/lib/i18n';

export default function AuthDivider() {
    const { t } = useTranslation();

    return (
        <div className="my-3 flex items-center gap-3 sm:my-3.5" aria-hidden="true">
            <span className="h-px flex-1 bg-[#ecd5ce]" />
            <span className="text-[11px] font-medium tracking-wider text-[#8f756e] uppercase sm:text-xs">{t('or')}</span>
            <span className="h-px flex-1 bg-[#ecd5ce]" />
        </div>
    );
}
