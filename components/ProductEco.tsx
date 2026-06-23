'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Cpu, Copy, Check, Download, Chrome, Code, Activity, 
  ExternalLink, FileText, ChevronRight, Terminal, Globe, 
  ShieldAlert, Sparkles, AlertCircle 
} from 'lucide-react';
import { Product } from '@/lib/ecosystemStore';
import Logo from './Logo';

interface ProductEcoProps {
  products: Product[];
  onDownloadTrigger: (product: Product, platform: string) => void;
}

export default function ProductEco({ products, onDownloadTrigger }: ProductEcoProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [activeTabMap, setActiveTabMap] = useState<Record<string, 'overview' | 'terminal' | 'notes'>>({});

  const handleCopyChecksum = (productId: string, checksum: string) => {
    navigator.clipboard.writeText(checksum);
    setCopiedId(productId);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getActiveTab = (productId: string) => activeTabMap[productId] || 'overview';
  const setActiveTab = (productId: string, tab: 'overview' | 'terminal' | 'notes') => {
    setActiveTabMap(prev => ({ ...prev, [productId]: tab }));
  };

  const getPlatformIcon = (platform: string) => {
    const p = platform.toLowerCase();
    if (p.includes('chrome') || p.includes('firefox') || p.includes('extension')) {
      return <Chrome className="w-3.5 h-3.5" />;
    } else if (p.includes('web')) {
      return <Globe className="w-3.5 h-3.5" />;
    } else {
      return <Cpu className="w-3.5 h-3.5" />;
    }
  };

  const currentTabStyles = (active: boolean) => {
    return active
      ? 'border-cyan-400 text-cyan-400 bg-cyan-950/20 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
      : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.02]';
  };

  return (
    <section id="products" className="relative py-28 overflow-hidden">
      {/* Background radial atmosphere */}
      <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-teal-500/5 rounded-full blur-[140px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mb-24 text-center md:text-left flex flex-col items-center md:items-start">
          <Logo iconOnly={true} glow={true} className="mb-4" />
          <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest font-semibold">
            Brand Portfolio
          </span>
          <h2 className="mt-3 font-display text-4xl md:text-6xl font-black tracking-tight text-white">
            Product Ecosystem
          </h2>
          <p className="mt-4 text-slate-400 text-base max-w-2xl leading-relaxed">
            EduSentinel AI is not a single product—it is an interdependent suite of security nodes, local AI engines, browser shields, and ecological monitoring platforms. Explore each sovereign module below.
          </p>
        </div>

        {/* Product Stack */}
        <div className="space-y-36">
          {products.map((product, index) => {
            const activeTab = getActiveTab(product.id);
            const isLatest = product.id === 'prod-agent';
            
            return (
              <motion.div
                key={product.id}
                id={`product-showcase-${product.id}`}
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-100px' }}
                transition={{ duration: 0.8 }}
                className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start"
              >
                
                {/* Tech Metadata Column (Launch details like size, checksum) */}
                <div className="lg:col-span-5 flex flex-col justify-between h-full">
                  <div>
                    {/* Status badge & Name */}
                    <div className="flex items-center gap-3">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase tracking-wider border ${
                        product.status === 'Stable' || product.status === 'Updated'
                          ? 'bg-emerald-950/20 text-emerald-400 border-emerald-500/25'
                          : product.status === 'Beta'
                          ? 'bg-amber-950/20 text-amber-400 border-amber-500/25'
                          : 'bg-cyan-950/20 text-cyan-400 border-cyan-500/25'
                      }`}>
                        <Sparkles className="w-3 h-3" />
                        {product.status}
                      </span>
                      <span className="font-mono text-xs text-slate-500">v{product.version}</span>
                    </div>

                    <h3 className="mt-4 font-display text-3xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
                      {product.name}
                    </h3>

                    <p className="mt-6 text-slate-300 text-sm md:text-base leading-relaxed">
                      {product.description}
                    </p>

                    {/* Tags */}
                    <div className="mt-6 flex flex-wrap gap-2">
                      {product.tags.map(t => (
                        <span key={t} className="px-2.5 py-1 rounded bg-slate-900 border border-white/5 font-mono text-[9px] text-cyan-400/80">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Operational Controls Spec Matrix */}
                  <div className="mt-10 p-5 rounded-2xl bg-slate-950/80 border border-white/5 space-y-4">
                    <div className="grid grid-cols-2 gap-4 pb-4 border-b border-white/5 text-xs">
                      <div>
                        <span className="block text-slate-500 font-mono">DISTRIBUTED SIZE</span>
                        <span className="block mt-1 font-mono font-semibold text-white">{product.fileSize}</span>
                      </div>
                      <div>
                        <span className="block text-slate-500 font-mono">RELEASE DATE</span>
                        <span className="block mt-1 font-mono font-semibold text-white">{product.releaseDate}</span>
                      </div>
                    </div>

                    {/* Verification hash SHA-256 copy block */}
                    <div className="text-xs">
                      <span className="block text-slate-500 font-mono uppercase">Master Integrity Signature (SHA-256)</span>
                      <div className="mt-1.5 flex items-center justify-between gap-1.5 px-3 py-2 rounded-lg bg-slate-900/60 border border-white/5 font-mono text-[10px] text-cyan-300/85 overflow-hidden">
                        <span className="truncate max-w-[280px]">{product.checksum}</span>
                        <button
                          id={`copy-checksum-btn-${product.id}`}
                          onClick={() => handleCopyChecksum(product.id, product.checksum)}
                          className="flex-shrink-0 p-1 rounded hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Copy file verification SHA-256 signature"
                        >
                          {copiedId === product.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <span className="text-[9px] text-slate-500 mt-1 block">Inspect the file signature locally before running binaries.</span>
                    </div>

                    {/* Supported Platforms lists */}
                    <div>
                      <span className="block text-slate-500 font-mono text-[10px] uppercase mb-2">TARGET ARCHITECTURES</span>
                      <div className="flex flex-wrap gap-1.5">
                        {product.platforms.map(p => (
                          <button
                            key={p}
                            id={`dl-shortcut-${product.id}-${p.replace(/\s+/g,'-')}`}
                            onClick={() => onDownloadTrigger(product, p)}
                            className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-mono font-medium border border-white/5 hover:border-cyan-500/20 bg-slate-900/40 text-slate-300 hover:text-cyan-400 transition-all cursor-pointer"
                          >
                            {getPlatformIcon(p)}
                            {p}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Interactive Sandbox/CLI Canvas Presentation Column */}
                <div className="lg:col-span-7 rounded-2xl bg-slate-950/60 border border-white/10 hover:border-cyan-500/20 overflow-hidden shadow-2xl transition-all">
                  
                  {/* Top switching Tab Controller bar */}
                  <div className="flex items-center justify-between px-4 py-2 border-b border-white/10 bg-slate-950/90 text-xs">
                    <div className="flex items-center gap-1 bg-slate-900 p-0.5 rounded-lg border border-white/5">
                      <button
                        id={`tab-overview-${product.id}`}
                        onClick={() => setActiveTab(product.id, 'overview')}
                        className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${currentTabStyles(activeTab === 'overview')}`}
                      >
                        Architecture Description
                      </button>
                      <button
                        id={`tab-terminal-${product.id}`}
                        onClick={() => setActiveTab(product.id, 'terminal')}
                        className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${currentTabStyles(activeTab === 'terminal')}`}
                      >
                        Terminal Output
                      </button>
                      <button
                        id={`tab-notes-${product.id}`}
                        onClick={() => setActiveTab(product.id, 'notes')}
                        className={`px-3 py-1 rounded-md font-medium transition-all cursor-pointer ${currentTabStyles(activeTab === 'notes')}`}
                      >
                        Release Notes
                      </button>
                    </div>
                    
                    {/* Tiny blinking connection signal */}
                    <div className="hidden sm:flex items-center gap-1.5 font-mono text-[10px] text-emerald-400 bg-emerald-950/20 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      SECURE CDN LINK
                    </div>
                  </div>

                  {/* Active Window Body */}
                  <div className="p-6 min-h-[300px] flex flex-col justify-between font-sans">
                    <AnimatePresence mode="wait">
                      
                      {/* OVERVIEW TAB */}
                      {activeTab === 'overview' && (
                        <motion.div
                          key="overview"
                          initial={{ opacity: 0, x: 5 }}
                          animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: -5 }}
                          transition={{ duration: 0.2 }}
                          className="space-y-4"
                        >
                          <div className="flex items-start gap-3">
                            <Activity className="w-5 h-5 text-cyan-400 mt-0.5" />
                            <div>
                              <h4 className="font-mono text-sm font-semibold text-white uppercase tracking-wider">Cognitive Capabilities</h4>
                              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                                Integrated core algorithms engineered under strict localized permissions. Operates entirely off-grid avoiding cloud-leak profiles. Uses localized neural embeddings configured inside a lightweight WASM buffer.
                              </p>
                            </div>
                          </div>

                          <div className="flex items-start gap-3 border-t border-white/5 pt-4">
                            <Code className="w-5 h-5 text-teal-400 mt-0.5" />
                            <div>
                              <h4 className="font-mono text-sm font-semibold text-white uppercase tracking-wider">Sovereign Encryption Core</h4>
                              <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                                Multi-layered identity routing. Bypasses browser session injection frameworks by utilizing device-specific cryptographic chips for login validations.
                              </p>
                            </div>
                          </div>

                          {/* Trigger action button inside overview */}
                          <div className="pt-4 flex items-center justify-between border-t border-white/5">
                            <span className="text-[10px] font-mono text-slate-500">DYNAMIC REGISTRATION STATUS: verified</span>
                            <div className="flex gap-2">
                              {product.fileSize !== '-- MB' && product.platforms.map(plat => (
                                <button
                                  key={plat}
                                  id={`overview-dl-btn-${product.id}-${plat.replace(/\s+/g,'-')}`}
                                  onClick={() => onDownloadTrigger(product, plat)}
                                  className="flex items-center gap-1 px-2.5 py-1 rounded bg-cyan-950/40 hover:bg-cyan-900 border border-cyan-500/30 hover:border-cyan-500/60 text-cyan-300 font-mono text-[10px] transition-all cursor-pointer"
                                >
                                  <Download className="w-3 h-3" />
                                  <span>Get for {plat}</span>
                                </button>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}

                      {/* TERMINAL SIGNALS TAB (Futuristic interactive sandbox shell simulator) */}
                      {activeTab === 'terminal' && (
                        <motion.div
                          key="terminal"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="font-mono text-xs text-slate-300 space-y-2 bg-[#020617] p-4 rounded-xl border border-white/5 overflow-x-auto"
                        >
                          <p className="text-slate-500 flex items-center gap-1.5">
                            <Terminal className="w-3.5 h-3.5" />
                            edusentinel-verify --target {product.slug} --checksum --verbose
                          </p>
                          <p className="text-cyan-400">⚡ Initializing secure integrity validation layer...</p>
                          <p className="text-slate-400">[info] Handshaking secure device enclaves... successfully linked [TPM_V2.0_READY]</p>
                          <p className="text-slate-400">[info] Resolving binary metadata indices for version {product.version}</p>
                          <p className="text-teal-400">[success] Checksum validated local registry hash matches distributed footprint perfectly:</p>
                          <p className="text-slate-300 bg-white/5 px-2 py-1 rounded select-all break-all border border-white/5 text-[11px] leading-relaxed">
                            {product.checksum}
                          </p>
                          <p className="text-emerald-400">● Core status: OPERATIONAL [secured via local container sandbox]</p>
                        </motion.div>
                      )}

                      {/* RELEASE NOTES TAB */}
                      {activeTab === 'notes' && (
                        <motion.div
                          key="notes"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="space-y-4"
                        >
                          <div className="flex items-start gap-2.5">
                            <FileText className="w-4 h-4 text-cyan-400 mt-1" />
                            <div>
                              <span className="font-mono text-xs text-slate-400 uppercase tracking-wider block">v{product.version} Major Changes</span>
                              <p className="mt-2 text-xs text-slate-300 leading-relaxed bg-[#020617] p-3 rounded-lg border border-white/5">
                                {product.releaseNotes}
                              </p>
                            </div>
                          </div>
                          
                          <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-lg p-3 text-xs flex items-start gap-2.5 text-cyan-300 font-mono">
                            <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <p className="text-[10px] leading-relaxed">
                              SECURITY DIRECTIVE: All official releases are signed by the root EduSentinel administrator. Do not run binaries reporting conflicting checksum values.
                            </p>
                          </div>
                        </motion.div>
                      )}

                    </AnimatePresence>
                  </div>

                </div>

              </motion.div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
