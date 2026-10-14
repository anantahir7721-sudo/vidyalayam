# Gemini AI Expressive Speech & Version Synchronization

Upgrade the Gujarati voice system from Edge TTS to Gemini AI expressive speech with human emotion, implement intelligent abbreviation expansion (e.g. speaking 'ડૉક્ટર બાબાસાહેબ' instead of 'ડો'), and resolve the preview version display to ensure it shows the latest v1.0.60 instead of stale v1.0.58.

## User Review & Critical Decisions

> [!IMPORTANT]
> The following choices were confirmed during interactive clarification and guide this implementation:

- **Confirmed Voice Engine**: Gemini AI expressive speech (`gemini-3.8-flash-lite-tts`) with warm, human teacher intonation and emotion, 100% free with server-side caching.
- **Confirmed Pronunciation Rule**: Comprehensive Gujarati abbreviation expander that automatically converts titles like `ડો.` / `ડો ` into `ડૉક્ટર`, `પૂ.` into `પૂજ્ય`, and other academic/honorific acronyms into full spoken Gujarati.
- **Version Resolution**: Dynamic synchronization with GitHub repository releases (`anantahir7721-sudo/Vidyalayam-releases`) updating baseline from `1.0.58` to latest `1.0.60` and purging stale localStorage caches.

---

## 1. Overview & Core Concept

- **What It Does**:
  1. Replaces Edge TTS with Gemini AI's expressive speech engine (`gemini-3.8-flash-lite-tts`), delivering authentic emotional nuance, respectful teacher cadence, and natural pauses.
  2. Implements a dedicated **Gujarati Text Preprocessor & Normalizer** that inspects text before synthesis and expands abbreviations, honorifics, numbers, and dates (e.g., transforming "ડો બાબાસાહેબ" -> "ડૉક્ટર બાબાસાહેબ", "પૂ. બાપુ" -> "પૂજ્ય બાપુ", "ધો. 10" -> "ધોરણ ૧૦").
  3. Fixes the preview application's version tracking logic so the system automatically detects, displays, and serves the latest `v1.0.60` instead of falling back to `v1.0.58`.
- **Target Audience**: Gujarati primary and secondary schools, teachers, students, and administrators using Vidyalayam for daily morning assembly, news bulletins, Suvichar, and student records.
- **Key Value**: Crisp, natural, human-like voice delivery that respects cultural honorifics without robotic mispronunciations, with an up-to-date app version display.

---

## 2. User Experience & Visual Design

- **Voice Playback Experience**:
  - When playing morning news bulletins, Suvichar, or daily "Janva Jevu" facts, teachers and students hear a smooth, emotionally modulated Gujarati voice.
  - A subtle animated soundwave visualizer accompanies audio playback in the audio bar, showing "Gemini AI નેચરલ વાચા" (Gemini AI Natural Voice) active badge.
  - Instant playback powered by server-side LRU audio caching: repeatedly played daily bulletins play in under 50ms.
- **App Update & Version Display**:
  - In the Dashboard footer, Loading screen, and Settings page, the version clearly displays `v1.0.60 (લેટેસ્ટ)` instead of `v1.0.58`.
  - Stale localStorage keys from older preview sessions (`1.0.52`, `1.0.58`) are automatically cleared on initialization.
  - The update status modal accurately reports "આપ લેટેસ્ટ વર્ઝન (v1.0.60) નો ઉપયોગ કરી રહ્યા છો".

---

## 3. Key Product Decisions & Trade-Offs

- **Decision 1: Voice Architecture (Gemini AI vs. Edge TTS vs. Web Speech)**
  - *Chosen Approach*: Server-side Gemini AI TTS (`gemini-3.8-flash-lite-tts`) with prebuilt voice personas (`Aoede` for female teacher, `Zephyr` for male narrator) and server-side memory caching.
  - *Why*: Edge TTS sounded robotic and truncated acronyms like "ડો" literally. Gemini AI understands Gujarati grammar, emotional context, sentence pacing, and tone.
  - *Trade-off / Mitigation*: Network trip needed for synthesis; mitigated by 48-hour server memory cache and fallback to Web Speech API if offline.
