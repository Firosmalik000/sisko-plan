import { usePage } from '@inertiajs/react';
import type { ImgHTMLAttributes } from 'react';

export type LogoVariant = 'primary' | 'dark' | 'dark_contrast' | 'monochrome' | 'mark' | 'mark_dark' | 'mark_monochrome';

type BrandMarkProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    logoUrl?: string | null;
    variant?: LogoVariant;
};

export default function BrandMark({ logoUrl, variant = 'mark', alt = '', ...props }: BrandMarkProps) {
    const page = usePage<{ branding?: { logos?: Record<string, string>; logo_url?: string | null } }>();
    const branding = page.props?.branding;

    const resolvedUrl =
        logoUrl ||
        branding?.logos?.[variant] ||
        (variant === 'primary' ? branding?.logo_url : null) ||
        (variant === 'mark'
            ? '/brand/mark-light.png'
            : variant === 'dark'
              ? '/brand/logo-dark.png'
              : variant === 'dark_contrast'
                ? '/brand/logo-dark-contrast.png'
                : variant === 'monochrome'
                  ? '/brand/logo-monochrome.png'
                  : variant === 'mark_dark'
                    ? '/brand/mark-dark.png'
                    : variant === 'mark_monochrome'
                      ? '/brand/mark-monochrome.png'
                      : '/brand/logo-light.png');

    return <img src={resolvedUrl} alt={alt} {...props} />;
}
