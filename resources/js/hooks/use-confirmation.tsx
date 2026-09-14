import { createContext, useCallback, useContext, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { ResponsiveDialog } from '@/components/overlays';
import { Button } from '@/components/ui/button';
import { translate } from '@/lib/i18n';

type ConfirmationOptions = {
    title: string;
    description?: string;
    confirmLabel?: string;
    cancelLabel?: string;
    variant?: 'default' | 'destructive';
};

type PendingConfirmation = {
    options: ConfirmationOptions;
    resolve: (confirmed: boolean) => void;
};

const ConfirmationContext = createContext<((options: ConfirmationOptions) => Promise<boolean>) | null>(null);

export function ConfirmationProvider({ children }: { children: ReactNode }) {
    const [pending, setPending] = useState<PendingConfirmation | null>(null);
    const pendingRef = useRef<PendingConfirmation | null>(null);

    const confirm = useCallback((options: ConfirmationOptions) => {
        pendingRef.current?.resolve(false);

        return new Promise<boolean>((resolve) => {
            const next = { options, resolve };
            pendingRef.current = next;
            setPending(next);
        });
    }, []);

    const settle = useCallback((confirmed: boolean) => {
        const current = pendingRef.current;
        pendingRef.current = null;
        setPending(null);
        current?.resolve(confirmed);
    }, []);

    return (
        <ConfirmationContext.Provider value={confirm}>
            {children}
            <ResponsiveDialog
                open={pending !== null}
                onOpenChange={(open) => !open && settle(false)}
                title={translate(pending?.options.title ?? 'Confirm')}
                size="sm"
                footer={
                    <>
                        <Button type="button" variant="outline" onClick={() => settle(false)}>
                            {translate(pending?.options.cancelLabel ?? 'Cancel')}
                        </Button>
                        <Button
                            type="button"
                            variant={pending?.options.variant === 'destructive' ? 'destructive' : 'default'}
                            onClick={() => settle(true)}
                        >
                            {translate(pending?.options.confirmLabel ?? 'Continue')}
                        </Button>
                    </>
                }
            >
                <p className="text-sm leading-6 text-muted-foreground">
                    {translate(pending?.options.description ?? 'Choose an action to continue.')}
                </p>
            </ResponsiveDialog>
        </ConfirmationContext.Provider>
    );
}

export function useConfirmation() {
    const confirm = useContext(ConfirmationContext);

    if (!confirm) {
        throw new Error('useConfirmation must be used within ConfirmationProvider.');
    }

    return confirm;
}