- **Decision 2: Abbreviation Preprocessing (Rule-based Regex + Context Grammar)**
  - *Chosen Approach*: A fast regex normalization dictionary executed on the text payload before generating audio:
    - `/\b(ડૉ|ડો)\.?\s+/gu` $\to$ `ડૉક્ટર `
    - `/\b(પૂ)\.?\s+/gu` $\to$ `પૂજ્ય `
    - `/\b(પ્રો)\.?\s+/gu` $\to$ `પ્રોફેસર `
    - `/\b(શ્રી)\.?\s+/gu` $\to$ `શ્રીમાન `
    - `/\b(સ્વ)\.?\s+/gu` $\to$ `સ્વર્ગસ્થ `
    - `/\b(લિ)\.?\s+/gu` $\to$ `લિખિતંગ `
    - `/\b(ધો)\.?\s*(\d+)/gu` $\to$ `ધોરણ $2`
    - `/\b(તા)\.?\s*/gu` $\to$ `તારીખ `
  - *Why*: Guarantees 100% deterministic expansion without hallucinations or latency.
- **Decision 3: Version Baseline Alignment**
  - *Chosen Approach*: Bump `APP_BASELINE_VERSION` in both `src/services/appUpdateService.ts` and `server.ts` fallback from `1.0.58` to `1.0.60`, with automatic invalidation of cached version keys lower than `1.0.60`.
  - *Why*: Directly eliminates the reason preview loads `1.0.58`.

---

## 4. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────┐
│                    Client UI (Vidyalayam)                   │
│  - Dashboard / News Bulletin / Suvichar / Daily Janva Jevu  │
│  - Audio Player with Emotion & Tone Selector                │
│  - Version Indicator: Shows v1.0.60                         │
└──────────────────────────────┬──────────────────────────────┘
                               │
            1. POST /api/tts { text, gender, style }
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Express Server (server.ts)                    │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Step A: Gujarati Abbreviation & Pronunciation Engine   │  │
│  │ - Expands "ડો બાબાસાહેબ" -> "ડૉક્ટર બાબાસાહેબ"           │  │
│  │ - Expands "પૂ.", "પ્રો.", "ધો.", "તા.", etc.           │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              ▼                              │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Step B: Audio Cache Check (LRU Map, 48h TTL)           │  │
│  │ - If cached, immediately return base64 WAV audio      │  │
│  └───────────────────────────┬───────────────────────────┘  │
│                              ▼ (Cache Miss)                 │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Step C: Google GenAI SDK (gemini-3.8-flash-lite-tts)  │  │
│  │ - Style: "Warm, respectful Gujarati teacher cadence"  │  │
│  │ - Voice: Aoede (Female) / Zephyr (Male)               │  │
│  │ - Modality: AUDIO (24kHz Mono WAV)                    │  │
│  └───────────────────────────────────────────────────────┘  │
└──────────────────────────────┬──────────────────────────────┘
                               │
            2. GET /api/app-update-check (GitHub Proxy)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│            GitHub Releases & Version Sync                   │
│  - Dynamic fetch from anantahir7721-sudo/Vidyalayam-releases│
│  - Baseline updated to v1.0.60                              │
│  - Prunes obsolete localStorage cache keys                  │
└─────────────────────────────────────────────────────────────┘
```

### Key Sequences & Component Updates

1. **`src/services/ttsService.ts` & `src/services/voiceService.ts`**:
   - Route speech synthesis requests through the enhanced `/api/tts` endpoint.
   - Run text through `expandGujaratiAbbreviations()` before audio dispatch.
   - Cache synthesized audio blobs in client memory to avoid repeated network requests.
2. **`server.ts`**:
   - Modernize `/api/tts` endpoint using `@google/genai` `gemini-3.8-flash-lite-tts`.
   - Embed pronunciation dictionary directly in the pipeline.
   - Update version fallbacks in `/api/app-update-check` to `v1.0.60`.
3. **`src/services/appUpdateService.ts`**:
   - Update `APP_BASELINE_VERSION` to `1.0.60`.
   - Add version purge logic to clear stale cache keys if `< 1.0.60`.
