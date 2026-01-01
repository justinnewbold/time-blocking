'use client';

import { useState, useEffect, useCallback } from 'react';

// Confetti particle colors
const COLORS = [
  '#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7',
  '#dfe6e9', '#ff9ff3', '#54a0ff', '#5f27cd', '#00d2d3',
  '#ff9f43', '#10ac84', '#ee5a24', '#9c88ff', '#ffc048'
];

// Confetti shapes
const SHAPES = ['square', 'circle', 'triangle', 'ribbon'];

// Single confetti particle
function ConfettiParticle({ x, y, color, shape, delay, duration }) {
  const [style, setStyle] = useState({
    left: `${x}%`,
    top: '-20px',
    opacity: 1,
    transform: 'rotate(0deg) scale(1)',
  });
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setStyle({
        left: `${x + (Math.random() - 0.5) * 30}%`,
        top: '120%',
        opacity: 0,
        transform: `rotate(${Math.random() * 720 - 360}deg) scale(${Math.random() * 0.5 + 0.5})`,
      });
    }, delay);
    
    return () => clearTimeout(timer);
  }, [x, delay]);
  
  const shapeStyle = {
    square: 'w-3 h-3',
    circle: 'w-3 h-3 rounded-full',
    triangle: 'w-0 h-0 border-l-[6px] border-r-[6px] border-b-[10px] border-l-transparent border-r-transparent',
    ribbon: 'w-2 h-4 rounded-sm',
  };
  
  return (
    <div
      className={`absolute pointer-events-none ${shape !== 'triangle' ? shapeStyle[shape] : ''}`}
      style={{
        ...style,
        backgroundColor: shape !== 'triangle' ? color : 'transparent',
        borderBottomColor: shape === 'triangle' ? color : undefined,
        transition: `all ${duration}ms cubic-bezier(0.25, 0.46, 0.45, 0.94)`,
        transitionDelay: `${delay}ms`,
        zIndex: 9999,
      }}
    />
  );
}

// Confetti burst component
export default function Confetti({ 
  active = false, 
  count = 50, 
  duration = 3000,
  onComplete 
}) {
  const [particles, setParticles] = useState([]);
  
  useEffect(() => {
    if (active) {
      // Generate particles
      const newParticles = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        y: Math.random() * 20,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        shape: SHAPES[Math.floor(Math.random() * SHAPES.length)],
        delay: Math.random() * 200,
        duration: duration + Math.random() * 1000,
      }));
      
      setParticles(newParticles);
      
      // Clear after animation
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, duration + 1500);
      
      return () => clearTimeout(timer);
    }
  }, [active, count, duration, onComplete]);
  
  if (!active && particles.length === 0) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[9999]">
      {particles.map((particle) => (
        <ConfettiParticle key={particle.id} {...particle} />
      ))}
    </div>
  );
}

// Celebration burst from a point
export function CelebrationBurst({ 
  active = false, 
  x = 50, 
  y = 50, 
  count = 30,
  onComplete 
}) {
  const [particles, setParticles] = useState([]);
  
  useEffect(() => {
    if (active) {
      const newParticles = Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const velocity = 50 + Math.random() * 100;
        
        return {
          id: i,
          startX: x,
          startY: y,
          endX: x + Math.cos(angle) * velocity,
          endY: y + Math.sin(angle) * velocity + 50,
          color: COLORS[Math.floor(Math.random() * COLORS.length)],
          size: 4 + Math.random() * 8,
          delay: Math.random() * 100,
        };
      });
      
      setParticles(newParticles);
      
      const timer = setTimeout(() => {
        setParticles([]);
        onComplete?.();
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [active, x, y, count, onComplete]);
  
  if (!active && particles.length === 0) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[9999]">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full"
          style={{
            left: `${p.startX}%`,
            top: `${p.startY}%`,
            width: p.size,
            height: p.size,
            backgroundColor: p.color,
            animation: `burst-${p.id} 1s cubic-bezier(0.25, 0.46, 0.45, 0.94) forwards`,
            animationDelay: `${p.delay}ms`,
          }}
        />
      ))}
      <style jsx>{`
        ${particles.map(p => `
          @keyframes burst-${p.id} {
            0% {
              transform: translate(0, 0) scale(1);
              opacity: 1;
            }
            100% {
              transform: translate(${p.endX - p.startX}vw, ${p.endY - p.startY}vh) scale(0);
              opacity: 0;
            }
          }
        `).join('\n')}
      `}</style>
    </div>
  );
}

// Emoji rain celebration
export function EmojiRain({ 
  active = false, 
  emoji = '🎉', 
  count = 20,
  duration = 3000,
  onComplete 
}) {
  const [emojis, setEmojis] = useState([]);
  
  useEffect(() => {
    if (active) {
      const newEmojis = Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 500,
        duration: duration + Math.random() * 1000,
        rotation: Math.random() * 360,
        size: 20 + Math.random() * 20,
      }));
      
      setEmojis(newEmojis);
      
      const timer = setTimeout(() => {
        setEmojis([]);
        onComplete?.();
      }, duration + 2000);
      
      return () => clearTimeout(timer);
    }
  }, [active, emoji, count, duration, onComplete]);
  
  if (!active && emojis.length === 0) return null;
  
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden z-[9999]">
      {emojis.map((e) => (
        <div
          key={e.id}
          className="absolute animate-emoji-fall"
          style={{
            left: `${e.x}%`,
            top: '-50px',
            fontSize: e.size,
            animationDuration: `${e.duration}ms`,
            animationDelay: `${e.delay}ms`,
            transform: `rotate(${e.rotation}deg)`,
          }}
        >
          {emoji}
        </div>
      ))}
    </div>
  );
}

// Task completion celebration
export function TaskCompleteCelebration({ active = false, isFrog = false, onComplete }) {
  if (!active) return null;
  
  return (
    <>
      <Confetti 
        active={active} 
        count={isFrog ? 80 : 40} 
        duration={isFrog ? 4000 : 2500}
        onComplete={onComplete}
      />
      {isFrog && (
        <EmojiRain 
          active={active} 
          emoji="🐸" 
          count={15}
          duration={3000}
        />
      )}
    </>
  );
}
