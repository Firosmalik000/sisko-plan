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

export function storeThemeVariables(color = '#1f6653'): CSSProperties {
    const safeColor = /^#[0-9a-f]{6}$/i.test(color) ? color : '#1f6653';

    return {
        '--app-primary': safeColor,
        '--app-ink': mix(safeColor, '#071b17', 0.52),
        '--app-soft': mix(safeColor, '#ffffff', 0.87),
        '--app-soft-strong': mix(safeColor, '#ffffff', 0.76),
        '--primary': safeColor,
        '--ring': mix(safeColor, '#ffffff', 0.35),
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
