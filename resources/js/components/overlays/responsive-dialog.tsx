import type { ComponentProps, CSSProperties, ReactNode, Ref } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

type ResponsiveDialogProps = ComponentProps<typeof Dialog> & {
    title: ReactNode;
    description?: ReactNode;
    children: ReactNode;
    footer?: ReactNode;
    size?: 'sm' | 'md' | 'lg' | 'xl';
    mobile?: 'sheet' | 'fullscreen';
    contentClassName?: string;
    bodyClassName?: string;
    contentStyle?: CSSProperties;
    bodyRef?: Ref<HTMLDivElement>;
};

const widths = {
    sm: 'sm:max-w-md',
    md: 'sm:max-w-xl',
    lg: 'sm:max-w-2xl',
    xl: 'sm:max-w-4xl',
} as const;

export function ResponsiveDialog({
    title,
    description,
    children,
    footer,
    size = 'md',
    mobile = 'sheet',
    contentClassName,
    bodyClassName,
    contentStyle,
    bodyRef,
    ...props
}: ResponsiveDialogProps) {
    return (
        <Dialog {...props}>
            <DialogContent
                style={contentStyle}
                className={cn(
                    'flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden border-border bg-card p-0 text-card-foreground shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl dark:shadow-none',
                    mobile === 'sheet' &&
                        'max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-[18px] max-sm:rounded-b-none',
                    mobile === 'fullscreen' &&
                        'max-sm:inset-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0',
                    widths[size],
                    contentClassName,
                )}
            >
                <DialogHeader className="shrink-0 border-b border-border px-5 py-4 pr-14 text-left sm:px-6">
                    <DialogTitle className="text-lg leading-snug font-bold tracking-[-0.02em] text-foreground sm:text-xl">
                        {title}
                    </DialogTitle>
                    {description && <DialogDescription className="leading-5">{description}</DialogDescription>}
                </DialogHeader>
                <div ref={bodyRef} className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-5 sm:px-6', bodyClassName)}>
                    {children}
                </div>
                {footer && (
                    <DialogFooter className="shrink-0 border-t border-border bg-card px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:px-6 sm:pb-4">
                        {footer}
                    </DialogFooter>
                )}
            </DialogContent>
        </Dialog>
    );
}
