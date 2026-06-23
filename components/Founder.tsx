'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Sparkles, Terminal, Cpu, Quote, ArrowRight, UserCheck, Heart, Shield } from 'lucide-react';
import Logo from './Logo';

interface PhilosophyNode {
  key: string;
  num: string;
  title: string;
  essence: string;
  narrative: string;
}

export default function Founder() {
  const [activePhil, setActivePhil] = useState<string>('build');
  const [terminalLine, setTerminalLine] = useState<string>('Select an index to see the raw logs...');
  const [founderPhoto, setFounderPhoto] = useState<string | null>(null);

  useEffect(() => {
    const updatePhoto = () => {
      const stored = localStorage.getItem('edusentinel_founder_image');
      setFounderPhoto(stored);
    };
    updatePhoto();
    window.addEventListener('founder-image-updated', updatePhoto);
    return () => window.removeEventListener('founder-image-updated', updatePhoto);
  }, []);

  const philosophies: PhilosophyNode[] = [
    {
      key: 'build',
      num: '01',
      title: 'Learning by Building',
      essence: 'Tutorial hell leads to passive conformity. True cognitive mastery comes from compiling compilers, breaking databases, and solving raw real-world friction indices.',
      narrative: 'I do not believe in academic isolation. Every software utility under the EduSentinel umbrella was designed because a core infrastructure failed in front of us. When you build, your code is tested by real-world friction. This forces you to understand why every system parameter exists, and what happens when they fail.'
    },
    {
      key: 'privacy',
      num: '02',
      title: 'Privacy-First Architecture',
      essence: 'Sovereignty over one’s data is a fundamental human parameter, not an expensive premium checkbox.',
      narrative: 'Computing systems should serve the user’s cognitive development, not the adtech industry. EduSentinel AI assumes your local hardware host is the only truly safe boundary. By executing model files, databases, and verification layers locally, we turn your computer back into a fortress for personal thought.'
    },
    {
      key: 'longterm',
      num: '03',
      title: 'Long-Term Thinking',
      essence: 'Fads dissolve. Memes disappear. Robust platforms are computed step-by-step for the span of decades.',
      narrative: 'We do not build for exit multi-variants or hype metrics. EduSentinel AI is a technological sandbox meant to grow with the user over their lifetime. This means choosing stable compilation standards, robust flat file states, and writing clear, maintainable logic that remains valuable ten years from now.'
    },
    {
      key: 'realproblem',
      num: '04',
      title: 'Real-world Overhauls',
      essence: 'Solve the messy, unglamorous friction of real people instead of building circular platforms for other startups.',
      narrative: 'Sentinel Shaadi was designed to clean up broken family identity matching systems. Carbon Footprint tracks real watts, not abstract paper multipliers. We focus our engineering hours solving actual physical constraints, proving software can still improve basic human trust and welfare.'
    }
  ];

  const handleTerminalQuery = (topic: string) => {
    switch (topic) {
      case 'root':
        setTerminalLine('> ayush --auth-logs: System bootstrapped from a student dormitory. First node launched: EduSentinel Extension.');
        break;
      case 'curr':
        setTerminalLine('> ayush --curiosity: Seeking complete self-containment. Developing edge mesh models to link user sandboxes without central cloud dependencies.');
        break;
      case 'code':
        setTerminalLine('> ayush --codebase: Clean architecture, strict typescript typing, 0% telemetry tracking by default. Code is poetry, security is grammar.');
        break;
      default:
        setTerminalLine('> Select an index to see the raw logs...');
    }
  };

  const currentPhil = philosophies.find(p => p.key === activePhil) || philosophies[0];

  return (
    <section id="founder" className="relative py-28 overflow-hidden bg-slate-950/25">
      {/* Dynamic graphic glow lines in background */}
      <div className="absolute top-1/3 right-1/4 w-[400px] h-[400px] bg-cyan-500/5 rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 items-center">
          
          {/* Visual Presentation Card Column */}
          <div className="lg:col-span-5 flex flex-col items-center">
            <div className="relative group w-full max-w-sm rounded-3xl overflow-hidden bg-gradient-to-br from-cyan-400/20 to-teal-400/20 p-1 shadow-2xl">
              <div className="relative aspect-auto min-h-[480px] md:min-h-[505px] bg-[#020a1c] rounded-[22px] flex flex-col justify-between p-8 overflow-hidden">
                
                {/* Tech HUD frames */}
                <div className="flex items-center justify-between font-mono text-[9px] text-cyan-400/60">
                  <span>ROOT_CORE_AUTHENTICATED</span>
                  <span>SYSTEM_INIT_2024</span>
                </div>

                {/* Elegant, high-end minimal abstract typographic avatar representation */}
                <div className="my-auto flex flex-col items-center text-center">
                  <div className="relative w-24 h-24 rounded-full border border-cyan-500/30 flex items-center justify-center bg-cyan-950/20 shadow-[0_0_20px_rgba(6,182,212,0.15)] mb-6 overflow-hidden">
                    {founderPhoto ? (
                      <img 
                        src={founderPhoto} 
                        alt="Ayush Kushwaha" 
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <Logo iconOnly={true} glow={false} />
                    )}
                    <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-slate-950 border border-teal-500 flex items-center justify-center z-10">
                      <Shield className="w-3 h-3 text-teal-400" />
                    </div>
                  </div>
                  
                  <span className="font-display text-3xl font-extrabold tracking-tight text-white">
                    Ayush Kushwaha
                  </span>
                  <span className="font-mono text-xs text-cyan-400 mt-1 tracking-widest uppercase font-semibold">
                    Founder
                  </span>
                  
                  {/* Specialized Profile Info */}
                  <div className="mt-3 text-center space-y-1">
                    <p className="font-sans text-[11px] text-slate-300 font-medium leading-tight">
                      BTech Computer Science Engineering<br/>
                      <span className="text-cyan-400/90 text-[10px] font-mono uppercase font-semibold">Specialization: Cybersecurity & Forensics</span>
                    </p>
                    
                    <div className="flex flex-wrap gap-1 justify-center pt-2 max-w-[280px] mx-auto">
                      {['AI Builder', 'Cybersecurity Enthusiast', 'Hackathon Finalist', 'Product Builder'].map(tag => (
                        <span key={tag} className="px-2 py-0.5 rounded bg-cyan-950/30 border border-cyan-500/15 text-[9px] font-mono text-cyan-300">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Human philosophy signature quote block */}
                <div className="border-t border-white/5 pt-4 text-center space-y-0.5">
                  <span className="font-mono text-[8px] text-cyan-400 uppercase block tracking-wider font-semibold">Founder Philosophy</span>
                  <p className="font-sans text-sm text-cyan-300 font-extrabold leading-normal">
                    Build Until Success Finds You
                  </p>
                  <p className="font-mono text-[10px] text-slate-400 tracking-wider uppercase font-medium">
                    Ideas → Startups → Impact
                  </p>
                  <p className="font-sans text-[10px] text-slate-400 italic">
                    One Idea Can Change Everything.
                  </p>
                </div>

              </div>
            </div>

            {/* Simulated mini founder interaction terminal (Tactile) */}
            <div className="mt-8 w-full max-w-sm p-4 rounded-xl bg-slate-950 border border-white/5 font-mono text-xs shadow-inner">
              <div className="flex items-center justify-between pb-3 border-b border-white/5">
                <span className="text-[10px] text-slate-500 flex items-center gap-1.5 uppercase font-semibold">
                  <Terminal className="w-3 h-3 text-cyan-400" /> ayush_terminal.sh
                </span>
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
              </div>
              
              <div className="space-y-1 my-3 text-[11px] leading-relaxed select-none">
                <p className="text-slate-400">Click a node to index core parameters:</p>
                <div className="grid grid-cols-3 gap-2 py-1">
                  <button
                    onClick={() => handleTerminalQuery('root')}
                    className="p-1 rounded bg-[#020a1c] hover:bg-cyan-950/40 text-cyan-400 text-center text-[10px] border border-cyan-500/10 hover:border-cyan-500/30 cursor-pointer"
                  >
                    --roots
                  </button>
                  <button
                    onClick={() => handleTerminalQuery('curr')}
                    className="p-1 rounded bg-[#020a1c] hover:bg-cyan-950/40 text-cyan-400 text-center text-[10px] border border-cyan-500/10 hover:border-cyan-500/30 cursor-pointer"
                  >
                    --curiosity
                  </button>
                  <button
                    onClick={() => handleTerminalQuery('code')}
                    className="p-1 rounded bg-[#020a1c] hover:bg-cyan-950/40 text-cyan-400 text-center text-[10px] border border-cyan-500/10 hover:border-cyan-500/30 cursor-pointer"
                  >
                    --logic
                  </button>
                </div>
              </div>

              <div className="p-2.5 rounded bg-slate-900 border border-white/[0.04]">
                <p className="text-[10px] text-cyan-300 leading-relaxed break-words">{terminalLine}</p>
              </div>
            </div>

          </div>

          {/* Philosophy Narrative Column */}
          <div className="lg:col-span-7 flex flex-col justify-center">
            <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest font-semibold block mb-2">
              Founder Profile
            </span>
            <h2 className="font-display text-3xl md:text-5xl font-black text-white tracking-tight leading-tight">
              Ayush Kushwaha
            </h2>
            <div className="mt-4 space-y-4 text-slate-400 text-sm md:text-base leading-relaxed">
              <p>
                Ayush Kushwaha is a BTech Computer Science Engineering student specializing in Cybersecurity & Forensics with experience in AI systems, cybersecurity, browser security, hackathons, product development and startup ecosystems.
              </p>
              <p>
                He has worked on AI agents, browser extensions, cybersecurity products, privacy-first applications and real-world technology solutions.
              </p>
              <p>
                His work spans AI, cloud technologies, cybersecurity, digital trust systems and educational technology innovation.
              </p>
            </div>

            {/* Achievements Grid */}
            <div className="mt-6 border-t border-white/5 pt-6">
              <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest font-bold block mb-3">
                Key Credentials & Achievements
              </span>
              <ul className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-300 font-mono">
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">■</span>
                  <span>APL 2026 Solo Finalist</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">■</span>
                  <span>AMD Slingshot Top 10 Solo Rank</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">■</span>
                  <span>Chief Staff AMD Slingshot Grand Finale</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-cyan-400 font-bold">■</span>
                  <span>Hack2Skill Campus Ambassador</span>
                </li>
                <li className="flex items-start gap-2 md:col-span-2">
                  <span className="text-cyan-400 font-bold">■</span>
                  <span>Google Cloud GenAI Programs</span>
                </li>
              </ul>
            </div>

            {/* Horizontal tab-selectors for principles */}
            <div className="mt-8 grid grid-cols-1 md:grid-cols-4 gap-2.5">
              {philosophies.map(p => (
                <button
                  key={p.key}
                  id={`phil-tab-${p.key}`}
                  onClick={() => setActivePhil(p.key)}
                  className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
                    activePhil === p.key
                      ? 'bg-cyan-950/20 border-cyan-400/40 shadow-[0_0_15px_rgba(6,182,212,0.1)]'
                      : 'bg-slate-900/40 border-white/5 hover:bg-white/[0.01]'
                  }`}
                >
                  <span className="font-mono text-[9px] text-cyan-400 block tracking-widest">{p.num}</span>
                  <span className="font-display text-xs font-bold text-white block mt-1 leading-tight">{p.title}</span>
                </button>
              ))}
            </div>

            {/* Interactive Tab details presentation card */}
            <div className="mt-6 p-6 rounded-2xl bg-slate-950/80 border border-white/5 relative">
              <Quote className="absolute top-4 right-4 w-12 h-12 text-white/[0.02] transform rotate-180 pointer-events-none" />
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentPhil.key}
                  initial={{ opacity: 0, y: 5 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -5 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-cyan-400" />
                    <span className="font-mono text-[10px] text-cyan-400 uppercase tracking-widest font-semibold">
                      {currentPhil.title} Notebook
                    </span>
                  </div>

                  <p className="font-display text-sm md:text-lg font-medium text-white leading-relaxed">
                    &quot;{currentPhil.essence}&quot;
                  </p>
                  
                  <p className="text-xs text-slate-400 leading-relaxed font-sans border-t border-white/5 pt-3">
                    {currentPhil.narrative}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>

          </div>

        </div>
      </div>
    </section>
  );
}
