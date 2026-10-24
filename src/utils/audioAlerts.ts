import { AlertSound, AlertRepeat, AlertSoundSettings } from '../types/alerts';

class AudioAlertManager {
  private audioCtx: AudioContext | null = null;
  private currentLoopTimeout: any = null;
  private isPlayingSound: boolean = false;
  private activeOscillators: OscillatorNode[] = [];
  private activeGainNodes: GainNode[] = [];
  private onPlayingStateChange?: (playing: boolean) => void;

  public settings: AlertSoundSettings = {
    masterMute: false,
    volume: 0.9,
    quietHoursEnabled: false,
    quietHoursStart: '23:00',
    quietHoursEnd: '06:00',
  };

  constructor() {
    this.loadSettings();
  }

  public setPlayingListener(cb: (playing: boolean) => void) {
    this.onPlayingStateChange = cb;
  }

  private loadSettings() {
    try {
      const saved = localStorage.getItem('tu_alert_audio_settings');
      if (saved) {
        this.settings = { ...this.settings, ...JSON.parse(saved) };
      }
    } catch {
      // Defaults
    }
  }

  public updateSettings(updates: Partial<AlertSoundSettings>) {
    this.settings = { ...this.settings, ...updates };
    try {
      localStorage.setItem('tu_alert_audio_settings', JSON.stringify(this.settings));
    } catch {
      // Ignored
    }
  }

