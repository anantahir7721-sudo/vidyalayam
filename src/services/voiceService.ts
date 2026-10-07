/**
 * Voice Service — High-Fidelity Humanlike Gujarati Speech Synthesis
 *
 * Designed for realistic, authentic, human-level speech:
 * 1. Studio AI Voice (Primary via /api/tts): Uses Gemini Neural TTS (Aoede/Zephyr)
 *    with instant in-memory caching for zero latency and natural prosody.
 * 2. Natural Browser Speech Synthesis (Zero-Quota Fallback):
 *    - Preserves whole sentences without artificial comma chopping.
 *    - Intelligent voice matching (Google Gujarati Neural, Microsoft Natural, Apple Enhanced).
 *    - Gujarati phonetic & conversational normalization (no robotic "dot", "colon", or bracket labels).
 *    - Perfect teacher cadence: relaxed 0.96x rate with natural 1.0 pitch.
 *    - Chrome 15s freeze prevention keep-alive.
 */

import { apiUrl } from '../utils/apiConfig';

export interface VoiceOptions {
  rate?: number;
  pitch?: number;
  voiceGender?: 'female' | 'male';
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (err: any) => void;
  onLoading?: (isLoading: boolean) => void;
}

class VoiceService {
  private activeVoices: SpeechSynthesisVoice[] = [];
  private isVoicesLoaded = false;
  private currentSessionId = 0;
  private currentlySpeaking = false;
  private currentAudioElement: HTMLAudioElement | null = null;
  private keepAliveTimer: any = null;
  private clientAudioCache = new Map<string, string>(); // textHash -> audioObjectURL
  private userVoiceGender: 'female' | 'male' = (() => {
    try {
      const saved = localStorage.getItem('ekam_voice_gender');
      if (saved === 'male' || saved === 'female') return saved;
    } catch {}
    return 'female';
  })();

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.initVoices();
      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.initVoices();
        };
      }
    }
  }

  public setVoiceGender(gender: 'female' | 'male'): void {
    this.userVoiceGender = gender;
    try {
      localStorage.setItem('ekam_voice_gender', gender);
    } catch {}
  }

  public getVoiceGender(): 'female' | 'male' {
    return this.userVoiceGender;
  }

  private initVoices(): void {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;
    try {
      const voices = window.speechSynthesis.getVoices();
      if (voices && voices.length > 0) {
        this.activeVoices = voices;
        this.isVoicesLoaded = true;
      }
    } catch {
      // Ignore initial query errors
    }
  }

  public async getAvailableVoices(): Promise<SpeechSynthesisVoice[]> {
    if (this.isVoicesLoaded && this.activeVoices.length > 0) {
      return this.activeVoices;
    }

    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      return [];
    }

    return new Promise((resolve) => {
      let attempts = 0;
      const poll = () => {
        const voices = window.speechSynthesis.getVoices();
        if (voices && voices.length > 0) {
          this.activeVoices = voices;
          this.isVoicesLoaded = true;
          resolve(voices);
        } else if (attempts < 10) {
          attempts++;
          setTimeout(poll, 80);
        } else {
          resolve([]);
        }
      };
      poll();
    });
  }

  /**
   * Discovers the highest-fidelity human voice available on this device for Gujarati.
   * Prioritizes Neural/Natural Google and Microsoft voices.
   */
  public async getBestVoice(preferredGender: 'female' | 'male' = 'female'): Promise<SpeechSynthesisVoice | null> {
    const voices = await this.getAvailableVoices();
    if (!voices || voices.length === 0) return null;

    let bestVoice: SpeechSynthesisVoice | null = null;
    let highestScore = -1;

    for (const v of voices) {
      const name = (v.name || '').toLowerCase();
      const lang = (v.lang || '').toLowerCase().replace('_', '-');
      let score = 0;

      const isGujarati = lang === 'gu-in' || lang === 'gu' || lang.startsWith('gu-');
      const isHindi = lang === 'hi-in' || lang === 'hi' || lang.startsWith('hi-');
      const isIndian = lang.includes('-in');

      const isNatural =
        name.includes('natural') ||
        name.includes('neural') ||
        name.includes('online') ||
        name.includes('enhanced') ||
        name.includes('premium');

      const isGoogle = name.includes('google');
      const isMicrosoft = name.includes('microsoft');
      const isApple = name.includes('siri') || name.includes('apple') || name.includes('lekha');

      // Gender affinity
      const isFemaleName =
        name.includes('swara') ||
        name.includes('lekha') ||
        name.includes('kalpana') ||
        name.includes('female') ||
        name.includes('woman') ||
        name.includes('zira');
      const isMaleName =
        name.includes('madhur') ||
        name.includes('neel') ||
        name.includes('male') ||
        name.includes('man') ||
        name.includes('ravi');

      if (preferredGender === 'female' && isFemaleName) score += 15;
      if (preferredGender === 'male' && isMaleName) score += 15;

      if (isGujarati) {
        score += 150;
        if (isNatural) score += 40;
        if (isGoogle) score += 30;
        if (isMicrosoft) score += 25;
        if (isApple) score += 20;
      } else if (isHindi) {
        // High quality Neural Hindi shares identical sound inventory and sounds human
        score += 80;
        if (isNatural) score += 35;
        if (isGoogle) score += 25;
        if (isMicrosoft) score += 20;
      } else {
        // Never allow English voices to read Gujarati!
        score = -1;
      }

      if (score > highestScore && score > 0) {
        highestScore = score;
        bestVoice = v;
      }
    }

    return bestVoice;
  }

  /**
   * Prepares raw Gujarati text for natural human reading:
   * - Converts leading digits (૧., 1.) into natural phrasing
   * - Strips robotic labels like "(વિસ્તૃત સમજૂતી):" or "મુખ્ય મુદ્દાઓ:"
   * - Removes URLs, emojis, and special icons
   * - Replaces colons and hyphens with natural phrasing
   */
  public cleanTextForSpeech(text: string): string {
    if (!text) return '';

    return text
      // Remove URLs
      .replace(/https?:\/\/\S+/gi, '')
      // Remove emojis and decorative symbols
      .replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F018}-\u{1F270}\u{238C}-\u{2454}\u{20D0}-\u{20FF}]/gu, '')
      .replace(/[✨🎙️💡❝❞👉🎯📖🌟⏱️❓📰•—–~*#_`]/g, ' ')
      // Remove bracketed stage directions like "(વિદ્યાર્થીઓને સૂચના આપો):" or "(સ્ટેજ પર નમીને...)"
      .replace(/\([^\)]*\)/g, ' ')
      .replace(/\[[^\]]*\]/g, ' ')
      // Convert leading numbers like "૧. " or "1. " to clean words or pause
      .replace(/^[૦-૯0-9]+[.\-)]\s*/gm, ' ')
      // Clean colons
      .replace(/[:;]/g, ', ')
      // Normalize excessive whitespace
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Splits a long text on true sentence boundaries (. ! ? । \n) only when needed,
   * preserving whole clauses and natural human breathing rhythm.
   */
  public chunkText(text: string): string[] {
    const clean = this.cleanTextForSpeech(text);
    if (!clean) return [];

    // Split strictly on sentence terminators: full stop, exclamation, question mark, devanagari danda, newline
    const rawSentences = clean.split(/(?<=[.!?।\n])\s+/);
    const resultChunks: string[] = [];

    for (const raw of rawSentences) {
      const sentence = raw.trim();
      if (!sentence) continue;

      // Keep sentence whole up to 180 characters to allow the voice engine to handle its own natural intonation
      if (sentence.length <= 180) {
        resultChunks.push(sentence);
      } else {
        // If extremely long sentence, break at logical comma pauses
        const subParts = sentence.split(/(?<=[,])\s+/);
        let current = '';
        for (const part of subParts) {
          if ((current + ' ' + part).length <= 180) {
            current = current ? current + ' ' + part : part;
          } else {
            if (current) resultChunks.push(current.trim());
            current = part;
          }
        }
        if (current) resultChunks.push(current.trim());
      }
    }

    return resultChunks.filter(Boolean);
  }

  /**
   * Speaks the provided text with humanlike pacing, warm intonation, and optimal voice.
   * Tries studio-quality AI Neural Voice first (via /api/tts), seamlessly falling back
   * to natural browser speech synthesis.
   */
  public async speak(text: string, options: VoiceOptions = {}): Promise<void> {
    // Stop any existing speech or audio
    this.stop();

    const clean = this.cleanTextForSpeech(text);
    if (!clean) {
      if (options.onEnd) options.onEnd();
      return;
    }

    const sessionId = ++this.currentSessionId;
    this.currentlySpeaking = true;
    if (options.onStart) options.onStart();

    const gender = options.voiceGender || this.userVoiceGender || 'female';
    const cacheKey = `${gender}:${clean}`;

    // 1. Try playing from client audio cache first
    const cachedUrl = this.clientAudioCache.get(cacheKey);
    if (cachedUrl) {
      const played = await this.playAudioUrl(cachedUrl, sessionId, options);
      if (played) return;
    }

    // 2. Try fetching high-fidelity AI voice from /api/tts
    if (typeof window !== 'undefined' && window.fetch) {
      try {
        if (options.onLoading) options.onLoading(true);

        const preferredVoiceName = gender === 'male' ? 'Zephyr' : 'Aoede';
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 25000); // 25s timeout for high-capacity synthesis

        const response = await fetch(apiUrl('/api/tts'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: clean.slice(0, 3000), // optimal length for full bulletin / complete speech
            voice: preferredVoiceName,
            gender: gender,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (response.ok) {
          const data = await response.json();
          if (sessionId !== this.currentSessionId || !this.currentlySpeaking) return;

          if (data.success && data.audioBase64) {
            const blob = this.base64ToBlob(data.audioBase64, data.mimeType || 'audio/wav');
            const audioUrl = URL.createObjectURL(blob);
            this.clientAudioCache.set(cacheKey, audioUrl);

            if (options.onLoading) options.onLoading(false);
            const played = await this.playAudioUrl(audioUrl, sessionId, options);
            if (played) return;
          }
        }
      } catch {
        // Silently fall through to enhanced browser synthesis
      } finally {
        if (options.onLoading) options.onLoading(false);
      }
    }

    // If cancelled during fetch
    if (sessionId !== this.currentSessionId || !this.currentlySpeaking) return;

    // 3. Fallback: Ultra-enhanced client browser speech synthesis
    this.speakViaBrowser(clean, sessionId, { ...options, voiceGender: gender });
  }

  private async playAudioUrl(
    url: string,
    sessionId: number,
    options: VoiceOptions
  ): Promise<boolean> {
    try {
      const audio = new Audio(url);
      this.currentAudioElement = audio;

      audio.onended = () => {
        if (sessionId !== this.currentSessionId) return;
        this.currentlySpeaking = false;
        this.currentAudioElement = null;
        if (options.onEnd) options.onEnd();
      };

      audio.onerror = () => {
        if (sessionId !== this.currentSessionId) return;
        this.currentAudioElement = null;
        // If audio playback fails, fall back to browser speech
        const clean = this.cleanTextForSpeech(url);
        this.speakViaBrowser(clean, sessionId, options);
      };

      await audio.play();
      return true;
    } catch {
      this.currentAudioElement = null;
      return false;
    }
  }

  private async speakViaBrowser(
    cleanText: string,
    sessionId: number,
    options: VoiceOptions
  ): Promise<void> {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.currentlySpeaking = false;
      if (options.onError) {
        options.onError(new Error('Speech synthesis not available'));
      }
      return;
    }

    const chunks = this.chunkText(cleanText);
    if (chunks.length === 0) {
      this.currentlySpeaking = false;
      if (options.onEnd) options.onEnd();
      return;
    }

    const bestVoice = await this.getBestVoice(options.voiceGender || this.userVoiceGender || 'female');
    if (!bestVoice) {
      // Do NOT read Gujarati with an English browser voice!
      console.warn('[VoiceService] No genuine Gujarati/Hindi voice available on device for browser speech.');
      this.currentlySpeaking = false;
      if (options.onEnd) options.onEnd();
      return;
    }

    // Golden ratio for natural Gujarati speech rhythm
    const rate = options.rate ?? 0.96;
    const pitch = options.pitch ?? 1.0;

    let chunkIndex = 0;

    // Start Chrome keep-alive
    this.startKeepAlive();

    const playNextChunk = () => {
      if (sessionId !== this.currentSessionId || !this.currentlySpeaking) {
        this.clearKeepAlive();
        return;
      }

      if (chunkIndex >= chunks.length) {
        this.currentlySpeaking = false;
        this.clearKeepAlive();
        if (options.onEnd) options.onEnd();
        return;
      }

      const chunkText = chunks[chunkIndex++];
      const utterance = new SpeechSynthesisUtterance(chunkText);

      utterance.voice = bestVoice;
      utterance.lang = bestVoice.lang;
      utterance.rate = rate;
      utterance.pitch = pitch;

      utterance.onend = () => {
        if (sessionId !== this.currentSessionId) return;
        // Natural human breath pause between sentences (100ms)
        setTimeout(playNextChunk, 100);
      };

      utterance.onerror = (event: any) => {
        if (sessionId !== this.currentSessionId) return;
        if (event.error !== 'interrupted' && event.error !== 'canceled') {
          console.warn('Speech error on chunk:', event);
        }
        this.currentlySpeaking = false;
        this.clearKeepAlive();
        if (options.onEnd) options.onEnd();
      };

      window.speechSynthesis.speak(utterance);
    };

    playNextChunk();
  }

  private startKeepAlive(): void {
    this.clearKeepAlive();
    // Chrome bug: SpeechSynthesis gets paused after 15 seconds if not nudged
    this.keepAliveTimer = setInterval(() => {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window && this.currentlySpeaking) {
        if (window.speechSynthesis.speaking) {
          window.speechSynthesis.pause();
          window.speechSynthesis.resume();
        }
      }
    }, 12000);
  }

  private clearKeepAlive(): void {
    if (this.keepAliveTimer) {
      clearInterval(this.keepAliveTimer);
      this.keepAliveTimer = null;
    }
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    return new Blob([byteArray], { type: mimeType });
  }

  /**
   * Immediately stops any active audio or speech synthesis.
   */
  public stop(): void {
    this.currentSessionId++;
    this.currentlySpeaking = false;
    this.clearKeepAlive();

    if (this.currentAudioElement) {
      try {
        this.currentAudioElement.pause();
        this.currentAudioElement.currentTime = 0;
      } catch {
        // Ignore audio stop errors
      }
      this.currentAudioElement = null;
    }

    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancel errors
      }
    }
  }

  public isSpeaking(): boolean {
    return this.currentlySpeaking;
  }
}

export const voiceService = new VoiceService();
