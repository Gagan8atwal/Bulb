// src/features/capture/usePushToTalk.ts
// Push-to-talk speech recognition using @react-native-voice/voice.
//
// Architecture:
//   • On-device STT (SFSpeechRecognizer on iOS) — no network, no cost.
//   • Hold model: call startListening() when mic button is pressed,
//     stopListening() on release.
//   • Partial results update the transcript live during speech.
//   • Final result is stable in `transcript` after stopListening().
//
// REQUIRES: custom dev client build (Voice is a native module).
// PERMISSIONS: NSMicrophoneUsageDescription + NSSpeechRecognitionUsageDescription
//   are set in app.config.ts.

import { useState, useEffect, useCallback } from 'react';
import Voice, {
  SpeechResultsEvent,
  SpeechErrorEvent,
  SpeechStartEvent,
  SpeechEndEvent,
} from '@react-native-voice/voice';
import { logger } from '../../lib/logger';

export type MicState = 'idle' | 'listening' | 'processing' | 'error';

export interface UsePushToTalkResult {
  micState: MicState;
  transcript: string;         // Current/final transcript
  partialTranscript: string;  // Live partial results during speech
  startListening: () => Promise<void>;
  stopListening: () => Promise<void>;
  clearTranscript: () => void;
  isAvailable: boolean;       // false on simulator or unavailable locale
}

export function usePushToTalk(locale = 'en-US'): UsePushToTalkResult {
  const [micState, setMicState] = useState<MicState>('idle');
  const [transcript, setTranscript] = useState('');
  const [partialTranscript, setPartialTranscript] = useState('');
  const [isAvailable, setIsAvailable] = useState(false);

  // ── Check availability once on mount ──────────────────────────────────────
  useEffect(() => {
    Voice.isAvailable()
      .then((available) => setIsAvailable(!!available))
      .catch(() => setIsAvailable(false));

    return () => {
      // Cleanup: destroy Voice on unmount
      Voice.destroy().then(Voice.removeAllListeners).catch(() => undefined);
    };
  }, []);

  // ── Wire up event handlers ─────────────────────────────────────────────────
  useEffect(() => {
    Voice.onSpeechStart = (_e: SpeechStartEvent) => {
      setMicState('listening');
      setPartialTranscript('');
      logger.debug('usePushToTalk: speech started');
    };

    Voice.onSpeechEnd = (_e: SpeechEndEvent) => {
      setMicState('processing');
      logger.debug('usePushToTalk: speech ended');
    };

    Voice.onSpeechResults = (e: SpeechResultsEvent) => {
      // Final results — take the highest-confidence result (index 0)
      const final = e.value?.[0] ?? '';
      logger.debug('usePushToTalk: final result:', final);
      setTranscript(final);
      setPartialTranscript('');
      setMicState('idle');
    };

    Voice.onSpeechPartialResults = (e: SpeechResultsEvent) => {
      const partial = e.value?.[0] ?? '';
      setPartialTranscript(partial);
    };

    Voice.onSpeechError = (e: SpeechErrorEvent) => {
      logger.warn('usePushToTalk: error:', e.error);
      setMicState('error');
      setPartialTranscript('');
      // Don't clear the transcript on error — keep whatever we had
    };

    return () => {
      Voice.onSpeechStart = undefined;
      Voice.onSpeechEnd = undefined;
      Voice.onSpeechResults = undefined;
      Voice.onSpeechPartialResults = undefined;
      Voice.onSpeechError = undefined;
    };
  }, []);

  // ── Controls ───────────────────────────────────────────────────────────────

  const startListening = useCallback(async (): Promise<void> => {
    if (!isAvailable || micState === 'listening') return;
    try {
      setMicState('listening');
      setPartialTranscript('');
      await Voice.start(locale);
    } catch (err) {
      logger.error('usePushToTalk.start failed:', err);
      setMicState('error');
    }
  }, [isAvailable, locale, micState]);

  const stopListening = useCallback(async (): Promise<void> => {
    if (micState !== 'listening') return;
    try {
      setMicState('processing');
      await Voice.stop();
    } catch (err) {
      logger.error('usePushToTalk.stop failed:', err);
      setMicState('idle');
    }
  }, [micState]);

  const clearTranscript = useCallback((): void => {
    setTranscript('');
    setPartialTranscript('');
    setMicState('idle');
  }, []);

  return {
    micState,
    transcript,
    partialTranscript,
    startListening,
    stopListening,
    clearTranscript,
    isAvailable,
  };
}
