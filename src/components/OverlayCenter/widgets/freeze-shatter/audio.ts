import type { WidgetConfig } from './config';

export class IceAudio {
  private context?: AudioContext;
  private active = new Set<AudioScheduledSourceNode>();

  unlock() {
    this.context ??= new AudioContext();
    void this.context.resume();
  }

  play(phase: 'formation' | 'cracking' | 'shatter', config: WidgetConfig) {
    if (!config.sound || !this.context) return;
    const variant = config[`${phase}Sound`];
    if (variant === 'none') return;
    const ctx = this.context;
    const now = ctx.currentTime;
    const volume = config[`${phase}Volume`];
    const length = phase === 'formation' ? 0.65 : phase === 'cracking' ? 0.25 : 0.9;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length * 5);
    const noise = ctx.createBufferSource();
    const filter = ctx.createBiquadFilter();
    const gain = ctx.createGain();
    noise.buffer = buffer;
    filter.type = phase === 'formation' ? 'bandpass' : 'highpass';
    filter.frequency.value = variant === 'deep' || variant === 'heavy' ? 600 : phase === 'formation' ? 2400 : 1300;
    filter.Q.value = phase === 'formation' ? 4 : 0.6;
    gain.gain.setValueAtTime(volume * 0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + length);
    noise.connect(filter).connect(gain).connect(ctx.destination);
    noise.start(now);
    this.active.add(noise);
    noise.onended = () => { this.active.delete(noise); noise.disconnect(); filter.disconnect(); gain.disconnect(); };
    if (phase !== 'cracking') {
      [1100, 1750, 2670].forEach((frequency, index) => {
        const tone = ctx.createOscillator();
        const envelope = ctx.createGain();
        tone.type = 'sine';
        tone.frequency.setValueAtTime(frequency * (variant === 'heavy' ? 0.45 : 1), now);
        envelope.gain.setValueAtTime(volume * 0.035, now + index * 0.035);
        envelope.gain.exponentialRampToValueAtTime(0.001, now + length);
        tone.connect(envelope).connect(ctx.destination);
        tone.start(now + index * 0.035); tone.stop(now + length);
        this.active.add(tone);
        tone.onended = () => { this.active.delete(tone); tone.disconnect(); envelope.disconnect(); };
      });
    }
  }

  stop() {
    this.active.forEach(source => { try { source.stop(); } catch { /* Already ended. */ } });
    this.active.clear();
  }

  destroy() { this.stop(); void this.context?.close(); }
}
