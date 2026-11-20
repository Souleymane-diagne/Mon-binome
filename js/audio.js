/**
 * Mon Assistant - Synthétiseur Audio Web Audio API
 * Génère des sons réels sans dépendance de fichiers externes
 */

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.volume = 0.8;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.masterGain = this.ctx.createGain();
        this.masterGain.connect(this.ctx.destination);
        this.setVolume(this.volume);
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  setVolume(vol) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  // Joue une note douce avec harmoniques
  playTone(freq, duration = 0.5, type = 'sine', decay = 0.3, startTime = 0) {
    this.init();
    if (!this.ctx) return;

    const t = this.ctx.currentTime + startTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, t);

    // Enveloppe d'amplitude douce (ADSR simplifié)
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.exponentialRampToValueAtTime(0.6, t + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + duration);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(t);
    osc.stop(t + duration);
  }

  // 1. Son d'Adhan (mélodie inspirée du Maqam Bayati avec timbre chaud)
  playAdhan() {
    this.init();
    if (!this.ctx) return;

    // Séquence de notes : D4 (293.66), F4 (349.23), G4 (392.00), A4 (440.00), G4 (392.00), F4, D4
    const notes = [
      { f: 293.66, d: 0.9 }, // Al-
      { f: 349.23, d: 1.1 }, // -la-
      { f: 392.00, d: 1.6 }, // -hu
      { f: 440.00, d: 1.2 }, // Ak-
      { f: 392.00, d: 1.0 }, // -bar
      { f: 349.23, d: 1.4 },
      { f: 293.66, d: 2.2 }
    ];

    let currentT = 0;
    notes.forEach((n) => {
      // Oscillateur principal
      this.playTone(n.f, n.d, 'sine', 0.5, currentT);
      // Harmonique chaleureuse
      this.playTone(n.f * 1.5, n.d * 0.7, 'triangle', 0.3, currentT);
      currentT += n.d * 0.75;
    });
  }

  // 2. Son doux / Zen (cloche tibétaine / carillon)
  playGentleChime() {
    this.init();
    if (!this.ctx) return;

    // Deux fréquences fondamentales avec résonance
    const freqs = [528, 792, 1056]; // Fréquence de Solfège 528Hz (apaisante)
    freqs.forEach((f, i) => {
      this.playTone(f, 2.0, 'sine', 1.2, i * 0.08);
    });
  }

  // 3. Son de cloche zen
  playZenBowl() {
    this.init();
    if (!this.ctx) return;

    const baseFreq = 432; // Fréquence 432 Hz
    this.playTone(baseFreq, 2.5, 'sine', 2.0, 0);
    this.playTone(baseFreq * 2.02, 2.0, 'sine', 1.8, 0.05);
    this.playTone(baseFreq * 3.01, 1.4, 'triangle', 1.0, 0.1);
  }

  // 4. Bip d'alerte moderne
  playBeep() {
    this.init();
    if (!this.ctx) return;

    this.playTone(880, 0.15, 'sine', 0.1, 0);
    this.playTone(880, 0.25, 'sine', 0.15, 0.18);
  }

  // 5. Rappel de cours (3 notes montantes)
  playCourseReminder() {
    this.init();
    if (!this.ctx) return;

    this.playTone(523.25, 0.3, 'sine', 0.2, 0);    // C5
    this.playTone(659.25, 0.3, 'sine', 0.2, 0.15); // E5
    this.playTone(783.99, 0.5, 'sine', 0.3, 0.30); // G5
  }

  // 6. Rappel de tâche récurrent (bip stimulant)
  playTaskAlert() {
    this.init();
    if (!this.ctx) return;

    this.playTone(698.46, 0.2, 'sine', 0.15, 0);   // F5
    this.playTone(587.33, 0.35, 'sine', 0.25, 0.15); // D5
  }

  // 7. Célébration 🎉 (arpège scintillant)
  playSuccess() {
    this.init();
    if (!this.ctx) return;

    const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
    notes.forEach((f, i) => {
      this.playTone(f, 0.35, 'triangle', 0.25, i * 0.08);
    });
  }

  // Jouer selon le réglage de prière
  playPrayerAlert(type = 'doux') {
    if (type === 'adhan') {
      this.playAdhan();
    } else if (type === 'zen') {
      this.playZenBowl();
    } else if (type === 'bip') {
      this.playBeep();
    } else {
      this.playGentleChime();
    }
  }
}

window.soundEngine = new SoundEngine();

// Réveiller l'audio dès la première interaction utilisateur
document.addEventListener('click', () => {
  if (window.soundEngine) window.soundEngine.init();
}, { once: true });
document.addEventListener('touchstart', () => {
  if (window.soundEngine) window.soundEngine.init();
}, { once: true });
