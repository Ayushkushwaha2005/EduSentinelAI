'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, Clock, Calendar, ArrowRight, User, Terminal, 
  TrendingUp, Compass, ChevronDown, ChevronUp, Sparkles, Hash 
} from 'lucide-react';
import { CommunityPost } from '@/lib/ecosystemStore';

interface CommunityProps {
  posts: CommunityPost[];
}

export default function Community({ posts }: CommunityProps) {
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [activeQuarter, setActiveQuarter] = useState<'q3-2026' | 'q4-2026' | 'h1-2027'>('q3-2026');

  const roadmapQuarters = [
    {
      id: 'q3-2026',
      label: 'Q3 2026',
      status: 'In Development',
      summary: 'Establishing cryptographic enclave primitives and secure device identities.',
      milestones: [
        { label: 'Sentinel Shaadi Public Beta Transition', desc: 'Rollout of Zero-knowledge hardware attestation chips for devices.' },
        { label: 'Browser Extension Sandbox Overlay', desc: 'Secure Chromium sandbox nodes preventing keyjacking and forms manipulation.' },
        { label: 'Edge Embedding Buffering', desc: 'Reducing RAM use to <1.5 GB on integrated consumer endpoints.' }
      ]
    },
    {
      id: 'q4-2026',
      label: 'Q4 2026',
      status: 'Sprinting',
      summary: 'Unifying individual local sandboxes into a distributed, peer-encrypted learning mesh.',
      milestones: [
        { label: 'Sovereign Study Mesh Protocol', desc: 'Secure peer routing avoiding centralized gateways.' },
        { label: 'Sentinel Agent WASM Engine', desc: 'Enabling direct execution of language submodels inside basic browser tabs.' },
        { label: 'Ecological Telemetry API Integration', desc: 'Real-time hypervisor monitoring of container carbon burn rates.' }
      ]
    },
    {
      id: 'h1-2027',
      label: 'H1 2027',
      status: 'Planning',
      summary: 'Launching our decentralized mesh study containers globally.',
      milestones: [
        { label: 'Distributed Knowledge Cache', desc: 'P2P decentralized study repositories for classroom environments.' },
        { label: 'TPM Key attestation audits', desc: 'Audited protocol enabling cryptographically verified grading loops.' },
        { label: 'Future Cognitive Nodes Launch', desc: 'First early dev builds representing multi-platform sovereign meshes.' }
      ]
    }
  ];

  const currentQuarter = roadmapQuarters.find(q => q.id === activeQuarter) || roadmapQuarters[0];

  const togglePostContent = (postId: string) => {
    setActivePostId(prev => (prev === postId ? null : postId));
  };

  const getCategoryTheme = (category: string) => {
    switch (category.toLowerCase()) {
      case 'research':
        return 'bg-violet-950/20 border-violet-500/20 text-violet-400';
      case 'update':
        return 'bg-emerald-950/20 border-emerald-500/20 text-emerald-400';
      default:
        return 'bg-cyan-950/20 border-cyan-500/20 text-cyan-400';
    }
  };

  return (
    <section id="roadmap" className="relative py-28 overflow-hidden bg-[#010613]/55">
      {/* Background graphic highlights */}
      <div className="absolute bottom-1/4 left-1/4 w-[500px] h-[300px] bg-cyan-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mb-20 text-center md:text-left">
          <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest font-semibold flex items-center justify-center md:justify-start gap-1.5">
            <TrendingUp className="w-4 h-4" /> Cognitive Ecosystem Stream
          </span>
          <h2 className="mt-3 font-display text-4xl md:text-6xl font-black tracking-tight text-white">
            Intelligence Logs & Roadmap
          </h2>
          <p className="mt-4 text-slate-400 text-sm md:text-base max-w-2xl leading-relaxed">
            Stay updated with official security research, development sprints, and global software initiatives compiled straight from founder desk.
          </p>
        </div>

        {/* Community Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
          
          {/* Research & Blogs Feed Column (Left) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                Knowledge Registries ({posts.length})
              </span>
            </div>

            <div className="space-y-4">
              {posts.map((post) => {
                const isOpen = activePostId === post.id;
                return (
                  <div
                    key={post.id}
                    id={`blog-item-${post.id}`}
                    className="p-6 rounded-2xl bg-slate-950/60 border border-white/5 hover:border-cyan-500/25 transition-all"
                  >
                    {/* Header line metadata */}
                    <div className="flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-slate-500">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-full border text-[9px] uppercase font-bold tracking-wider ${getCategoryTheme(post.category)}`}>
                          {post.category}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-500" /> {post.author}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {post.date}</span>
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {post.readTime}</span>
                      </div>
                    </div>

                    {/* Article click title toggle */}
                    <button
                      id={`blog-title-btn-${post.id}`}
                      onClick={() => togglePostContent(post.id)}
                      className="mt-3 text-left block w-full group/title cursor-pointer"
                    >
                      <h4 className="font-display text-lg md:text-xl font-bold text-white group-hover/title:text-cyan-300 transition-colors flex items-center justify-between gap-2.5">
                        <span>{post.title}</span>
                        <span className="p-1 rounded bg-slate-900 border border-white/5 text-slate-400 group-hover/title:text-cyan-400 transition-all flex-shrink-0">
                          {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </span>
                      </h4>
                    </button>

                    <p className="mt-3 text-xs text-slate-400 leading-relaxed">
                      {post.excerpt}
                    </p>

                    {/* Expanded complete Markdown/text viewer */}
                    <AnimatePresence>
                      {isOpen && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          className="mt-6 pt-6 border-t border-white/5 overflow-hidden"
                        >
                          <div className="prose prose-invert prose-xs text-slate-300 leading-relaxed font-sans space-y-4 max-w-none">
                            {/* Render lines manually to preserve safe styling without heavy external libraries */}
                            {post.content.split('\n\n').map((paragraph, pIdx) => {
                              if (paragraph.startsWith('### ')) {
                                return (
                                  <h5 key={pIdx} className="font-display text-sm font-bold text-cyan-400 uppercase tracking-wide mt-4 flex items-center gap-1.5">
                                    <Hash className="w-3.5 h-3.5 text-cyan-405/60" />
                                    {paragraph.replace('### ', '')}
                                  </h5>
                                );
                              }
                              if (paragraph.startsWith('- ')) {
                                return (
                                  <ul key={pIdx} className="list-disc pl-5 space-y-1 text-xs">
                                    {paragraph.split('\n').map((li, lIdx) => (
                                      <li key={lIdx} className="text-slate-400">
                                        {li.replace('- ', '')}
                                      </li>
                                    ))}
                                  </ul>
                                );
                              }
                              return (
                                <p key={pIdx} className="text-xs text-slate-300 leading-relaxed">
                                  {paragraph}
                                </p>
                              );
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Sprints Development Roadmap Column (Right) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="w-4 h-4 text-cyan-400" />
              <span className="font-mono text-[10px] text-cyan-400 font-bold uppercase tracking-widest">
                Ecosystem Evolution Track
              </span>
            </div>

            <div className="p-6 rounded-2xl bg-slate-950/80 border border-white/5 space-y-6">
              
              {/* Roadmap Tab selectors */}
              <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-900 border border-white/5">
                {roadmapQuarters.map(q => (
                  <button
                    key={q.id}
                    id={`roadmap-tab-${q.id}`}
                    onClick={() => setActiveQuarter(q.id as any)}
                    className={`py-2 text-center text-[10px] font-mono tracking-wider uppercase rounded-lg cursor-pointer transition-all ${
                      activeQuarter === q.id
                        ? 'bg-cyan-950/40 text-cyan-400 border border-cyan-500/20 shadow-[0_0_10px_rgba(6,182,212,0.1)]'
                        : 'text-slate-500 hover:text-white'
                    }`}
                  >
                    {q.label}
                  </button>
                ))}
              </div>

              {/* Connected details */}
              <div className="space-y-4">
                
                {/* Quarter Meta details */}
                <div className="fflex flex-row justify-between items-center bg-slate-900/40 border border-white/5 p-3 rounded-lg text-xs">
                  <div className="flex items-center gap-2">
                    <Compass className="w-4 h-4 text-cyan-400 animate-spin" />
                    <span className="font-mono font-medium text-white">{currentQuarter.label} Sprint</span>
                  </div>
                  <span className="inline-block mt-1 font-mono text-[9px] text-emerald-400 uppercase tracking-widest bg-emerald-950/20 px-2 py-0.5 rounded border border-emerald-500/20">
                    {currentQuarter.status}
                  </span>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed font-sans font-medium">
                  {currentQuarter.summary}
                </p>

                {/* Milestones list with stylized timeline connectors */}
                <div className="pt-4 border-t border-white/5 space-y-4 relative">
                  
                  {currentQuarter.milestones.map((ms, idx) => (
                    <div key={idx} className="flex gap-3 relative group">
                      
                      {/* Timeline pointer */}
                      <div className="flex flex-col items-center flex-shrink-0 mt-1">
                        <span className="h-3.5 w-3.5 rounded-full border border-cyan-500/40 bg-slate-950 flex items-center justify-center">
                          <span className="h-1.5 w-1.5 bg-cyan-400 rounded-full group-hover:scale-110 transition-transform" />
                        </span>
                        {idx !== currentQuarter.milestones.length - 1 && (
                          <div className="w-px h-12 bg-white/5 mt-1" />
                        )}
                      </div>

                      <div className="text-xs">
                        <h5 className="font-mono font-semibold text-white group-hover:text-cyan-300 transition-colors leading-tight">
                          {ms.label}
                        </h5>
                        <p className="mt-1 text-slate-400 font-sans text-[11px] leading-relaxed">
                          {ms.desc}
                        </p>
                      </div>

                    </div>
                  ))}

                </div>

              </div>

              {/* Community dialogue prompt block */}
              <div className="border-t border-white/5 pt-4 bg-[#020a1a]/40 p-3 rounded-lg border border-cyan-500/10 text-[10px] text-slate-400 flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                <p className="leading-relaxed">
                  Join our open development channels or submit architectural suggestions directly on the global GitHub mesh branches.
                </p>
              </div>

            </div>
          </div>

        </div>

      </div>
    </section>
  );
}
