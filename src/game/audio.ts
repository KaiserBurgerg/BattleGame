import { CoinTier, TeamId } from './types';
import { getUnitArchetype } from './rules';

/**
 * Cleans a TikTok username so TTS pronounces ONLY the human name/numbers
 * and NEVER reads emojis, smileys, symbols, or underscores aloud.
 */
export function formatUsernameForSpeech(rawUsername: string): string {
  const cleaned = rawUsername
    .replace(/^@+/, '')
    // Remove all Unicode emojis, smileys, pictographs, dingbats, flags, variation selectors, and zero-width joiners
    .replace(
      /[\p{Extended_Pictographic}\p{Emoji_Presentation}\p{Symbol}\u200d\ufe0e\ufe0f]/gu,
      ' '
    )
    // Remove ASCII emoticons/kaomoji punctuation & replace separators with spaces
    .replace(/[^\p{L}\p{N}\s]+/gu, ' ')
    // Separate attached trailing numbers gently (e.g. "Max99" -> "Max 99")
    .replace(/(\p{L})(\p{N})/gu, '$1 $2')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || 'einem Zuschauer';
}

/**
 * Ranks available German SpeechSynthesis voices to strongly prefer warm,
 * human-sounding Neural / Natural / Online / Google voices over old robotic SAPI Desktop voices.
 */
