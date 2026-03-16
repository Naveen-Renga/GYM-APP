// src/pages/LoginPage.jsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { loginWithEmail, registerWithEmail } from '../firebase/auth';
import { getUser, createMember } from '../firebase/firestore';
import { auth } from '../firebase/config';

export default function LoginPage() {
  const { user, role } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Handle automatic redirection if user is already logged in
  useEffect(() => {
    if (user && role) {
      const redirectMap = { admin: '/admin', mentor: '/mentor', member: '/member' };
      navigate(redirectMap[role] || '/', { replace: true });
    }
  }, [user, role, navigate]);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!email || !password || (!isLogin && (!name || !phone))) { 
      toast.error('Please fill in all required fields'); 
      setLoading(false); 
      return; 
    }

    try {
      if (isLogin) {
        const cred = await loginWithEmail(email, password);
        const snap = await getUser(cred.user.uid);
        if (!snap.exists()) {
          await auth.signOut();
          toast.error('Profile not found. Contact admin.');
          setLoading(false);
          return;
        }
        toast.success(`Welcome back, ${snap.data().name || 'User'}!`);
      } else {
        const cred = await registerWithEmail(email, password);
        await createMember(
          cred.user.uid, 
          { name, email, phone, role: 'member' },
          { status: 'inactive', planId: 'basic' } // Default values
        );
        toast.success('Account created successfully!');
      }
    } catch (err) {
      toast.error(err.message.includes('auth/invalid-credential') ? 'Invalid email or password.' : err.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#070710] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-neon-purple/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-neon-green/5 rounded-full blur-[120px]" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }} 
        animate={{ opacity: 1, scale: 1 }} 
        className="w-full max-w-md relative z-10"
      >
        <div className="text-center mb-10">
          <motion.div 
            key={isLogin ? 'login-icon' : 'register-icon'}
            initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            className="w-20 h-20 mx-auto mb-6 rounded-3xl bg-gradient-to-br from-[#00F5A0] to-[#00D2FF] flex items-center justify-center text-4xl shadow-[0_0_40px_rgba(0,245,160,0.3)]"
          >
            {isLogin ? '🏋️' : '📝'}
          </motion.div>
          <h1 className="text-white text-4xl font-black tracking-tight mb-2">IronForge</h1>
          <p className="text-slate-400 font-medium">{isLogin ? 'Sign in to your account' : 'Create your new account'}</p>
        </div>

        <form onSubmit={handleAuth} className="space-y-5">
          <AnimatePresence mode="wait">
            {!isLogin && (
              <motion.div 
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-[2px] ml-1">Full Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-[#12121F] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-[#00F5A0] focus:ring-1 focus:ring-[#00F5A0] transition-all"
                    placeholder="Palani Samy" 
                    value={name} 
                    onChange={e => setName(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-[2px] ml-1">Phone Number</label>
                  <input 
                    type="tel" 
                    className="w-full bg-[#12121F] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-[#00F5A0] focus:ring-1 focus:ring-[#00F5A0] transition-all"
                    placeholder="+91 98765 43210" 
                    value={phone} 
                    onChange={e => setPhone(e.target.value)} 
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="space-y-2">
            <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-[2px] ml-1">Email Address</label>
            <input 
              type="email" 
              className="w-full bg-[#12121F] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-[#00F5A0] focus:ring-1 focus:ring-[#00F5A0] transition-all"
              placeholder="palani@gmail.com" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
            />
          </div>

          <div className="space-y-2">
            <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-[2px] ml-1">Password</label>
            <div className="relative">
              <input 
                type={showPassword ? 'text' : 'password'} 
                className="w-full bg-[#12121F] border border-white/10 rounded-2xl px-5 py-4 text-white placeholder-slate-600 focus:outline-none focus:border-[#00F5A0] focus:ring-1 focus:ring-[#00F5A0] transition-all"
                placeholder="••••••" 
                value={password} 
                onChange={e => setPassword(e.target.value)} 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)} 
                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white transition-colors"
              >
                {showPassword ? '🙈' : '👁️'}
              </button>
            </div>
          </div>

          <button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-[#00F5A0] hover:bg-[#00E590] text-[#070710] font-black py-4 rounded-full shadow-[0_8px_20px_rgba(0,245,160,0.2)] hover:shadow-[0_8px_30px_rgba(0,245,160,0.4)] transform hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 group mt-2"
          >
            {loading ? (
              <div className="w-5 h-5 border-2 border-[#070710]/30 border-t-[#070710] rounded-full animate-spin" />
            ) : (
              <>{isLogin ? 'Sign In' : 'Create Account'} <span className="text-xl group-hover:translate-x-1 transition-transform">→</span></>
            )}
          </button>
        </form>

        <div className="mt-8 text-center flex flex-col gap-4">
          <button 
            onClick={() => setIsLogin(!isLogin)}
            className="text-[#00F5A0] text-sm font-bold hover:underline transition-all"
          >
            {isLogin ? "Don't have an account? Register" : "Already have an account? Sign In"}
          </button>
          
          <div className="text-slate-600 text-[10px] font-bold uppercase tracking-[2px]">
            Role is detected automatically after login
          </div>
        </div>
      </motion.div>
    </div>
  );
}
