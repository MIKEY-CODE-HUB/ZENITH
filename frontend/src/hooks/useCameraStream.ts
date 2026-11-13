'use client';

import { useState, useEffect, useRef } from 'react';

export function useCameraStream() {
  const [requested, setRequested] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    if (!requested) {
      setStream(null);
      return;
    }
    let cancelled = false;
    let acquired: MediaStream | null = null;

    async function start() {
      setError(null);
      try {
        acquired = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
          audio: false,
        });
        if (cancelled) acquired.getTracks().forEach(track => track.stop());
        else setStream(acquired);
      } catch (error) {
        if (cancelled) return;
        setError(error instanceof DOMException && error.name === 'NotAllowedError'
          ? 'Allow camera access in your browser to see a preview.'
          : 'Camera unavailable. You can still start your focus session.');
        setRequested(false);
      }
    }
    void start();

    return () => {
      cancelled = true;
      acquired?.getTracks().forEach(track => track.stop());
    };
  }, [requested]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream;
  }, [stream]);

  return {
    videoRef,
    isCameraOn: Boolean(stream),
    pending: requested && !stream,
    error,
    toggleCamera: () => setRequested(previous => !previous),
  };
}
