import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  glow?: boolean;
}

export default function Logo({ className = '', iconOnly = false, glow = true }: LogoProps) {
  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      {/* Visual Icon Mark */}
      <div className="relative group flex-shrink-0">
        {/* Soft atmospheric background aura */}
        {glow && (
          <div className="absolute -inset-1.5 bg-gradient-to-r from-cyan-500 to-teal-500 rounded-xl blur-md opacity-40 group-hover:opacity-75 transition-opacity duration-500" />
        )}

        {/* ─── CHANGED: replaced inline <svg> with <img> referencing EduSentinel SVG ─── */}
        <img
          src="/edusentinel-logo.svg"
          alt="EduSentinel"
          className="relative w-10 h-10 object-contain transform group-hover:scale-105 transition-transform duration-300"
        />
        {/* ─────────────────────────────────────────────────────────────────────────── */}
      </div>

      {/* Brand Text Lockup */}
      {!iconOnly && (
        <div className="flex flex-col items-start leading-none">
          <span className="font-display text-lg font-bold tracking-wide bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-cyan-400">
            EduSentinel <span className="text-cyan-400 font-extrabold text-glow-cyan">AI</span>
          </span>
          <span className="font-mono text-[9px] text-cyan-400/70 tracking-widest uppercase mt-0.5 font-medium">
            Unified Ecosystem
          </span>
        </div>
      )}
    </div>
  );
}