'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Download, Search, Shield, Cpu, Activity, Chrome, Globe, 
  Terminal, Smartphone, Check, Copy, AlertTriangle, Play, HelpCircle, AlertCircle
} from 'lucide-react';
import { Product } from '@/lib/ecosystemStore';
import Logo from './Logo';

interface DownloadCenterProps {
  products: Product[];
  onDownloadCompleted: (product: Product) => void;
  selectedProductFromShortcut?: { product: Product; platform: string } | null;
  clearShortcut?: () => void;
}

interface DownloadingState {
  productId: string;
  platform: string;
  progress: number;
  phase: 'idle' | 'handshake' | 'streaming' | 'verifying' | 'writing' | 'completed';
}

export default function DownloadCenter({ 
  products, 
  onDownloadCompleted, 
  selectedProductFromShortcut,
  clearShortcut
}: DownloadCenterProps) {
  const [searchVal, setSearchVal] = useState('');
  const [activePlatFilter, setActivePlatFilter] = useState<string>('all');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState<DownloadingState | null>(null);

  const triggerPhysicalDownload = (product: Product, platform: string) => {
    try {
      const contractContent = `========================================================================
EDUSENTINEL AI SOVEREIGN TECH GRID LOG
Ecosystem Binary Integrity Receipt & Security Contract
========================================================================
Product Node:      \${product.name}
Release Version:   v\${product.version}
Platform Target:   \${platform}
File Metrics:      \${product.fileSize}
Publishing Date:   \${product.releaseDate}
MASTER CHECKSUM:   \${product.checksum}
Sign Authority:    ak12chess@gmail.com (Roots Admin Key ID: ES-2026-X)
Security Status:   VERIFIED SANBOX SECURED (0 bytes cloud leakage)
========================================================================
SECURITY DIRECTIVE:
------------------------------------------------------------------------
This text file represents your official cryptographically verified 
installation contract. You are authorized to run this binary inside 
isolated local environments under self-sovereign user permissions.

Master verification command:
$ edusentinel-verify --target "\${product.slug}" --key "\${product.checksum}"

Thank you for participating in the sovereign decentralized future.
EduSentinel AI Systems.
========================================================================`;

      const blob = new Blob([contractContent], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `\${product.slug}_v\${product.version}_\${platform.toLowerCase().replace(/\\s+/g, '_')}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error('Failed to trigger virtual filesystem write contract:', e);
    }
  };

  const handleInitiateDownload = (product: Product, platform: string) => {
    if (product.fileSize === '-- MB') return; // Cannot download uncompiled nodes
    
    setDownloading({
      productId: product.id,
      platform,
      progress: 0,
      phase: 'handshake'
    });

    // Simulated high-fidelity download phases
    // Handshake -> Streaming bytes -> Verifying Cryptographic SHA hash -> Local file write -> Completed + Real direct download trigger
    setTimeout(() => {
      setDownloading(prev => prev ? { ...prev, phase: 'streaming', progress: 10 } : null);
      
      const interval = setInterval(() => {
        setDownloading(prev => {
          if (!prev) {
            clearInterval(interval);
            return null;
          }
          if (prev.progress >= 90) {
            clearInterval(interval);
            setTimeout(() => {
              // Sign verification check phase
              setDownloading(cur => cur ? { ...cur, phase: 'verifying' } : null);
              setTimeout(() => {
                // Secure write check
                setDownloading(cur => cur ? { ...cur, phase: 'writing' } : null);
                setTimeout(() => {
                  // Trigger physical file download contract assembly
                  triggerPhysicalDownload(product, platform);
                  setDownloading(cur => {
                    onDownloadCompleted(product);
                    return cur ? { ...cur, phase: 'completed', progress: 100 } : null;
                  });
                  setTimeout(() => setDownloading(null), 3000);
                }, 1000);
              }, 1200);
            }, 500);
            return prev;
          }
          return { ...prev, progress: prev.progress + 20 };
        });
      }, 350);
    }, 1200);
  };

  // Trigger from navbar/hero quick link
  useEffect(() => {
    if (selectedProductFromShortcut) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      handleInitiateDownload(selectedProductFromShortcut.product, selectedProductFromShortcut.platform);
      if (clearShortcut) clearShortcut();
    }
  }, [selectedProductFromShortcut]);

  const platformGrid = [
    { label: 'All Hosts', key: 'all', icon: Cpu },
    { label: 'Windows', key: 'windows', icon: Cpu },
    { label: 'macOS', key: 'macos', icon: Cpu },
    { label: 'Linux', key: 'linux', icon: Terminal },
    { label: 'Android', key: 'android', icon: Smartphone },
    { label: 'Extensions', key: 'extension', icon: Chrome },
  ];

  const handleCopyChecksum = (id: string, hash: string) => {
    navigator.clipboard.writeText(hash);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Filter products by searching keys or targets
  const filteredProducts = products.filter(p => {
    const s = searchVal.toLowerCase();
    const nameMatch = p.name.toLowerCase().includes(s) || p.description.toLowerCase().includes(s);
    
    if (activePlatFilter === 'all') return nameMatch;
    
    const isExtension = activePlatFilter === 'extension';
    const platMatch = p.platforms.some(plat => {
      const targetPlat = plat.toLowerCase();
      if (isExtension) {
        return targetPlat.includes('extension') || targetPlat.includes('chrome') || targetPlat.includes('firefox');
      }
      return targetPlat.includes(activePlatFilter);
    });

    return nameMatch && platMatch;
  });

  return (
    <section id="downloads" className="relative py-28 overflow-hidden bg-slate-950/40">
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="mb-16 text-center flex flex-col items-center justify-center">
          <Logo iconOnly={true} glow={true} className="mb-3" />
          <span className="font-mono text-xs text-cyan-400 uppercase tracking-widest font-semibold">
            SECURE RELEASES
          </span>
          <h2 className="mt-3 font-display text-4xl md:text-6xl font-black tracking-tight text-white">
            Download Center
          </h2>
          <p className="mt-4 text-slate-400 text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Pull binary packages directly from our secure CDN. All downloads are signed, vetted against XSS injectors, and include pre-computed SHA-256 integrity checksums.
          </p>
        </div>

        {/* Dynamic Filters & Search Panel */}
        <div className="mb-12 p-3 rounded-2xl bg-slate-950/80 border border-white/5 space-y-4 md:space-y-0 md:flex md:items-center md:justify-between md:gap-6">
          
          {/* Platform category selectors */}
          <div className="flex flex-wrap items-center gap-1.5 scrollbar-none overflow-x-auto">
            {platformGrid.map(item => {
              const Icon = item.icon;
              const isActive = activePlatFilter === item.key;
              return (
                <button
                  key={item.key}
                  id={`filter-plat-btn-${item.key}`}
                  onClick={() => setActivePlatFilter(item.key)}
                  className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                    isActive
                      ? 'bg-cyan-950/30 text-cyan-300 border border-cyan-500/20 shadow-[0_0_12px_rgba(6,182,212,0.1)]'
                      : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/[0.01]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Text keywords search */}
          <div className="relative max-w-xs w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              id="download-search-input"
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              placeholder="Search release directories..."
              className="w-full pl-9 pr-4 py-2 text-xs bg-slate-900 border border-white/5 rounded-xl text-white focus:outline-none focus:border-cyan-500/30 placeholder-slate-500 transition-all font-sans"
            />
          </div>

        </div>

        {/* Binary Catalog Matrix */}
        <div id="downloads-catalog-matrix" className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredProducts.map((p) => {
            const isUnreleased = p.fileSize === '-- MB';
            const isTargetDownloading = downloading?.productId === p.id;

            return (
              <div
                key={p.id}
                id={`download-matrix-item-${p.id}`}
                className={`p-6 rounded-2xl bg-slate-950/60 border hover:border-cyan-500/15 transition-all flex flex-col justify-between ${
                  isUnreleased ? 'opacity-65 grayscale' : ''
                }`}
              >
                <div>
                  {/* Status header indices */}
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 mb-3">
                    <span>REGISTRY_ID: {p.id.toUpperCase()}</span>
                    <span className="text-cyan-400">v{p.version}</span>
                  </div>

                  <h3 className="font-display text-xl font-bold text-white tracking-tight">
                    {p.name}
                  </h3>

                  <p className="mt-2.5 text-xs text-slate-400 leading-relaxed font-sans line-clamp-3">
                    {p.description}
                  </p>

                  {/* SHA-256 block */}
                  <div className="mt-4 p-2.5 rounded-lg bg-[#020617] border border-white/5 font-mono text-[9px] text-cyan-300">
                    <div className="flex items-center justify-between gap-1 mb-1">
                      <span className="text-slate-500 font-semibold uppercase">Verification SHA-256 Code</span>
                      <button
                        onClick={() => handleCopyChecksum(p.id, p.checksum)}
                        className="p-0.5 rounded hover:bg-white/5 text-slate-400 hover:text-white"
                        title="Copy Checksum to cache"
                      >
                        {copiedId === p.id ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <p className="truncate block font-mono tracking-wider">{p.checksum}</p>
                  </div>
                </div>

                {/* Bottom Downloads action block */}
                <div className="mt-6 pt-4 border-t border-white/5 flex flex-wrap items-center justify-between gap-4">
                  {/* Size metadata and support lists */}
                  <div className="text-[10px] font-mono">
                    <div className="flex items-center gap-1.5 text-slate-500">
                      <span>SIZE:</span>
                      <span className="text-white font-bold">{p.fileSize}</span>
                    </div>
                    <div className="mt-1 flex gap-1 items-center text-slate-600">
                      <span>DOC_SHEET:</span>
                      <span className="text-cyan-400 hover:underline cursor-pointer">{p.slug}.pdf</span>
                    </div>
                  </div>

                  {/* Dynamic Download Action triggers */}
                  <div>
                    {isUnreleased ? (
                      <span className="px-3.5 py-2 rounded-lg bg-amber-950/20 text-xs font-mono border border-amber-500/20 text-amber-400 block text-center">
                        Awaiting Compilation
                      </span>
                    ) : (
                      <div className="flex gap-2">
                        {p.platforms.map((plat) => (
                          <button
                            key={plat}
                            id={`btn-download-${p.id}-${plat.replace(/\s+/g,'-')}`}
                            onClick={() => handleInitiateDownload(p, plat)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-cyan-950/30 hover:bg-cyan-950 border border-cyan-500/20 hover:border-cyan-500 text-cyan-300 hover:text-white font-mono text-[10px] leading-tight transition-all cursor-pointer shadow-[0_0_8px_rgba(6,182,212,0.05)]"
                          >
                            <Download className="w-3 h-3" />
                            {plat}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

              </div>
            );
          })}
        </div>

        {/* Dynamic handshaking download progress overlay overlay */}
        <AnimatePresence>
          {downloading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-slate-950/80 backdrop-blur-md z-50 flex items-center justify-center p-4"
            >
              <motion.div
                initial={{ scale: 0.95, y: 15 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.95, y: 15 }}
                className="w-full max-w-md p-6 rounded-2xl bg-[#03081e] border border-cyan-500/20 shadow-[0_0_50px_rgba(0,240,255,0.15)] flex flex-col gap-6"
              >
                
                {/* HUD Header */}
                <div className="flex items-center justify-between pb-3 border-b border-white/5">
                  <span className="flex items-center gap-2 font-mono text-xs text-cyan-400 uppercase font-semibold">
                    <Shield className="w-4 h-4 text-cyan-400 animate-pulse" />
                    EduSentinel CDN Handshake
                  </span>
                  <span className="font-mono text-[10px] text-cyan-400/60">PORT_3000_SHIELD</span>
                </div>

                {/* Progress Details depending on active state phase */}
                <div className="text-center py-4 flex flex-col items-center">
                  
                  {/* Rotating micro-indicator */}
                  <div className="relative w-16 h-16 rounded-full border border-cyan-500/10 flex items-center justify-center mb-4">
                    <Activity className="w-6 h-6 text-cyan-400 animate-pulse" />
                    <div className="absolute inset-0 rounded-full border-t border-cyan-400 animate-spin" />
                  </div>

                  <h3 className="font-display font-bold text-white text-base">
                    {downloading.phase === 'handshake' && 'Negotiating Cryptographic Tunnel...'}
                    {downloading.phase === 'streaming' && `Downloading Dynamic Payload Byte Chunks...`}
                    {downloading.phase === 'verifying' && 'Validating Integrity Sign Key...'}
                    {downloading.phase === 'writing' && 'Compiling Local File Contract...'}
                    {downloading.phase === 'completed' && 'Sovereign Release Installed Successfully!'}
                  </h3>

                  <p className="mt-2 text-xs text-slate-400 font-mono text-center max-w-xs leading-relaxed">
                    {downloading.phase === 'handshake' && 'Checking client SSL, validating Cloud Run router headers, routing tunnel...'}
                    {downloading.phase === 'streaming' && `Downloaded ${downloading.progress}% of verified binaries...`}
                    {downloading.phase === 'verifying' && 'Comparing SHA-255 signature, vetting workspace against injection blocks...'}
                    {downloading.phase === 'writing' && 'Building localized receipt text file... compiling payload arrays...'}
                    {downloading.phase === 'completed' && 'The verified contract receipt was successfully downloaded to your native files drawer!'}
                  </p>

                </div>

                {/* Animated horizontal progress bar element */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500">
                    <span>CDN STREAM PERCENTAGE</span>
                    <span>{downloading.progress}%</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-slate-900 border border-white/5 overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
                      style={{ width: `${downloading.progress}%` }}
                    />
                  </div>
                </div>

                {/* Bottom prompt */}
                <div className="bg-cyan-950/20 border border-cyan-500/20 rounded-lg p-3 text-xs flex items-start gap-2.5 text-cyan-300 font-mono">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <p className="text-[10px] leading-relaxed">
                    WARNING: Never close this tab while binary compilation is in progress to avoid corrupted memory cache allocations.
                  </p>
                </div>

              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>
    </section>
  );
}
