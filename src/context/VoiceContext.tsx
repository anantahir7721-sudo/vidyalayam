import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { voiceService } from '../services/voiceService';

export type VoiceGender = 'female' | 'male';

interface VoiceContextType {
  voiceGender: VoiceGender;
  setVoiceGender: (gender: VoiceGender) => void;
  toggleVoiceGender: () => void;
  isSpeaking: boolean;
  activeId: string | null;
  loadingId: string | null;
  playSpeech: (id: string, text: string, onDone?: () => void) => void;
  stopSpeech: () => void;
}

const VoiceContext = createContext<VoiceContextType>({
  voiceGender: 'female',
  setVoiceGender: () => {},
  toggleVoiceGender: () => {},
  isSpeaking: false,
  activeId: null,
  loadingId: null,
  playSpeech: () => {},
  stopSpeech: () => {},
});

export const VoiceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [voiceGender, setVoiceGenderState] = useState<VoiceGender>(() => {
    try {
      const saved = localStorage.getItem('ekam_voice_gender');
      if (saved === 'male' || saved === 'female') return saved;
    } catch {}
    return 'female';
  });

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [lastSpeechPayload, setLastSpeechPayload] = useState<{ id: string; text: string; onDone?: () => void } | null>(null);

  // Sync state to voiceService and localStorage
  const setVoiceGender = useCallback((gender: VoiceGender) => {
    setVoiceGenderState(gender);
    try {
      localStorage.setItem('ekam_voice_gender', gender);
    } catch {}
    voiceService.setVoiceGender(gender);

    // If currently speaking or was just playing, switch immediately to the newly selected voice!
    if (activeId && lastSpeechPayload && lastSpeechPayload.id === activeId) {
      voiceService.stop();
      setIsSpeaking(false);
      // Immediate restart with the new voice
      setTimeout(() => {
        playSpeech(lastSpeechPayload.id, lastSpeechPayload.text, lastSpeechPayload.onDone, gender);
      }, 50);
    }
  }, [activeId, lastSpeechPayload]);

  const toggleVoiceGender = useCallback(() => {
    setVoiceGender(voiceGender === 'female' ? 'male' : 'female');
  }, [voiceGender, setVoiceGender]);

  const stopSpeech = useCallback(() => {
    voiceService.stop();
    setIsSpeaking(false);
    setActiveId(null);
    setLoadingId(null);
  }, []);

  const playSpeech = useCallback((id: string, text: string, onDone?: () => void, overrideGender?: VoiceGender) => {
    if (activeId === id && isSpeaking) {
      stopSpeech();
      return;
    }

    voiceService.stop();
    setActiveId(id);
    setLoadingId(id);
    setIsSpeaking(true);
    setLastSpeechPayload({ id, text, onDone });

    const effectiveGender = overrideGender || voiceGender;

    voiceService.speak(text, {
      voiceGender: effectiveGender,
      onStart: () => {
        setLoadingId(null);
        setIsSpeaking(true);
        setActiveId(id);
      },
      onEnd: () => {
        setIsSpeaking(false);
        setActiveId(null);
        setLoadingId(null);
        if (onDone) onDone();
      },
      onError: () => {
        setIsSpeaking(false);
        setActiveId(null);
        setLoadingId(null);
      },
      onLoading: (isLoading) => {
        if (isLoading) setLoadingId(id);
        else setLoadingId(null);
      },
    });
  }, [activeId, isSpeaking, voiceGender, stopSpeech]);

  useEffect(() => {
    return () => {
      voiceService.stop();
    };
  }, []);

  return (
    <VoiceContext.Provider
      value={{
        voiceGender,
        setVoiceGender,
        toggleVoiceGender,
        isSpeaking,
        activeId,
        loadingId,
        playSpeech,
        stopSpeech,
      }}
    >
      {children}
    </VoiceContext.Provider>
  );
};

export const useVoice = () => useContext(VoiceContext);
