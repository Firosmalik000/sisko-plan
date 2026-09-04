let audioContext: AudioContext | null = null;

export function playScannerSuccessTone(): void {
    if (typeof window === 'undefined' || !window.AudioContext) {
        return;
    }

    void playTone();
}

async function playTone(): Promise<void> {
    try {
        audioContext ??= new window.AudioContext();

        if (audioContext.state === 'suspended') {
            await audioContext.resume();
        }

        if (audioContext.state !== 'running') {
            return;
        }

        const start = audioContext.currentTime;
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();

        oscillator.type = 'sine';
        oscillator.frequency.setValueAtTime(1480, start);
        gain.gain.setValueAtTime(0.0001, start);
        gain.gain.exponentialRampToValueAtTime(0.12, start + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.085);

        oscillator.connect(gain);
        gain.connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + 0.09);
    } catch {
        // Audio feedback is optional; capture remains successful when muted or blocked.
    }
}
