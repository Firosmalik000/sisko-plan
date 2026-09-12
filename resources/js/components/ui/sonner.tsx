import { useFlashToast } from '@/hooks/use-flash-toast';
import { useAppearance } from '@/hooks/use-appearance';
import { useIsMobile } from '@/hooks/use-mobile';
import { translate } from '@/lib/i18n';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

function Toaster({ ...props }: ToasterProps) {
    useFlashToast();
    const { resolvedAppearance } = useAppearance();
    const isMobile = useIsMobile();

    return (
        <Sonner
            theme={resolvedAppearance}
            className="toaster group"
            position={isMobile ? 'top-center' : 'bottom-right'}
            offset={isMobile ? { top: 'calc(4.75rem + env(safe-area-inset-top))' } : 20}
            closeButton
            visibleToasts={3}
            duration={4000}
            toastOptions={{
                closeButtonAriaLabel: translate('Tutup notifikasi'),
                classNames: {
                    toast: 'rounded-xl border-border bg-popover text-popover-foreground shadow-lg dark:shadow-none',
                    title: 'font-medium',
                    description: 'text-muted-foreground',
                    closeButton:
                        'size-7 border-border bg-popover text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring',
                },
            }}
            style={
                {
                    '--normal-bg': 'var(--popover)',
                    '--normal-text': 'var(--popover-foreground)',
                    '--normal-border': 'var(--border)',
                } as React.CSSProperties
            }
            {...props}
        />
    );
}

export { Toaster };
