'use client';

import React, { useState, useEffect } from 'react';
import { Menu, X, Sun, Moon, Lock, Shield, Cpu, Terminal, Download, ArrowRight, User } from 'lucide-react';
import Logo from './Logo';

interface NavbarProps {
  theme: 'dark' | 'light';
  toggleTheme: () => void;
  onAdminClick: () => void;
  isAdminLoggedIn: boolean;
  onAdminLogout: () => void;
}

export default function Navbar({
  theme,
  toggleTheme,
  onAdminClick,
  isAdminLoggedIn,
  onAdminLogout,
}: NavbarProps) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('hero');

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 40);
      
      // Determine active target scroll element
      const sections = ['hero', 'products', 'founder', 'roadmap', 'downloads'];
      const scrollPosition = window.scrollY + 180;

      for (const section of sections) {
        const el = document.getElementById(section);
        if (el) {
          const top = el.offsetTop;
          const height = el.offsetHeight;
          if (scrollPosition >= top && scrollPosition < top + height) {
            setActiveSection(section);
            break;
          }
        }
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleNavClick = (sectionId: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(sectionId);
    if (element) {
      const topOffset = 90;
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.pageYOffset - topOffset;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  };

  const menuItems = [
    { label: 'Ecosystem', id: 'products', icon: Cpu },
    { label: 'Philosophy', id: 'founder', icon: User },
    { label: 'Intelligence Logs', id: 'roadmap', icon: Terminal },
    { label: 'Download Center', id: 'downloads', icon: Download },
  ];

  return (
    <nav
      id="main-nav"
      className={`fixed top-0 left-0 w-full z-50 transition-all duration-300 ${
        scrolled
          ? 'py-3 bg-slate-950/45 dark:bg-slate-950/50 backdrop-blur-2xl border-b border-white/[0.04] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.7)]'
          : 'py-5 bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between">
          
          {/* Logo Brand Lockup & Live Ecosystem Status */}
          <div className="flex items-center gap-4">
            <div 
              className="cursor-pointer" 
              onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            >
              <Logo glow={!scrolled} />
            </div>

            {/* Vertical Divider */}
            <div className="hidden lg:block h-6 w-px bg-white/10" />

            {/* Minimal Live Status Indicator */}
            <div className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/60 border border-emerald-500/15 text-emerald-400 font-mono text-[9px] uppercase tracking-wider shadow-[0_0_12px_rgba(16,185,129,0.06)] backdrop-blur-md">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              <span className="font-semibold text-emerald-400/90">Ecosystem: OPERATIONAL</span>
              <span className="text-slate-600 font-normal">|</span>
              <span className="text-slate-300 font-semibold">Threat Shield: ACTIVE</span>
              <span className="text-slate-600 font-normal">|</span>
              <span className="text-slate-300 font-semibold">Local AI: ONLINE</span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <div className="hidden md:flex items-center gap-1 rounded-full bg-slate-950/60 border border-white/[0.05] backdrop-blur-md px-2 py-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  id={`nav-btn-${item.id}`}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all duration-300 ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/15 via-teal-500/10 to-cyan-500/15 text-cyan-200 border border-cyan-500/25 shadow-[0_0_15px_rgba(0,240,255,0.12)] saturate-125'
                      : 'text-slate-400 hover:text-white border border-transparent hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5 opacity-80" />
                  {item.label}
                </button>
              );
            })}
          </div>

          {/* Action Buttons: Administrative Lock & Theme core switcher */}
          <div className="hidden md:flex items-center gap-3">
            {/* Theme switcher */}
            <button
              id="theme-toggler"
              onClick={toggleTheme}
              className="p-2 translate-y-[2px] rounded-full border border-white/5 bg-slate-900/60 text-slate-400 hover:text-cyan-400 hover:border-cyan-500/20 cursor-pointer transition-colors duration-200"
              title={theme === 'dark' ? 'Toggle light mode' : 'Toggle cinematic dark mode'}
            >
              {theme === 'dark' ? (
                <Sun className="w-4 h-4 text-cyan-400 animate-pulse-glow" />
              ) : (
                <Moon className="w-4 h-4 text-slate-700" />
              )}
            </button>

            {/* Premium Admin Authentication Access lock */}
            {isAdminLoggedIn ? (
              <div className="flex items-center gap-2">
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
                <button
                  id="admin-logout-btn"
                  onClick={onAdminLogout}
                  className="px-3 py-1.5 rounded-lg text-xs font-mono bg-red-950/20 hover:bg-red-900/30 text-red-400 border border-red-500/30 transition-all cursor-pointer"
                >
                  Secured Exit
                </button>
                <button
                  id="admin-portal-dashboard-btn"
                  onClick={onAdminClick}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-mono bg-cyan-950/20 hover:bg-cyan-900/30 text-cyan-400 border border-cyan-500/30 transition-all cursor-pointer animate-pulse"
                >
                  <Shield className="w-3.5 h-3.5 text-cyan-400" />
                  Management
                </button>
              </div>
            ) : (
              <button
                id="vault-access-lock-btn"
                onClick={onAdminClick}
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-mono tracking-wider bg-slate-900/80 hover:bg-slate-800 text-slate-300 hover:text-cyan-400 border border-white/10 hover:border-cyan-500/30 shadow-inner group/btn transition-all duration-300 cursor-pointer"
              >
                <Lock className="w-3 h-3 text-cyan-400/80 group-hover/btn:scale-110 transition-transform" />
                <span>Admin Vault</span>
                <ArrowRight className="w-3 h-3 opacity-0 -translate-x-1 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all duration-300" />
              </button>
            )}
          </div>

          {/* Mobile Menu Icon Toggle */}
          <div className="flex md:hidden items-center gap-3">
            <button
              onClick={toggleTheme}
              className="p-1.5 rounded-full border border-white/5 bg-slate-900/40 text-slate-400 hover:text-cyan-400"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4 text-cyan-400" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 rounded-lg border border-white/5 bg-slate-900/45 text-slate-400 hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 w-full glass-panel-dark border-b border-white/10 py-6 px-4 flex flex-col gap-4 animate-in fade-in slide-in-from-top-3 duration-200">
          <div className="flex flex-col gap-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeSection === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavClick(item.id)}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium ${
                    isActive
                      ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20 text-cyan-300 border border-cyan-500/30'
                      : 'text-slate-300 hover:bg-white/5'
                  }`}
                >
                  <Icon className="w-4 h-4 text-cyan-400" />
                  {item.label}
                </button>
              );
            })}
          </div>

          <div className="border-t border-white/5 pt-4 flex flex-col gap-2">
            {isAdminLoggedIn ? (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onAdminClick();
                  }}
                  className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-center text-xs font-mono bg-cyan-900/30 text-cyan-300 border border-cyan-500/30"
                >
                  <Shield className="w-4 h-4 text-cyan-400" />
                  Management Console
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onAdminLogout();
                  }}
                  className="w-full py-2.5 rounded-xl text-center text-xs font-mono bg-red-950/20 text-red-400 border border-red-500/30"
                >
                  Secure Vault Exit
                </button>
              </>
            ) : (
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  onAdminClick();
                }}
                className="flex items-center justify-center gap-2 w-full py-2.5 rounded-xl text-sm font-mono bg-slate-900 border border-white/10 text-slate-300 hover:text-cyan-400"
              >
                <Lock className="w-3.5 h-3.5 text-cyan-400" />
                Access Admin Vault
              </button>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
