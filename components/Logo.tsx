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
        
        {/* Main Brand SVG Container */}
        <svg
          className="relative w-10 h-10 transform group-hover:scale-105 transition-transform duration-300"
          viewBox="0 0 100 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Subtle drop shadow filter for premium 3D depth */}
          <defs>
            <filter id="esLogoShadow" x="-10%" y="-10%" width="130%" height="130%">
              <feDropShadow dx="1" dy="2" stdDeviation="1.5" floodColor="#010616" floodOpacity="0.8" />
            </filter>
            
            <linearGradient id="esWhiteGrad" x1="18" y1="15" x2="45" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#FFFFFF" />
              <stop offset="100%" stopColor="#E2E8F0" />
            </linearGradient>
            
            <linearGradient id="esCyanGrad" x1="55" y1="15" x2="82" y2="85" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#00f6ff" />
              <stop offset="40%" stopColor="#00cbd8" />
              <stop offset="100%" stopColor="#007299" />
            </linearGradient>
          </defs>

          {/* Symmetrical Outer Hexagonal Branding "E" and "S" */}
          <g filter="url(#esLogoShadow)">
            {/* E character (Left Side - White/Slate gradient with shadow accent) */}
            <path
              d="M45,15 L18,31 L18,69 L45,85 L45,71 L31,63 L31,56 L45,48 L45,43 L31,35 L31,28 L45,20 Z"
              fill="url(#esWhiteGrad)"
              stroke="#010616"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />

            {/* S character (Right Side - Vibrant Cyan/Teal gradient) */}
            <path
              d="M55,15 L82,31 L82,43 L69,51 L69,58 L82,66 L82,69 L55,85 L55,80 L69,72 L69,65 L55,57 L55,52 L69,44 L69,37 L55,29 Z"
              fill="url(#esCyanGrad)"
              stroke="#010616"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
          </g>
        </svg>
      </div>

      {/* Brand Text Lockup */}
      {!iconOnly && (
        <div className="flex flex-col items-start leading-none">
          <span className="font-display text-lg font-bold tracking-wide uppercase bg-clip-text text-transparent bg-gradient-to-r from-white via-cyan-100 to-cyan-400">
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
