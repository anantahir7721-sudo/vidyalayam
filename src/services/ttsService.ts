import { apiUrl } from '../utils/apiConfig';
import { DailyNewsBulletin, DailySuvicharItem, DailyJanvaJevuBulletin } from '../types';

export type TTSVoice = 'female' | 'male';

export interface TTSPlayerState {
  isPlaying: boolean;
  isLoading: boolean;
  currentTitle: string;
  activeId: string | null;
  voice: TTSVoice;
  rate: number;
  duration: number;
  currentTime: number;
}

class TTSServiceManager {
  private audio: HTMLAudioElement | null = null;
  private currentObjectUrl: string | null = null;
  private currentAbortController: AbortController | null = null;
  private listeners: Set<(state: TTSPlayerState) => void> = new Set();

  private state: TTSPlayerState = {
    isPlaying: false,
    isLoading: false,
    currentTitle: '',
    activeId: null,
    voice: (localStorage.getItem('vidyalayam_tts_voice') as TTSVoice) || 'female',
    rate: 1.0,
    duration: 0,
    currentTime: 0,
  };

  constructor() {
    if (typeof window !== 'undefined') {
      this.audio = new Audio();
      this.setupAudioListeners();
    }
  }

  private setupAudioListeners() {
    if (!this.audio) return;

    this.audio.addEventListener('play', () => {
      this.state.isPlaying = true;
      this.state.isLoading = false;
      this.notify();
    });

    this.audio.addEventListener('pause', () => {
      this.state.isPlaying = false;
      this.notify();
    });

    this.audio.addEventListener('ended', () => {
      this.state.isPlaying = false;
      this.state.currentTime = 0;
      this.notify();
    });

    this.audio.addEventListener('timeupdate', () => {
      if (!this.audio) return;
      this.state.currentTime = this.audio.currentTime;
      this.state.duration = this.audio.duration || 0;
      this.notify();
    });

    this.audio.addEventListener('error', (e) => {
      console.warn('[TTSService] Audio playback error:', e);
      this.state.isPlaying = false;
      this.state.isLoading = false;
      this.notify();
    });
  }

  public subscribe(listener: (state: TTSPlayerState) => void): () => void {
    this.listeners.add(listener);
    listener(this.getState());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const s = this.getState();
    for (const listener of this.listeners) {
      try {
        listener(s);
      } catch (err) {
        console.error('[TTSService] Listener error:', err);
      }
    }
  }

  public getState(): TTSPlayerState {
    return { ...this.state };
  }

  public setVoice(voice: TTSVoice) {
    this.state.voice = voice;
    localStorage.setItem('vidyalayam_tts_voice', voice);
    this.notify();
  }

  public setRate(rate: number) {
    this.state.rate = rate;
    if (this.audio) {
      this.audio.playbackRate = rate;
    }
    this.notify();
  }

  public stop() {
    if (this.currentAbortController) {
      this.currentAbortController.abort();
      this.currentAbortController = null;
    }
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    if (this.currentObjectUrl) {
      URL.revokeObjectURL(this.currentObjectUrl);
      this.currentObjectUrl = null;
    }
    this.state.isPlaying = false;
    this.state.isLoading = false;
    this.state.activeId = null;
    this.state.currentTime = 0;
    this.notify();
  }

  public pause() {
    if (this.audio && this.state.isPlaying) {
      this.audio.pause();
    }
  }

  public resume() {
    if (this.audio && !this.state.isPlaying && this.state.activeId) {
      this.audio.play().catch(() => {});
    }
  }

  /**
   * Main synthesis & play method using Gemini AI Expressive Speech API.
   * If current activeId is already playing, calling toggle will pause it.
   */
  public async play(
    id: string,
    text: string,
    title: string,
    voiceOverride?: TTSVoice
  ): Promise<void> {
    if (this.state.activeId === id && this.state.isPlaying) {
      this.pause();
      return;
    }

    if (this.state.activeId === id && !this.state.isPlaying && this.audio?.src) {
      this.resume();
      return;
    }

    this.stop();

    const cleanText = expandGujaratiSpeechText(text.trim());
    if (!cleanText) return;

    const chosenVoice = voiceOverride || this.state.voice;

    this.state.activeId = id;
    this.state.currentTitle = title;
    this.state.isLoading = true;
    this.state.isPlaying = false;
    this.notify();

    this.currentAbortController = new AbortController();

    try {
      const response = await fetch(apiUrl('/api/tts/speak'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: cleanText,
          voice: chosenVoice,
        }),
        signal: this.currentAbortController.signal,
      });

      if (!response.ok) {
        throw new Error(`TTS server responded with ${response.status}`);
      }

