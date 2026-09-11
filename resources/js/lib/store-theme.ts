import type { CSSProperties } from 'react';

function hexToRgb(hex: string) {
    const value = hex.replace('#', '');
    const number = Number.parseInt(value, 16);

    return {
        r: (number >> 16) & 255,
        g: (number >> 8) & 255,
        b: number & 255,
    };
}

function mix(hex: string, target: string, amount: number) {
    const from = hexToRgb(hex);
    const to = hexToRgb(target);
    const channel = (start: number, end: number) =>
        Math.round(start + (end - start) * amount)
            .toString(16)
            .padStart(2, '0');

    return `#${channel(from.r, to.r)}${channel(from.g, to.g)}${channel(from.b, to.b)}`;
}

function contrastColor(hex: string) {
    const { r, g, b } = hexToRgb(hex);
    const luminance = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;

    return luminance > 0.64 ? '#2d2928' : '#ffffff';
}

export function storeThemeVariables(color = '#ee4d2d', appearance: 'light' | 'dark' = 'light'): CSSProperties {
    const safeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : '#ee4d2d';
    const dark = appearance === 'dark';
    const foreground = dark ? '#f5efec' : '#2d2928';
    const surface = dark ? '#201c1b' : '#fffaf7';
    const soft = dark ? mix(safeColor, '#201c1b', 0.86) : mix(safeColor, '#ffffff', 0.9);
    const softStrong = dark ? mix(safeColor, '#201c1b', 0.72) : mix(safeColor, '#ffffff', 0.8);
    const border = dark ? '#51443f' : mix(safeColor, '#ffffff', 0.76);
    const primaryForeground = contrastColor(safeColor);

    return {
        colorScheme: appearance,
        fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
        '--app-primary': safeColor,
        '--app-primary-foreground': primaryForeground,
        '--app-shadow': `${safeColor}38`,
        '--app-ink': foreground,
        '--app-soft': soft,
        '--app-soft-strong': softStrong,
        '--background': surface,
        '--foreground': foreground,
        '--card': dark ? '#2b2523' : '#ffffff',
        '--card-foreground': foreground,
        '--popover': dark ? '#2b2523' : '#ffffff',
        '--popover-foreground': foreground,
        '--primary': safeColor,
        '--primary-foreground': primaryForeground,
        '--secondary': soft,
        '--secondary-foreground': foreground,
        '--muted': dark ? '#352e2b' : '#f8ede9',
        '--muted-foreground': dark ? '#c1b3ad' : '#756d6a',
        '--accent': softStrong,
        '--accent-foreground': foreground,
        '--border': border,
        '--input': dark ? '#6a5951' : mix(safeColor, '#ffffff', 0.68),
        '--ring': safeColor,
        '--sidebar': surface,
        '--sidebar-foreground': foreground,
        '--sidebar-primary': safeColor,
        '--sidebar-primary-foreground': primaryForeground,
        '--sidebar-accent': soft,
        '--sidebar-accent-foreground': foreground,
        '--sidebar-border': border,
        '--sidebar-ring': safeColor,
        '--workspace-50': mix(safeColor, '#ffffff', 0.94),
        '--workspace-100': mix(safeColor, '#ffffff', 0.88),
        '--workspace-200': mix(safeColor, '#ffffff', 0.74),
        '--workspace-300': mix(safeColor, '#ffffff', 0.56),
        '--workspace-400': mix(safeColor, '#ffffff', 0.32),
        '--workspace-500': mix(safeColor, '#ffffff', 0.12),
        '--workspace-600': safeColor,
        '--workspace-700': mix(safeColor, '#000000', 0.12),
        '--workspace-800': mix(safeColor, '#000000', 0.24),
        '--workspace-900': mix(safeColor, '#000000', 0.36),
        '--workspace-950': mix(safeColor, '#000000', 0.54),
    } as CSSProperties;
}

export function previewStoreTheme(color: string) {
    const workspace = document.querySelector<HTMLElement>('.customer-workspace');

    if (!workspace) {
        return;
    }

    const variables = storeThemeVariables(color, document.documentElement.classList.contains('dark') ? 'dark' : 'light') as Record<
        string,
        string
    >;
    Object.entries(variables).forEach(([name, value]) =>
        workspace.style.setProperty(
            name.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`),
            value,
        ),
    );
}
