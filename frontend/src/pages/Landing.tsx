import React from 'react';
import { Link } from 'react-router-dom';
import { Package, LineChart, Cpu, RefreshCw, Layers, ArrowRight, Shield } from 'lucide-react';

export const Landing: React.FC = () => {
  return (
    <div className="min-h-screen w-screen bg-zinc-950 text-zinc-100 font-sans overflow-x-hidden relative">
      {/* Decorative blurred background shapes */}
      <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-indigo-500/10 blur-[120px] -translate-y-1/2"></div>
      <div className="absolute top-1/3 right-0 w-[400px] h-[400px] rounded-full bg-violet-500/10 blur-[100px] translate-x-1/3"></div>

      {/* Header bar */}
      <header className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between border-b border-zinc-900 z-10 relative">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded bg-zinc-900 border border-zinc-800 text-indigo-400">
            <Package className="h-5 w-5" />
          </div>
          <span className="font-bold tracking-wider text-sm bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent uppercase">
            IMS Predictive
          </span>
        </div>
        <Link 
          to="/auth" 
          className="px-5 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/60 hover:bg-zinc-800 text-sm font-semibold text-zinc-200 transition-all hover:text-zinc-50"
        >
          Access Platform
        </Link>
      </header>

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-20 pb-16 text-center z-10 relative">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-indigo-950 bg-indigo-950/20 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-6">
          <Cpu className="h-3.5 w-3.5" />
          Powered by Meta Prophet Time-Series Models
        </div>
        
        <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold tracking-tight max-w-5xl mx-auto leading-[1.1] mb-6">
          Synchronized Supply Intelligence. <br />
          <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-violet-400 bg-clip-text text-transparent">
            Real-Time B2B & Predictive Demand.
          </span>
        </h1>
        
        <p className="text-base md:text-xl text-zinc-400 max-w-3xl mx-auto font-normal leading-relaxed mb-12">
          Bridge information asymmetry between shop retailers and wholesale warehouses. Eliminate capital-draining stockouts and over-ordering via coordinated AI demand forecasting.
        </p>

        {/* Call to Actions - Dual cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto mb-24">
          {/* Retailer Card */}
          <div className="glass-panel-retailer rounded-2xl p-8 text-left transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between group shadow-xl">
            <div>
              <div className="h-12 w-12 rounded-xl bg-indigo-950/30 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6">
                <LineChart className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-zinc-200">Shop Owners & Retailers</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                Browse supplier inventories with live stock sync. Ingest B2C customer sales history to predict item depletion dates and auto-generate restock carts.
              </p>
            </div>
            <Link 
              to="/auth" 
              onClick={() => {}} // Could dispatch selected role, but Auth handles toggle
              className="inline-flex items-center gap-2 text-sm font-semibold text-indigo-400 group-hover:text-indigo-300 transition-colors"
            >
              Enter Retailer Space
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>

          {/* Supplier Card */}
          <div className="glass-panel-supplier rounded-2xl p-8 text-left transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between group shadow-xl">
            <div>
              <div className="h-12 w-12 rounded-xl bg-violet-950/30 border border-violet-500/20 flex items-center justify-center text-violet-400 mb-6">
                <Layers className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-zinc-200">Wholesale Suppliers</h3>
              <p className="text-zinc-400 text-sm leading-relaxed mb-8">
                Manage your digital warehouse. Process bulk inventory uploads via CSV streams, track live retailer order checkouts, and schedule factory output with aggregate B2B demand predictions.
              </p>
            </div>
            <Link 
              to="/auth" 
              className="inline-flex items-center gap-2 text-sm font-semibold text-violet-400 group-hover:text-violet-300 transition-colors"
            >
              Enter Supplier Space
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="bg-zinc-900/40 border-t border-zinc-900 py-20 z-10 relative">
        <div className="max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold tracking-tight text-zinc-200">
              Technical Core Engines
            </h2>
            <p className="text-zinc-500 text-sm mt-2">
              Hardened engineering standards for premium B2B system operations.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30">
              <RefreshCw className="h-8 w-8 text-indigo-400 mb-4" />
              <h4 className="text-base font-bold text-zinc-200 mb-2">Supabase WebSockets Sync</h4>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Database level replication triggers automatically broadcast stock mutations to all active clients. Badges update instantly in the UI with a warning pulse effect.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30">
              <Shield className="h-8 w-8 text-emerald-400 mb-4" />
              <h4 className="text-base font-bold text-zinc-200 mb-2">Safe Concurrency Row Locking</h4>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Protects inventory databases against over-selling during peak traffic. checkout operations use PostgreSQL `FOR UPDATE` transaction locks to secure quantities.
              </p>
            </div>
            <div className="p-6 rounded-xl border border-zinc-800 bg-zinc-900/30">
              <Cpu className="h-8 w-8 text-violet-400 mb-4" />
              <h4 className="text-base font-bold text-zinc-200 mb-2">Meta Prophet Forecasting</h4>
              <p className="text-zinc-400 text-xs leading-relaxed">
                Python FastAPI analytics worker uses Facebook's Prophet time-series models to predict consumer buying patterns, accounting for holiday spikes and missing sales points.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-zinc-900 py-10 text-center text-xs text-zinc-600 font-mono">
        &copy; {new Date().getFullYear()} PREDICTIVE B2B INVENTORY SYSTEM. ALL RIGHTS RESERVED.
      </footer>
    </div>
  );
};