function selectBestGermanVoice(
  voices: SpeechSynthesisVoice[]
): SpeechSynthesisVoice | null {
  const deVoices = voices.filter((v) =>
    v.lang.toLowerCase().replace('_', '-').startsWith('de')
  );
  if (deVoices.length === 0) return null;

  const scoreVoice = (v: SpeechSynthesisVoice): number => {
    const name = v.name.toLowerCase();
    const lang = v.lang.toLowerCase().replace('_', '-');
    let score = 0;

    // Prefer standard German (de-DE / de-AT)
    if (lang === 'de-de') score += 20;
    else if (lang.startsWith('de')) score += 10;

    // Strongly prefer Neural / Natural / Online / Studio voices (Edge, Windows 11, Chrome, macOS)
    if (name.includes('natural')) score += 120;
    if (name.includes('neural')) score += 110;
    if (name.includes('online')) score += 90;
    if (name.includes('google')) score += 80;
    if (name.includes('premium') || name.includes('enhanced')) score += 75;

    // Energetic male/female natural commentator voices in German
    if (
      name.includes('conrad') ||
      name.includes('killian') ||
      name.includes('florian') ||
      name.includes('seraphina') ||
      name.includes('katja') ||
      name.includes('amala') ||
      name.includes('kasper') ||
      name.includes('markus') ||
      name.includes('martin') ||
      name.includes('anna') ||
      name.includes('petra') ||
      name.includes('yannick')
    ) {
      score += 45;
    }

    // Prefer remote/cloud neural voices over local SAPI5 concatenative engines
    if (!v.localService) {
      score += 35;
    }

    // Penalize legacy robotic Windows SAPI5 "Desktop" voices (Hedda Desktop / Stefan Desktop)
    if (name.includes('desktop')) score -= 60;
    if (name.includes('espeak') || name.includes('festival')) score -= 80;

    return score;
  };

  const sorted = [...deVoices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  return sorted[0] || deVoices[0];
}

class BeastArenaAudioEngine {
  private ctx: AudioContext | null = null;
  public sfxEnabled = true;
  public ttsEnabled = true;
  private lastSfxTime: Record<string, number> = {};
  private phraseCursor = 0;

  private ensureContext(): AudioContext | null {
    if (!this.sfxEnabled) return null;
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private canPlay(key: string, minGapMs: number): boolean {
    const now = performance.now();
    const prev = this.lastSfxTime[key] || 0;
    if (now - prev < minGapMs) return false;
    this.lastSfxTime[key] = now;
    return true;
  }

  /**
   * Subtle warm stadium crowd cheer swell under big announcements so the commentator
   * feels embedded in a live arena atmosphere.
   */
  private playStadiumCrowdSwell(durationSec = 1.4, intensity = 0.08): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const bufferSize = Math.floor(ctx.sampleRate * durationSec);
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0;
    // Pink-ish filtered noise for warm crowd roar
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.04 * white) / 1.04;
      lastOut = output[i];
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(620, now);
    filter.Q.setValueAtTime(1.2, now);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(intensity, now + durationSec * 0.28);
    gain.gain.exponentialRampToValueAtTime(0.001, now + durationSec);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    noise.start(now);
    noise.stop(now + durationSec + 0.02);
  }

  public playSpawnSound(coins: CoinTier, team: TeamId): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.canPlay(`spawn_${coins}`, coins === 0 ? 110 : 40)) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pitchVar = 0.94 + Math.random() * 0.12;

    if (coins === 0) {
      osc.type = team === 'lion' ? 'sawtooth' : 'triangle';
      const baseFreq = (team === 'lion' ? 145 : 220) * pitchVar;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, now + 0.14);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.16);
    } else if (coins <= 10) {
      osc.type = 'sawtooth';
      const baseFreq = (coins === 10 ? 130 : 190) * pitchVar;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 1.45, now + 0.25);
      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.28);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.3);
    } else {
      const freqs = coins >= 500 ? [110, 164.8, 220, 329.6] : [98, 146.8, 196];
      freqs.forEach((f, idx) => {
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = idx === 0 ? 'sawtooth' : 'triangle';
        o.frequency.setValueAtTime(f * pitchVar, now);
        o.frequency.exponentialRampToValueAtTime(f * 1.15, now + 0.55);
        g.gain.setValueAtTime(0.11 / freqs.length, now);
        g.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        o.connect(g);
        g.connect(ctx.destination);
        o.start(now);
        o.stop(now + 0.62);
      });
    }
  }

  public playHitSound(heavy = false): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.canPlay(heavy ? 'heavy_hit' : 'light_hit', heavy ? 90 : 75)) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pitchVar = 0.92 + Math.random() * 0.16;

    osc.type = heavy ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime((heavy ? 115 : 240) * pitchVar, now);
    osc.frequency.exponentialRampToValueAtTime(heavy ? 32 : 65, now + (heavy ? 0.22 : 0.09));

    gain.gain.setValueAtTime(heavy ? 0.18 : 0.07, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + (heavy ? 0.24 : 0.1));

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + (heavy ? 0.25 : 0.11));
  }

  public playGroundSlam(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.canPlay('ground_slam', 150)) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(95, now);
    osc.frequency.exponentialRampToValueAtTime(24, now + 0.38);

    gain.gain.setValueAtTime(0.26, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.42);
  }

  public playElementalWave(kind: 'fire' | 'ice'): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.canPlay('wave', 220)) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = kind === 'fire' ? 'sawtooth' : 'sine';
    osc.frequency.setValueAtTime(kind === 'fire' ? 180 : 520, now);
    osc.frequency.exponentialRampToValueAtTime(kind === 'fire' ? 65 : 880, now + 0.45);

    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.48);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.5);
  }

  public playThunderStrike(): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.canPlay('thunder', 180)) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(22, now + 0.65);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.72);
  }

  public playVictoryFanfare(): void {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const notes = [261.63, 329.63, 392.0, 523.25];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      const t = now + i * 0.11;
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.48);
    });
  }

  /**
   * Natural, human-tuned German Stadium Commentator ("Stadion-Kommentator").
   * Uses neural/natural voice ranking, clean spoken usernames, varied live-sport phrasing,
   * and two-part prosody (excited callout + dynamic follow-up) so it sounds warm and alive.
   */
  public announceCoinDonationDe(
    username: string,
    team: TeamId,
    coins: CoinTier
  ): void {
    if (!this.ttsEnabled || coins < 1) return;
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    try {
      const arch = getUnitArchetype(team, coins);
      const spokenUser = formatUsernameForSpeech(username);
      const teamLabel = team === 'lion' ? 'Team Löwe' : 'Team Wolf';
      const variantIdx = this.phraseCursor++ % 3;

      let leadCallout = '';
      let actionFollowup = '';

      if (coins === 1000) {
        this.playStadiumCrowdSwell(2.4, 0.14);
        const leads = [
          `Unglaublich! Eintausend Coins Galaxie von ${spokenUser}!`,
          `Was für ein Wahnsinn! ${spokenUser} zündet die Galaxie für ${teamLabel}!`,
          `Alarm in der Arena! Eintausend Coins von ${spokenUser}!`,
        ];
        const actions = [
          `Der Giganten-Titan stampft alles in Grund und Boden!`,
          `Die gegnerische Festung fällt, und ${spokenUser} erobert den Thron!`,
          `Sofortiger K.O.-Schlag für ${teamLabel}!`,
        ];
        leadCallout = leads[variantIdx];
        actionFollowup = actions[variantIdx];
      } else if (coins === 500) {
        this.playStadiumCrowdSwell(1.8, 0.11);
        const unitName = team === 'lion' ? 'Feuer-Phönix' : 'Eis-Drache';
        const leads = [
          `Wow, fünfhundert Coins Geldregen von ${spokenUser}!`,
          `Riesige Unterstützung von ${spokenUser} für ${teamLabel}!`,
          `Fünfhundert Coins! Danke an ${spokenUser}!`,
        ];
        const actions = [
          `Der ${unitName} fegt direkt über die Brücke!`,
          `Luftschlag von oben und volle Heilung für das eigene Rudel!`,
          `Da brennt die Luft in der Arena!`,
        ];
        leadCallout = leads[variantIdx];
        actionFollowup = actions[variantIdx];
      } else if (coins === 100) {
        this.playStadiumCrowdSwell(1.5, 0.09);
        const leads = [
          `Stark! Hundert Coins von ${spokenUser}!`,
          `Volle Kraft für ${teamLabel} von ${spokenUser}!`,
          `Hundert Coins Konfetti von ${spokenUser}!`,
        ];
        const actions = [
          `Das Kriegs-Mammut rollt unaufhaltsam nach vorn!`,
          `Die Erde bebt, die Reihen fliegen auseinander!`,
          `Was für ein Koloss auf der Brücke!`,
        ];
        leadCallout = leads[variantIdx];
        actionFollowup = actions[variantIdx];
      } else if (coins === 30) {
        this.playStadiumCrowdSwell(1.2, 0.07);
        const colossus =
          team === 'lion' ? 'Silberrücken-Gorilla' : 'Riesen-Grizzlybär';
        const leads = [
          `Dreißig Coins von ${spokenUser}!`,
          `Schöner Donut von ${spokenUser} für ${teamLabel}!`,
          `${spokenUser} schickt Verstärkung mit dreißig Coins!`,
        ];
        const actions = [
          `Der ${colossus} stürmt mitten ins Getümmel!`,
          `Jetzt gibt es ordentlich Flächenschaden!`,
          `Die Festung wankt!`,
        ];
        leadCallout = leads[variantIdx];
        actionFollowup = actions[variantIdx];
      } else if (coins === 10) {
        if (!this.canPlay('tts_10coin', 3200)) return;
        const leads = [
          `Zehn Coins von ${spokenUser}!`,
          `Krone von ${spokenUser} für ${teamLabel}!`,
          `Danke ${spokenUser}, zehn Coins!`,
        ];
        const actions = [
          `Das Panzer-Nashorn räumt die Brücke frei!`,
          `Voller Durchbruch nach vorn!`,
          `Da fliegt die Abwehr zur Seite!`,
        ];
        leadCallout = leads[variantIdx];
        actionFollowup = actions[variantIdx];
      } else if (coins === 5) {
        if (!this.canPlay('tts_5coin', 4500)) return;
        const packName = team === 'lion' ? 'Hyänen-Meute' : 'Luchs-Meute';
        leadCallout = `Fünf Coins von ${spokenUser}!`;
        actionFollowup = `Die fünfer ${packName} jagt im Rudel los!`;
      } else if (coins === 1) {
        if (!this.canPlay('tts_1coin', 8000)) return;
        leadCallout = `Danke ${spokenUser}!`;
        actionFollowup = `Der ${arch.nameDe} legt los!`;
      }

      const voices = window.speechSynthesis.getVoices();
      if (!voices || voices.length === 0) {
        return;
      }

      const bestVoice = selectBestGermanVoice(voices);

      if (coins >= 30) {
        window.speechSynthesis.cancel();
      }

      // Utterance 1: Energetic, natural callout of the donor & gift
      const utterLead = new SpeechSynthesisUtterance(leadCallout);
      utterLead.lang = bestVoice?.lang || 'de-DE';
      if (bestVoice) utterLead.voice = bestVoice;
      // Natural human conversational speed (not sped-up robotic 1.08+)
      utterLead.rate = 1.0;
      utterLead.pitch = 1.03;
      utterLead.volume = 0.98;

      // Utterance 2: Slightly deeper, dramatic play-by-play reaction
      const utterAction = new SpeechSynthesisUtterance(actionFollowup);
      utterAction.lang = bestVoice?.lang || 'de-DE';
      if (bestVoice) utterAction.voice = bestVoice;
      utterAction.rate = 0.98;
      utterAction.pitch = 0.98;
      utterAction.volume = 0.96;

      window.speechSynthesis.speak(utterLead);
      window.speechSynthesis.speak(utterAction);
    } catch {
      // Ignore speech synthesis errors in headless or restricted environments
    }
  }
}

export const audioEngine = new BeastArenaAudioEngine();
