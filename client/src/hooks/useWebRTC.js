import { useRef, useState, useCallback, useEffect } from 'react';

const ICE_SERVERS = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

export const useWebRTC = (socket) => {
  const localStreamRef = useRef(null);
  const peerConnectionRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [mediaError, setMediaError] = useState(null);
  const isInitiatorRef = useRef(false);

  // Acquire user media once on mount
  const startLocalStream = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      localStreamRef.current = stream;
      setLocalStream(stream);
      setMediaError(null);
      return stream;
    } catch (err) {
      const msg =
        err.name === 'NotAllowedError'
          ? 'Camera/mic permission denied. Please allow access and refresh.'
          : err.name === 'NotFoundError'
          ? 'No camera or microphone found.'
          : 'Could not access camera/microphone.';
      setMediaError(msg);
      return null;
    }
  }, []);

  const createPeerConnection = useCallback(() => {
    const pc = new RTCPeerConnection(ICE_SERVERS);

    // Add local tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Receive remote stream
    const remote = new MediaStream();
    setRemoteStream(remote);
    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => remote.addTrack(track));
    };

    // ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate && socket) {
        socket.emit('ice-candidate', { candidate: event.candidate });
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed') {
        console.warn('WebRTC connection failed, attempting restart');
        pc.restartIce();
      }
    };

    peerConnectionRef.current = pc;
    return pc;
  }, [socket]);

  // Initiator side: create offer
  const initiateCall = useCallback(async () => {
    isInitiatorRef.current = true;
    const pc = createPeerConnection();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket?.emit('webrtc-offer', { offer });
  }, [createPeerConnection, socket]);

  // Receiver side: handle incoming offer
  const handleOffer = useCallback(
    async ({ offer }) => {
      const pc = createPeerConnection();
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket?.emit('webrtc-answer', { answer });
    },
    [createPeerConnection, socket]
  );

  const handleAnswer = useCallback(async ({ answer }) => {
    const pc = peerConnectionRef.current;
    if (pc && pc.signalingState !== 'stable') {
      await pc.setRemoteDescription(new RTCSessionDescription(answer));
    }
  }, []);

  const handleIceCandidate = useCallback(async ({ candidate }) => {
    const pc = peerConnectionRef.current;
    if (pc && candidate) {
      try {
        await pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('ICE candidate error:', err);
      }
    }
  }, []);

  const closePeerConnection = useCallback(() => {
    peerConnectionRef.current?.close();
    peerConnectionRef.current = null;
    setRemoteStream(null);
    isInitiatorRef.current = false;
  }, []);

  // Toggle mute
  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((prev) => !prev);
  }, []);

  // Toggle camera
  const toggleCam = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    stream.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsCamOff((prev) => !prev);
  }, []);

  const stopLocalStream = useCallback(() => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      closePeerConnection();
      stopLocalStream();
    };
  }, [closePeerConnection, stopLocalStream]);

  return {
    localStream,
    remoteStream,
    isMuted,
    isCamOff,
    mediaError,
    startLocalStream,
    initiateCall,
    handleOffer,
    handleAnswer,
    handleIceCandidate,
    closePeerConnection,
    toggleMute,
    toggleCam,
    stopLocalStream,
  };
};