  public getAudioContext(): AudioContext {
    if (!this.audioCtx) {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass();
    }
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume().catch(() => {});
    }
    return this.audioCtx;
  }

  public unlockAudio() {
    try {
      const ctx = this.getAudioContext();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      // Play a 1ms inaudible buffer to unlock iOS / Safari / Chrome autoplay restrictions
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (e) {
      console.warn('Audio unlock warning:', e);
    }
  }

  private isQuietHours(): boolean {
    if (!this.settings.quietHoursEnabled) return false;
    const now = new Date();
    const currentMins = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = this.settings.quietHoursStart.split(':').map(Number);
    const [endH, endM] = this.settings.quietHoursEnd.split(':').map(Number);
    const startMins = startH * 60 + startM;
    const endMins = endH * 60 + endM;

    if (startMins <= endMins) {
      return currentMins >= startMins && currentMins < endMins;
    } else {
      // Spans across midnight (e.g. 23:00 to 07:00)
      return currentMins >= startMins || currentMins < endMins;
    }
  }

  public stopSound() {
    if (this.currentLoopTimeout) {
      clearTimeout(this.currentLoopTimeout);
      this.currentLoopTimeout = null;
    }
    this.activeOscillators.forEach((osc) => {
      try {
        osc.stop();
        osc.disconnect();
      } catch {}
    });
    this.activeOscillators = [];
    this.activeGainNodes.forEach((gain) => {
      try {
        gain.disconnect();
      } catch {}
    });
    this.activeGainNodes = [];
    this.isPlayingSound = false;
    if (this.onPlayingStateChange) {
      this.onPlayingStateChange(false);
    }
  }

  public isCurrentlyPlaying(): boolean {
    return this.isPlayingSound;
  }

  public playAlert(sound: AlertSound, repeat: AlertRepeat = '3_times', isPreview: boolean = false) {
    if (this.settings.masterMute && !isPreview) return;
    if (this.isQuietHours() && !isPreview) return;

    this.stopSound();
    this.isPlayingSound = true;
    if (this.onPlayingStateChange) {
      this.onPlayingStateChange(true);
    }

    let repeatCount = 1;
    let isContinuous = false;

    if (repeat === '1_time') repeatCount = 1;
    else if (repeat === '3_times') repeatCount = 3;
    else if (repeat === '5_times') repeatCount = 5;
    else if (repeat === 'continuous') isContinuous = true;

    if (isPreview) {
      repeatCount = 1;
      isContinuous = false;
    }

    let currentIteration = 0;

    const playCycle = () => {
      if (!this.isPlayingSound) return;
      currentIteration++;

      const duration = this.synthesizeSingleSound(sound);

      if (isContinuous || currentIteration < repeatCount) {
        this.currentLoopTimeout = setTimeout(() => {
          if (this.isPlayingSound) {
            playCycle();
          }
        }, duration * 1000 + 400); // 400ms pause between sound cycles
      } else {
        this.currentLoopTimeout = setTimeout(() => {
          this.stopSound();
        }, duration * 1000);
      }
    };

    playCycle();
  }

  private synthesizeSingleSound(sound: AlertSound): number {
    try {
      const ctx = this.getAudioContext();
      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(Math.min(1.0, Math.max(0.05, this.settings.volume)), ctx.currentTime);
      masterGain.connect(ctx.destination);
      this.activeGainNodes.push(masterGain);

      const now = ctx.currentTime;

      switch (sound) {
        case 'loud_alarm': {
          // Urgent, high-energy alarm beep burst (two sharp pulses)
          const totalDuration = 0.8;
          [0, 0.4].forEach((offset) => {
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(920, now + offset);
            osc2.type = 'square';
            osc2.frequency.setValueAtTime(1400, now + offset);

            gain.gain.setValueAtTime(0, now + offset);
            gain.gain.linearRampToValueAtTime(0.7, now + offset + 0.03);
            gain.gain.setValueAtTime(0.7, now + offset + 0.22);
            gain.gain.linearRampToValueAtTime(0.01, now + offset + 0.28);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(masterGain);

            osc1.start(now + offset);
            osc2.start(now + offset);
            osc1.stop(now + offset + 0.3);
            osc2.stop(now + offset + 0.3);

            this.activeOscillators.push(osc1, osc2);
            this.activeGainNodes.push(gain);
          });
          return totalDuration;
        }

        case 'emergency_siren': {
          // Rapid frequency sweep oscillating siren
          const duration = 1.0;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(650, now);
          osc.frequency.exponentialRampToValueAtTime(1250, now + 0.4);
          osc.frequency.exponentialRampToValueAtTime(650, now + 0.8);
          osc.frequency.exponentialRampToValueAtTime(1100, now + 1.0);

          gain.gain.setValueAtTime(0.05, now);
          gain.gain.linearRampToValueAtTime(0.75, now + 0.05);
          gain.gain.setValueAtTime(0.75, now + 0.9);
          gain.gain.linearRampToValueAtTime(0.01, now + duration);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now);
          osc.stop(now + duration);

          this.activeOscillators.push(osc);
          this.activeGainNodes.push(gain);
          return duration;
        }

        case 'sonar_ping': {
          // High-frequency crystal ping with exponential decay
          const duration = 1.2;
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();

          osc.type = 'sine';
          osc.frequency.setValueAtTime(1560, now);
          osc.frequency.exponentialRampToValueAtTime(1100, now + duration);

          gain.gain.setValueAtTime(0.9, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

          osc.connect(gain);
          gain.connect(masterGain);

          osc.start(now);
          osc.stop(now + duration);

          this.activeOscillators.push(osc);
          this.activeGainNodes.push(gain);
          return duration;
        }

        case 'chime_bell': {
          // Harmonic chime chord (Arpeggiated high bells)
          const notes = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7
          const duration = 1.1;

          notes.forEach((freq, idx) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            const noteStart = now + idx * 0.08;

            osc.type = 'sine';
            osc.frequency.setValueAtTime(freq, noteStart);

            gain.gain.setValueAtTime(0, noteStart);
            gain.gain.linearRampToValueAtTime(0.5, noteStart + 0.02);
            gain.gain.exponentialRampToValueAtTime(0.001, noteStart + 0.8);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(noteStart);
            osc.stop(noteStart + 0.85);

            this.activeOscillators.push(osc);
            this.activeGainNodes.push(gain);
          });

          return duration;
        }

        case 'cyber_radar': {
          // Sci-fi high-tech radar chirps
          const duration = 0.9;
          [0, 0.25, 0.5].forEach((offset) => {
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'triangle';
            osc.frequency.setValueAtTime(450, now + offset);
            osc.frequency.exponentialRampToValueAtTime(2400, now + offset + 0.16);

            gain.gain.setValueAtTime(0.65, now + offset);
            gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.18);

            osc.connect(gain);
            gain.connect(masterGain);

            osc.start(now + offset);
            osc.stop(now + offset + 0.2);

            this.activeOscillators.push(osc);
            this.activeGainNodes.push(gain);
          });
          return duration;
        }

        default:
          return 0.5;
      }
    } catch (err) {
      console.warn('Audio synthesis warning:', err);
      return 0.5;
    }
  }
}

export const alertAudioManager = new AudioAlertManager();
