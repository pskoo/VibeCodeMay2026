/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { Trophy, RefreshCcw, Pause, Play, ChevronUp, ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// --- Constants ---
const GRID_SIZE = 20;
const INITIAL_SPEED = 150;
const SPEED_INCREMENT = 2;
const MIN_SPEED = 60;

type Point = { x: number; y: number };
type Direction = 'UP' | 'DOWN' | 'LEFT' | 'RIGHT';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
};

export default function App() {
  // --- Refs ---
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const requestRef = useRef<number>(null);
  const lastUpdateTimeRef = useRef<number>(0);
  const directionRef = useRef<Direction>('RIGHT');
  const nextDirectionRef = useRef<Direction>('RIGHT');

  // --- State ---
  const [snake, setSnake] = useState<Point[]>([
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 },
  ]);
  const [food, setFood] = useState<Point>({ x: 15, y: 10 });
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(() => {
    const saved = localStorage.getItem('snake-high-score');
    return saved ? parseInt(saved, 10) : 0;
  });
  const [gameState, setGameState] = useState<'IDLE' | 'INITIALIZING' | 'PLAYING' | 'PAUSED' | 'GAME_OVER'>('IDLE');
  const [speed, setSpeed] = useState(INITIAL_SPEED);
  const [dimensions, setDimensions] = useState({ width: 400, height: 400 });
  const [particles, setParticles] = useState<Particle[]>([]);
  const [isShaking, setIsShaking] = useState(false);
  const [showFlash, setShowFlash] = useState(false);

  // --- Helpers ---
  const getRandomPoint = useCallback((currentSnake: Point[], width: number, height: number): Point => {
    const cols = Math.floor(width / GRID_SIZE);
    const rows = Math.floor(height / GRID_SIZE);
    let newPoint: Point;
    while (true) {
      newPoint = {
        x: Math.floor(Math.random() * cols),
        y: Math.floor(Math.random() * rows),
      };
      // Ensure point is not on snake
      if (!currentSnake.some(p => p.x === newPoint.x && p.y === newPoint.y)) {
        break;
      }
    }
    return newPoint;
  }, []);

  const createExplosion = useCallback((x: number, y: number, color: string) => {
    const newParticles: Particle[] = [];
    for (let i = 0; i < 15; i++) {
      newParticles.push({
        x: x * GRID_SIZE + GRID_SIZE / 2,
        y: y * GRID_SIZE + GRID_SIZE / 2,
        vx: (Math.random() - 0.5) * 8,
        vy: (Math.random() - 0.5) * 8,
        life: 1.0,
        color: color,
        size: Math.random() * 4 + 2,
      });
    }
    setParticles(prev => [...prev, ...newParticles]);
  }, []);

  const triggerCollisionEffect = useCallback(() => {
    setIsShaking(true);
    setShowFlash(true);
    setTimeout(() => setIsShaking(false), 300);
    setTimeout(() => setShowFlash(false), 150);
  }, []);

  const resetGame = () => {
    setSnake([
      { x: 10, y: 10 },
      { x: 9, y: 10 },
      { x: 8, y: 10 },
    ]);
    const initialFood = getRandomPoint([], dimensions.width, dimensions.height);
    setFood(initialFood);
    setScore(0);
    setSpeed(INITIAL_SPEED);
    directionRef.current = 'RIGHT';
    nextDirectionRef.current = 'RIGHT';
    setGameState('INITIALIZING');
  };

  // --- Logic ---
  useEffect(() => {
    if (gameState === 'INITIALIZING') {
      const timer = setTimeout(() => {
        setGameState('PLAYING');
      }, 2200);
      return () => clearTimeout(timer);
    }
  }, [gameState]);

  const update = useCallback(() => {
    if (gameState !== 'PLAYING') return;

    directionRef.current = nextDirectionRef.current;
    
    setSnake(prevSnake => {
      const head = prevSnake[0];
      const newHead = { ...head };

      switch (directionRef.current) {
        case 'UP': newHead.y -= 1; break;
        case 'DOWN': newHead.y += 1; break;
        case 'LEFT': newHead.x -= 1; break;
        case 'RIGHT': newHead.x += 1; break;
      }

      const cols = Math.floor(dimensions.width / GRID_SIZE);
      const rows = Math.floor(dimensions.height / GRID_SIZE);

      // Collision detection: Walls
      if (newHead.x < 0 || newHead.x >= cols || newHead.y < 0 || newHead.y >= rows) {
        setGameState('GAME_OVER');
        triggerCollisionEffect();
        return prevSnake;
      }

      // Collision detection: Self
      if (prevSnake.some(p => p.x === newHead.x && p.y === newHead.y)) {
        setGameState('GAME_OVER');
        triggerCollisionEffect();
        return prevSnake;
      }

      const newSnake = [newHead, ...prevSnake];

      // Check if food eaten
      if (newHead.x === food.x && newHead.y === food.y) {
        setScore(s => s + 10);
        createExplosion(food.x, food.y, '#f43f5e');
        setFood(getRandomPoint(newSnake, dimensions.width, dimensions.height));
        setSpeed(prev => Math.max(MIN_SPEED, prev - SPEED_INCREMENT));
        // Don't pop tail if food eaten
      } else {
        newSnake.pop();
      }

      return newSnake;
    });
  }, [gameState, food, dimensions, getRandomPoint]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear background
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Draw Grid (Subtle)
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    for (let x = 0; x <= canvas.width; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Draw Food
    ctx.shadowBlur = 15;
    ctx.shadowColor = '#f43f5e';
    ctx.fillStyle = '#f43f5e';
    ctx.beginPath();
    ctx.arc(
      food.x * GRID_SIZE + GRID_SIZE / 2,
      food.y * GRID_SIZE + GRID_SIZE / 2,
      GRID_SIZE / 2.5,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Draw Snake
    snake.forEach((segment, index) => {
      const isHead = index === 0;
      ctx.shadowBlur = isHead ? 20 : 0;
      ctx.shadowColor = isHead ? '#10b981' : 'transparent';
      ctx.fillStyle = isHead ? '#10b981' : '#34d399';
      
      const x = segment.x * GRID_SIZE + 1;
      const y = segment.y * GRID_SIZE + 1;
      const size = GRID_SIZE - 2;
      
      ctx.fillRect(x, y, size, size);

      // Draw eyes on head
      if (isHead) {
        ctx.shadowBlur = 0;
        ctx.fillStyle = '#0f172a';
        const eyeSize = 3;
        const offset = 5;
        
        if (directionRef.current === 'RIGHT') {
          ctx.fillRect(x + size - offset, y + 4, eyeSize, eyeSize);
          ctx.fillRect(x + size - offset, y + size - 4 - eyeSize, eyeSize, eyeSize);
        } else if (directionRef.current === 'LEFT') {
          ctx.fillRect(x + offset - eyeSize, y + 4, eyeSize, eyeSize);
          ctx.fillRect(x + offset - eyeSize, y + size - 4 - eyeSize, eyeSize, eyeSize);
        } else if (directionRef.current === 'UP') {
          ctx.fillRect(x + 4, y + offset - eyeSize, eyeSize, eyeSize);
          ctx.fillRect(x + size - 4 - eyeSize, y + offset - eyeSize, eyeSize, eyeSize);
        } else if (directionRef.current === 'DOWN') {
          ctx.fillRect(x + 4, y + size - offset, eyeSize, eyeSize);
          ctx.fillRect(x + size - 4 - eyeSize, y + size - offset, eyeSize, eyeSize);
        }
      }
    });

    ctx.shadowBlur = 0;

    // Draw Particles
    particles.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;
  }, [snake, food, particles]);

  // --- Effects ---
  useEffect(() => {
    const handleResize = () => {
      if (containerRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        // Keep it square and aligned to GRID_SIZE
        const size = Math.floor(Math.min(clientWidth, clientHeight) / GRID_SIZE) * GRID_SIZE;
        setDimensions({ width: size, height: size });
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowUp':
          if (directionRef.current !== 'DOWN') nextDirectionRef.current = 'UP';
          break;
        case 'ArrowDown':
          if (directionRef.current !== 'UP') nextDirectionRef.current = 'DOWN';
          break;
        case 'ArrowLeft':
          if (directionRef.current !== 'RIGHT') nextDirectionRef.current = 'LEFT';
          break;
        case 'ArrowRight':
          if (directionRef.current !== 'LEFT') nextDirectionRef.current = 'RIGHT';
          break;
        case ' ':
          if (gameState === 'PLAYING') setGameState('PAUSED');
          else if (gameState === 'PAUSED') setGameState('PLAYING');
          else if (gameState === 'IDLE' || gameState === 'GAME_OVER') resetGame();
          break;
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState]);

  const animate = useCallback((time: number) => {
    if (gameState === 'PLAYING') {
      const delta = time - lastUpdateTimeRef.current;
      if (delta > speed) {
        update();
        lastUpdateTimeRef.current = time;
      }
    }
    
    // Update Particles
    setParticles(prev => 
      prev
        .map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          life: p.life - 0.02,
        }))
        .filter(p => p.life > 0)
    );

    draw();
    requestRef.current = requestAnimationFrame(animate);
  }, [gameState, speed, update, draw]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  useEffect(() => {
    if (score > highScore) {
      setHighScore(score);
      localStorage.setItem('snake-high-score', score.toString());
    }
  }, [score, highScore]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col font-sans selection:bg-emerald-500/30 overflow-hidden">
      {/* Header */}
      <header className="h-20 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between px-10 shrink-0 sticky top-0 z-50 backdrop-blur-md">
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(16,185,129,0.4)]">
            <RefreshCcw className="w-6 h-6 text-slate-900" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-white italic">NEON<span className="text-emerald-400">SNAKE</span>.OS</h1>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-mono">Build v4.2.0-STABLE</p>
          </div>
        </div>
        
        <div className="flex gap-8 items-center">
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-mono text-right w-full">Current Score</span>
            <span className="text-3xl font-mono font-bold text-emerald-400">{score.toString().padStart(3, '0')}</span>
          </div>
          <div className="w-px h-10 bg-slate-800 hidden sm:block"></div>
          <div className="flex flex-col items-end">
            <span className="text-[10px] uppercase tracking-widest text-slate-500 font-bold font-mono text-right w-full">High Score</span>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-slate-400" />
              <span className="text-3xl font-mono font-bold text-slate-300">{highScore.toString().padStart(3, '0')}</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-grow flex items-center justify-center p-8 bg-[radial-gradient(circle_at_center,_#1e293b_0%,_#0f172a_100%)] relative">
        {/* Dot Grid Overlay */}
        <div className="absolute inset-0 opacity-10 pointer-events-none" style={{ backgroundImage: 'radial-gradient(#64748b 0.5px, transparent 0.5px)', backgroundSize: '24px 24px' }}></div>
        
        <motion.div 
          ref={containerRef}
          animate={isShaking ? {
            x: [-4, 4, -4, 4, 0],
            y: [-4, 4, -4, 4, 0],
          } : {}}
          transition={{ duration: 0.3 }}
          className="relative z-10 bg-slate-900 p-1 rounded-xl shadow-2xl border border-slate-700/50 flex items-center justify-center aspect-square w-full max-w-[500px]"
          id="game-canvas-container"
        >
          <canvas
            ref={canvasRef}
            width={dimensions.width}
            height={dimensions.height}
            className="block rounded-lg shadow-inner cursor-none"
          />

          {showFlash && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-white z-20 pointer-events-none rounded-lg"
            />
          )}

          {/* Overlays */}
          <AnimatePresence>
            {(gameState === 'IDLE' || gameState === 'INITIALIZING' || gameState === 'GAME_OVER' || gameState === 'PAUSED') && (
              <motion.div 
                initial={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                animate={{ opacity: 1, backdropFilter: 'blur(8px)' }}
                exit={{ opacity: 0, backdropFilter: 'blur(0px)' }}
                className="absolute inset-0 bg-slate-900/80 flex items-center justify-center z-10 p-8 text-center rounded-lg overflow-hidden"
              >
                {/* Intro Sequence Overlay */}
                {gameState === 'INITIALIZING' && (
                  <div className="relative w-full h-full flex flex-col items-center justify-center pointer-events-none">
                    <motion.div 
                      key="scanner"
                      initial={{ top: '-10%' }}
                      animate={{ top: '110%' }}
                      transition={{ duration: 1.5, repeat: 1, ease: 'linear' }}
                      className="absolute left-0 right-0 h-1 bg-emerald-500/50 shadow-[0_0_20px_#10b981] z-20"
                    />
                    
                    <div className="space-y-4 relative z-10">
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="text-emerald-400 font-mono text-xs tracking-[0.3em] uppercase mb-2"
                      >
                        System Authorization Required
                      </motion.div>
                      
                      <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.4, type: 'spring' }}
                        className="text-6xl font-black italic text-white tracking-tighter"
                      >
                        BOOTING<span className="text-emerald-500">.</span>
                      </motion.div>
                      
                      <div className="flex justify-center gap-1">
                        {[0, 1, 2, 3, 4].map((i) => (
                          <motion.div
                            key={i}
                            initial={{ scaleY: 0 }}
                            animate={{ scaleY: [0, 1, 0] }}
                            transition={{ 
                              duration: 0.4, 
                              repeat: Infinity, 
                              delay: i * 0.1,
                              repeatDelay: 0.2
                            }}
                            className="w-1 h-8 bg-emerald-500"
                          />
                        ))}
                      </div>

                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: [0, 1, 0] }}
                        transition={{ duration: 0.1, repeat: 5, delay: 1.5 }}
                        className="text-emerald-500 font-mono text-[10px] absolute -bottom-12 left-0 right-0"
                      >
                        CRITICAL SYNC: 100% SUCCESSFUL
                      </motion.div>
                    </div>
                  </div>
                )}

                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="max-w-xs"
                >
                  {gameState === 'IDLE' && (
                    <>
                      <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-tighter italic">Ready?</h2>
                      <p className="text-slate-400 mb-8 text-sm">Use Arrow Keys to Navigate. Initializing core systems...</p>
                      <button 
                        onClick={resetGame}
                        className="px-8 py-3 bg-emerald-500 text-slate-950 font-bold rounded-full hover:bg-emerald-400 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)] uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
                      >
                        <Play className="w-5 h-5 fill-current" /> Initialize Core
                      </button>
                    </>
                  )}

                  {gameState === 'PAUSED' && (
                    <>
                      <h2 className="text-4xl font-bold text-white mb-4 uppercase tracking-tighter italic">Suspended</h2>
                      <p className="text-slate-400 mb-8 text-sm">System diagnostic in progress. Resume when ready.</p>
                      <button 
                        onClick={() => setGameState('PLAYING')}
                        className="px-8 py-3 bg-emerald-500 text-slate-950 font-bold rounded-full hover:bg-emerald-400 transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)] uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
                      >
                        <Play className="w-5 h-5 fill-current" /> Resume
                      </button>
                    </>
                  )}

                  {gameState === 'GAME_OVER' && (
                    <>
                      <motion.h2 
                        initial={{ y: -20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        className="text-4xl font-bold text-white mb-2 uppercase tracking-tighter italic text-rose-500"
                      >
                        System Failure
                      </motion.h2>
                      <motion.div 
                        initial={{ scale: 0.5, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ delay: 0.2, type: 'spring' }}
                        className="text-7xl font-mono font-bold mb-6 text-white drop-shadow-[0_0_15px_rgba(255,255,255,0.3)]"
                      >
                        {score.toString().padStart(3, '0')}
                      </motion.div>
                      <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.4 }}
                        className="text-slate-400 mb-8 text-sm"
                      >
                        Connection lost. Final score recorded. Re-synchronizing data banks...
                      </motion.p>
                      <motion.button 
                        initial={{ y: 20, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ delay: 0.6 }}
                        onClick={resetGame}
                        className="px-8 py-3 bg-white text-slate-950 font-bold rounded-full hover:bg-slate-200 transition-colors shadow-[0_0_20px_rgba(255,255,255,0.2)] uppercase tracking-widest flex items-center justify-center gap-2 mx-auto"
                      >
                        <RefreshCcw className="w-5 h-5" /> Retry Sync
                      </motion.button>
                    </>
                  )}
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Sidebar / Controls Info */}
        <aside className="absolute right-10 top-1/2 -translate-y-1/2 w-64 hidden xl:flex flex-col gap-6">
          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Diagnostics</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">System Speed</span>
                <span className="text-xs font-mono text-emerald-400">{(INITIAL_SPEED - speed + MIN_SPEED).toString().padStart(3, '0')} Hz</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-400">Buffer Length</span>
                <span className="text-xs font-mono text-emerald-400">{snake.length.toString().padStart(3, '0')}</span>
              </div>
              <div className="h-1 w-full bg-slate-800 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-emerald-500" 
                  initial={{ width: 0 }}
                  animate={{ width: `${(score % 100)}%` }}
                />
              </div>
            </div>
          </div>

          <div className="bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-md">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-6">Input Matrix</h3>
            
            <div className="grid grid-cols-3 gap-2 w-32 mx-auto">
              <div />
              <button 
                className="h-10 w-10 border border-slate-700 rounded flex items-center justify-center text-slate-400 font-bold bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
                onClick={() => { if (directionRef.current !== 'DOWN') nextDirectionRef.current = 'UP'; }}
              >
                ↑
              </button>
              <div />
              <button 
                className="h-10 w-10 border border-slate-700 rounded flex items-center justify-center text-slate-400 font-bold bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
                onClick={() => { if (directionRef.current !== 'RIGHT') nextDirectionRef.current = 'LEFT'; }}
              >
                ←
              </button>
              <button 
                className="h-10 w-10 border border-slate-700 rounded flex items-center justify-center text-slate-400 font-bold bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
                onClick={() => { if (directionRef.current !== 'UP') nextDirectionRef.current = 'DOWN'; }}
              >
                ↓
              </button>
              <button 
                className="h-10 w-10 border border-slate-700 rounded flex items-center justify-center text-slate-400 font-bold bg-slate-800/50 hover:bg-slate-700/50 transition-colors"
                onClick={() => { if (directionRef.current !== 'LEFT') nextDirectionRef.current = 'RIGHT'; }}
              >
                →
              </button>
            </div>

            <div className="mt-8 text-center">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/5 rounded-full text-[10px] uppercase tracking-widest text-slate-500 border border-white/5">
                <kbd className="font-mono px-1 bg-white/10 rounded text-emerald-400">SPACE</kbd> Pause / Play
              </div>
            </div>
          </div>
        </aside>
      </main>

      {/* Footer / Status Rail */}
      <footer className="h-12 bg-slate-900 border-t border-slate-800 px-10 flex items-center justify-between shrink-0">
        <div className="flex gap-6">
          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">Region: US-EAST-1</span>
          <span className="text-[10px] text-slate-500 font-medium uppercase tracking-tighter">Latency: 14ms</span>
        </div>
        <div className="flex gap-2 items-center">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] text-emerald-500/80 font-bold uppercase tracking-widest">System Online</span>
        </div>
      </footer>
    </div>
  );
}
