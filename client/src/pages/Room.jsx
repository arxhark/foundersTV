import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Video, VideoOff, SkipForward, PhoneOff,
  Bookmark, BookmarkCheck, AlertTriangle, Send, Clock,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { useWebRTC } from '../hooks/useWebRTC';
import { userApi } from '../services/api';
import VideoPlayer from '../components/video/VideoPlayer';
import FounderCard from '../components/ui/FounderCard';
import Spinner from '../components/ui/Spinner';

const CALL_STATES = {
  IDLE: 'idle',
  WAITING: 'waiting',
  CONNECTED: 'connected',
  TIMEOUT: 'timeout',
};

const REPORT_REASONS = [
  { value: 'spam', label: 'Spam' },
  { value: 'inappropriate', label: 'Inappropriate' },
  { value: 'bot', label: 'Bot' },
];

export default function Room() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  const location = useLocation();
  const filters = location.state?.filters || {};

  const {
    localStream, remoteStream, isMuted, isCamOff, mediaError,
    startLocalStream, initiateCall, handleOffer, handleAnswer,
    handleIceCandidate, closePeerConnection, toggleMute, toggleCam, stopLocalStream,
  } = useWebRTC(socket);

  const [callState, setCallState] = useState(CALL_STATES.IDLE);
  const [peer, setPeer] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [elapsed, setElapsed] = useState(0);
  const [saved, setSaved] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [reportSent, setReportSent] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [reactions, setReactions] = useState([]);

  const timerRef = useRef(null);
  const callStartRef = useRef(null);
  const chatEndRef = useRef(null);
  const isInitiatorRef = useRef(false);

  // Format elapsed seconds as mm:ss
  const formatTime = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const startTimer = () => {
    callStartRef.current = Date.now();
    timerRef.current = setInterval(() => setElapsed(Math.floor((Date.now() - callStartRef.current) / 1000)), 1000);
  };

  const stopTimer = () => {
    clearInterval(timerRef.current);
    return Math.floor((Date.now() - (callStartRef.current || Date.now())) / 1000);
  };

  const sendCallEnded = useCallback((duration) => {
    if (duration > 0) socket?.emit('call-ended', { durationSeconds: duration });
  }, [socket]);

  const resetCall = useCallback(() => {
    const duration = stopTimer();
    sendCallEnded(duration);
    closePeerConnection();
    setPeer(null);
    setMessages([]);
    setElapsed(0);
    setSaved(false);
    setReportSent(false);
    setShowReport(false);
    isInitiatorRef.current = false;
  }, [closePeerConnection, sendCallEnded]);

  // Initialize: get media then join queue
  useEffect(() => {
    let mounted = true;

    const init = async () => {
      const stream = await startLocalStream();
      if (!stream || !mounted) return;

      socket?.emit('join-queue', { filters });
      setCallState(CALL_STATES.WAITING);
    };

    if (socket) init();

    return () => {
      mounted = false;
      resetCall();
      socket?.emit('end-call');
      stopLocalStream();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket]);

  // Socket event handlers
  useEffect(() => {
    if (!socket) return;

    const onMatchFound = async ({ peer: peerProfile, initiator }) => {
      setPeer(peerProfile);
      setCallState(CALL_STATES.CONNECTED);
      setMessages([]);
      setReactions([]);
      setSaved(false);
      startTimer();

      // The server assigns who creates the offer to avoid WebRTC glare
      isInitiatorRef.current = !!initiator;
      if (isInitiatorRef.current) await initiateCall();
    };

    const onReaction = ({ emoji }) => spawnReaction(emoji);

    const onWaiting = () => setCallState(CALL_STATES.WAITING);
    const onTimeout = () => { resetCall(); setCallState(CALL_STATES.TIMEOUT); };
    const onPeerDisconnected = () => {
      resetCall();
      socket.emit('join-queue', { filters });
      setCallState(CALL_STATES.WAITING);
    };

    const onChatMessage = ({ message, from, timestamp }) => {
      setMessages((prev) => [...prev, { message, from, timestamp, mine: false }]);
    };

    socket.on('match-found', onMatchFound);
    socket.on('waiting', onWaiting);
    socket.on('queue-timeout', onTimeout);
    socket.on('peer-disconnected', onPeerDisconnected);
    socket.on('webrtc-offer', handleOffer);
    socket.on('webrtc-answer', handleAnswer);
    socket.on('ice-candidate', handleIceCandidate);
    socket.on('chat-message', onChatMessage);
    socket.on('reaction', onReaction);

    return () => {
      socket.off('match-found', onMatchFound);
      socket.off('waiting', onWaiting);
      socket.off('queue-timeout', onTimeout);
      socket.off('peer-disconnected', onPeerDisconnected);
      socket.off('webrtc-offer', handleOffer);
      socket.off('webrtc-answer', handleAnswer);
      socket.off('ice-candidate', handleIceCandidate);
      socket.off('chat-message', onChatMessage);
      socket.off('reaction', onReaction);
    };
  }, [socket, filters, initiateCall, handleOffer, handleAnswer, handleIceCandidate, resetCall]);

  // Auto-scroll chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleNext = () => {
    resetCall();
    socket?.emit('next-founder', { filters });
    setCallState(CALL_STATES.WAITING);
  };

  // Spawn a floating reaction that drifts up and removes itself
  const spawnReaction = (emoji) => {
    const id = `${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    const left = 20 + Math.random() * 50; // random horizontal position (%)
    setReactions((prev) => [...prev, { id, emoji, left }]);
    setTimeout(() => setReactions((prev) => prev.filter((r) => r.id !== id)), 2600);
  };

  const sendReaction = (emoji) => {
    socket?.emit('reaction', { emoji });
    spawnReaction(emoji);
  };

  const handleLeave = () => {
    resetCall();
    socket?.emit('end-call');
    navigate('/dashboard');
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;
    socket?.emit('chat-message', { message: chatInput });
    setMessages((prev) => [...prev, { message: chatInput, from: user.name, timestamp: Date.now(), mine: true }]);
    setChatInput('');
  };

  const handleSaveContact = async () => {
    if (!peer?._id || saved) return;
    try {
      await userApi.saveContact(peer._id);
      setSaved(true);
    } catch (err) {
      setSaveError(err.response?.data?.error || 'Could not save');
      setTimeout(() => setSaveError(''), 3000);
    }
  };

  const handleReport = async (reason) => {
    if (!peer?._id) return;
    await userApi.reportUser(peer._id, reason).catch(() => {});
    setReportSent(true);
    setShowReport(false);
    setTimeout(() => handleNext(), 1000);
  };

  // --- RENDER ---
  if (mediaError) {
    return (
      <div className="min-h-screen bg-bg-primary flex items-center justify-center px-4">
        <div className="card p-8 max-w-md text-center">
          <VideoOff size={40} className="text-red-disconnect mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Camera access required</h2>
          <p className="text-text-secondary text-sm mb-6">{mediaError}</p>
          <button onClick={() => navigate('/dashboard')} className="btn-secondary">
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-bg-primary flex flex-col overflow-hidden pt-16">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle bg-bg-primary/80 backdrop-blur">
        <div className="flex items-center gap-2">
          <span className="text-blue-electric font-bold text-lg">▶</span>
          <span className="font-bold text-sm hidden sm:block">FoundersTV</span>
        </div>

        {callState === CALL_STATES.CONNECTED && (
          <div className="flex items-center gap-2 text-sm">
            <Clock size={14} className="text-text-muted" />
            <span className="font-mono font-medium text-text-primary">{formatTime(elapsed)}</span>
          </div>
        )}

        <div className="flex items-center gap-2">
          {callState === CALL_STATES.CONNECTED && (
            <>
              <button
                onClick={handleSaveContact}
                disabled={saved}
                className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border
                            transition-all duration-200
                            ${saved
                              ? 'border-green-connected/30 bg-green-connected/10 text-green-connected'
                              : 'border-border-subtle hover:border-blue-electric/40 hover:text-blue-electric text-text-secondary'}`}
              >
                {saved ? <BookmarkCheck size={14} /> : <Bookmark size={14} />}
                {saved ? 'Saved' : 'Save'}
              </button>

              <button
                onClick={() => setShowReport(!showReport)}
                className="p-1.5 rounded-lg text-text-muted hover:text-yellow-500 hover:bg-yellow-500/10
                           transition-all duration-200"
                title="Report"
              >
                <AlertTriangle size={16} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Report dropdown */}
      <AnimatePresence>
        {showReport && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="absolute top-28 right-4 z-50 card p-3 w-44 space-y-1"
          >
            <p className="text-text-muted text-xs px-2 mb-2">Report this user</p>
            {REPORT_REASONS.map(r => (
              <button
                key={r.value}
                onClick={() => handleReport(r.value)}
                className="w-full text-left px-3 py-2 rounded-lg text-sm text-text-secondary
                           hover:bg-bg-card hover:text-text-primary transition-colors"
              >
                {r.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Video area */}
        <div className="flex-1 relative bg-black">
          <AnimatePresence mode="wait">
            {callState === CALL_STATES.WAITING && (
              <motion.div
                key="waiting"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-6"
              >
                <div className="flex gap-2">
                  {[0, 1, 2].map(i => (
                    <div
                      key={i}
                      className="w-3 h-3 rounded-full bg-blue-electric waiting-dot"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
                <div className="text-center">
                  <p className="text-text-primary font-semibold">Finding a founder...</p>
                  <p className="text-text-muted text-sm mt-1">This usually takes under 10 seconds</p>
                </div>
                <button onClick={handleLeave} className="btn-secondary text-sm">
                  Cancel
                </button>
              </motion.div>
            )}

            {callState === CALL_STATES.TIMEOUT && (
              <motion.div
                key="timeout"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center px-4"
              >
                <div className="text-4xl">😴</div>
                <p className="font-semibold text-text-primary">No founders available right now</p>
                <p className="text-text-muted text-sm">Try again in a few minutes.</p>
                <div className="flex gap-3">
                  <button onClick={() => { socket?.emit('join-queue', { filters }); setCallState(CALL_STATES.WAITING); }}
                    className="btn-primary text-sm">
                    Try again
                  </button>
                  <button onClick={handleLeave} className="btn-secondary text-sm">Dashboard</button>
                </div>
              </motion.div>
            )}

            {callState === CALL_STATES.CONNECTED && (
              <motion.div key="connected" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0">
                {/* Remote video (full) */}
                <VideoPlayer
                  stream={remoteStream}
                  className="w-full h-full"
                />

                {/* Local video (PiP) */}
                <div className="video-pip">
                  <VideoPlayer
                    stream={localStream}
                    muted
                    isCamOff={isCamOff}
                    className="w-full h-full"
                    label="You"
                  />
                </div>

                {/* Floating reactions */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  <AnimatePresence>
                    {reactions.map((r) => (
                      <motion.div
                        key={r.id}
                        initial={{ opacity: 0, y: 0, scale: 0.5 }}
                        animate={{ opacity: 1, y: -220, scale: 1.4 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 2.4, ease: 'easeOut' }}
                        className="absolute bottom-24 text-5xl"
                        style={{ left: `${r.left}%` }}
                      >
                        {r.emoji}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Always-visible local preview when waiting */}
          {callState === CALL_STATES.WAITING && localStream && (
            <div className="absolute bottom-4 left-4 w-36 h-24 rounded-xl overflow-hidden border border-border opacity-60">
              <VideoPlayer stream={localStream} muted className="w-full h-full" />
            </div>
          )}
        </div>

        {/* Chat + peer profile sidebar (only in connected state) */}
        <AnimatePresence>
          {callState === CALL_STATES.CONNECTED && (
            <motion.div
              initial={{ opacity: 0, x: 300 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 300 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="hidden md:flex flex-col w-80 border-l border-border-subtle bg-bg-secondary"
            >
              {/* Peer profile */}
              {peer && (
                <div className="p-4 border-b border-border-subtle">
                  <FounderCard founder={peer} compact={false} />
                </div>
              )}

              {/* Chat messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.length === 0 && (
                  <p className="text-center text-text-muted text-xs mt-8">
                    Say hello! Break the ice.
                  </p>
                )}
                {messages.map((msg, i) => (
                  <div key={i} className={`flex ${msg.mine ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm
                                    ${msg.mine
                                      ? 'bg-blue-electric text-white rounded-br-sm'
                                      : 'bg-bg-card text-text-primary rounded-bl-sm'}`}>
                      {msg.message}
                    </div>
                  </div>
                ))}
                <div ref={chatEndRef} />
              </div>

              {/* Chat input */}
              <form onSubmit={sendMessage} className="p-4 border-t border-border-subtle flex gap-2">
                <input
                  className="input-base text-sm flex-1"
                  value={chatInput}
                  onChange={e => setChatInput(e.target.value)}
                  placeholder="Type a message..."
                  maxLength={500}
                />
                <button type="submit" disabled={!chatInput.trim()}
                  className="p-3 rounded-xl bg-blue-electric text-white hover:bg-blue-hover
                             disabled:opacity-40 transition-all">
                  <Send size={16} />
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Controls bar */}
      <div className="border-t border-border-subtle bg-bg-secondary/80 backdrop-blur px-4 py-4">
        {/* Reactions row */}
        {callState === CALL_STATES.CONNECTED && (
          <div className="flex items-center justify-center gap-2 mb-3">
            {['👏', '🔥', '🤝', '💡'].map((emoji) => (
              <button
                key={emoji}
                onClick={() => sendReaction(emoji)}
                className="text-xl w-10 h-10 rounded-full border border-border-subtle hover:border-blue-electric/40
                           hover:bg-bg-card active:scale-90 transition-all"
              >
                {emoji}
              </button>
            ))}
          </div>
        )}

        <div className="flex items-center justify-center gap-3 flex-wrap">
          <button
            onClick={toggleMute}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200
                        ${isMuted
                          ? 'border-red-disconnect/40 bg-red-disconnect/10 text-red-disconnect'
                          : 'border-border-subtle hover:border-border text-text-secondary hover:text-text-primary'}`}
          >
            {isMuted ? <MicOff size={20} /> : <Mic size={20} />}
            <span className="text-xs">{isMuted ? 'Unmute' : 'Mute'}</span>
          </button>

          <button
            onClick={toggleCam}
            className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all duration-200
                        ${isCamOff
                          ? 'border-red-disconnect/40 bg-red-disconnect/10 text-red-disconnect'
                          : 'border-border-subtle hover:border-border text-text-secondary hover:text-text-primary'}`}
          >
            {isCamOff ? <VideoOff size={20} /> : <Video size={20} />}
            <span className="text-xs">{isCamOff ? 'Start cam' : 'Stop cam'}</span>
          </button>

          {callState === CALL_STATES.CONNECTED && (
            <button
              onClick={handleNext}
              className="flex flex-col items-center gap-1 p-3 rounded-xl border border-blue-electric/30
                         bg-blue-electric/10 text-blue-electric hover:bg-blue-electric/20 transition-all duration-200"
            >
              <SkipForward size={20} />
              <span className="text-xs">Next</span>
            </button>
          )}

          <button
            onClick={handleLeave}
            className="flex flex-col items-center gap-1 p-3 rounded-xl border border-red-disconnect/30
                       bg-red-disconnect/10 text-red-disconnect hover:bg-red-disconnect/20 transition-all duration-200"
          >
            <PhoneOff size={20} />
            <span className="text-xs">Leave</span>
          </button>
        </div>

        {saveError && (
          <p className="text-center text-red-400 text-xs mt-2">{saveError}</p>
        )}
        {reportSent && (
          <p className="text-center text-green-connected text-xs mt-2">Report submitted. Moving to next founder...</p>
        )}
      </div>
    </div>
  );
}
