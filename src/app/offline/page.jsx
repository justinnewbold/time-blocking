'use client';

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="text-center space-y-6 max-w-md">
        <div className="text-8xl animate-pulse">📡</div>
        
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-white">You're Offline</h1>
          <p className="text-purple-200 text-lg">No worries! Your progress is saved locally.</p>
        </div>
        
        <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 space-y-4">
          <h2 className="text-white font-semibold text-lg">While offline, you can:</h2>
          <ul className="text-purple-200 text-left space-y-2">
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              View your cached tasks
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Use the focus timer
            </li>
            <li className="flex items-center gap-2">
              <span className="text-green-400">✓</span>
              Mark tasks complete (syncs when online)
            </li>
          </ul>
        </div>
        
        <button 
          onClick={() => window.location.reload()}
          className="px-8 py-4 bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105"
        >
          Try Again
        </button>
        
        <p className="text-purple-300 text-sm italic">
          "Even offline, you're still moving forward." 💜
        </p>
      </div>
    </div>
  );
}