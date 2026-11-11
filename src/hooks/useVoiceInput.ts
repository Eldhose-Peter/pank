/// <reference path="../types/speech-recognition.d.ts" />
'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseVoiceInputOptions {
  lang?: string;
  continuous?: boolean;
  onResult?: (transcript: string) => void;
  onInterim?: (transcript: string) => void;
  onError?: (error: string) => void;
}

interface UseVoiceInputReturn {
  isListening: boolean;
  isSupported: boolean;
  transcript: string;
  startListening: () => void;
  stopListening: () => void;
  toggleListening: () => void;
}

/**
 * Hook for browser-native speech recognition using the Web Speech API.
 * Works in Chrome, Edge, and other Chromium-based browsers.
 * Zero cost, no backend required.
 */
export function useVoiceInput(options: UseVoiceInputOptions = {}): UseVoiceInputReturn {
  const { lang = 'en-IN', continuous = false, onResult, onInterim, onError } = options;

  const [isListening, setIsListening] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const onResultRef = useRef(onResult);
  const onInterimRef = useRef(onInterim);
  const onErrorRef = useRef(onError);

  // Keep callback refs current without re-creating the recognition instance
  useEffect(() => {
    onResultRef.current = onResult;
    onInterimRef.current = onInterim;
    onErrorRef.current = onError;
  }, [onResult, onInterim, onError]);

  // Check support on client mount
  useEffect(() => {
    const supported =
      typeof window !== 'undefined' &&
      ('SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
    setIsSupported(supported);

    if (!supported) return;

    const SpeechRecognitionCtor =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) return;
    const recognition = new SpeechRecognitionCtor();

    recognition.lang = lang;
    recognition.interimResults = true;
    recognition.continuous = continuous;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          finalTranscript += result[0].transcript;
        } else {
          interimTranscript += result[0].transcript;
        }
      }

      if (interimTranscript) {
        setTranscript(interimTranscript);
        onInterimRef.current?.(interimTranscript);
      }

      if (finalTranscript) {
        setTranscript(finalTranscript);
        onResultRef.current?.(finalTranscript);
      }
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      setIsListening(false);
      if (event.error !== 'aborted') {
        onErrorRef.current?.(
          event.error === 'not-allowed'
            ? 'Microphone access denied. Please allow microphone permissions in your browser.'
            : `Voice recognition error: ${event.error}`
        );
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;

    return () => {
      recognition.abort();
    };
  }, [lang, continuous]);

  const startListening = useCallback(() => {
    if (isListening) return;

    if (!recognitionRef.current) {
      if (typeof window !== 'undefined' && window.isSecureContext === false) {
        onErrorRef.current?.(
          'Speech recognition is blocked on insecure HTTP. Please use http://localhost:3000 or HTTPS.'
        );
      } else {
        onErrorRef.current?.(
          'Browser speech recognition is not supported in this browser. Please use Chrome/Edge or switch to Gemini AI mode.'
        );
      }
      return;
    }

    try {
      setTranscript('');
      recognitionRef.current.start();
      setIsListening(true);
    } catch (e: any) {
      setIsListening(false);
      onErrorRef.current?.(e.message || 'Could not start speech recognition');
    }
  }, [isListening]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  }, [isListening]);

  const toggleListening = useCallback(() => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  }, [isListening, startListening, stopListening]);

  return {
    isListening,
    isSupported,
    transcript,
    startListening,
    stopListening,
    toggleListening,
  };
}
