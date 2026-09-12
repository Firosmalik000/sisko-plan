import { useSyncExternalStore } from 'react';

export type ResolvedAppearance = 'light' | 'dark';
export type Appearance = ResolvedAppearance | 'system';
export type UseAppearanceReturn = {
    readonly appearance: Appearance;
    readonly resolvedAppearance: ResolvedAppearance;
    readonly updateAppearance: (mode: Appearance) => void;
};

const listeners = new Set<() => void>();
let currentAppearance: Appearance = 'light';
let systemDark = false;
const notify = () => listeners.forEach((listener) => listener());
const subscribe = (callback: () => void) => {
    listeners.add(callback);

    return () => {
        listeners.delete(callback);
    };
};
const resolved = (): ResolvedAppearance => (currentAppearance === 'system' ? (systemDark ? 'dark' : 'light') : currentAppearance);
const applyTheme = () => {
    document.documentElement.classList.toggle('dark', resolved() === 'dark');
    document.documentElement.style.colorScheme = resolved();
};

export function initializeTheme(): void {
    if (typeof window === 'undefined') {
        return;
    }

    const stored = localStorage.getItem('appearance');
    currentAppearance = stored === 'dark' || stored === 'system' ? stored : 'light';
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    systemDark = media.matches;
    media.addEventListener('change', (event) => {
        systemDark = event.matches;
        applyTheme();
        notify();
    });
    applyTheme();
}

export function useAppearance(): UseAppearanceReturn {
    const appearance = useSyncExternalStore(
        subscribe,
        () => currentAppearance,
        () => 'light' as Appearance,
    );
    const resolvedAppearance = useSyncExternalStore(subscribe, resolved, () => 'light' as ResolvedAppearance);
    const updateAppearance = (mode: Appearance) => {
        currentAppearance = mode;
        localStorage.setItem('appearance', mode);
        document.cookie = `appearance=${mode};path=/;max-age=31536000;SameSite=Lax`;
        applyTheme();
        notify();
    };

    return { appearance, resolvedAppearance, updateAppearance };
}
