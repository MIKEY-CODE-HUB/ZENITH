'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Socket } from 'socket.io-client';

const stunServers: RTCIceServer[] = [{ urls: 'stun:stun.l.google.com:19302' }];

interface UseWebRTCProps {
  socket: Socket | null;
  roomId: string;
  userId: string;
  allowVoice?: boolean;
  iceServers?: RTCIceServer[];
}

export function useWebRTC({
  socket,
  roomId,
  userId,
  allowVoice = false,
  iceServers,
}: UseWebRTCProps) {
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStreams, setRemoteStreams] = useState<Map<string, MediaStream>>(new Map());
  const [isCameraOn, setIsCameraOn] = useState(false);
  const [isMicOn, setIsMicOn] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [deviceError, setDeviceError] = useState<string | null>(null);

  const peerConnections = useRef<Map<string, RTCPeerConnection>>(new Map());
  const iceCandidateQueue = useRef<Map<string, RTCIceCandidateInit[]>>(new Map());
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  const capture = useRef<MediaStream | null>(null);
  const pendingCapture = useRef(new Set<'video' | 'audio'>());
  const captureGeneration = useRef(0);

  useEffect(() => {
    const generation = ++captureGeneration.current;
    return () => {
      captureGeneration.current = generation + 1;
      capture.current?.getTracks().forEach(track => track.stop());
      capture.current = null;
      setLocalStream(null);
      setIsCameraOn(false);
      setIsMicOn(false);
      setIsSpeaking(false);
      pendingCapture.current.clear();
      if (audioContextRef.current) void audioContextRef.current.close().catch(() => {});
      if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [roomId]);

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

      source.connect(analyser);

      const bufferLength = analyser.frequencyBinCount;
      const dataArray = new Uint8Array(bufferLength);

      let speakingCounter = 0;
      let speaking = false;

      const checkAudio = () => {
        analyser.getByteFrequencyData(dataArray);
        let sum = 0;
        for (let i = 0; i < bufferLength; i++) {
          sum += dataArray[i];
        }
        const average = sum / bufferLength;

        if (average > 18) speakingCounter = 6;
        else if (speakingCounter > 0) speakingCounter--;
        const nextSpeaking = speakingCounter > 0;
        if (speaking !== nextSpeaking) {
          speaking = nextSpeaking;
          setIsSpeaking(speaking);
          socket?.emit('speaking_change', { roomId, isSpeaking: speaking });
        }

        animationFrameRef.current = requestAnimationFrame(checkAudio);
      };

      checkAudio();
    } catch (e) {
      console.warn('Audio analyser setup failed:', e);
    }
  };

  const syncPeerTracks = useCallback((pc: RTCPeerConnection) => {
    for (const transceiver of pc.getTransceivers()) {
      const track = capture.current?.getTracks().find(t => t.kind === transceiver.receiver.track.kind) ?? null;
      void transceiver.sender.replaceTrack(track).catch(() => {});
    }
  }, []);

  // An offer reserves media slots even when the devices are off. Turning a
  // device on later can then replace its sender track without another offer.
  const createPeerConnection = useCallback(
    (remoteSocketId: string, outgoing = false) => {
      const pc = new RTCPeerConnection({ iceServers: [...stunServers, ...(iceServers ?? [])] });
      if (outgoing) {
        pc.addTransceiver('video', { direction: 'sendrecv' });
        if (allowVoice) pc.addTransceiver('audio', { direction: 'sendrecv' });
        syncPeerTracks(pc);
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

      const incoming = new MediaStream();
      pc.ontrack = ({ track }) => {
        incoming.addTrack(track);
        setRemoteStreams(prev => new Map(prev).set(remoteSocketId, incoming));
      };

      pc.onconnectionstatechange = () => {
        if (peerConnections.current.get(remoteSocketId) === pc &&
            (pc.connectionState === 'failed' || pc.connectionState === 'closed')) {
          peerConnections.current.delete(remoteSocketId);
          pc.close();
          iceCandidateQueue.current.delete(remoteSocketId);
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
    [socket, allowVoice, iceServers, syncPeerTracks]
  );

  // 5. Socket Signaling Listeners
  useEffect(() => {
    if (!socket) return;

    // Incoming WebRTC Offer
    const handleOffer = async (data: { fromSocketId: string; fromUserId: string; offer: any }) => {
      let pc = peerConnections.current.get(data.fromSocketId);
      if (!pc) {
        pc = createPeerConnection(data.fromSocketId);
      }

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(data.offer));
        for (const transceiver of pc.getTransceivers()) {
          transceiver.direction = transceiver.receiver.track.kind === 'video' || allowVoice ? 'sendrecv' : 'inactive';
        }
        syncPeerTracks(pc);

        // Drain buffered candidates
        const queued = iceCandidateQueue.current.get(data.fromSocketId) || [];
        for (const cand of queued) {
          try {
            await pc.addIceCandidate(new RTCIceCandidate(cand));
          } catch (err) {
            console.warn('Buffered ICE candidate addition failed:', err);
          }
        }
        iceCandidateQueue.current.delete(data.fromSocketId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        socket.emit('webrtc_answer', {
          toSocketId: data.fromSocketId,
          fromUserId: userId,
          answer,
        });
      } catch (err) {
        console.error('Error handling webrtc_offer:', err);
      }
    };

    // Incoming WebRTC Answer
    const handleAnswer = async (data: { fromSocketId: string; answer: any }) => {
      const pc = peerConnections.current.get(data.fromSocketId);
      if (pc) {
        try {
          await pc.setRemoteDescription(new RTCSessionDescription(data.answer));

          // Drain buffered candidates
          const queued = iceCandidateQueue.current.get(data.fromSocketId) || [];
          for (const cand of queued) {
            try {
              await pc.addIceCandidate(new RTCIceCandidate(cand));
            } catch (err) {
              console.warn('Buffered ICE candidate addition failed:', err);
            }
          }
          iceCandidateQueue.current.delete(data.fromSocketId);
        } catch (err) {
          console.error('Error handling webrtc_answer:', err);
        }
      }
    };

    // Incoming ICE Candidate
    const handleIce = async (data: { fromSocketId: string; candidate: any }) => {
      const pc = peerConnections.current.get(data.fromSocketId);
      if (pc && pc.remoteDescription && pc.remoteDescription.type) {
        try {
          await pc.addIceCandidate(new RTCIceCandidate(data.candidate));
        } catch (e) {
          console.warn('ICE candidate addition failed:', e);
        }
      } else {
        // Buffer candidate until remote description is set
        if (!iceCandidateQueue.current.has(data.fromSocketId)) {
          iceCandidateQueue.current.set(data.fromSocketId, []);
        }
        iceCandidateQueue.current.get(data.fromSocketId)!.push(data.candidate);
      }
    };

    // When another user joins, initiate an offer to them
    const handleJoin = async (data: { participant: { socketId: string; userId: string } }) => {
      if (data.participant.socketId !== socket.id) {
        try {
          if (peerConnections.current.has(data.participant.socketId)) return;
          const pc = createPeerConnection(data.participant.socketId, true);
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);

          socket.emit('webrtc_offer', {
            toSocketId: data.participant.socketId,
            fromUserId: userId,
            offer,
          });
        } catch (err) {
          console.error('Error initiating WebRTC offer to new peer:', err);
        }
      }
    };

    // When a user leaves, cleanup their PC
    const handleLeave = (data: { socketId: string }) => {
      const pc = peerConnections.current.get(data.socketId);
      if (pc) {
        pc.close();
        peerConnections.current.delete(data.socketId);
      }
      iceCandidateQueue.current.delete(data.socketId);
      setRemoteStreams((prev) => {
        const updated = new Map(prev);
        updated.delete(data.socketId);
        return updated;
      });
    };

    const clearPeers = () => {
      for (const pc of peerConnections.current.values()) pc.close();
      peerConnections.current.clear();
      iceCandidateQueue.current.clear();
      setRemoteStreams(new Map());
    };
    socket.on('webrtc_offer', handleOffer);
    socket.on('webrtc_answer', handleAnswer);
    socket.on('webrtc_ice_candidate', handleIce);
    socket.on('user_joined', handleJoin);
    socket.on('user_left', handleLeave);
    socket.on('disconnect', clearPeers);
    return () => {
      socket.off('webrtc_offer', handleOffer);
      socket.off('webrtc_answer', handleAnswer);
      socket.off('webrtc_ice_candidate', handleIce);
      socket.off('user_joined', handleJoin);
      socket.off('user_left', handleLeave);
      socket.off('disconnect', clearPeers);
      clearPeers();
    };
  }, [socket, roomId, createPeerConnection, userId, allowVoice, syncPeerTracks]);

  const toggleDevice = async (kind: 'video' | 'audio') => {
    if (!roomId || (kind === 'audio' && !allowVoice) || pendingCapture.current.has(kind)) return;
    const active = capture.current?.getTracks().find(track => track.kind === kind);
    const update = () => {
      const stream = capture.current;
      setLocalStream(stream ? new MediaStream(stream.getTracks()) : null);
      const cameraOn = Boolean(stream?.getVideoTracks().length);
      const micOn = Boolean(stream?.getAudioTracks().length);
      setIsCameraOn(cameraOn);
      setIsMicOn(micOn);
      peerConnections.current.forEach(syncPeerTracks);
      socket?.emit('media_toggled', { roomId, cameraOn, micOn });
    };

    if (active && capture.current) {
      active.stop();
      capture.current.removeTrack(active);
      if (kind === 'audio') {
        if (animationFrameRef.current !== null) cancelAnimationFrame(animationFrameRef.current);
        if (audioContextRef.current) void audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
        setIsSpeaking(false);
        socket?.emit('speaking_change', { roomId, isSpeaking: false });
      }
      update();
      return;
    }

    const generation = captureGeneration.current;
    pendingCapture.current.add(kind);
    try {
      const input = await navigator.mediaDevices.getUserMedia({ video: kind === 'video', audio: kind === 'audio' });
      if (generation !== captureGeneration.current) {
        input.getTracks().forEach(track => track.stop());
        return;
      }
      capture.current ??= new MediaStream();
      for (const track of input.getTracks()) {
        capture.current.addTrack(track);
        track.addEventListener('ended', () => {
          if (generation !== captureGeneration.current) return;
          capture.current?.removeTrack(track);
          update();
          setDeviceError(kind === 'video' ? 'Camera disconnected.' : 'Microphone disconnected.');
        }, { once: true });
      }
      update();
      setDeviceError(null);
      if (kind === 'audio') setupAudioAnalyser(input);
    } catch (error) {
      if (generation !== captureGeneration.current) return;
      const device = kind === 'video' ? 'camera' : 'microphone';
      setDeviceError(error instanceof DOMException && error.name === 'NotAllowedError'
        ? `Allow ${device} access in your browser to use it.`
        : `Your ${device} is unavailable. You can continue your session.`);
    } finally {
      if (generation === captureGeneration.current) pendingCapture.current.delete(kind);
    }
  };

  return {
    localStream,
    remoteStreams,
    isCameraOn,
    isMicOn,
    isSpeaking,
    deviceError,
    toggleCamera: () => void toggleDevice('video'),
    toggleMic: () => void toggleDevice('audio'),
  };
}
