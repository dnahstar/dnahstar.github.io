"use client";
import React, { useState, useEffect, useCallback } from 'react';

// 빌드 에러 원인이었던 스타일 태그를 안전한 방식으로 수정했습니다.
const GameStyles = () => (
  <style jsx global>{`
    @keyframes fall { 
      0% { transform: translateY(-20px); opacity: 0; } 
      15% { opacity: 1; } 
      100% { transform: translateY(500px); } 
    }
    .ring-fall { animation: fall 3.8s linear forwards; }
    .pole-gradient { background: linear-gradient(to bottom, #4b5563, #1f2937, #111827); }
    .fever-glow { filter: drop-shadow(0 0 10px #fbbf24); }
  `}</style>
);

export default function Home() {
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [gameState, setGameState] = useState('lobby');
  const [rings, setRings] = useState([]);
  const [stackedRings, setStackedRings] = useState([]); 
  const [isFever, setIsFever] = useState(false);
  const [feverCount, setFeverCount] = useState(0);
  const [user, setUser] = useState(null);
  const [sdkStatus, setSdkStatus] = useState("Checking Pi SDK...");

  // Pi SDK 인증 로직 (메인넷의 핵심!)
  useEffect(() => {
    const initPi = async () => {
      if (typeof window !== 'undefined' && window.Pi) {
        try {
          await window.Pi.init({ version: "2.0", sandbox: false });
          const auth = await window.Pi.authenticate(["username"], (err) => console.error(err));
          setUser(auth.user);
          setSdkStatus("Connected");
        } catch (e) { setSdkStatus("External Browser"); }
      } else { setSdkStatus("Pi Browser Required"); }
    };
    initPi();
  }, []);

  const playSound = useCallback((type) => {
    const audio = new Audio(`/sounds/${type}.mp3`);
    audio.play().catch(() => {});
  }, []);

  // 게임 루프: 고리 생성 (기존 2.0 재미 복원)
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      const isBomb = Math.random() < 0.12;
      setRings(prev => [...prev, { id: Date.now(), x: 30 + Math.random() * 40, isBomb }]);
    }, isFever ? 400 : 900);
    return () => clearInterval(interval);
  }, [gameState, isFever]);

  const handleCatch = (ring) => {
    if (ring.isBomb) {
      setLives(l => { if (l <= 1) { setGameState('gameover'); playSound('gameover'); return 0; } return l - 1; });
      playSound('bomb');
    } else {
      setScore(s => s + (isFever ? 50 : 20));
      setStackedRings(prev => [...prev.slice(-9), ring.id]); // 하단에 고리 쌓기 시각화
      setFeverCount(f => {
        if (f + 1 >= 10 && !isFever) {
          setIsFever(true); playSound('fever');
          setTimeout(() => setIsFever(false), 5000);
          return 0;
        } return f + 1;
      });
      playSound('catch');
    }
    setRings(prev => prev.filter(r => r.id !== ring.id));
  };

  return (
    <div className="min-h-screen bg-[#0a0f1e] text-white p-4 flex flex-col items-center select-none font-sans">
      <GameStyles />
      <header className="w-full max-w-md flex justify-between items-start mb-4">
        <div>
          <h1 className="text-3xl font-black text-yellow-400 italic leading-none">RING CATCHER</h1>
          <p className="text-[10px] text-sky-400 font-bold mt-1 uppercase italic tracking-widest">
            {user ? `PIONEER: ${user.username}` : sdkStatus}
          </p>
        </div>
        <div className="text-right">
          <div className="flex gap-0.5 mb-1 justify-end">
            {[...Array(5)].map((_, i) => (
              <span key={i} className={`text-xl ${i < lives ? 'grayscale-0' : 'grayscale opacity-20'}`}>❤️</span>
            ))}
          </div>
          <p className="text-2xl font-black">{score}</p>
        </div>
      </header>

      <main className="w-full max-w-md aspect-[3/4] bg-[#1a2333] rounded-[2.5rem] border-[6px] border-[#3a4a6e] relative overflow-hidden shadow-2xl">
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-8 h-72 pole-gradient rounded-t-full border-t-4 border-white/10 opacity-40" />
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col-reverse items-center">
          {stackedRings.map((id) => (
            <div key={id} className="w-20 h-5 border-2 border-sky-400 bg-sky-500/40 rounded-full mb-[-3px] fever-glow" />
          ))}
        </div>

        {gameState === 'lobby' && (
          <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/85 backdrop-blur-sm p-8">
            {user && <p className="text-yellow-400 font-bold mb-2 animate-bounce underline decoration-sky-500">Welcome, @{user.username}!</p>}
            <h2 className="text-2xl font-black mb-6">MISSION: MAINNET</h2>
            <button onClick={() => { setScore(0); setLives(5); setStackedRings([]); setGameState('playing'); playSound('start'); }} 
              className="w-full bg-yellow-400 text-black py-4 rounded-2xl font-black text-xl shadow-[0_6px_0_#b48a04] active:translate-y-1 active:shadow-none transition-all">START GAME</button>
          </div>
        )}

        {/* 게임오버/승리 화면 */}
        {(gameState === 'gameover' || score >= 2000) && (
          <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-black/90">
            <h2 className="text-4xl font-black mb-4 italic text-yellow-400">{score >= 2000 ? 'SUCCESS' : 'FAILED'}</h2>
            <p className="text-2xl mb-8">SCORE: {score}</p>
            <button onClick={() => setGameState('lobby')} className="bg-sky-500 px-12 py-4 rounded-2xl font-bold">RETRY</button>
          </div>
        )}

        <div className="relative w-full h-full">
          {rings.map(r => (
            <div key={r.id} onClick={() => handleCatch(r)}
              className={`absolute ring-fall cursor-pointer flex items-center justify-center rounded-full border-4 shadow-xl active:scale-95 ${r.isBomb ? 'border-red-500 bg-red-900/60' : 'border-sky-400 bg-sky-900/40'}`}
              style={{ left: `${r.x}%`, width: '60px', height: '60px' }}>
              <span className="text-2xl font-black">{r.isBomb ? '💣' : 'π'}</span>
            </div>
          ))}
        </div>
      </main>

      <footer className="mt-6 text-center">
        <p className="text-gray-600 text-[10px] font-bold tracking-widest uppercase">© 2026 RAPAJOCKDH • Mainnet Pioneer</p>
        <p className="text-sky-500/40 text-[9px] italic mt-1">"Grit leads to the Mainnet."</p>
      </footer>
    </div>
  );
}
