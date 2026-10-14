import type { MoneyExplosionConfig } from './config';

export class MoneyExplosionAudio {
  private context?: AudioContext;
  private active = new Set<AudioScheduledSourceNode>();

  unlock() {
    this.context ??= new AudioContext();
    void this.context.resume();
  }

  explosion(config: MoneyExplosionConfig) {
    if (!config.sound || !config.explosionSound || !this.context) return;
    const ctx = this.context; const now = ctx.currentTime; const length = 0.85;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * Math.exp(-i / data.length * 7);
    const noise = ctx.createBufferSource(); const filter = ctx.createBiquadFilter(); const gain = ctx.createGain();
    noise.buffer = buffer; filter.type = 'lowpass'; filter.frequency.setValueAtTime(1600, now); filter.frequency.exponentialRampToValueAtTime(140, now + length);
    gain.gain.setValueAtTime(config.explosionVolume * 0.55, now); gain.gain.exponentialRampToValueAtTime(0.001, now + length);
    noise.connect(filter).connect(gain).connect(ctx.destination); noise.start(now); this.track(noise, [filter, gain]);
    const tone = ctx.createOscillator(); const toneGain = ctx.createGain();
    tone.type = 'sine'; tone.frequency.setValueAtTime(110, now); tone.frequency.exponentialRampToValueAtTime(42, now + 0.42);
    toneGain.gain.setValueAtTime(config.explosionVolume * 0.24, now); toneGain.gain.exponentialRampToValueAtTime(0.001, now + 0.46);
    tone.connect(toneGain).connect(ctx.destination); tone.start(now); tone.stop(now + 0.46); this.track(tone, [toneGain]);
  }

  flutter(config: MoneyExplosionConfig, duration: number) {
    if (!config.sound || !config.flutterSound || !this.context) return;
    const ctx = this.context; const now = ctx.currentTime; const length = Math.min(3.8, Math.max(0.5, duration));
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * length), ctx.sampleRate); const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) {
      const wave = Math.sin(i / ctx.sampleRate * 28) * 0.55 + Math.sin(i / ctx.sampleRate * 43) * 0.45;
      data[i] = (Math.random() * 2 - 1) * Math.max(0, wave) * Math.sin(Math.PI * i / data.length);
    }
    const source = ctx.createBufferSource(); const filter = ctx.createBiquadFilter(); const gain = ctx.createGain();
    source.buffer = buffer; filter.type = 'bandpass'; filter.frequency.value = 2600; filter.Q.value = 0.65;
    gain.gain.value = config.flutterVolume * 0.16; source.connect(filter).connect(gain).connect(ctx.destination); source.start(now); this.track(source, [filter, gain]);
  }

  private track(source: AudioScheduledSourceNode, nodes: AudioNode[]) {
    this.active.add(source);
    source.onended = () => { this.active.delete(source); source.disconnect(); nodes.forEach(node => node.disconnect()); };
  }

  stop() { this.active.forEach(source => { try { source.stop(); } catch { /* already ended */ } }); this.active.clear(); }
  destroy() { this.stop(); void this.context?.close(); }
}
