import React, { useEffect, useState } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Loader2,
  X,
  Sparkles,
} from 'lucide-react';
import { ttsService, TTSPlayerState } from '../services/ttsService';

function formatDuration(seconds: number): string {
  if (!seconds || isNaN(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const TTSFloatingBar: React.FC = () => {
  const [state, setState] = useState<TTSPlayerState>(ttsService.getState());

  useEffect(() => {
    const unsub = ttsService.subscribe((s) => {
      setState(s);
    });
    return () => unsub();
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

  const handleSpeedToggle = () => {
    const speeds = [1.0, 1.15, 1.25, 0.9];
    const currentIndex = speeds.indexOf(state.rate);
    const nextSpeed = speeds[(currentIndex + 1) % speeds.length] || 1.0;
    ttsService.setRate(nextSpeed);
  };

  const progressPercent = state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <div className="fixed bottom-20 lg:bottom-5 left-3 right-3 sm:left-auto sm:right-6 sm:max-w-md z-[9990] animate-in slide-in-from-bottom-4 duration-300">
      <div className="bg-slate-900/95 dark:bg-[#0c131a]/95 backdrop-blur-xl border border-indigo-500/30 dark:border-indigo-500/40 text-white rounded-2xl shadow-2xl p-3 sm:p-3.5 space-y-2 ring-1 ring-white/10">
        
        {/* Progress Bar Top Edge */}
        {state.duration > 0 && (
          <div className="w-full bg-slate-800 rounded-full h-1 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-400 via-rose-400 to-indigo-400 h-1 transition-all duration-300"
              style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
            />
          </div>
        )}

        {/* Main Controls Row */}
        <div className="flex items-center justify-between gap-3">
          {/* Status Icon & Title */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-amber-500 flex items-center justify-center shrink-0 shadow-md">
              {state.isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-white" />
              ) : state.isPlaying ? (
                <Volume2 className="w-4 h-4 animate-bounce text-white" />
              ) : (
                <VolumeX className="w-4 h-4 text-white/70" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  ગુજરાતી મહિલા શિક્ષક વાણી
                </span>
                <span className="text-[10px] text-amber-300 font-semibold">
                  • Gemini AI (માનવીય અવાજ)
                </span>
              </div>
              <h4 className="text-xs font-bold text-white truncate leading-tight">
                {state.currentTitle || 'વાંચી રહ્યું છે...'}
              </h4>
              {state.duration > 0 && (
                <div className="text-[10px] text-slate-400 font-mono">
                  {formatDuration(state.currentTime)} / {formatDuration(state.duration)}
                </div>
              )}
            </div>
          </div>

          {/* Quick Buttons */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Speed Toggle */}
            <button
              type="button"
              onClick={handleSpeedToggle}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] font-bold text-slate-200 transition-colors cursor-pointer"
              title="વાચન ઝડપ બદલો"
            >
              {state.rate}x
            </button>

            {/* Play / Pause Toggle */}
            <button
              type="button"
              onClick={handleTogglePlay}
              disabled={state.isLoading}
              className="w-8 h-8 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center justify-center transition-transform active:scale-90 cursor-pointer shadow-md disabled:opacity-50"
              title={state.isPlaying ? 'વિરામ (Pause)' : 'ચાલુ કરો (Play)'}
            >
              {state.isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Stop / Close */}
            <button
              type="button"
              onClick={handleStop}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="બંધ કરો"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
