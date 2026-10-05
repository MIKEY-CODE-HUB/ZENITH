'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

interface UseWebRTCProps {
  socket: Socket | null;
  roomId: string;
  userId: string;
  enableCameraDefault?: boolean;
  enableMicDefault?: boolean;
  allowVoice?: boolean;
}

export function useWebRTC({
  socket,
  roomId,
  userId,
  enableCameraDefault = true,
  enableMicDefault = false,
  allowVoice = false,
}: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isCameraOn, setIsCameraOn] = useState(enableCameraDefault);
  const [isMicOn, setIsMicOn] = useState(enableMicDefault);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // ICE Server configuration (Public STUN servers)
  const rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  // 1. Initialize Local Media Stream
  useEffect(() => {
    let stream: MediaStream | null = null;

    async function initMedia() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: enableCameraDefault ? { width: { ideal: 640 }, height: { ideal: 360 } } : false,
          audio: allowVoice,
        });

        // Set initial track states
        stream.getVideoTracks().forEach((track) => {
          track.enabled = enableCameraDefault;
        });
        stream.getAudioTracks().forEach((track) => {
          track.enabled = allowVoice ? enableMicDefault : false;
        });

        setLocalStream(stream);
        setIsCameraOn(enableCameraDefault);
        setIsMicOn(allowVoice ? enableMicDefault : false);

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        // Set up speaking detection only if voice is permitted
        if (allowVoice) {
          setupAudioAnalyser(stream);
        }
      } catch (err: any) {
        console.warn('WebRTC getUserMedia error or denied:', err);
        setDeviceError(err.message || 'Camera or microphone access denied');
      }
    }

    initMedia();

    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // 2. Audio Analyser for Speaking Indicator
  const setupAudioAnalyser = (stream: MediaStream) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const audioCtx = new AudioCtx();
      audioContextRef.current = audioCtx;

      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0.4;
      analyserRef.current = analyser;

      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingCounter = 0;

      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        // If mic is enabled and volume exceeds threshold
        const currentlySpeaking = isMicOn && average > 18;

        if (currentlySpeaking) {
          speakingCounter = 6; // linger for smooth indicator
          if (!isSpeaking) {
            setIsSpeaking(true);
            if (socket) {
              socket.emit('speaking_change', { roomId, isSpeaking: true });
            }
          }
        } else if (speakingCounter > 0) {
          speakingCounter--;
        } else if (isSpeaking) {
          setIsSpeaking(false);
          if (socket) {
            socket.emit('speaking_change', { roomId, isSpeaking: false });
          }
        }

        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (e) {
      console.warn('Audio analyser setup failed:', e);
    }
  };

  // 3. WebRTC Peer Connection Helper
  const createPeerConnection = useCallback(
    (remoteSocketId: string) => {
      const pc = new RTCPeerConnection(rtcConfig);

      // Add local stream tracks to PC
      if (localStream) {
        localStream.getTracks().forEach((track) => {
          pc.addTrack(track, localStream);
        });
      }

      // Handle ICE candidates
      pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
          socket.emit('webrtc_ice_candidate', {
            toSocketId: remoteSocketId,
            candidate: event.candidate,
          });
        }
      };

      // Handle remote track arrival
      pc.ontrack = (event) => {
        setRemoteStreams((prev) => {
          const updated = new Map(prev);
          updated.set(remoteSocketId, event.streams[0]);
          return updated;
        });
      };

      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'disconnected' || pc.connectionState === 'failed' || pc.connectionState === 'closed') {
          peerConnections.current.delete(remoteSocketId);
          setRemoteStreams((prev) => {
            const updated = new Map(prev);
            updated.delete(remoteSocketId);
            return updated;
          });
        }
      };

      peerConnections.current.set(remoteSocketId, pc);
      return pc;
    },
    [localStream, socket, roomId]
  );

  // 4. Socket Signaling Listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming WebRTC Offer
    socket.on('webrtc_offer', async (data: { fromSocketId: string; fromUserId: string; offer: any }) => {
      let pc = peerConnections.current.get(data.fromSocketId);
      if (!pc) {
        pc = createPeerConnection(data.fromSocketId);
      }

      await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);

      socket.emit('webrtc_answer', {
        toSocketId: data.fromSocketId,
        fromUserId: userId,
        answer,
      });
    });

    // Incoming WebRTC Answer
    socket.on('webrtc_answer', async (data: { fromSocketId: string; answer: any }) => {
      const pc = peerConnections.current.get(data.fromSocketId);
      if (pc) {
        await pc.setRemoteDescription(new RTCSessionDescription(data.answer));
      }
    });

    // Incoming ICE Candidate
    socket.on('webrtc_ice_candidate', async (data: { fromSocketId: string; candidate: any }) => {
      const pc = peerConnections.current.get(data.fromSocketId);
      if (pc && data.candidate) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('ICE candidate addition failed:', e);
        }
      }
    });

    // When another user joins, initiate an offer to them
    socket.on('user_joined', async (data: { participant: { socketId: string; userId: string } }) => {
      if (data.participant.socketId !== socket.id) {
        const pc = createPeerConnection(data.participant.socketId);
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);

        socket.emit('webrtc_offer', {
          toSocketId: data.participant.socketId,
          fromUserId: userId,
          offer,
        });
      }
    });

    // When a user leaves, cleanup their PC
    socket.on('user_left', (data: { socketId: string }) => {
      const pc = peerConnections.current.get(data.socketId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(data.socketId);
      }
      setRemoteStreams((prev) => {
        const updated = new Map(prev);
        updated.delete(data.socketId);
        return updated;
      });
    });

    return () => {
      socket.off('webrtc_offer');
      socket.off('webrtc_answer');
      socket.off('webrtc_ice_candidate');
      socket.off('user_joined');
      socket.off('user_left');
    };
  }, [socket, createPeerConnection, userId]);

  // 5. Toggle Controls
  const toggleCamera = useCallback(() => {
    if (localStream) {
      const videoTracks = localStream.getVideoTracks();
      if (videoTracks.length > 0) {
        const newState = !isCameraOn;
        videoTracks.forEach((t) => (t.enabled = newState));
        setIsCameraOn(newState);
        if (socket) {
          socket.emit('media_toggled', { roomId, cameraOn: newState });
        }
      }
    }
  }, [localStream, isCameraOn, socket, roomId]);

  const toggleMic = useCallback(() => {
    if (!allowVoice) return;
    if (localStream) {
      const audioTracks = localStream.getAudioTracks();
      if (audioTracks.length > 0) {
        const newState = !isMicOn;
        audioTracks.forEach((t) => (t.enabled = newState));
        setIsMicOn(newState);
        if (socket) {
          socket.emit('media_toggled', { roomId, micOn: newState });
        }
      }
    }
  }, [allowVoice, localStream, isMicOn, socket, roomId]);

  return {
    localStream,
    remoteStreams,
    localVideoRef,
    isCameraOn,
    isMicOn,
    isSpeaking,
    deviceError,
    toggleCamera,
    toggleMic,
  };
}
