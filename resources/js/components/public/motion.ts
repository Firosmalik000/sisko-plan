import type { Variants } from 'framer-motion';

export const publicEase = [0.16, 1, 0.3, 1] as const;

export const revealUp: Variants = {
    hidden: { opacity: 0, y: 28, filter: 'blur(5px)' },
    visible: {
        opacity: 1,
        y: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.58, ease: publicEase },
    },
};

export const revealLeft: Variants = {
    hidden: { opacity: 0, x: -34, filter: 'blur(4px)' },
    visible: {
        opacity: 1,
        x: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.62, ease: publicEase },
    },
};

export const revealRight: Variants = {
    hidden: { opacity: 0, x: 34, filter: 'blur(4px)' },
    visible: {
        opacity: 1,
        x: 0,
        filter: 'blur(0px)',
        transition: { duration: 0.62, ease: publicEase },
    },
};

export const revealClip: Variants = {
    hidden: { opacity: 0, clipPath: 'inset(0 0 22% 0)' },
    visible: {
        opacity: 1,
        clipPath: 'inset(0 0 0% 0)',
        transition: { duration: 0.68, ease: publicEase },
    },
};

export const staggerGroup: Variants = {
    hidden: {},
    visible: {
        transition: { delayChildren: 0.08, staggerChildren: 0.09 },
    },
};

export const staggerItem: Variants = {
    hidden: { opacity: 0, y: 22 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.48, ease: publicEase },
    },
};

export const publicViewport = { once: true, amount: 0.18 } as const;
