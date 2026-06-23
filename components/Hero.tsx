'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Cpu, Download, ArrowRight, ShieldCheck, Zap, Layers, Sparkles, Search } from 'lucide-react';

interface HeroProps {
  onExploreProducts: () => void;
  onGoToDownloads: () => void;
  productCount: number;
}

export default function Hero({ onExploreProducts, onGoToDownloads, productCount }: HeroProps) {
  const [typedTerm, setTypedTerm] = useState('');
  const [searchFeedback, setSearchFeedback] = useState<string | null>(null);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setTypedTerm(term);
    
    if (term.trim() === '') {
      setSearchFeedback(null);
      return;
    }

    const t = term.toLowerCase();
    if (t.includes('agent') || t.includes('sentinel') || t.includes('autonomous')) {
      setSearchFeedback('Found match: Sentinel AI Agent (Stable v2.4.1) is loaded in Ecosystem.');
    } else if (t.includes('ext') || t.includes('chrome') || t.includes('plugin') || t.includes('browser')) {
      setSearchFeedback('Found match: EduSentinel Browser Extension (Updated v1.0.8) is loaded in Ecosystem.');
    } else if (t.includes('shaadi') || t.includes('marriage') || t.includes('family') || t.includes('identity')) {
      setSearchFeedback('Found match: Sentinel Shaadi (Beta v0.9.5) is loaded in Ecosystem.');
    } else if (t.includes('carbon') || t.includes('footprint') || t.includes('energy') || t.includes('green')) {
      setSearchFeedback('Found match: Carbon Footprint Telemetry (Stable v1.2.0) is loaded in Ecosystem.');
    } else if (t.includes('node') || t.includes('mesh') || t.includes('future') || t.includes('distributed')) {
      setSearchFeedback('Found match: Future Cognitive Nodes (H2 Planning) in Ecosystem.');
    } else {
      setSearchFeedback('Analyzing ecosystem indexes... Type "agent", "shaadi", "extension", or "carbon" for exact matches.');
    }
  };

  return (
    <section
      id="hero"
      className="relative min-h-screen flex items-center justify-center pt-28 pb-20 overflow-hidden"
    >
      {/* Background radial highlight */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-cyan-500/10 rounded-full blur-[160px] pointer-events-none animate-pulse-glow" />

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
        
        {/* Dynamic Launch Tag badge */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-cyan-500/30 bg-cyan-950/20 text-cyan-400 text-[10px] font-mono uppercase tracking-widest mb-8 shadow-[0_0_15px_rgba(6,182,212,0.1)]"
        >
          <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
          <span>EduSentinel Master Registry v2026.6</span>
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
        </motion.div>

        {/* Master Headline Lockup */}
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1, ease: 'easeOut' }}
          className="font-display text-4xl md:text-7xl font-black tracking-tight leading-tight text-white max-w-4xl"
        >
          <span className="block mb-2">Trust Every Click.</span>
          <span className="block bg-clip-text text-transparent bg-gradient-to-r from-cyan-400 via-teal-300 to-white text-glow-cyan">
            Protect Every Digital Asset.
          </span>
        </motion.h1>

        {/* Cinematic Subheadline */}
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="mt-8 text-slate-300 text-sm md:text-lg max-w-3xl leading-relaxed font-sans"
        >
          EduSentinel AI is a privacy-first cybersecurity ecosystem focused on digital trust, source verification, scam prevention, phishing defense, browser protection, educational security and local AI-powered intelligence.
          <span className="block mt-4 text-[#00f0ff] font-mono text-sm tracking-widest uppercase font-semibold">
            Build Until Success Finds You.
          </span>
        </motion.p>

        {/* Action Button CTA Groups */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3 }}
          className="mt-10 flex flex-col sm:flex-row items-center gap-4 w-full justify-center"
        >
          {/* Explore Product Launchpages */}
          <button
            onClick={onExploreProducts}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-400 hover:to-teal-400 text-black font-semibold tracking-wide shadow-lg shadow-cyan-500/25 transition-all hover:scale-[1.02] cursor-pointer"
          >
            <Cpu className="w-4 h-4 fill-black" />
            Explore Products
          </button>

          {/* Direct download vault portal jump */}
          <button
            onClick={onGoToDownloads}
            className="w-full sm:w-auto flex items-center justify-center gap-2.5 px-8 py-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-cyan-400 border border-cyan-500/20 hover:border-cyan-500/40 transition-all cursor-pointer group"
          >
            <Download className="w-4 h-4 text-cyan-400 group-hover:translate-y-0.5 transition-transform" />
            <span>Download Center</span>
            <div className="px-1.5 py-0.5 rounded bg-cyan-950 text-[10px] text-cyan-400 border border-cyan-500/30 font-mono">
              {productCount} Files
            </div>
          </button>
        </motion.div>

        {/* Dynamic Ecosystem Exploration Lens */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          className="mt-16 w-full max-w-lg p-1 rounded-2xl bg-gradient-to-r from-white/5 to-cyan-500/5 hover:from-white/10 hover:to-cyan-500/10 border border-white/10 hover:border-cyan-500/20 shadow-2xl transition-all group"
        >
          <div className="flex items-center gap-3 px-4 py-2 bg-slate-950/80 rounded-xl">
            <Search className="w-4 h-4 text-cyan-400/80" />
            <input
              type="text"
              value={typedTerm}
              onChange={handleSearchChange}
              placeholder="Search cognitive keys... try 'shaadi' or 'agent'"
              className="w-full bg-transparent text-sm focus:outline-none placeholder-slate-500 border-none text-white py-1.5"
            />
          </div>

          <AnimatePresence mode="wait">
            {searchFeedback && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="px-4 py-3 bg-slate-950/95 border-t border-white/5 rounded-b-2xl text-left"
              >
                <p className="font-mono text-[10px] text-cyan-400 animate-pulse flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full inline-block animate-ping" />
                  {searchFeedback}
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Ecosystem Highlighting Metric Blocks */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1, delay: 0.6 }}
          className="mt-20 grid grid-cols-2 lg:grid-cols-4 gap-8 w-full border-t border-white/5 pt-12 text-left"
        >
          <div className="flex flex-col gap-1">
            <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 font-display">
              05
            </span>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Core Platforms
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 font-display">
              100%
            </span>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Privacy Sovereign
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 font-display">
              10k+
            </span>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5" /> Daily Queries
            </span>
          </div>

          <div className="flex flex-col gap-1">
            <span className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-b from-white to-slate-400 font-display text-shadow-teal">
              Active
            </span>
            <span className="text-xs font-mono text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5" /> Mesh Status
            </span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}
