let audioContext: AudioContext | null = null;
let lastToneAt = 0;

type ScannerAudioWindow = Window &
    typeof globalThis & {
        webkitAudioContext?: typeof AudioContext;
    };

export function prepareScannerTone(): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        const AudioContextConstructor = window.AudioContext ?? (window as ScannerAudioWindow).webkitAudioContext;

        if (!AudioContextConstructor) {
            return;
        }

        audioContext ??= new AudioContextConstructor();

        if (audioContext.state === 'suspended') {
            void audioContext.resume();
        }
    } catch {
        // Scanner remains usable when the browser or device blocks audio.
    }
}

export function playScannerSuccessTone(): void {
    if (typeof window === 'undefined' || performance.now() - lastToneAt < 250) {
        return;
    }

    lastToneAt = performance.now();
    void playTone();
}

async function playTone(): Promise<void> {
    try {
        prepareScannerTone();

        if (!audioContext) {
            return;
        }

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        if (audioContext.state !== 'running') {
            return;
        }

        const start = audioContext.currentTime + 0.005;
        playPulse(audioContext, start, 0.075, 2050, 0.32);
        playPulse(audioContext, start + 0.105, 0.09, 2550, 0.3);
    } catch {
        // Audio feedback is optional; capture remains successful when muted or blocked.
    }
}

function playPulse(context: AudioContext, start: number, duration: number, frequency: number, volume: number): void {
    const oscillator = context.createOscillator();
    const gain = context.createGain();

    oscillator.type = 'square';
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(volume, start + 0.004);
    gain.gain.setValueAtTime(volume, start + duration - 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    oscillator.connect(gain);
    gain.connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration);
}