      const blob = await response.blob();
      if (!this.audio) {
        this.audio = new Audio();
        this.setupAudioListeners();
      }

      this.currentObjectUrl = URL.createObjectURL(blob);
      this.audio.src = this.currentObjectUrl;
      this.audio.playbackRate = this.state.rate;
      await this.audio.play();

      this.state.isLoading = false;
      this.state.isPlaying = true;
      this.notify();
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      console.warn('[TTSService] Backend Gemini TTS failed, attempting browser fallback:', err);
      this.fallbackBrowserSpeech(cleanText);
    }
  }

  /**
   * Client-side fallback if server is unreachable
   */
  private fallbackBrowserSpeech(text: string) {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      this.stop();
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'gu-IN';
    utterance.rate = this.state.rate;

    utterance.onstart = () => {
      this.state.isLoading = false;
      this.state.isPlaying = true;
      this.notify();
    };
    utterance.onend = () => {
      this.stop();
    };
    utterance.onerror = () => {
      this.stop();
    };

    window.speechSynthesis.speak(utterance);
  }
}

/**
 * Expands Gujarati abbreviations, titles, and dates so that speech synthesis
 * produces natural, respectful human speech (e.g. 'ડો બાબાસાહેબ' -> 'ડૉક્ટર બાબાસાહેબ').
 */
