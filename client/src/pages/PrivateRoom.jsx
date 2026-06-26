import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Mic, MicOff, Video, VideoOff, MonitorUp, MonitorX, PhoneOff, Copy, Check, Users,
} from 'lucide-react';
import { useSocket } from '../context/SocketContext';
import VideoPlayer from '../components/video/VideoPlayer';
import Spinner from '../components/ui/Spinner';

const ICE = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

export default function PrivateRoom() {
  const { id: roomId } = useParams();
  const navigate = useNavigate();
  const { socket } = useSocket();

  const localStreamRef = useRef(null);
  const pcsRef = useRef(new Map());        // socketId -> RTCPeerConnection
  const cameraTrackRef = useRef(null);

  const [localStream, setLocalStream] = useState(null);
  const [peers, setPeers] = useState([]);   // { socketId, profile, stream }
  const [status, setStatus] = useState('loading'); // loading | ready | error | full
  const [error, setError] = useState('');
  const [isMuted, setIsMuted] = useState(false);
  const [isCamOff, setIsCamOff] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);

  const upsertPeer = useCallback((socketId, patch) => {
    setPeers((prev) => {
      const idx = prev.findIndex((p) => p.socketId === socketId);
      if (idx === -1) return [...prev, { socketId, ...patch }];
      const next = [...prev];
      next[idx] = { ...next[idx], ...patch };
      return next;
    });
  }, []);

  const removePeer = useCallback((socketId) => {
    pcsRef.current.get(socketId)?.close();
    pcsRef.current.delete(socketId);
    setPeers((prev) => prev.filter((p) => p.socketId !== socketId));
  }, []);

  // Build a peer connection; if `initiator`, send the offer
  const createPeer = useCallback(async (socketId, profile, initiator) => {
    const pc = new RTCPeerConnection(ICE);
    pcsRef.current.set(socketId, pc);

    localStreamRef.current?.getTracks().forEach((t) => pc.addTrack(t, localStreamRef.current));

    const remote = new MediaStream();
    upsertPeer(socketId, { profile, stream: remote });
    pc.ontrack = (e) => e.streams[0].getTracks().forEach((t) => remote.addTrack(t));

    pc.onicecandidate = (e) => {
      if (e.candidate) socket.emit('room:signal', { to: socketId, data: { type: 'candidate', candidate: e.candidate } });
    };

    if (initiator) {
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('room:signal', { to: socketId, data: { type: 'offer', sdp: offer } });
    }
    return pc;
  }, [socket, upsertPeer]);

  // Acquire media + join the room
  useEffect(() => {
    if (!socket) return;
    let mounted = true;

    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        if (!mounted) { stream.getTracks().forEach((t) => t.stop()); return; }
        localStreamRef.current = stream;
        cameraTrackRef.current = stream.getVideoTracks()[0];
        setLocalStream(stream);
        setStatus('ready');
        socket.emit('room:join', { roomId });
      } catch {
        setError('Camera/microphone access is required to join the room.');
        setStatus('error');
      }
    })();

    return () => {
      mounted = false;
      socket.emit('room:leave');
      pcsRef.current.forEach((pc) => pc.close());
      pcsRef.current.clear();
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, [socket, roomId]);

  // Signaling handlers
  useEffect(() => {
    if (!socket) return;

    const onPeers = ({ peers: existing }) => {
      // I'm the newcomer → I initiate offers to everyone already here
      existing.forEach((p) => createPeer(p.socketId, p.profile, true));
    };
    const onPeerJoined = ({ socketId, profile }) => {
      // Someone joined after me → they'll send me the offer; just note them
      upsertPeer(socketId, { profile });
    };
    const onSignal = async ({ from, data }) => {
      let pc = pcsRef.current.get(from);
      if (data.type === 'offer') {
        if (!pc) pc = await createPeer(from, peers.find((p) => p.socketId === from)?.profile, false);
        await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        socket.emit('room:signal', { to: from, data: { type: 'answer', sdp: answer } });
      } else if (data.type === 'answer') {
        if (pc) await pc.setRemoteDescription(new RTCSessionDescription(data.sdp));
      } else if (data.type === 'candidate') {
        try { await pc?.addIceCandidate(new RTCIceCandidate(data.candidate)); } catch { /* ignore */ }
      }
    };
    const onPeerLeft = ({ socketId }) => removePeer(socketId);
    const onFull = () => { setStatus('full'); };

    socket.on('room:peers', onPeers);
    socket.on('room:peer-joined', onPeerJoined);
    socket.on('room:signal', onSignal);
    socket.on('room:peer-left', onPeerLeft);
    socket.on('room:full', onFull);

    return () => {
      socket.off('room:peers', onPeers);
      socket.off('room:peer-joined', onPeerJoined);
      socket.off('room:signal', onSignal);
      socket.off('room:peer-left', onPeerLeft);
      socket.off('room:full', onFull);
    };
  }, [socket, createPeer, removePeer, upsertPeer, peers]);

  const toggleMute = () => {
    localStreamRef.current?.getAudioTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsMuted((m) => !m);
  };
  const toggleCam = () => {
    localStreamRef.current?.getVideoTracks().forEach((t) => { t.enabled = !t.enabled; });
    setIsCamOff((c) => !c);
  };

  // Replace the outgoing video track across all peers
  const replaceVideoTrack = (track) => {
    pcsRef.current.forEach((pc) => {
      const sender = pc.getSenders().find((s) => s.track?.kind === 'video');
      if (sender) sender.replaceTrack(track);
    });
  };

  const toggleScreenShare = async () => {
    if (sharing) {
      replaceVideoTrack(cameraTrackRef.current);
      setSharing(false);
      return;
    }
    try {
      const display = await navigator.mediaDevices.getDisplayMedia({ video: true });
      const screenTrack = display.getVideoTracks()[0];
      replaceVideoTrack(screenTrack);
      setSharing(true);
      // Revert when the user stops sharing from the browser UI
      screenTrack.onended = () => { replaceVideoTrack(cameraTrackRef.current); setSharing(false); };
    } catch { /* user cancelled */ }
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const leave = () => navigate('/dashboard');

  if (status === 'error' || status === 'full') {
    return (
      <div className="min-h-screen bg-bg-primary flex flex-col items-center justify-center gap-4 px-4 text-center">
        <p className="text-text-secondary">{status === 'full' ? 'This room is full (max 4 participants).' : error}</p>
        <button onClick={leave} className="btn-secondary text-sm">Back to dashboard</button>
      </div>
    );
  }

  // Grid sizing based on participant count (local + remotes)
  const total = peers.length + 1;
  const gridCols = total <= 1 ? 'grid-cols-1' : total === 2 ? 'grid-cols-2' : 'grid-cols-2';

  return (
    <div className="h-screen bg-black flex flex-col">
      {/* Top bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-bg-primary/90 backdrop-blur border-b border-border-subtle">
        <div className="flex items-center gap-2 text-sm">
          <span className="text-blue-electric font-bold">▶</span>
          <span className="font-semibold">Private room</span>
          <span className="flex items-center gap-1 text-text-muted ml-2"><Users size={14} />{total}/4</span>
        </div>
        <button onClick={copyLink} className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-border-subtle hover:border-blue-electric/40 text-text-secondary hover:text-blue-electric transition-all">
          {copied ? <><Check size={14} /> Copied</> : <><Copy size={14} /> Share link</>}
        </button>
      </div>

      {/* Video grid */}
      <div className={`flex-1 grid ${gridCols} gap-2 p-2 overflow-hidden`}>
        <div className="relative rounded-xl overflow-hidden bg-bg-secondary">
          <VideoPlayer stream={localStream} muted isCamOff={isCamOff} className="w-full h-full" label="You" />
        </div>
        {peers.map((p) => (
          <div key={p.socketId} className="relative rounded-xl overflow-hidden bg-bg-secondary">
            <VideoPlayer stream={p.stream} className="w-full h-full" label={p.profile?.name || 'Guest'} />
          </div>
        ))}
        {status === 'loading' && (
          <div className="absolute inset-0 flex items-center justify-center"><Spinner size={28} /></div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-bg-secondary/90 backdrop-blur border-t border-border-subtle px-4 py-4 flex items-center justify-center gap-3">
        <button onClick={toggleMute}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all
                     ${isMuted ? 'border-red-disconnect/40 bg-red-disconnect/10 text-red-disconnect' : 'border-border-subtle text-text-secondary hover:text-text-primary'}`}>
          {isMuted ? <MicOff size={20} /> : <Mic size={20} />}<span className="text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
        </button>
        <button onClick={toggleCam}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all
                     ${isCamOff ? 'border-red-disconnect/40 bg-red-disconnect/10 text-red-disconnect' : 'border-border-subtle text-text-secondary hover:text-text-primary'}`}>
          {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}<span className="text-xs">Cam</span>
        </button>
        <button onClick={toggleScreenShare}
          className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all
                     ${sharing ? 'border-blue-electric bg-blue-electric/10 text-blue-electric' : 'border-border-subtle text-text-secondary hover:text-text-primary'}`}>
          {sharing ? <MonitorX size={20} /> : <MonitorUp size={20} />}<span className="text-xs">{sharing ? 'Stop' : 'Share'}</span>
        </button>
        <button onClick={leave}
          className="flex flex-col items-center gap-1 p-3 rounded-xl border border-red-disconnect/30 bg-red-disconnect/10 text-red-disconnect hover:bg-red-disconnect/20 transition-all">
          <PhoneOff size={20} /><span className="text-xs">Leave</span>
        </button>
      </div>
    </div>
  );
}
