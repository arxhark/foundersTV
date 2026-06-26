import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, Video, Send, Users, ArrowLeft, BadgeCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { connectionApi, roomApi } from '../services/api';
import Spinner from '../components/ui/Spinner';

function Avatar({ user, size = 44 }) {
  return user?.photo ? (
    <img src={user.photo} alt={user.name} style={{ width: size, height: size }}
      className="rounded-full object-cover border border-border-subtle flex-shrink-0" />
  ) : (
    <div style={{ width: size, height: size }}
      className="rounded-full bg-blue-electric/15 border border-border-subtle flex items-center justify-center flex-shrink-0 text-blue-electric font-bold">
      {user?.name?.[0]?.toUpperCase()}
    </div>
  );
}

export default function Connections() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null);   // selected connection
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const pollRef = useRef(null);

  useEffect(() => {
    connectionApi.list()
      .then(({ data }) => setConnections(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const loadMessages = useCallback((connectionId) => {
    connectionApi.getMessages(connectionId)
      .then(({ data }) => setMessages(data))
      .catch(() => {});
  }, []);

  // Poll the open conversation every 5s
  useEffect(() => {
    if (!active) return;
    loadMessages(active._id);
    pollRef.current = setInterval(() => loadMessages(active._id), 5000);
    return () => clearInterval(pollRef.current);
  }, [active, loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openChat = (conn) => {
    setMessages([]);
    setActive(conn);
    // Clear unread badge locally
    setConnections((prev) => prev.map((c) => c._id === conn._id ? { ...c, unread: 0 } : c));
  };

  const send = async (e) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    setSending(true);
    const text = input;
    setInput('');
    // Optimistic append
    setMessages((prev) => [...prev, { _id: `tmp_${Date.now()}`, senderId: user._id, text, optimistic: true }]);
    try {
      await connectionApi.sendMessage(active._id, text);
      loadMessages(active._id);
    } catch {
      setMessages((prev) => prev.filter((m) => !m.optimistic));
      setInput(text);
    } finally {
      setSending(false);
    }
  };

  const startCall = async () => {
    try {
      const { data } = await roomApi.create(`Call with ${active.peer.name}`);
      const link = `${window.location.origin}/room/${data.roomId}`;
      await connectionApi.sendMessage(active._id, `📹 Join my video room: ${link}`);
      navigate(`/room/${data.roomId}`);
    } catch { /* ignore */ }
  };

  const isMine = (m) => (m.senderId?._id || m.senderId)?.toString() === user._id.toString();

  return (
    <div className="min-h-screen bg-bg-primary pt-20 pb-0 px-0 sm:px-4">
      <div className="max-w-5xl mx-auto sm:pt-4">
        <div className="card overflow-hidden flex h-[calc(100vh-7rem)]">
          {/* List */}
          <div className={`w-full sm:w-80 border-r border-border-subtle flex flex-col ${active ? 'hidden sm:flex' : 'flex'}`}>
            <div className="p-4 border-b border-border-subtle">
              <h1 className="font-bold text-lg flex items-center gap-2">
                <Users size={18} className="text-blue-electric" /> Connections
              </h1>
              <p className="text-text-muted text-xs mt-0.5">{connections.length} mutual connections</p>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex justify-center py-10"><Spinner /></div>
              ) : connections.length === 0 ? (
                <div className="text-center py-10 px-4">
                  <Users size={32} className="text-text-muted mx-auto mb-3" />
                  <p className="text-text-secondary text-sm">No connections yet.</p>
                  <p className="text-text-muted text-xs mt-1">Save founders during calls — when you both save, you connect.</p>
                </div>
              ) : connections.map((c) => (
                <button key={c._id} onClick={() => openChat(c)}
                  className={`w-full flex items-center gap-3 p-3 text-left hover:bg-bg-card transition-colors border-b border-border-subtle/50
                             ${active?._id === c._id ? 'bg-bg-card' : ''}`}>
                  <Avatar user={c.peer} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1">
                      <span className="font-medium text-sm truncate">{c.peer.name}</span>
                      {c.peer.isVerified && <BadgeCheck size={12} className="text-blue-electric" />}
                    </div>
                    <p className="text-text-muted text-xs truncate">
                      {c.lastMessage?.text || c.peer.title || 'Say hello'}
                    </p>
                  </div>
                  {c.unread > 0 && (
                    <span className="bg-blue-electric text-white text-[10px] font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                      {c.unread}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Chat */}
          <div className={`flex-1 flex flex-col ${active ? 'flex' : 'hidden sm:flex'}`}>
            {!active ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
                <MessageSquare size={40} className="text-text-muted mb-3" />
                <p className="text-text-secondary">Select a connection to start chatting.</p>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 p-3 border-b border-border-subtle">
                  <button onClick={() => setActive(null)} className="sm:hidden text-text-secondary">
                    <ArrowLeft size={20} />
                  </button>
                  <Avatar user={active.peer} size={38} />
                  <div className="flex-1 min-w-0">
                    <button onClick={() => navigate(`/profile/${active.peer._id}`)}
                      className="font-semibold text-sm hover:text-blue-electric transition-colors">
                      {active.peer.name}
                    </button>
                    <p className="text-text-muted text-xs truncate">{active.peer.title}</p>
                  </div>
                  <button onClick={startCall} title="Start a video call"
                    className="flex items-center gap-1.5 text-sm font-medium px-3 py-1.5 rounded-lg border border-blue-electric/30
                               bg-blue-electric/10 text-blue-electric hover:bg-blue-electric/20 transition-all">
                    <Video size={15} /> Call
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-4 space-y-2">
                  {messages.length === 0 && (
                    <p className="text-center text-text-muted text-xs mt-8">No messages yet. Break the ice!</p>
                  )}
                  {messages.map((m) => (
                    <div key={m._id} className={`flex ${isMine(m) ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[75%] rounded-2xl px-3.5 py-2 text-sm break-words
                                      ${isMine(m) ? 'bg-blue-electric text-white rounded-br-sm' : 'bg-bg-card text-text-primary rounded-bl-sm'}`}>
                        {m.text}
                      </div>
                    </div>
                  ))}
                  <div ref={endRef} />
                </div>

                <form onSubmit={send} className="p-3 border-t border-border-subtle flex gap-2">
                  <input className="input-base text-sm flex-1" value={input} onChange={(e) => setInput(e.target.value)}
                    placeholder="Type a message…" maxLength={2000} />
                  <button type="submit" disabled={!input.trim() || sending}
                    className="p-3 rounded-xl bg-blue-electric text-white hover:bg-blue-hover disabled:opacity-40 transition-all">
                    <Send size={16} />
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
