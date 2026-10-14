import React, { useEffect, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  Loader2,
  User,
  Zap,
  X,
} from 'lucide-react';
import { ttsService, TTSPlayerState, TTSVoice } from '../services/ttsService';

export const GlobalTTSPlayerBar: React.FC = () => {
  const [state, setState] = useState<TTSPlayerState>(ttsService.getState());

  useEffect(() => {
    const unsubscribe = ttsService.subscribe((newState) => {
      setState(newState);
    });
    return () => unsubscribe();
  }, []);

  if (!state.activeId && !state.isLoading) {
    return null;
  }

  const handleTogglePlay = () => {
    if (state.isPlaying) {
      ttsService.pause();
    } else {
      ttsService.resume();
    }
  };

  const handleStop = () => {
    ttsService.stop();
  };

  const handleVoiceToggle = () => {
    const nextVoice: TTSVoice = state.voice === 'female' ? 'male' : 'female';
    ttsService.setVoice(nextVoice);
  };

  const handleRateToggle = () => {
    const nextRate = state.rate === 1.0 ? 1.25 : state.rate === 1.25 ? 0.9 : 1.0;
    ttsService.setRate(nextRate);
  };

  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const formatTime = (seconds: number) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  return (
    <aside
      aria-label="Audio speech player"
      className="fixed bottom-3 sm:bottom-5 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-[9990] animate-slideUp"
    >
      <div className="bg-slate-900/95 dark:bg-[#0b1329]/95 text-white backdrop-blur-md rounded-2xl p-3 sm:p-3.5 shadow-2xl border border-amber-500/30 dark:border-amber-400/20 ring-1 ring-white/10 flex flex-col gap-2 relative overflow-hidden">
        {/* Subtle top progress bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-white/10">
          <div
            className="h-full bg-gradient-to-r from-amber-400 to-orange-500 transition-all duration-200"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Header row */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0 text-amber-400">
              {state.isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
              ) : state.isPlaying ? (
                <Volume2 className="w-4 h-4 animate-pulse text-amber-400" />
              ) : (
                <VolumeX className="w-4 h-4 text-slate-400" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-white truncate leading-tight">
                {state.currentTitle || 'ઓડિયો વંચાઈ રહ્યો છે...'}
              </p>
              <p className="text-[10px] text-amber-300/80 truncate">
                {state.isLoading
                  ? 'અવાજ તૈયાર થઈ રહ્યો છે...'
                  : `${state.voice === 'female' ? '👩 આરાધ્યા (બહેન - Gemini AI)' : '👨 આરવ (ભાઈ - Gemini AI)'} • ${state.rate}x સ્પીડ`}
              </p>
            </div>
          </div>

          {/* Close / Stop */}
          <button
            onClick={handleStop}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
            title="બંધ કરો"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Controls row */}
        <div className="flex items-center justify-between gap-2 pt-1">
          {/* Time display */}
          <span className="text-[10px] font-mono text-slate-400 shrink-0">
            {formatTime(state.currentTime)} / {formatTime(state.duration)}
          </span>

          <div className="flex items-center gap-1.5">
            {/* Voice toggle */}
            <button
              onClick={handleVoiceToggle}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-semibold text-slate-200 transition-colors cursor-pointer"
              title="અવાજ બદલો (આરાધ્યા / આરવ)"
            >
              <User className="w-3 h-3 text-amber-400" />
              <span>{state.voice === 'female' ? 'આરાધ્યા' : 'આરવ'}</span>
            </button>

            {/* Speed toggle */}
            <button
              onClick={handleRateToggle}
              className="flex items-center gap-0.5 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-[10px] font-semibold text-slate-200 transition-colors cursor-pointer"
              title="સ્પીડ બદલો"
            >
              <Zap className="w-3 h-3 text-amber-400" />
              <span>{state.rate}x</span>
            </button>

            {/* Play / Pause button */}
            <button
              onClick={handleTogglePlay}
              disabled={state.isLoading}
              className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center justify-center transition-transform active:scale-95 shadow-md cursor-pointer disabled:opacity-50"
              title={state.isPlaying ? 'વિરામ (Pause)' : 'ચાલુ કરો (Play)'}
            >
              {state.isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-slate-950" />
              ) : state.isPlaying ? (
                <Pause className="w-4 h-4 fill-slate-950" />
              ) : (
                <Play className="w-4 h-4 fill-slate-950 ml-0.5" />
              )}
            </button>

            {/* Stop button */}
            <button
              onClick={handleStop}
              className="w-8 h-8 rounded-xl bg-white/10 hover:bg-red-500/20 hover:text-red-300 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
              title="સંપૂર્ણ બંધ કરો (Stop)"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
