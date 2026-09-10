import type { ImgHTMLAttributes } from 'react';

type BrandMarkProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    logoUrl?: string | null;
};

export default function BrandMark({ logoUrl, alt = '', ...props }: BrandMarkProps) {
    return <img src={logoUrl || '/icons/icon-192.png'} alt={alt} {...props} />;
}
