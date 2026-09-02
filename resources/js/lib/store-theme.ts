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

export function storeThemeVariables(color = '#ee4d2d'): CSSProperties {
    const safeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : '#ee4d2d';
    const foreground = '#2d2928';
    const surface = '#fffaf7';
    const soft = mix(safeColor, '#ffffff', 0.9);
    const softStrong = mix(safeColor, '#ffffff', 0.8);
    const border = mix(safeColor, '#ffffff', 0.76);
    const primaryForeground = contrastColor(safeColor);

    return {
        '--app-primary': safeColor,
        '--app-primary-foreground': primaryForeground,
        '--app-shadow': `${safeColor}38`,
        '--app-ink': foreground,
        '--app-soft': soft,
        '--app-soft-strong': softStrong,
        '--background': surface,
        '--foreground': foreground,
        '--card': '#ffffff',
        '--card-foreground': foreground,
        '--popover': '#ffffff',
        '--popover-foreground': foreground,
        '--primary': safeColor,
        '--primary-foreground': primaryForeground,
        '--secondary': soft,
        '--secondary-foreground': foreground,
        '--muted': '#f8ede9',
        '--muted-foreground': '#756d6a',
        '--accent': softStrong,
        '--accent-foreground': foreground,
        '--border': border,
        '--input': mix(safeColor, '#ffffff', 0.68),
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
    const workspace = document.querySelector<HTMLElement>(
        '.customer-workspace',
    );

    if (!workspace) {
        return;
    }

    const variables = storeThemeVariables(color) as Record<string, string>;
    Object.entries(variables).forEach(([name, value]) =>
        workspace.style.setProperty(name, value),
    );
}
