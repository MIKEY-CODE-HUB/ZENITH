'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

export function useCameraStream(initialCameraOn = true) {
  const [isCameraOn, setIsCameraOn] = useState(initialCameraOn);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const startStream = useCallback(async () => {
    try {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia) {
        setError('Media devices not supported in this environment');
        return;
      }

      // Audio is strictly false (Zero audio / no mic in focus rooms)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: isCameraOn ? { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' } : false,
        audio: false,
      });

      setStream(mediaStream);
      setHasPermission(true);
      setError(null);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera access denied or unavailable:', err.message);
      setError('Camera unavailable. Continuing with avatar accountability.');
      setHasPermission(false);
    }
  }, [isCameraOn]);

  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, [stream]);

  useEffect(() => {
    if (isCameraOn) {
      startStream();
    } else {
      stopStream();
    }

    return () => {
      stopStream();
    };
  }, [isCameraOn]);

  useEffect(() => {
    if (videoRef.current && stream) {
      videoRef.current.srcObject = stream;
    }
  }, [stream, videoRef]);

  const toggleCamera = () => {
    setIsCameraOn((prev) => !prev);
  };

  return {
    videoRef,
    stream,
    isCameraOn,
    hasPermission,
    error,
    toggleCamera,
  };
}
