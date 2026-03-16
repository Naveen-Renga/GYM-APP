// src/components/ui/Topbar.jsx
export default function Topbar({ title, onMenuClick }) {
  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  return (
    <header className="sticky top-0 z-20 h-16 flex items-center gap-4 px-6 bg-dark-800/60 backdrop-blur-xl border-b border-white/[0.06]">
      {/* Mobile Menu Toggle */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <div className="flex-1">
        <h2 className="text-white font-semibold text-lg">{title}</h2>
        <p className="text-slate-500 text-xs hidden sm:block">{today}</p>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 bg-neon-green rounded-full animate-pulse" />
        <span className="text-slate-400 text-xs hidden sm:block">Live</span>
      </div>
    </header>
  );
}
