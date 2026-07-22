export class AudioManager {
  private context: AudioContext | null = null;

  playTone(frequency: number, durationSeconds = 0.05): void {
    const context = this.context ?? new AudioContext();
    this.context = context;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.frequency.value = frequency;
    gain.gain.setValueAtTime(0.04, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + durationSeconds);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start();
    oscillator.stop(context.currentTime + durationSeconds);
  }

  dispose(): void {
    void this.context?.close();
    this.context = null;
  }
}