export function expandGujaratiSpeechText(raw: string): string {
  if (!raw || typeof raw !== 'string') return '';
  let text = raw;

  // 1. Dr. / Do. variations -> 'ડૉક્ટર ' (e.g. 'ડો બાબા સાહેબ' -> 'ડૉક્ટર બાબાસાહેબ')
  text = text.replace(/(^|[\s,।\.\-"\(])(?:ડૉ|ડો)(?:\.|\s+)/gu, '$1ડૉક્ટર ');
  // 2. Pujya / Pu. variations -> 'પૂજ્ય '
  text = text.replace(/(^|[\s,।\.\-"\(])(?:પૂ)(?:\.|\s+)/gu, '$1પૂજ્ય ');
  // 3. Professor / Pro. variations -> 'પ્રોફેસર '
  text = text.replace(/(^|[\s,।\.\-"\(])(?:પ્રો)(?:\.|\s+)/gu, '$1પ્રોફેસર ');
  // 4. Shri. variations -> 'શ્રી '
  text = text.replace(/(^|[\s,।\.\-"\(])(?:શ્રી)\.(?:\s*)/gu, '$1શ્રી ');
  // 5. Swargiy / Swa. variations -> 'સ્વર્ગસ્થ '
  text = text.replace(/(^|[\s,।\.\-"\(])(?:સ્વ)(?:\.|\s+)/gu, '$1સ્વર્ગસ્થ ');
  // 6. Likhitang / Li. variations -> 'લિખિતંગ '
  text = text.replace(/(^|[\s,।\.\-"\(])(?:લિ|લી)\.(?:\s*)/gu, '$1લિખિતંગ ');
  // 7. Dhoran / Dho. variations -> 'ધોરણ '
  text = text.replace(/(^|[\s,।\.\-"\(])(?:ધો)(?:\.|\s+)(\d+|[૧-૯])/gu, '$1ધોરણ $2');
  // 8. Tarikh / Ta. variations -> 'તારીખ '
  text = text.replace(/(^|[\s,।\.\-"\(])(?:તા)(?:\.|\s+)(\d+|[૧-૯])/gu, '$1તારીખ $2');
  // 9. Number / No. variations -> 'નંબર '
  text = text.replace(/(^|[\s,।\.\-"\(])(?:નં)(?:\.|\s+)(\d+|[૧-૯])/gu, '$1નંબર $2');
  // 10. Mobile / Mo. variations -> 'મોબાઇલ '
  text = text.replace(/(^|[\s,।\.\-"\(])(?:મો)(?:\.|\s+)(\d+|[૧-૯])/gu, '$1મોબાઇલ $2');
  // 11. Rupees / Ru. variations -> 'રૂપિયા '
  text = text.replace(/(^|[\s,।\.\-"\(])(?:રૂ)(?:\.|\s+)(\d+|[૧-૯])/gu, '$1રૂપિયા $2');
  // 12. Kilometers / Ki.Mi. variations -> 'કિલોમીટર '
  text = text.replace(/(?:કિ\.મી\.|કિમી)/gu, 'કિલોમીટર ');
  // 13. Isvisan -> 'ઈસવીસન '
  text = text.replace(/(?:ઈ\.સ\.|ઇ\.સ\.)/gu, 'ઈસવીસન ');
  // 14. Kram / Kr. variations -> 'ક્રમ '
  text = text.replace(/(^|[\s,।\.\-"\(])(?:ક્ર)\.(?:\s*)/gu, '$1ક્રમ ');
  // 15. Page / Pej variations -> 'પેજ નંબર '
  text = text.replace(/પેજ\s*નં\.?/gu, 'પેજ નંબર ');

  // Clean markdown symbols, hashtags, links, emojis
  text = text
    .replace(/https?:\/\/\S+/gu, ' ')
    .replace(/[*#_~`>\[\]]/gu, ' ')
    .replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu, ' ')
    .replace(/\s+/gu, ' ')
    .trim();

  return text;
}

export const ttsService = new TTSServiceManager();

// =========================================================================
// TEXT FORMATTERS FOR GUJARATI BROADCASTS
// =========================================================================

/**
 * Formats daily news bulletin into an anchor script
 */
export function formatNewsBulletinSpeech(bulletin: DailyNewsBulletin): string {
  const dateStr = bulletin.editionDate || 'આજ';
  let speech = `નમસ્તે વિદ્યાર્થી મિત્રો અને શિક્ષકગણ. વિદ્યાલયમ દૈનિક સમાચાર બુલેટિનમાં આપનું હાર્દિક સ્વાગત છે. તારીખ ${dateStr}. આજના મુખ્ય સમાચાર:\n\n`;

  const items = bulletin.items || [];
  if (items.length === 0) {
    return speech + 'આજના કોઈ સમાચાર ઉપલબ્ધ નથી.';
  }

  items.forEach((item, idx) => {
    const numGuj = ['એક', 'બે', 'ત્રણ', 'ચાર', 'પાંચ', 'છ', 'સાત', 'આઠ', 'નવ', 'દસ'][idx] || `${idx + 1}`;
    const heading = item.headline || (item as any).title || '';
    speech += `સમાચાર નંબર ${numGuj}: ${heading}. `;
    if (item.summary) {
      speech += `${item.summary} `;
    }
    speech += '\n\n';
  });

  speech += 'આ હતા આજના મુખ્ય સમાચાર. વિદ્યાલયમ સાથે જોડાયેલા રહો. આભાર!';
  return speech;
}

/**
 * Formats daily suvichar into an inspirational speech
 */
export function formatSuvicharSpeech(suvichar: DailySuvicharItem): string {
  let speech = `નમસ્તે વિદ્યાર્થી મિત્રો. વિદ્યાલયમ આજનો પ્રેરણાદાયી સુવિચાર:\n\n`;
  speech += `સુવિચાર: ${suvichar.thought}.\n\n`;

  if (suvichar.authorOrSource) {
    speech += `પ્રણેતા: ${suvichar.authorOrSource}.\n\n`;
  }

  if (suvichar.explanation) {
    speech += `વિચાર વિસ્તાર અને અર્થ: ${suvichar.explanation}.\n\n`;
  }

  if (suvichar.example) {
    speech += `જીવન ઉદાહરણ: ${suvichar.example}.\n\n`;
  }

  if (suvichar.moralValue) {
    speech += `આજના સુવિચારમાંથી શીખવા મળતો બોધ: ${suvichar.moralValue}.\n\n`;
  }

  speech += `આ સુવિચારને આપણા જીવનમાં ઉતારીએ. આપનો દિવસ શુભ રહે!`;
  return speech;
}

/**
 * Formats daily Janva Jevu (Facts or 20 Questions) into an engaging knowledge audio script
 */
export function formatJanvaJevuSpeech(bulletin: any): string {
  let speech = `નમસ્તે વિદ્યાર્થી મિત્રો. વિદ્યાલયમ આજનું જાણવા જેવું અને રોચક સામાન્ય જ્ઞાન:\n\n`;
  
  if (Array.isArray(bulletin?.facts) && bulletin.facts.length > 0) {
    bulletin.facts.forEach((fact: any, idx: number) => {
      const numGuj = `${idx + 1}`;
      speech += `રોચક તથ્ય નંબર ${numGuj}: ${fact.title ? fact.title + '. ' : ''}${fact.fact}. `;
      if (fact.explanation || fact.whyItMatters) {
        speech += `${fact.explanation || fact.whyItMatters} `;
      }
      speech += '\n\n';
    });
  } else if (Array.isArray(bulletin?.questions) && bulletin.questions.length > 0) {
    bulletin.questions.forEach((q: any, idx: number) => {
      const numGuj = `${idx + 1}`;
      speech += `પ્રશ્ન નંબર ${numGuj}: ${q.question}. ઉત્તર છે: ${q.answer}. `;
      if (q.explanation) {
        speech += `${q.explanation} `;
      }
      speech += '\n\n';
    });
  }

  speech += `નવું જાણતા રહો અને જ્ઞાન વધારતા રહો. આભાર!`;
  return speech;
}

