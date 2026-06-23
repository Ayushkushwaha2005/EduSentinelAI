'use client';

import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import Navbar from '@/components/Navbar';
import Logo from '@/components/Logo';
import MouseGlow from '@/components/MouseGlow';
import LivingBackground from '@/components/LivingBackground';
import Hero from '@/components/Hero';
import ProductEco from '@/components/ProductEco';
import Founder from '@/components/Founder';
import Community from '@/components/Community';
import DownloadCenter from '@/components/DownloadCenter';
import AdminVault from '@/components/AdminVault';
import { Product, CommunityPost, AuditLog, EcosystemData } from '@/lib/ecosystemStore';
import { ShieldCheck, Heart, Sparkles, Terminal, ArrowRight, Cpu, Layers } from 'lucide-react';

export default function Page() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark');
  const [vaultOpen, setVaultOpen] = useState(false);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  // Central Dynamic State
  const [products, setProducts] = useState<Product[]>([]);
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);

  // Platform shortcuts (linking Hero/Specs directly to the download simulator)
  const [selectedShortcut, setSelectedShortcut] = useState<{ product: Product; platform: string } | null>(null);

  // Fetch standard values from full-stack API endpoint
  const syncEcosystemData = async () => {
    try {
      const response = await fetch('/api/ecosystem');
      if (response.ok) {
        const data: EcosystemData = await response.json();
        setProducts(data.products || []);
        setPosts(data.posts || []);
        setAuditLogs(data.auditLogs || []);
      }
    } catch (e) {
      console.error('Failed to sync master registry, using static failover:', e);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    syncEcosystemData();
    
    // Mount custom theme class on the body element
    document.documentElement.classList.add('dark');
  }, []);

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'dark') {
      document.documentElement.classList.remove('light');
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  };

  // Secure Sign In Handlers
  const handleLoginSuccess = (userToken: string, userEmail: string) => {
    setToken(userToken);
    setIsAdminLoggedIn(true);
    syncEcosystemData(); // Pull logs denoting successful logins
  };

  const handleAdminLogout = async () => {
    setIsAdminLoggedIn(false);
    setToken(null);
    setVaultOpen(false);

    // Append standard audit exit record locally
    try {
      await fetch('/api/ecosystem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'admin-logout',
          isClientMockBypass: true
        })
      });
      syncEcosystemData();
    } catch (e) {
      // ignore
    }
  };

  // Privileged actions
  const handleAddNewProduct = async (prodForm: any): Promise<boolean> => {
    try {
      const res = await fetch('/api/ecosystem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'add-product',
          product: prodForm
        })
      });
      if (res.ok) {
        await syncEcosystemData();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const handleAddNewPost = async (postForm: any): Promise<boolean> => {
    try {
      const res = await fetch('/api/ecosystem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'add-post',
          post: postForm
        })
      });
      if (res.ok) {
        await syncEcosystemData();
        return true;
      }
    } catch (e) {
      console.error(e);
    }
    return false;
  };

  const handlePurgeAuditLogs = async () => {
    try {
      const res = await fetch('/api/ecosystem', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'purge-audit-logs' })
      });
      if (res.ok) {
        await syncEcosystemData();
      }
    } catch (e) {
      console.error(e);
    }
  };

  // High-fidelity Download Incrementor tracker
  const handleDownloadCompleted = async (product: Product) => {
    try {
      const res = await fetch('/api/ecosystem', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'track-download', id: product.id })
      });
      if (res.ok) {
        syncEcosystemData();
      }
    } catch (e) {
      // ignore
    }
  };

  // Smooth scroll and focus on target operating system download
  const handleDownloadShortcut = (product: Product, platform: string) => {
    setSelectedShortcut({ product, platform });
    
    // Scroll down to the center dynamically
    const element = document.getElementById('downloads');
    if (element) {
      const topOffset = 100;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const jumpToProductsSection = () => {
    const el = document.getElementById('products');
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 82,
        behavior: 'smooth'
      });
    }
  };

  const jumpToDownloadsSection = () => {
    const el = document.getElementById('downloads');
    if (el) {
      window.scrollTo({
        top: el.offsetTop - 82,
        behavior: 'smooth'
      });
    }
  };

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'dark' ? 'text-white bg-[#020617]' : 'text-slate-900 bg-[#f8fafc]'
    }`}>
      
      {/* 2D Canvas Living Background */}
      <LivingBackground theme={theme} />

      {/* Mouse Follow Glow */}
      <MouseGlow />

      {/* Floating Header */}
      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        onAdminClick={() => setVaultOpen(true)}
        isAdminLoggedIn={isAdminLoggedIn}
        onAdminLogout={handleAdminLogout}
      />

      {/* Primary Landing Content Sections */}
      <main className="relative z-10 w-full">
        
        {/* Full-screen Hero Banner */}
        <Hero 
          onExploreProducts={jumpToProductsSection} 
          onGoToDownloads={jumpToDownloadsSection}
          productCount={products.filter(p => p.fileSize !== '-- MB').length}
        />

        {/* Thick divider accent */}
        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
        </div>

        {/* Product ecosystem launch showcases */}
        <ProductEco 
          products={products} 
          onDownloadTrigger={handleDownloadShortcut} 
        />

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-teal-500/10 to-transparent" />
        </div>

        {/* Ayush Kushwaha Creator Philosophy */}
        <Founder />

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-cyan-500/10 to-transparent" />
        </div>

        {/* Community Blogs, Roadmap timelines */}
        <Community posts={posts} />

        <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="h-px bg-gradient-to-r from-transparent via-teal-500/10 to-transparent" />
        </div>

        {/* Secure Download Catalog center */}
        <DownloadCenter
          products={products}
          onDownloadCompleted={handleDownloadCompleted}
          selectedProductFromShortcut={selectedShortcut}
          clearShortcut={() => setSelectedShortcut(null)}
        />

      </main>

      {/* Cinematic Brand footer */}
      <footer className="relative z-10 border-t border-white/5 bg-[#010512] py-16 px-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-12 pb-12 border-b border-white/5">
            
            {/* Branded core summary (Left) */}
            <div className="md:col-span-5 space-y-4 col-span-1">
              <Logo glow={true} />
              <p className="text-xs text-slate-500 max-w-md leading-relaxed">
                EduSentinel AI is a unified technology ecosystem focused on AI Security, Cybersecurity, Browser Protection, Scam Detection, Source Verification, Educational Technology, Privacy Protection, and Local AI Systems.
              </p>
            </div>

            {/* Quick jumps navigation lists (Centre) */}
            <div className="md:col-span-4 grid grid-cols-2 gap-8">
              <div className="space-y-3">
                <span className="font-mono text-[9px] text-[#14b8a6] uppercase tracking-widest block">Technologies</span>
                <ul className="text-slate-400 text-xs space-y-2">
                  <li><span className="hover:text-cyan-400 hover:underline cursor-pointer">Sentinel AI Agent</span></li>
                  <li><span className="hover:text-cyan-400 hover:underline cursor-pointer">Sovereign Extension</span></li>
                  <li><span className="hover:text-cyan-400 hover:underline cursor-pointer">Sentinel Shaadi</span></li>
                  <li><span className="hover:text-cyan-400 hover:underline cursor-pointer">Carbon Telemetry</span></li>
                </ul>
              </div>

              <div className="space-y-3">
                <span className="font-mono text-[9px] text-[#14b8a6] uppercase tracking-widest block">Ecosystem</span>
                <ul className="text-slate-400 text-xs space-y-2">
                  <li><span className="hover:text-cyan-400 hover:underline cursor-pointer" onClick={jumpToProductsSection}>Products Vault</span></li>
                  <li><span className="hover:text-cyan-400 hover:underline cursor-pointer" onClick={() => setVaultOpen(true)}>Admin Enclave</span></li>
                  <li><span className="hover:text-cyan-400 hover:underline cursor-pointer" onClick={jumpToDownloadsSection}>Download Binaries</span></li>
                  <li><span className="hover:text-cyan-400 hover:underline cursor-pointer">Public Roadmap</span></li>
                </ul>
              </div>
            </div>

            {/* Global secure host certificate metrics (Right) */}
            <div className="md:col-span-3 space-y-4">
              <span className="font-mono text-[9px] text-slate-500 uppercase tracking-widest block">Security Attestation</span>
              
              <div className="p-4 rounded-xl bg-slate-950 border border-white/5 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span className="font-mono text-[10px] font-bold uppercase tracking-wider">Zero-Leak Certificate</span>
                </div>
                <p className="text-[10.5px] text-slate-500 leading-normal font-sans">
                  The entire EduSentinel ecosystem maintains zero automatic outbound cloud queries, securing absolute endpoint confidentiality.
                </p>
              </div>
            </div>

          </div>

          {/* Copyright signature block */}
          <div className="pt-8 flex flex-col md:flex-row items-center justify-between text-[10px] font-mono text-slate-600 uppercase tracking-widest">
            <p>© 2026 EduSentinel AI Collective • Managed by Ayush Kushwaha</p>
            <p className="mt-2 md:mt-0 flex items-center gap-1.5 text-[9px]">
              Securely compiled for sovereignty & local freedom • Built for Privacy
            </p>
          </div>

        </div>
      </footer>

      {/* Conditional Administrative controller Vault Overlay */}
      <AnimatePresence>
        {vaultOpen && (
          <AdminVault
            onLoginSuccess={handleLoginSuccess}
            onLogout={handleAdminLogout}
            isLoggedIn={isAdminLoggedIn}
            auditLogs={auditLogs}
            products={products}
            onAddNewProduct={handleAddNewProduct}
            onAddNewPost={handleAddNewPost}
            onPurgeAuditLogs={handlePurgeAuditLogs}
            onClose={() => setVaultOpen(false)}
          />
        )}
      </AnimatePresence>

    </div>
  );
}
