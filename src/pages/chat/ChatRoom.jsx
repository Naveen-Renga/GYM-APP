// src/pages/chat/ChatRoom.jsx
import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { onSnapshot } from 'firebase/firestore';
import { sendMessage, getMessagesQuery } from '../../firebase/firestore';
import toast from 'react-hot-toast';

export default function ChatRoom({ currentUser, otherUser }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const scrollRef = useRef();

  useEffect(() => {
    if (!currentUser?.uid || !otherUser?.id) return;

    const q = getMessagesQuery(currentUser.uid, otherUser.id);
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Sort client-side by createdAt ascending
      msgs.sort((a, b) => {
        const timeA = a.createdAt?.toMillis() || 0;
        const timeB = b.createdAt?.toMillis() || 0;
        return timeA - timeB;
      });
      setMessages(msgs);
    });

    return () => unsub();
  }, [currentUser, otherUser]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!text.trim() || sending) return;

    const currentText = text.trim();
    setSending(true);
    setText(''); // Optimistic clear

    try {
      await sendMessage(currentUser.uid, otherUser.id, currentText);
    } catch (e) {
      toast.error('Failed to send message');
      setText(currentText); // Restore on failure
      console.error(e);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[500px] glass-card overflow-hidden border-white/[0.05]">
      {/* Header */}
      <div className="p-4 border-b border-white/[0.06] flex items-center justify-between bg-white/[0.02]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-neon-blue to-neon-purple flex items-center justify-center text-white font-bold shadow-glow-blue">
            {(otherUser.name || '?').charAt(0).toUpperCase()}
          </div>
          <div>
            <h3 className="text-white font-bold leading-none">{otherUser.name}</h3>
            <p className="text-slate-500 text-[10px] mt-1 uppercase tracking-wider">{otherUser.role}</p>
          </div>
        </div>
        <div className="text-neon-green text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-neon-green/5 border border-neon-green/10">
          Live Chat
        </div>
      </div>

      {/* Messages */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-thin scrollbar-thumb-white/10"
      >
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-2 opacity-30">
            <div className="text-5xl">💬</div>
            <p className="text-sm">No messages yet. Say hello!</p>
          </div>
        ) : (
          messages.map((m) => {
            const isRight = m.senderId === currentUser.uid;
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, x: isRight ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                className={`flex ${isRight ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-[80%] ${isRight ? 'order-2' : 'order-1'}`}>
                  <div 
                    className={`px-4 py-2.5 rounded-2xl text-sm shadow-sm ${
                      isRight 
                        ? 'bg-gradient-to-r from-neon-blue to-neon-purple text-dark-900 font-bold rounded-tr-none' 
                        : 'bg-white/[0.05] border border-white/[0.05] text-slate-200 rounded-tl-none'
                    }`}
                  >
                    {m.text}
                  </div>
                  <p className={`text-[10px] text-slate-600 mt-1.5 font-medium ${isRight ? 'text-right' : 'text-left'}`}>
                    {m.createdAt?.toDate ? m.createdAt.toDate().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Sending...'}
                  </p>
                </div>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Input */}
      <form onSubmit={handleSend} className="p-4 border-t border-white/[0.06] bg-white/[0.01]">
        <div className="relative flex items-center gap-2">
          <input
            type="text"
            className="flex-1 bg-dark-600 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-neon-blue transition-all"
            placeholder="Type your message..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button
            type="submit"
            disabled={!text.trim() || sending}
            className="btn-neon py-3 px-6 shadow-glow-blue disabled:opacity-50 disabled:cursor-not-allowed text-xs font-bold uppercase"
          >
            {sending ? '...' : 'Send'}
          </button>
        </div>
      </form>
    </div>
  );
}
