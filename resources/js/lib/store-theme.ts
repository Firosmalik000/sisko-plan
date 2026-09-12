import type { CSSProperties } from 'react';

export const storeThemePresets = [
    { name: 'Sisko Orange', color: '#ee4d2d' },
    { name: 'Coral', color: '#f35d3d' },
    { name: 'Samudra', color: '#147d92' },
    { name: 'Nila', color: '#5753c9' },
    { name: 'Anggur', color: '#a34888' },
    { name: 'Arang', color: '#334155' },
] as const;

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
    const foreground = dark ? '#f4f1ef' : '#2d2928';
    const surface = dark ? '#141414' : mix(safeColor, '#ffffff', 0.965);
    const card = dark ? '#1c1c1c' : '#ffffff';
    const soft = dark ? '#242424' : mix(safeColor, '#ffffff', 0.9);
    const softStrong = dark ? mix(safeColor, '#242424', 0.84) : mix(safeColor, '#ffffff', 0.8);
    const border = dark ? '#343434' : mix(safeColor, '#ffffff', 0.76);
    const input = dark ? '#454545' : mix(safeColor, '#ffffff', 0.68);
    const muted = dark ? '#222222' : mix(safeColor, '#ffffff', 0.94);
    const mutedForeground = dark ? '#b9b3b0' : '#756d6a';
    const primaryForeground = contrastColor(safeColor);

    return {
        colorScheme: appearance,
        fontFamily: '"Inter", ui-sans-serif, system-ui, sans-serif',
        '--app-primary': safeColor,
        '--app-primary-foreground': primaryForeground,
        '--app-shadow': dark ? 'transparent' : `${safeColor}38`,
        '--app-ink': foreground,
        '--app-soft': soft,
        '--app-soft-strong': softStrong,
        '--background': surface,
        '--foreground': foreground,
        '--card': card,
        '--card-foreground': foreground,
        '--popover': card,
        '--popover-foreground': foreground,
        '--primary': safeColor,
        '--primary-foreground': primaryForeground,
        '--secondary': soft,
        '--secondary-foreground': foreground,
        '--muted': muted,
        '--muted-foreground': mutedForeground,
        '--accent': softStrong,
        '--accent-foreground': foreground,
        '--border': border,
        '--input': input,
        '--ring': safeColor,
        '--sidebar': surface,
        '--sidebar-foreground': foreground,
        '--sidebar-primary': safeColor,
        '--sidebar-primary-foreground': primaryForeground,
        '--sidebar-accent': soft,
        '--sidebar-accent-foreground': foreground,
        '--sidebar-border': border,
        '--sidebar-ring': safeColor,
        // Tailwind's generated utilities read --color-* tokens. Defining the
        // aliases at the customer boundary keeps the public/landing palette
        // untouched while making shared semantic components store-aware.
        '--color-background': surface,
        '--color-foreground': foreground,
        '--color-card': card,
        '--color-card-foreground': foreground,
        '--color-popover': card,
        '--color-popover-foreground': foreground,
        '--color-primary': safeColor,
        '--color-primary-foreground': primaryForeground,
        '--color-secondary': soft,
        '--color-secondary-foreground': foreground,
        '--color-muted': muted,
        '--color-muted-foreground': mutedForeground,
        '--color-accent': softStrong,
        '--color-accent-foreground': foreground,
        '--color-border': border,
        '--color-input': input,
        '--color-ring': safeColor,
        '--color-sidebar': surface,
        '--color-sidebar-foreground': foreground,
        '--color-sidebar-primary': safeColor,
        '--color-sidebar-primary-foreground': primaryForeground,
        '--color-sidebar-accent': soft,
        '--color-sidebar-accent-foreground': foreground,
        '--color-sidebar-border': border,
        '--color-sidebar-ring': safeColor,
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
