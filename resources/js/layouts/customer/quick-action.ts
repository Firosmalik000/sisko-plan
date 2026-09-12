export type QuickActionMode = 'scan' | 'manual';

export function quickActionHref(href: string, mode: QuickActionMode, supportsScan = true): string {
    return mode === 'scan' && supportsScan ? `${href}?scan=1` : href;
}
