'use client';

import { useState, useCallback, useRef, useEffect } from 'react';

interface UseAudioRecorderOptions {
  mimeType?: string;
  onError?: (error: string) => void;
}

interface UseAudioRecorderReturn {
  isRecording: boolean;
  isSupported: boolean;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<Blob | null>;
  toggleRecording: () => Promise<Blob | null>;
}

/**
 * Safely requests a MediaStream with microphone audio across all browsers
 * (modern MediaDevices, WebKit/legacy prefixes, and secure context detection).
 */
async function getMediaStream(constraints: MediaStreamConstraints): Promise<MediaStream> {
  // 1. Modern standard navigator.mediaDevices.getUserMedia
  if (
    typeof navigator !== 'undefined' &&
    navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function'
  ) {
    return await navigator.mediaDevices.getUserMedia(constraints);
  }

  // 2. Legacy vendor-prefixed getUserMedia (WebKit / Safari / older mobile)
  const nav = typeof navigator !== 'undefined' ? (navigator as any) : null;
  const legacyGetUserMedia =
    nav &&
    (nav.webkitGetUserMedia ||
      nav.mozGetUserMedia ||
      nav.msGetUserMedia ||
      nav.getUserMedia);

  if (legacyGetUserMedia) {
    return new Promise<MediaStream>((resolve, reject) => {
      legacyGetUserMedia.call(navigator, constraints, resolve, reject);
    });
  }

  // 3. Check for insecure context (HTTP on IP address like http://192.168.x.x:3000)
  if (typeof window !== 'undefined' && window.isSecureContext === false) {
    throw new Error(
      'Microphone access is blocked by your browser on insecure HTTP. Please access the app using "http://localhost:3000" or enable HTTPS.'
    );
  }

  throw new Error(
    'Microphone API (getUserMedia) is not available. Please verify microphone permissions in your browser settings.'
  );
}

/**
 * Hook for recording audio from the microphone as a Blob.
 * Supports Chrome, Safari, Firefox, Edge, and mobile browsers.
 */
export function useAudioRecorder(
  options: UseAudioRecorderOptions = {}
): UseAudioRecorderReturn {
  const { onError } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isSupported, setIsSupported] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const resolveStopRef = useRef<((blob: Blob | null) => void) | null>(null);
  const activeMimeTypeRef = useRef<string>('audio/webm');

  useEffect(() => {
    const hasMedia =
      typeof navigator !== 'undefined' &&
      (!!navigator.mediaDevices?.getUserMedia ||
        !!(navigator as any).webkitGetUserMedia ||
        !!(navigator as any).mozGetUserMedia ||
        !!(navigator as any).getUserMedia);
    const hasRecorder = typeof MediaRecorder !== 'undefined';
    setIsSupported(hasMedia && hasRecorder);
  }, []);

  // Determine the best supported MIME type for recording (Safari prefers mp4/aac, Chrome prefers webm)
  const getSupportedMimeType = useCallback((): string => {
    if (typeof MediaRecorder === 'undefined') return '';
    const candidates = [
      'audio/webm;codecs=opus',
      'audio/webm',
      'audio/mp4',
      'audio/aac',
      'audio/ogg;codecs=opus',
    ];
    for (const type of candidates) {
      if (typeof MediaRecorder.isTypeSupported === 'function' && MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return ''; // empty string lets the browser pick its default container
  }, []);

  const startRecording = useCallback(async () => {
    if (isRecording) return;

    try {
      const stream = await getMediaStream({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      const mimeType = getSupportedMimeType();
      activeMimeTypeRef.current = mimeType || 'audio/webm';

      let mediaRecorder: MediaRecorder;
      try {
        mediaRecorder = mimeType
          ? new MediaRecorder(stream, { mimeType })
          : new MediaRecorder(stream);
      } catch {
        // Fallback without mimeType option if constructor rejected it
        mediaRecorder = new MediaRecorder(stream);
      }

      chunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Stop all tracks to release the microphone hardware indicator
        stream.getTracks().forEach((track) => track.stop());

        const finalType = mediaRecorder.mimeType || activeMimeTypeRef.current || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: finalType });
        chunksRef.current = [];

        if (resolveStopRef.current) {
          resolveStopRef.current(blob);
          resolveStopRef.current = null;
        }
      };

      mediaRecorder.onerror = () => {
        setIsRecording(false);
        stream.getTracks().forEach((track) => track.stop());
        onError?.('Audio recording failed. Please try again.');
        if (resolveStopRef.current) {
          resolveStopRef.current(null);
          resolveStopRef.current = null;
        }
      };

      mediaRecorderRef.current = mediaRecorder;
      mediaRecorder.start(250); // Collect data every 250ms
      setIsRecording(true);
    } catch (err: any) {
      let message = err.message || 'Failed to access microphone';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Microphone permission was denied. Please allow microphone access in your browser.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No microphone device was detected on your system.';
      }
      onError?.(message);
    }
  }, [isRecording, getSupportedMimeType, onError]);

  const stopRecording = useCallback((): Promise<Blob | null> => {
    return new Promise((resolve) => {
      if (!mediaRecorderRef.current || !isRecording) {
        resolve(null);
        return;
      }

      resolveStopRef.current = resolve;
      try {
        mediaRecorderRef.current.stop();
      } catch {
        resolve(null);
      }
      setIsRecording(false);
    });
  }, [isRecording]);

  const toggleRecording = useCallback(async (): Promise<Blob | null> => {
    if (isRecording) {
      return stopRecording();
    } else {
      await startRecording();
      return null;
    }
  }, [isRecording, startRecording, stopRecording]);

  return {
    isRecording,
    isSupported,
    startRecording,
    stopRecording,
    toggleRecording,
  };
}
