'use client';

import React, { useEffect, useRef } from 'react';

export default function MouseGlow() {
  const glowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    const handleMouseMove = (e: MouseEvent) => {
      // Direct DOM manipulation for 120fps hardware-accelerated rendering
      glow.style.transform = `translate3d(${e.clientX - 200}px, ${e.clientY - 200}px, 0)`;
      glow.style.opacity = '1';
    };

    const handleMouseLeave = () => {
      glow.style.opacity = '0';
    };

    window.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);
    
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="pointer-events-none fixed top-0 left-0 z-30 h-[400px] w-[400px] rounded-full bg-gradient-to-r from-cyan-500/[0.04] to-teal-500/[0.04] blur-[120px] opacity-0 transition-opacity duration-500 pointer-events-none"
      style={{
        willChange: 'transform',
      }}
    />
  );
}
