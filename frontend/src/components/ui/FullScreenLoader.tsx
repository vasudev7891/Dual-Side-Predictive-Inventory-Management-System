import React from 'react';
import { Loader2 } from 'lucide-react';

export const FullScreenLoader: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-zinc-950/80 backdrop-blur-md select-none">
      {/* Decorative background glow rings */}
      <div className="absolute w-72 h-72 rounded-full bg-indigo-500/10 blur-3xl animate-pulse"></div>
      <div className="absolute w-72 h-72 rounded-full bg-violet-500/5 blur-3xl animate-pulse delay-75"></div>
      
      <div className="relative flex flex-col items-center gap-4">
        {/* Loading Spinner ring */}
        <div className="relative flex items-center justify-center p-4 rounded-full bg-zinc-900/60 border border-zinc-800/80 shadow-2xl">
          <Loader2 className="h-8 w-8 text-indigo-500 animate-spin" />
        </div>
        
        {/* Loading Text */}
        <div className="text-center space-y-1">
          <h3 className="text-xs font-bold tracking-widest text-zinc-300 uppercase">
            IMS Predictive
          </h3>
          <p className="text-[10px] text-zinc-550 font-medium">
            Syncing analytics and loading assets...
          </p>
        </div>
      </div>
    </div>
  );
};
