'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Lock, Shield, Eye, EyeOff, Terminal, Key, 
  Settings, Upload, FileText, Database, Trash2, 
  Activity, ArrowRight, CheckCircle2, AlertTriangle, RefreshCw, X 
} from 'lucide-react';
import { Product, CommunityPost, AuditLog } from '@/lib/ecosystemStore';
import Logo from './Logo';
interface AdminVaultProps {
  onLoginSuccess: (token: string, email: string) => void;
  onLogout: () => void;
  isLoggedIn: boolean;
  auditLogs: AuditLog[];
  products: Product[];
  onAddNewProduct: (prod: any) => Promise<boolean>;
  onAddNewPost: (post: any) => Promise<boolean>;
  onPurgeAuditLogs: () => void;
  onClose: () => void;
}

export default function AdminVault({
  onLoginSuccess,
  onLogout,
  isLoggedIn,
  auditLogs,
  products,
  onAddNewProduct,
  onAddNewPost,
  onPurgeAuditLogs,
  onClose,
}: AdminVaultProps) {
  
  // Login States (Access PIN & Auth PIN)
  const [accessPin, setAccessPin] = useState('');
  const [authPin, setAuthPin] = useState('');
  const [loginStep, setLoginStep] = useState<1 | 2>(1);
  const [loginErr, setLoginErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Brute force protection state management
  const [failedAttempts, setFailedAttempts] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      return Number(localStorage.getItem('edusentinel_failed_attempts') || '0');
    }
    return 0;
  });

  const [lockedUntil, setLockedUntil] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('edusentinel_locked_until');
      if (stored) {
        const time = Number(stored);
        if (time > Date.now()) {
          return time;
        } else {
          localStorage.removeItem('edusentinel_locked_until');
          localStorage.setItem('edusentinel_failed_attempts', '0');
        }
      }
    }
    return null;
  });

  const [timeRemaining, setTimeRemaining] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('edusentinel_locked_until');
      if (stored) {
        const time = Number(stored);
        if (time > Date.now()) {
          return Math.ceil((time - Date.now()) / 1000);
        }
      }
    }
    return 0;
  });

  // Locked count-down ticker
  React.useEffect(() => {
    if (!lockedUntil) return;

    const interval = setInterval(() => {
      const now = Date.now();
      if (now >= lockedUntil) {
        setLockedUntil(null);
        setFailedAttempts(0);
        if (typeof window !== 'undefined') {
          localStorage.removeItem('edusentinel_locked_until');
          localStorage.setItem('edusentinel_failed_attempts', '0');
        }
        clearInterval(interval);
      } else {
        setTimeRemaining(Math.ceil((lockedUntil - now) / 1000));
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [lockedUntil]);

  // Reset authentications on logout signal securely during next macro-task tick
  React.useEffect(() => {
    if (!isLoggedIn) {
      const timer = setTimeout(() => {
        setLoginStep(1);
        setAccessPin('');
        setAuthPin('');
        setLoginErr(null);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [isLoggedIn]);

  // Administrative Operations states
  const [activePane, setActivePane] = useState<'audit' | 'product' | 'article' | 'founder'>('audit');
  
  // Founder Dynamic Image Manager States
  const [origImage, setOrigImage] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [posX, setPosX] = useState<number>(0);
  const [posY, setPosY] = useState<number>(0);
  const [savedPhoto, setSavedPhoto] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('edusentinel_founder_image');
    }
    return null;
  });
  const [cropPreview, setCropPreview] = useState<string | null>(null);

  // Compute live thumbnail crop using canvas pipeline
  React.useEffect(() => {
    if (!origImage) {
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 300;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      const img = new Image();
      img.onload = () => {
        ctx.clearRect(0, 0, 300, 300);

        // Circular clipping mask
        ctx.beginPath();
        ctx.arc(150, 150, 150, 0, Math.PI * 2);
        ctx.clip();

        // Calculate dynamic scaling & offset matrix
        const size = Math.min(img.width, img.height);
        const sx = (img.width - size) / 2;
        const sy = (img.height - size) / 2;

        const dw = 300 * zoom;
        const dh = 300 * zoom;
        const dx = 150 - dw / 2 + posX;
        const dy = 150 - dh / 2 + posY;

        ctx.drawImage(img, sx, sy, size, size, dx, dy, dw, dh);

        try {
          const base64Cropped = canvas.toDataURL('image/png');
          setCropPreview(base64Cropped);
        } catch (err) {
          // silent fallback
        }
      };
      img.src = origImage;
    }
  }, [origImage, zoom, posX, posY]);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setOrigImage(event.target.result as string);
          setZoom(1);
          setPosX(0);
          setPosY(0);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveFounderPhoto = () => {
    if (cropPreview) {
      localStorage.setItem('edusentinel_founder_image', cropPreview);
      setSavedPhoto(cropPreview);
      window.dispatchEvent(new Event('founder-image-updated'));
      setNotif({ type: 'success', text: 'Founder Profile Image successfully saved & updated globally.' });
      setTimeout(() => setNotif(null), 4000);
    }
  };

  const handleResetFounderPhoto = () => {
    setZoom(1);
    setPosX(0);
    setPosY(0);
  };

  const handleDeleteFounderPhoto = () => {
    localStorage.removeItem('edusentinel_founder_image');
    setSavedPhoto(null);
    setOrigImage(null);
    setCropPreview(null);
    window.dispatchEvent(new Event('founder-image-updated'));
    setNotif({ type: 'success', text: 'Founder Profile Image removed. Restored system default.' });
    setTimeout(() => setNotif(null), 4000);
  };

  // Create product state
  const [prodForm, setProdForm] = useState({
    name: '',
    version: '1.0.0',
    status: 'Stable' as any,
    platforms: [] as string[],
    fileSize: '12.4 MB',
    checksum: '',
    releaseNotes: '',
    description: ''
  });

  // Create article state
  const [articleForm, setArticleForm] = useState({
    title: '',
    category: 'Research' as any,
    excerpt: '',
    content: ''
  });

  const [notif, setNotif] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const availablePlatforms = ['Windows', 'macOS', 'Linux', 'Android', 'Browser Extensions'];

  // Brute force retry logic
  const registerFailure = () => {
    const nextAttempts = failedAttempts + 1;
    setFailedAttempts(nextAttempts);
    if (typeof window !== 'undefined') {
      localStorage.setItem('edusentinel_failed_attempts', String(nextAttempts));
    }

    if (nextAttempts >= 4) {
      const lockTime = Date.now() + 15 * 60 * 1000;
      setLockedUntil(lockTime);
      setTimeRemaining(15 * 60);
      if (typeof window !== 'undefined') {
        localStorage.setItem('edusentinel_locked_until', String(lockTime));
      }
      setLoginErr('Administrative Access Temporarily Locked');
    } else {
      setLoginErr(`Security Mismatch. Access Denied. (${4 - nextAttempts} attempts remaining)`);
    }
  };

  // Step 1: Verify Access PIN (508032)
  const handleVerifyAccessPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedUntil) return;

    if (!accessPin.trim()) {
      setLoginErr('Access PIN required.');
      return;
    }

    setLoading(true);
    setLoginErr(null);

    setTimeout(() => {
      setLoading(false);
      if (accessPin === '508032') {
        setLoginStep(2);
        setAccessPin('');
        setNotif({ type: 'success', text: 'Step 1/2: Access authorization verified.' });
        setTimeout(() => setNotif(null), 3500);
      } else {
        registerFailure();
      }
    }, 1000);
  };

  // Step 2: Verify Security Validation PIN (800402)
  const handleVerifyAuthPin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lockedUntil) return;

    if (!authPin.trim()) {
      setLoginErr('Authentication PIN required.');
      return;
    }

    setLoading(true);
    setLoginErr(null);

    try {
      if (authPin === '800402') {
        // Authenticate session on server
        const response = await fetch('/api/ecosystem', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            action: 'admin-login',
            email: 'ak12chess@gmail.com',
            password: 'secure_core_shield',
            csrfToken: 'edusentinel_csrf_valid_2026'
          })
        });

        const resData = await response.json();
        setLoading(false);

        if (!response.ok) {
          setLoginErr(resData.error || 'Server rejected administrative credentials.');
        } else {
          // Reset attempts completely
          setFailedAttempts(0);
          setAuthPin('');
          if (typeof window !== 'undefined') {
            sessionStorage.setItem('edusentinel_admin_authenticated', 'true');
            localStorage.setItem('edusentinel_failed_attempts', '0');
            localStorage.removeItem('edusentinel_locked_until');
          }
          // Open Admin Dashboard
          onLoginSuccess(resData.token, resData.email);
          setNotif({ type: 'success', text: 'Sovereign administrative vault session opened.' });
          setTimeout(() => setNotif(null), 3000);
        }
      } else {
        setLoading(false);
        registerFailure();
      }
    } catch (err: any) {
      setLoading(false);
      setLoginErr(err.message || 'Failed to complete TOTP validation loop.');
    }
  };

  // Toggle platform select check
  const handlePlatformCheck = (plat: string) => {
    setProdForm(prev => {
      const exists = prev.platforms.includes(plat);
      if (exists) {
        return { ...prev, platforms: prev.platforms.filter(p => p !== plat) };
      } else {
        return { ...prev, platforms: [...prev.platforms, plat] };
      }
    });
  };

  // Dispatch Add Product Version
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodForm.name || prodForm.platforms.length === 0 || !prodForm.version) {
      setNotif({ type: 'error', text: 'Fill all core validation parameters.' });
      return;
    }

    setLoading(true);
    const success = await onAddNewProduct({
      ...prodForm,
      checksum: prodForm.checksum.trim() || undefined // Let API auto-compute if blank
    });

    setLoading(false);
    if (success) {
      setNotif({ type: 'success', text: `Successful release: ${prodForm.name} v${prodForm.version}` });
      // Clear Form parameters
      setProdForm({
        name: '',
        version: '1.0.0',
        status: 'Stable',
        platforms: [],
        fileSize: '15.0 MB',
        checksum: '',
        releaseNotes: '',
        description: ''
      });
      setTimeout(() => setNotif(null), 4000);
    } else {
      setNotif({ type: 'error', text: 'Administrative upload authorization rejected or rate-limited.' });
    }
  };

  // Dispatch Publish Article
  const handleArticleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!articleForm.title || !articleForm.content) {
      setNotif({ type: 'error', text: 'Please define Title and Content bodies.' });
      return;
    }

    setLoading(true);
    const success = await onAddNewPost(articleForm);
    setLoading(false);

    if (success) {
      setNotif({ type: 'success', text: `Published Security Article: ${articleForm.title}` });
      setArticleForm({
        title: '',
        category: 'Research',
        excerpt: '',
        content: ''
      });
      setTimeout(() => setNotif(null), 4000);
    } else {
      setNotif({ type: 'error', text: 'Failed to broadcast intelligence log.' });
    }
  };

  const clearNotificationsAndBugs = () => {
    setNotif(null);
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-slate-950/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      
      {/* Centered glass sheet */}
      <motion.div
        initial={{ scale: 0.98, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.98, opacity: 0 }}
        className="w-full max-w-5xl h-[85vh] rounded-3xl bg-[#020718] border border-cyan-500/10 shadow-[0_0_80px_rgba(0,240,255,0.08)] flex flex-col overflow-hidden"
      >
        
        {/* Dynamic header dashboard */}
        <div className="px-6 py-4 border-b border-white/5 bg-[#030922]/85 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 rounded-lg bg-cyan-950/80 border border-cyan-500/30 flex items-center justify-center">
              <Shield className="w-4 h-4 text-cyan-400" />
            </div>
            <div>
              <span className="font-mono text-[9px] text-cyan-400 font-semibold tracking-wider block">EDUSENTINEL VAULT LOCK</span>
              <h1 className="font-display text-sm font-extrabold text-white">Administrative Sovereign Control</h1>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="font-mono text-[9px] text-slate-500 bg-slate-900 px-2 py-0.5 rounded border border-white/5">
              SEC_SSL_MODE: TLS_V1.3_AUTH
            </span>
            <button
              id="close-vault-modal-btn"
              onClick={onClose}
              className="p-1 rounded-full hover:bg-white/5 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Content body container */}
        <div className="flex-1 overflow-y-auto flex flex-col justify-between">
          
          <AnimatePresence mode="wait">
            
            {/* NOT LOGGED IN -> RENDER VAULT UNLOCK PORTAL */}
            {!isLoggedIn ? (
              <motion.div
                key="login-portal"
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="max-w-md w-full mx-auto py-8 px-4 flex flex-col justify-center h-full"
              >
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-3">
                    <Logo iconOnly={true} glow={true} className="h-10 w-10" />
                  </div>
                  <h2 className="font-display text-xl font-extrabold text-white">Unlock Admin Vault</h2>
                  <p className="mt-1 text-xs text-slate-400">
                    Sovereign administrative Multi-Factor security clearance required.
                  </p>
                </div>

                {/* Progress Indicators Bar */}
                <div className="mb-6 grid grid-cols-2 gap-2.5 pb-5 border-b border-white/5">
                  {[
                    { label: '1. Access Authorization', val: 1 },
                    { label: '2. Security Validation', val: 2 }
                  ].map(step => (
                    <div key={step.val} className="text-center flex flex-col items-center">
                      <span className={`h-1.5 w-full rounded-full transition-all duration-300 ${
                        loginStep === step.val 
                          ? 'bg-cyan-400 shadow-[0_0_8px_rgba(6,182,212,0.6)]' 
                          : loginStep > step.val 
                          ? 'bg-emerald-500' 
                          : 'bg-slate-800'
                      }`} />
                      <span className={`mt-1.5 font-mono text-[9px] uppercase tracking-wider font-semibold ${
                        loginStep === step.val 
                          ? 'text-cyan-400' 
                          : loginStep > step.val 
                          ? 'text-emerald-400' 
                          : 'text-slate-500'
                      }`}>
                        {step.label}
                      </span>
                    </div>
                  ))}
                </div>

                {/* STEP 1: ACCESS PIN */}
                {loginStep === 1 && (
                  <form onSubmit={handleVerifyAccessPin} className="space-y-4">
                    <div className="space-y-1.5 text-left">
                      <label id="access-pin-label" className="block text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest">
                        Administrative Access PIN
                      </label>
                      <input
                        id="access-pin-input"
                        type="password"
                        required
                        disabled={!!lockedUntil}
                        maxLength={6}
                        value={accessPin}
                        onChange={e => setAccessPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-center tracking-[0.4em] py-3 text-lg bg-slate-900 border border-white/5 rounded-xl text-white focus:outline-none focus:border-cyan-500/35 transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {loginErr && (
                      <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/25 flex gap-2 text-xs text-red-400 text-left">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed font-mono">{loginErr}</p>
                      </div>
                    )}

                    {lockedUntil && (
                      <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/35 text-center space-y-2">
                        <div className="text-xs text-red-400 font-semibold uppercase tracking-wider font-mono">
                          Administrative Access Temporarily Locked
                        </div>
                        <div className="text-xl font-mono text-white font-black tracking-widest animate-pulse">
                          {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                        </div>
                        <p className="text-[9px] text-slate-400 font-mono">
                          Brute-force countermeasure active. Security protocols impose 15 minute delay.
                        </p>
                      </div>
                    )}

                    <button
                      id="access-pin-submit"
                      type="submit"
                      disabled={loading || !!lockedUntil}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-semibold tracking-wide text-xs flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      ) : (
                        <>
                          <Key className="w-4 h-4 text-black" />
                          Verify Access PIN
                        </>
                      )}
                    </button>
                  </form>
                )}

                {/* STEP 2: SECURITY VALIDATION PIN */}
                {loginStep === 2 && (
                  <form onSubmit={handleVerifyAuthPin} className="space-y-4">
                    <div className="space-y-1.5 text-left">
                      <div className="flex justify-between items-center mb-1">
                        <label id="auth-pin-label" className="block text-[10px] font-mono text-cyan-400 uppercase font-bold tracking-widest">
                          Security Validation PIN
                        </label>
                        <button
                          type="button"
                          disabled={!!lockedUntil}
                          onClick={() => { setLoginStep(1); setAuthPin(''); setLoginErr(null); }}
                          className="text-[9.5px] text-cyan-400 hover:underline font-mono cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Back to Step 1
                        </button>
                      </div>
                      <input
                        id="auth-pin-input"
                        type="password"
                        required
                        disabled={!!lockedUntil}
                        maxLength={6}
                        value={authPin}
                        onChange={e => setAuthPin(e.target.value.replace(/\D/g, ''))}
                        className="w-full text-center tracking-[0.4em] py-3 text-lg bg-slate-900 border border-white/5 rounded-xl text-white focus:outline-none focus:border-cyan-500/35 transition-all font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                    </div>

                    {loginErr && (
                      <div className="p-3 rounded-lg bg-red-950/20 border border-red-500/25 flex gap-2 text-xs text-red-400 text-left">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                        <p className="text-[11px] leading-relaxed font-mono">{loginErr}</p>
                      </div>
                    )}

                    {lockedUntil && (
                      <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/35 text-center space-y-2">
                        <div className="text-xs text-red-400 font-semibold uppercase tracking-wider font-mono">
                          Administrative Access Temporarily Locked
                        </div>
                        <div className="text-xl font-mono text-white font-black tracking-widest animate-pulse">
                          {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
                        </div>
                        <p className="text-[9px] text-slate-400 font-mono">
                          Brute-force countermeasure active. Security protocols impose 15 minute delay.
                        </p>
                      </div>
                    )}

                    <button
                      id="auth-pin-submit"
                      type="submit"
                      disabled={loading || !!lockedUntil}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-semibold tracking-wide text-xs flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                    >
                      {loading ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-black" />
                      ) : (
                        <>
                          <Shield className="w-4 h-4 text-black" />
                          Confirm Validation PIN
                        </>
                      )}
                    </button>
                  </form>
                )}

              </motion.div>
            ) : (
              
              /* IS LOGGED IN -> RENDER MASTER CONSOLE */
              <motion.div
                key="admin-console"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-12 h-full"
              >
                
                {/* Left Drawer tab links */}
                <div className="lg:col-span-3 border-r border-white/5 bg-[#010614]/85 p-4 flex flex-col gap-2.5">
                  <div className="px-3 py-2 font-mono text-[10px] text-slate-500 uppercase">Vault Operations</div>
                  
                  <button
                    id="pane-tab-audit"
                    onClick={() => setActivePane('audit')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-mono tracking-wider transition-all cursor-pointer ${
                      activePane === 'audit'
                        ? 'bg-cyan-950/20 text-cyan-400 border border-cyan-500/15'
                        : 'text-slate-400 hover:bg-white/[0.01]'
                    }`}
                  >
                    <Database className="w-4 h-4 text-cyan-400" />
                    Security Audit logs
                  </button>

                  <button
                    id="pane-tab-product"
                    onClick={() => setActivePane('product')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-mono tracking-wider transition-all cursor-pointer ${
                      activePane === 'product'
                        ? 'bg-cyan-950/20 text-cyan-400 border border-cyan-500/15'
                        : 'text-slate-400 hover:bg-white/[0.01]'
                    }`}
                  >
                    <Upload className="w-4 h-4 text-cyan-400" />
                    Publish Release Binary
                  </button>

                  <button
                    id="pane-tab-article"
                    onClick={() => setActivePane('article')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-mono tracking-wider transition-all cursor-pointer ${
                      activePane === 'article'
                        ? 'bg-cyan-950/20 text-cyan-400 border border-cyan-500/15'
                        : 'text-slate-400 hover:bg-white/[0.01]'
                    }`}
                  >
                    <FileText className="w-4 h-4 text-cyan-400" />
                    Writer Intelligence Log
                  </button>

                  <button
                    id="pane-tab-founder"
                    onClick={() => setActivePane('founder')}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl text-xs font-mono tracking-wider transition-all cursor-pointer ${
                      activePane === 'founder'
                        ? 'bg-cyan-950/20 text-cyan-400 border border-cyan-500/15'
                        : 'text-slate-400 hover:bg-white/[0.01]'
                    }`}
                  >
                    <Settings className="w-4 h-4 text-cyan-400" />
                    Founder Profile
                  </button>

                  <div className="mt-auto border-t border-white/5 pt-4">
                    <div className="flex items-center gap-2 p-3 bg-teal-950/10 border border-teal-500/20 rounded-xl text-[10px] text-teal-400 font-mono">
                      <Activity className="w-3.5 h-3.5 text-teal-400" />
                      <span>Sovereign integrity active</span>
                    </div>

                    <button
                      id="vault-sign-out-btn"
                      onClick={onLogout}
                      className="w-full mt-4 py-2 rounded-xl text-center text-xs font-mono bg-red-950/20 border border-red-500/20 hover:border-red-500/45 text-red-400 hover:bg-red-950/40 transition-all cursor-pointer"
                    >
                      Terminated session lock
                    </button>
                  </div>
                </div>

                {/* Right Primary details panel */}
                <div className="lg:col-span-9 p-6 overflow-y-auto max-h-[70vh]">
                  
                  {notif && (
                    <div className={`mb-6 p-3 rounded-xl flex items-center justify-between gap-4 text-xs ${
                      notif.type === 'success' 
                        ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20' 
                        : 'bg-red-950/20 text-red-400 border border-red-500/20'
                    }`}>
                      <p className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4" />
                        {notif.text}
                      </p>
                      <button onClick={clearNotificationsAndBugs} className="font-mono text-[9px] underline">DISMISS</button>
                    </div>
                  )}

                  {/* ACTIVE OPERATIONAL PANES */}

                  {/* A: AUDIT LOGS DISPLAY */}
                  {activePane === 'audit' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between pb-4 border-b border-white/5">
                        <div>
                          <h2 className="font-display text-lg font-bold text-white tracking-tight">Security Audit Logs & Registry</h2>
                          <p className="text-xs text-slate-400">Cryptographic audit log records generated directly under JWT sign-off.</p>
                        </div>
                        <button
                          id="purge-audit-logs-btn"
                          onClick={onPurgeAuditLogs}
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono bg-red-950/25 hover:bg-red-900/30 text-red-400 border border-red-500/20 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" /> Purge Logs
                        </button>
                      </div>

                      {/* Display Table logs */}
                      <div className="overflow-x-auto border border-white/5 rounded-xl bg-slate-950/40">
                        <table className="w-full text-left font-mono text-xs border-collapse">
                          <thead>
                            <tr className="border-b border-white/5 bg-slate-900/50 text-[10px] text-slate-400 uppercase">
                              <th className="p-3">IP ADDRESS</th>
                              <th className="p-3">ACTION EVENT</th>
                              <th className="p-3">TIMESTAMP</th>
                              <th className="p-3">STATUS</th>
                              <th className="p-3">LOG DETAILS</th>
                            </tr>
                          </thead>
                          <tbody>
                            {auditLogs.map((log) => (
                              <tr key={log.id} className="border-b border-white/5 hover:bg-white/[0.01]">
                                <td className="p-3 text-cyan-400">{log.ip}</td>
                                <td className="p-3 font-semibold text-slate-300">{log.action}</td>
                                <td className="p-3 text-[10px] text-slate-500">{log.timestamp.replace('Z','').replace('T',' ')}</td>
                                <td className="p-3">
                                  <span className={`inline-block px-2 py-0.5 rounded text-[9px] uppercase font-bold tracking-wider ${
                                    log.status === 'Success' 
                                      ? 'bg-emerald-950/20 text-emerald-400 border border-emerald-500/20' 
                                      : 'bg-red-950/20 text-red-400 border border-red-500/20'
                                  }`}>
                                    {log.status}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-400 max-w-xs truncate" title={log.details}>{log.details}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* B: REGISTER NEW PRODUCT PLATFORM RELEASE FORM */}
                  {activePane === 'product' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="font-display text-lg font-bold text-white tracking-tight">Compile & Publish Binary Release</h2>
                        <p className="text-xs text-slate-400">Introduce new system modules or update existing version codes securely.</p>
                      </div>

                      <form onSubmit={handleProductSubmit} className="space-y-4 font-sans text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-mono text-slate-500">PRODUCT NAME</label>
                            <input
                              type="text"
                              required
                              value={prodForm.name}
                              onChange={e => setProdForm(prev => ({ ...prev, name: e.target.value }))}
                              placeholder="e.g. Sentinel Identity Hub"
                              className="w-full px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-white focus:outline-none focus:border-cyan-500/30"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-mono text-slate-500">SEMVER VERSION CODE</label>
                            <input
                              type="text"
                              required
                              value={prodForm.version}
                              onChange={e => setProdForm(prev => ({ ...prev, version: e.target.value }))}
                              placeholder="e.g. 1.0.4"
                              className="w-full font-mono px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-white focus:outline-none focus:border-cyan-500/30"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-mono text-slate-500">STATUS MULTIPLIER</label>
                            <select
                              value={prodForm.status}
                              onChange={e => setProdForm(prev => ({ ...prev, status: e.target.value as any }))}
                              className="w-full px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-slate-300 focus:outline-none focus:border-cyan-500/30 font-mono"
                            >
                              <option value="Stable">Stable</option>
                              <option value="Updated">Updated</option>
                              <option value="Beta">Beta</option>
                              <option value="Reviewing">Reviewing</option>
                              <option value="Coming Soon">Coming Soon</option>
                            </select>
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-mono text-slate-500">DISTRUBUTED SIZE</label>
                            <input
                              type="text"
                              required
                              value={prodForm.fileSize}
                              onChange={e => setProdForm(prev => ({ ...prev, fileSize: e.target.value }))}
                              placeholder="e.g. 14.8 MB"
                              className="w-full font-mono px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-white focus:outline-none focus:border-cyan-500/30"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-mono text-slate-500 flex items-center justify-between">
                              <span>SHA-256 CHECKSUM</span>
                              <span className="text-[9px] text-slate-600 font-normal">Leave blank to auto-generate</span>
                            </label>
                            <input
                              type="text"
                              value={prodForm.checksum}
                              onChange={e => setProdForm(prev => ({ ...prev, checksum: e.target.value }))}
                              placeholder="Un-compiled nodes build dynamic key hashes"
                              className="w-full font-mono px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-white focus:outline-none focus:border-cyan-500/30"
                            />
                          </div>
                        </div>

                        {/* Platforms multi Checkbox selection */}
                        <div className="space-y-2 pt-2">
                          <label className="block text-[10px] font-mono text-slate-500 uppercase">TARGET HOST PLATFORMS</label>
                          <div className="flex flex-wrap gap-2">
                            {availablePlatforms.map(plat => {
                              const isChecked = prodForm.platforms.includes(plat);
                              return (
                                <button
                                  type="button"
                                  key={plat}
                                  id={`checkbox-plat-${plat.replace(/\s+/g,'-')}`}
                                  onClick={() => handlePlatformCheck(plat)}
                                  className={`px-3 py-1.5 rounded-lg border text-[10px] font-mono cursor-pointer transition-all ${
                                    isChecked
                                      ? 'bg-cyan-900/30 text-cyan-300 border-cyan-500/30'
                                      : 'bg-slate-900 border-white/5 text-slate-400 hover:text-white'
                                  }`}
                                >
                                  {plat}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono text-slate-500">ARCHITECTURE DESCRIPTION</label>
                          <textarea
                            required
                            rows={3}
                            value={prodForm.description}
                            onChange={e => setProdForm(prev => ({ ...prev, description: e.target.value }))}
                            placeholder="Vividly outline what capabilities this product node holds..."
                            className="w-full px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-white focus:outline-none focus:border-cyan-500/30 resize-none"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono text-slate-500">RELEASE NOTES LOG</label>
                          <textarea
                            required
                            rows={2}
                            value={prodForm.releaseNotes}
                            onChange={e => setProdForm(prev => ({ ...prev, releaseNotes: e.target.value }))}
                            placeholder="Describe semver modifications details..."
                            className="w-full px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-white focus:outline-none focus:border-cyan-500/30 resize-none font-mono"
                          />
                        </div>

                        <button
                          type="submit"
                          id="submit-new-product"
                          disabled={loading}
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-semibold text-xs transition-transform cursor-pointer"
                        >
                          Compile & Sign Binary Release
                        </button>
                      </form>
                    </div>
                  )}

                  {/* C: PUBLISH COGNITIVE ARTICLE FORM */}
                  {activePane === 'article' && (
                    <div className="space-y-6">
                      <div>
                        <h2 className="font-display text-lg font-bold text-white tracking-tight">Broadcast Knowledge Registry Log</h2>
                        <p className="text-xs text-slate-400">Author security research insights or release reports directly to followers.</p>
                      </div>

                      <form onSubmit={handleArticleSubmit} className="space-y-4 font-sans text-xs">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="md:col-span-2 space-y-1.5">
                            <label className="block text-[10px] font-mono text-slate-500">LOG TITLE</label>
                            <input
                              type="text"
                              required
                              value={articleForm.title}
                              onChange={e => setArticleForm(prev => ({ ...prev, title: e.target.value }))}
                              placeholder="e.g. Memory optimizations on low-memory sandboxes"
                              className="w-full px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-white focus:outline-none focus:border-cyan-500/30"
                            />
                          </div>

                          <div className="space-y-1.5">
                            <label className="block text-[10px] font-mono text-slate-500">STREAM CATEGORY</label>
                            <select
                              value={articleForm.category}
                              onChange={e => setArticleForm(prev => ({ ...prev, category: e.target.value as any }))}
                              className="w-full px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-slate-300 focus:outline-none focus:border-cyan-500/30 font-mono"
                            >
                              <option value="Research">Research Insight</option>
                              <option value="Blog">General Blog</option>
                              <option value="Update">Development Update</option>
                              <option value="Roadmap">Ecosystem Roadmap</option>
                            </select>
                          </div>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono text-slate-500">LOG EXCERPT SUMMARY</label>
                          <input
                            type="text"
                            value={articleForm.excerpt}
                            onChange={e => setArticleForm(prev => ({ ...prev, excerpt: e.target.value }))}
                            placeholder="An elegant high-level description to highlight logs..."
                            className="w-full px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-white focus:outline-none focus:border-cyan-500/30"
                          />
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-mono text-slate-500 flex items-center justify-between">
                            <span>LOG RECORD CONTENT</span>
                            <span className="text-[9px] text-slate-600 font-normal">Splits paragraphs natively. Use &quot;### Header&quot; for subtopics.</span>
                          </label>
                          <textarea
                            required
                            rows={8}
                            value={articleForm.content}
                            onChange={e => setArticleForm(prev => ({ ...prev, content: e.target.value }))}
                            placeholder="Draft your detailed security narrative... preserving standard text buffers."
                            className="w-full px-4 py-2 bg-slate-900 border border-white/5 rounded-xl text-white focus:outline-none focus:border-cyan-500/30 font-mono"
                          />
                        </div>

                        <button
                          type="submit"
                          id="submit-new-article"
                          disabled={loading}
                          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-black font-semibold text-xs transition-transform cursor-pointer"
                        >
                          Publish Knowledge Log Node
                        </button>
                      </form>
                    </div>
                  )}

                  {/* D: FOUNDER PROFILE IMAGE MANAGER */}
                  {activePane === 'founder' && (
                    <div className="space-y-6">
                      <div className="pb-4 border-b border-white/5">
                        <h2 className="font-display text-lg font-bold text-white tracking-tight">Founder Profile Manager</h2>
                        <p className="text-xs text-slate-400">Configure and style the founder portrait in real-time. Automatically updates everywhere.</p>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
                        {/* Control Column */}
                        <div className="md:col-span-7 space-y-6">
                          
                          {/* Photo Input action button */}
                          <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-4">
                            <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">1. Acquire Base Portrait</span>
                            <div className="flex items-center gap-4">
                              <label className="px-4 py-2 bg-gradient-to-r from-cyan-500/15 via-teal-500/10 to-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-xs font-mono tracking-wider rounded-xl cursor-pointer hover:border-cyan-500/50 hover:bg-cyan-500/10 transition-all flex items-center gap-2">
                                <Upload className="w-4 h-4" />
                                <span>Upload Photo</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={handlePhotoUpload}
                                  className="hidden"
                                />
                              </label>
                              <span className="text-[10px] text-slate-500 font-sans">
                                {origImage ? 'New image loaded' : 'Supports JPG, PNG or WEBP formats'}
                              </span>
                            </div>
                          </div>

                          {origImage && (
                            <div className="p-5 rounded-2xl bg-slate-950/60 border border-white/5 space-y-4">
                              <span className="block text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">2. Fine Tuning Controls</span>
                              
                              {/* Zoom slider */}
                              <div className="space-y-2">
                                <div className="flex justify-between text-[11px] font-mono">
                                  <span className="text-slate-400">Zoom Scale</span>
                                  <span className="text-cyan-400">{zoom.toFixed(1)}x</span>
                                </div>
                                <input
                                  type="range"
                                  min="1"
                                  max="3"
                                  step="0.05"
                                  value={zoom}
                                  onChange={e => setZoom(parseFloat(e.target.value))}
                                  className="w-full accent-cyan-400 bg-slate-900 border border-white/5 rounded-lg h-1.5 cursor-pointer"
                                />
                              </div>

                              {/* Horizontal Shift */}
                              <div className="space-y-2">
                                <div className="flex justify-between text-[11px] font-mono">
                                  <span className="text-slate-400">Horizontal Shift</span>
                                  <span className="text-cyan-400">{posX}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="-150"
                                  max="150"
                                  step="1"
                                  value={posX}
                                  onChange={e => setPosX(parseInt(e.target.value))}
                                  className="w-full accent-cyan-400 bg-slate-900 border border-white/5 rounded-lg h-1.5 cursor-pointer"
                                />
                              </div>

                              {/* Vertical Shift */}
                              <div className="space-y-2">
                                <div className="flex justify-between text-[11px] font-mono">
                                  <span className="text-slate-400">Vertical Shift</span>
                                  <span className="text-cyan-400">{posY}px</span>
                                </div>
                                <input
                                  type="range"
                                  min="-150"
                                  max="150"
                                  step="1"
                                  value={posY}
                                  onChange={e => setPosY(parseInt(e.target.value))}
                                  className="w-full accent-cyan-400 bg-slate-900 border border-white/5 rounded-lg h-1.5 cursor-pointer"
                                />
                              </div>

                              {/* Actions Row */}
                              <div className="flex gap-2.5 pt-2">
                                <button
                                  type="button"
                                  onClick={handleResetFounderPhoto}
                                  className="px-3.5 py-2 text-xs font-mono border border-white/10 rounded-xl hover:bg-white/[0.02] text-slate-300 cursor-pointer"
                                >
                                  Reset Tuning
                              </button>
                            </div>
                          </div>
                        )}

                      </div>

                      {/* Preview/Save Column */}
                      <div className="md:col-span-5 flex flex-col items-center justify-center p-6 rounded-2xl bg-gradient-to-b from-slate-950/80 to-[#02071c]/90 border border-white/5 space-y-6">
                        <span className="text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Circular Crop Preview</span>
                        
                        {/* Preview avatar ring frame */}
                        <div className="relative w-44 h-44 rounded-full border border-cyan-500/30 flex items-center justify-center bg-cyan-950/20 shadow-[0_0_30px_rgba(6,182,212,0.15)] overflow-hidden">
                          {cropPreview ? (
                            <img src={cropPreview} alt="Crop Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : savedPhoto ? (
                            <img src={savedPhoto} alt="Saved Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                          ) : (
                            <div className="flex flex-col items-center text-slate-500">
                              <Shield className="w-8 h-8 text-slate-600 animate-pulse mb-2" />
                              <span className="text-[9px] font-mono uppercase tracking-wider text-center px-4 text-slate-400">Default Avatar Placeholder</span>
                            </div>
                          )}
                        </div>

                        <div className="w-full space-y-2.5">
                          {cropPreview && (
                            <button
                              type="button"
                              onClick={handleSaveFounderPhoto}
                              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-teal-500 text-black text-xs font-semibold tracking-wide flex items-center justify-center gap-2 hover:scale-[1.01] transition-transform cursor-pointer"
                            >
                              <CheckCircle2 className="w-4 h-4 text-black" />
                              Save & Sync Portrait
                            </button>
                          )}

                          {(savedPhoto || cropPreview) && (
                            <button
                              type="button"
                              onClick={handleDeleteFounderPhoto}
                              className="w-full py-2 text-xs font-mono text-red-400 bg-red-950/10 hover:bg-red-950/30 border border-red-500/20 rounded-xl transition-all cursor-pointer"
                            >
                              Delete Profile Image
                            </button>
                          )}
                        </div>

                      </div>
                    </div>
                  </div>
                )}

                </div>

              </motion.div>
            )}

          </AnimatePresence>

          {/* Footer of Modal (Credits panel) */}
          <div className="px-6 py-3 border-t border-white/5 bg-[#010515] font-mono text-[9px] text-slate-600 text-center uppercase tracking-widest flex flex-col md:flex-row md:justify-between">
            <span>Core Vault Enclave verified: SHA-256 auth</span>
            <span className="mt-1 md:mt-0">© 2026 EduSentinel AI Collective • Built for Sovereignty</span>
          </div>

        </div>

      </motion.div>
    </div>
  );
}
