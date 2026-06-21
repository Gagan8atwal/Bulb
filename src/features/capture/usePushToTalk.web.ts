// src/features/capture/usePushToTalk.web.ts
// WEB stub for push-to-talk.
//
// @react-native-voice/voice is a native module with no web implementation, so it
// must never be imported into the web bundle. This stub reports `isAvailable:
// false`, which makes CaptureInput hide the mic button entirely. Text capture is
// fully functional on web; voice capture is cleanly disabled (it returns on
// native when the Apple Developer / native build path is ready).

import type { UsePushToTalkResult } from './usePushToTalk';

export function usePushToTalk(_locale = 'en-US'): UsePushToTalkResult {
  return {
    micState: 'idle',
    transcript: '',
    partialTranscript: '',
    startListening: async () => undefined,
    stopListening: async () => undefined,
    clearTranscript: () => undefined,
    isAvailable: false, // → CaptureInput hides the mic button on web
  };
}
