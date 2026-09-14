import { X } from 'lucide-react';
import type { ComponentProps, CSSProperties, ReactNode, Ref } from 'react';
import { Drawer } from 'vaul';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';
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
    const isMobile = useIsMobile();

    if (mobile === 'sheet' && isMobile) {
        return (
            <Drawer.Root open={props.open} onOpenChange={props.onOpenChange} dismissible={props.modal !== false}>
                <Drawer.Portal>
                    <Drawer.Overlay className="fixed inset-0 z-50 bg-black/45 dark:bg-black/70" />
                    <Drawer.Content
                        style={contentStyle}
                        className={cn(
                            'fixed inset-x-0 bottom-0 z-50 flex max-h-[min(88dvh,44rem)] flex-col overflow-hidden rounded-t-[18px] border border-b-0 border-border bg-card text-card-foreground shadow-2xl outline-none dark:shadow-none',
                            contentClassName,
                        )}
                    >
                        <Drawer.Handle className="mt-2.5 mb-1 h-1.5 w-12 bg-muted-foreground/35" />
                        <div className="relative shrink-0 border-b border-border px-5 pt-2 pr-14 pb-4 text-left">
                            <Drawer.Title className="text-lg leading-snug font-bold tracking-[-0.02em] text-foreground">
                                {title}
                            </Drawer.Title>
                            {description && (
                                <Drawer.Description className="mt-2 text-sm leading-5 text-muted-foreground">
                                    {description}
                                </Drawer.Description>
                            )}
                            <Drawer.Close
                                aria-label="Close"
                                className="absolute top-0 right-2.5 grid size-11 place-items-center rounded-full text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
                            >
                                <X className="size-5" aria-hidden="true" />
                            </Drawer.Close>
                        </div>
                        <div ref={bodyRef} className={cn('min-h-0 flex-1 overflow-y-auto px-5 py-5', bodyClassName)}>
                            {children}
                        </div>
                        {footer && (
                            <DialogFooter className="shrink-0 border-t border-border bg-card px-5 py-4 pb-[calc(1rem+env(safe-area-inset-bottom))] [&>*]:w-full">
                                {footer}
                            </DialogFooter>
                        )}
                    </Drawer.Content>
                </Drawer.Portal>
            </Drawer.Root>
        );
    }

    return (
        <Dialog {...props}>
            <DialogContent
                style={contentStyle}
                className={cn(
                    'flex max-h-[calc(100dvh-1rem)] w-[calc(100%-1rem)] flex-col gap-0 overflow-hidden border-border bg-card p-0 text-card-foreground shadow-2xl sm:max-h-[calc(100dvh-3rem)] sm:rounded-2xl dark:shadow-none',
                    mobile === 'sheet' &&
                        'motion-reduce:duration-0 max-sm:top-auto max-sm:bottom-0 max-sm:left-0 max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-t-[18px] max-sm:rounded-b-none max-sm:data-[state=closed]:duration-180 max-sm:data-[state=closed]:zoom-out-100 max-sm:data-[state=closed]:slide-out-to-bottom max-sm:data-[state=open]:duration-240 max-sm:data-[state=open]:zoom-in-100 max-sm:data-[state=open]:slide-in-from-bottom',
                    mobile === 'fullscreen' &&
                        'motion-reduce:duration-0 max-sm:inset-0 max-sm:h-dvh max-sm:max-h-none max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-none max-sm:border-0 max-sm:data-[state=closed]:duration-180 max-sm:data-[state=closed]:zoom-out-100 max-sm:data-[state=closed]:slide-out-to-right max-sm:data-[state=open]:duration-240 max-sm:data-[state=open]:zoom-in-100 max-sm:data-[state=open]:slide-in-from-right',
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
