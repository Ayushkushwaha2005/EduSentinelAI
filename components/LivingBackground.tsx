'use client';

import React, { useEffect, useRef } from 'react';

interface LivingBackgroundProps {
  theme: 'dark' | 'light';
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  pulseSpeed: number;
  pulsePhase: number;
}

interface EnergyWave {
  amplitude: number;
  wavelength: number;
  speed: number;
  yOffset: number;
  color: string;
  lineWidth: number;
  phase: number;
}

export default function LivingBackground({ theme }: LivingBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: 0, y: 0, active: false });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    // Initialize premium energy particles
    const particles: Particle[] = [];
    const numParticles = 45;
    const isDark = theme === 'dark';

    const getThemeColors = () => {
      if (theme === 'dark') {
        return [
          { r: 0, g: 240, b: 255 }, // Electric Cyan
          { r: 20, g: 184, b: 166 }, // Soft Teal
          { r: 255, g: 255, b: 255 }, // White
        ];
      } else {
        return [
          { r: 6, g: 182, b: 212 }, // Cyan 500
          { r: 13, g: 148, b: 136 }, // Teal 600
          { r: 59, g: 130, b: 246 }, // Blue 500
        ];
      }
    };

    const colors = getThemeColors();

    const createParticle = (): Particle => {
      const colorObj = colors[Math.floor(Math.random() * colors.length)];
      return {
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        size: Math.random() * 2.8 + 1,
        color: `rgb(${colorObj.r}, ${colorObj.g}, ${colorObj.b})`,
        alpha: Math.random() * 0.4 + 0.15,
        pulseSpeed: Math.random() * 0.02 + 0.005,
        pulsePhase: Math.random() * Math.PI,
      };
    };

    for (let i = 0; i < numParticles; i++) {
      particles.push(createParticle());
    }

    // Config energy sine waves flowing across background
    const waves: EnergyWave[] = [
      {
        amplitude: 25,
        wavelength: 0.002,
        speed: 0.0015,
        yOffset: height * 0.3,
        color: isDark ? 'rgba(0, 240, 255, 0.03)' : 'rgba(6, 182, 212, 0.04)',
        lineWidth: 1.5,
        phase: 0,
      },
      {
        amplitude: 35,
        wavelength: 0.001,
        speed: -0.001,
        yOffset: height * 0.75,
        color: isDark ? 'rgba(20, 184, 166, 0.025)' : 'rgba(13, 148, 136, 0.035)',
        lineWidth: 2.2,
        phase: Math.PI / 3,
      },
      {
        amplitude: 15,
        wavelength: 0.004,
        speed: 0.0025,
        yOffset: height * 0.5,
        color: isDark ? 'rgba(0, 240, 255, 0.02)' : 'rgba(59, 130, 246, 0.025)',
        lineWidth: 1.0,
        phase: Math.PI,
      },
    ];

    // Glow beam tracks (slow coordinates)
    const beam1 = { x: width * 0.2, y: height * 0.3, tx: width * 0.2, ty: height * 0.3, size: 450 };
    const beam2 = { x: width * 0.8, y: height * 0.7, tx: width * 0.8, ty: height * 0.7, size: 550 };

    const handleResize = () => {
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
      
      // Realignment of wave coordinates
      waves[0].yOffset = height * 0.3;
      waves[1].yOffset = height * 0.75;
      waves[2].yOffset = height * 0.5;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current.x = e.clientX;
      mouseRef.current.y = e.clientY;
      mouseRef.current.active = true;
    };

    const handleMouseLeave = () => {
      mouseRef.current.active = false;
    };

    const resizeObserver = new ResizeObserver(() => handleResize());
    resizeObserver.observe(canvas);

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseleave', handleMouseLeave);

    // Main animation loop
    const render = () => {
      // 1. Draw solid background based on active theme
      if (theme === 'dark') {
        const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, Math.max(width, height));
        bgGrad.addColorStop(0, '#050c21'); // Deep Midnight Blue hub
        bgGrad.addColorStop(1, '#020617'); // Pitch Midnight Blue
        ctx.fillStyle = bgGrad;
      } else {
        const bgGrad = ctx.createRadialGradient(width / 2, height / 2, 10, width / 2, height / 2, Math.max(width, height));
        bgGrad.addColorStop(0, '#f8fafc'); // Pure slate white
        bgGrad.addColorStop(1, '#f1f5f9'); // Clean warm grey
        ctx.fillStyle = bgGrad;
      }
      ctx.fillRect(0, 0, width, height);

      // 2. Draw slow moving light glow beams (Atmospheric lighting)
      if (theme === 'dark') {
        // Slowly update target positions
        if (Math.random() < 0.005) beam1.tx = Math.random() * width;
        if (Math.random() < 0.005) beam1.ty = Math.random() * height;
        if (Math.random() < 0.005) beam2.tx = Math.random() * width;
        if (Math.random() < 0.005) beam2.ty = Math.random() * height;

        beam1.x += (beam1.tx - beam1.x) * 0.005;
        beam1.y += (beam1.ty - beam1.y) * 0.005;
        beam2.x += (beam2.tx - beam2.x) * 0.005;
        beam2.y += (beam2.ty - beam2.y) * 0.005;

        // Draw radial glow 1 (Electric Cyan)
        const rad1 = ctx.createRadialGradient(beam1.x, beam1.y, 0, beam1.x, beam1.y, beam1.size);
        rad1.addColorStop(0, 'rgba(0, 240, 255, 0.06)');
        rad1.addColorStop(0.5, 'rgba(0, 240, 255, 0.02)');
        rad1.addColorStop(1, 'transparent');
        ctx.fillStyle = rad1;
        ctx.fillRect(0, 0, width, height);

        // Draw radial glow 2 (Soft Teal)
        const rad2 = ctx.createRadialGradient(beam2.x, beam2.y, 0, beam2.x, beam2.y, beam2.size);
        rad2.addColorStop(0, 'rgba(20, 184, 166, 0.05)');
        rad2.addColorStop(0.5, 'rgba(20, 184, 166, 0.015)');
        rad2.addColorStop(1, 'transparent');
        ctx.fillStyle = rad2;
        ctx.fillRect(0, 0, width, height);
      } else {
        // Subtle clean warm glows for light mode
        if (Math.random() < 0.005) beam1.tx = Math.random() * width;
        if (Math.random() < 0.005) beam1.ty = Math.random() * height;

        beam1.x += (beam1.tx - beam1.x) * 0.005;
        beam1.y += (beam1.ty - beam1.y) * 0.005;

        const rad1 = ctx.createRadialGradient(beam1.x, beam1.y, 0, beam1.x, beam1.y, beam1.size * 0.8);
        rad1.addColorStop(0, 'rgba(6, 182, 212, 0.03)');
        rad1.addColorStop(1, 'transparent');
        ctx.fillStyle = rad1;
        ctx.fillRect(0, 0, width, height);
      }

      // 3. Draw energy waves (Subtle flowing sine lines)
      waves.forEach((wave) => {
        ctx.beginPath();
        for (let x = 0; x < width; x += 5) {
          const y = wave.amplitude * Math.sin(x * wave.wavelength + wave.phase) + wave.yOffset;
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.strokeStyle = wave.color;
        ctx.lineWidth = wave.lineWidth;
        ctx.stroke();
        wave.phase += wave.speed;
      });

      // 4. Draw subtle technical grid background (Interactive depth)
      ctx.strokeStyle = theme === 'dark' ? 'rgba(255, 255, 255, 0.012)' : 'rgba(0, 0, 0, 0.012)';
      ctx.lineWidth = 1;
      const gridSize = 80;
      
      // Slight grid translation offset based on mouse
      const gridOffsetX = mouseRef.current.active ? (mouseRef.current.x - width/2) * 0.02 : 0;
      const gridOffsetY = mouseRef.current.active ? (mouseRef.current.y - height/2) * 0.02 : 0;

      ctx.beginPath();
      for (let x = gridOffsetX % gridSize; x < width; x += gridSize) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = gridOffsetY % gridSize; y < height; y += gridSize) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // 5. Draw and connect the particle network (Brain ecosystem nodes)
      particles.forEach((p, index) => {
        // Move particle
        p.x += p.vx;
        p.y += p.vy;

        // Wrap boundaries
        if (p.x < -10) p.x = width + 10;
        if (p.x > width + 10) p.x = -10;
        if (p.y < -10) p.y = height + 10;
        if (p.y > height + 10) p.y = -10;

        // Mouse attraction (subtle flow effect)
        if (mouseRef.current.active) {
          const dx = mouseRef.current.x - p.x;
          const dy = mouseRef.current.y - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 250) {
            const force = (250 - dist) / 250;
            p.x += (dx / dist) * force * 0.25;
            p.y += (dy / dist) * force * 0.25;
          }
        }

        // Pulse alpha
        p.pulsePhase += p.pulseSpeed;
        const currentAlpha = p.alpha + Math.sin(p.pulsePhase) * 0.07;
        const boundedAlpha = Math.max(0.05, Math.min(0.7, currentAlpha));

        // Draw particle
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fillStyle = p.color;
        ctx.globalAlpha = boundedAlpha;
        ctx.fill();

        // Connect nearby nodes to form tech network constellation
        for (let j = index + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 120) {
            ctx.beginPath();
            ctx.moveTo(p.x, p.y);
            ctx.lineTo(p2.x, p2.y);
            
            // Connection line opacity decreases with distance
            const lineAlpha = (120 - dist) / 120 * (theme === 'dark' ? 0.08 : 0.09);
            ctx.strokeStyle = theme === 'dark' ? '#00f0ff' : '#0ea5e9';
            ctx.globalAlpha = lineAlpha;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      });

      // Restore alpha parameters
      ctx.globalAlpha = 1.0;

      // Repeat frame
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [theme]);

  return (
    <div className="fixed inset-0 w-full h-full pointer-events-none overflow-hidden z-0">
      <style>{`
        @keyframes holographic-float-1 {
          0% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          33% { transform: translate(30px, -50px) scale(1.08) rotate(120deg); }
          66% { transform: translate(-20px, 35px) scale(0.95) rotate(240deg); }
          100% { transform: translate(0px, 0px) scale(1) rotate(360deg); }
        }
        @keyframes holographic-float-2 {
          0% { transform: translate(0px, 0px) scale(1) rotate(0deg); }
          50% { transform: translate(-40px, 30px) scale(1.12) rotate(-180deg); }
          100% { transform: translate(0px, 0px) scale(1) rotate(-360deg); }
        }
        @keyframes holographic-float-3 {
          0% { transform: translate(0px, 0px) scale(1); }
          50% { transform: translate(45px, 25px) scale(0.93); }
          100% { transform: translate(0px, 0px) scale(1); }
        }
      `}</style>
      
      {/* 2D Canvas Living Background */}
      <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" />
      
      {/* Premium cyan holographic light beams */}
      {theme === 'dark' && (
        <div className="absolute inset-0 w-full h-full mix-blend-screen opacity-[0.22] pointer-events-none">
          {/* Holographic Beam 1 */}
          <div 
            className="absolute top-[-10%] left-[-15%] w-[650px] h-[650px] rounded-full bg-cyan-500/15 blur-[140px]" 
            style={{ animation: 'holographic-float-1 26s ease-in-out infinite' }}
          />
          {/* Holographic Beam 2 */}
          <div 
            className="absolute bottom-[5%] right-[-15%] w-[750px] h-[750px] rounded-full bg-teal-500/12 blur-[160px]" 
            style={{ animation: 'holographic-float-2 32s ease-in-out infinite' }}
          />
          {/* Holographic Beam 3 */}
          <div 
            className="absolute top-[40%] left-[25%] w-[550px] h-[550px] rounded-full bg-cyan-600/10 blur-[130px]" 
            style={{ animation: 'holographic-float-3 23s ease-in-out infinite' }}
          />
        </div>
      )}
    </div>
  );
}
