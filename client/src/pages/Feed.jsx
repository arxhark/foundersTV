import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Send, MessageCircle, Trash2, Rocket, Search, Trophy, HelpCircle, Megaphone } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { postApi } from '../services/api';
import Spinner from '../components/ui/Spinner';

const POST_TYPES = [
  { value: 'update', label: 'Update', icon: Megaphone },
  { value: 'search', label: 'Looking for', icon: Search },
  { value: 'milestone', label: 'Milestone', icon: Trophy },
  { value: 'question', label: 'Question', icon: HelpCircle },
];

const REACTIONS = ['👏', '🔥', '🤝', '💡', '🚀', '🎉'];

function timeAgo(date) {
  const s = Math.floor((Date.now() - new Date(date)) / 1000);
  if (s < 60) return 'now';
  if (s < 3600) return `${Math.floor(s / 60)}m`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

function Avatar({ user, size = 40 }) {
  return user?.photo ? (
    <img src={user.photo} alt="" style={{ width: size, height: size }} className="rounded-full object-cover flex-shrink-0" />
  ) : (
    <div style={{ width: size, height: size }}
      className="rounded-full bg-blue-electric/15 flex items-center justify-center flex-shrink-0 text-blue-electric font-bold">
      {user?.name?.[0]?.toUpperCase()}
    </div>
  );
}

export default function Feed() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState('');
  const [type, setType] = useState('update');
  const [posting, setPosting] = useState(false);
  const [commentBox, setCommentBox] = useState({});

  useEffect(() => {
    postApi.feed()
      .then(({ data }) => setPosts(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const submitPost = async (e) => {
    e.preventDefault();
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      const { data } = await postApi.create({ text, type });
      setPosts((prev) => [{ ...data, reactionCount: 0, myReaction: null, comments: [] }, ...prev]);
      setText('');
      setType('update');
    } finally {
      setPosting(false);
    }
  };

  const react = async (post, emoji) => {
    // optimistic
    setPosts((prev) => prev.map((p) => {
      if (p._id !== post._id) return p;
      const had = p.myReaction;
      const delta = had === emoji ? -1 : had ? 0 : 1;
      return { ...p, myReaction: had === emoji ? null : emoji, reactionCount: p.reactionCount + delta };
    }));
    await postApi.react(post._id, emoji).catch(() => {});
  };

  const addComment = async (post) => {
    const value = (commentBox[post._id] || '').trim();
    if (!value) return;
    setCommentBox((b) => ({ ...b, [post._id]: '' }));
    try {
      const { data } = await postApi.comment(post._id, value);
      setPosts((prev) => prev.map((p) =>
        p._id === post._id ? { ...p, comments: [...(p.comments || []), { ...data, userId: { _id: user._id, name: user.name, photo: user.photo } }] } : p
      ));
    } catch { /* ignore */ }
  };

  const remove = async (post) => {
    setPosts((prev) => prev.filter((p) => p._id !== post._id));
    await postApi.remove(post._id).catch(() => {});
  };

  return (
    <div className="min-h-screen bg-bg-primary pt-20 pb-12 px-4">
      <div className="max-w-2xl mx-auto">
        <motion.h1 initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-2xl font-bold mb-5">
          Community
        </motion.h1>

        {/* Composer */}
        <div className="card p-4 mb-6">
          <form onSubmit={submitPost}>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Share an update, a milestone, or ask the community…"
              maxLength={2000}
              rows={3}
              className="input-base resize-none"
            />
            <div className="flex items-center justify-between mt-3 gap-2 flex-wrap">
              <div className="flex gap-1.5 flex-wrap">
                {POST_TYPES.map((t) => {
                  const Icon = t.icon;
                  return (
                    <button type="button" key={t.value} onClick={() => setType(t.value)}
                      className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all
                                 ${type === t.value ? 'border-blue-electric bg-blue-electric/10 text-blue-electric'
                                   : 'border-border-subtle text-text-secondary hover:border-border'}`}>
                      <Icon size={13} /> {t.label}
                    </button>
                  );
                })}
              </div>
              <button type="submit" disabled={!text.trim() || posting}
                className="btn-primary text-sm py-2 px-4 flex items-center gap-2">
                {posting ? <Spinner size={16} /> : <><Send size={15} /> Post</>}
              </button>
            </div>
          </form>
        </div>

        {/* Feed */}
        {loading ? (
          <div className="flex justify-center py-12"><Spinner size={28} /></div>
        ) : posts.length === 0 ? (
          <div className="card p-10 text-center">
            <Rocket size={36} className="text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">No posts yet. Be the first to share something!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {posts.map((post) => {
              const author = post.authorId || {};
              const typeMeta = POST_TYPES.find((t) => t.value === post.type);
              return (
                <motion.div key={post._id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="card p-5">
                  <div className="flex items-start gap-3">
                    <Avatar user={author} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <button onClick={() => navigate(`/profile/${author._id}`)}
                          className="font-semibold text-sm hover:text-blue-electric transition-colors">
                          {author.name}
                        </button>
                        <span className="text-text-muted text-xs">· {timeAgo(post.createdAt)}</span>
                        {typeMeta && (
                          <span className="badge bg-blue-electric/10 text-blue-electric border border-blue-electric/20 text-[10px] ml-auto">
                            {typeMeta.label}
                          </span>
                        )}
                      </div>
                      {author.title && <p className="text-text-muted text-xs">{author.title}</p>}

                      <p className="text-text-primary text-sm mt-2 whitespace-pre-wrap break-words">{post.text}</p>

                      {/* Reactions */}
                      <div className="flex items-center gap-1 mt-3 flex-wrap">
                        {REACTIONS.map((emoji) => (
                          <button key={emoji} onClick={() => react(post, emoji)}
                            className={`text-sm w-8 h-8 rounded-lg border transition-all active:scale-90
                                       ${post.myReaction === emoji ? 'border-blue-electric bg-blue-electric/10' : 'border-border-subtle hover:border-border'}`}>
                            {emoji}
                          </button>
                        ))}
                        {post.reactionCount > 0 && (
                          <span className="text-text-muted text-xs ml-1">{post.reactionCount}</span>
                        )}
                        {author._id === user._id && (
                          <button onClick={() => remove(post)} className="ml-auto text-text-muted hover:text-red-disconnect transition-colors p-1.5">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>

                      {/* Comments */}
                      {(post.comments || []).length > 0 && (
                        <div className="mt-3 space-y-2 pt-3 border-t border-border-subtle">
                          {post.comments.map((c, i) => (
                            <div key={c._id || i} className="flex items-start gap-2">
                              <Avatar user={c.userId} size={24} />
                              <div className="bg-bg-card rounded-xl px-3 py-1.5 flex-1">
                                <span className="font-medium text-xs">{c.userId?.name}</span>
                                <p className="text-text-secondary text-xs">{c.text}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Add comment */}
                      <div className="flex items-center gap-2 mt-3">
                        <MessageCircle size={15} className="text-text-muted" />
                        <input
                          value={commentBox[post._id] || ''}
                          onChange={(e) => setCommentBox((b) => ({ ...b, [post._id]: e.target.value }))}
                          onKeyDown={(e) => e.key === 'Enter' && addComment(post)}
                          placeholder="Add a comment…"
                          className="bg-transparent text-sm flex-1 focus:outline-none text-text-primary placeholder:text-text-muted"
                        />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
