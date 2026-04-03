"use client";
import React, { useState, useEffect, useCallback, useRef } from 'react';

const GameStyles = () => (
  <style jsx global>{`
    @keyframes fall { 0% { transform: translateY(-50px); opacity: 0; } 15% { opacity: 1; } 100% { transform: translateY(700px); } }
    .ring-fall { animation: fall 3.5s linear forwards; }
    @keyframes victory-glow { 0% { background: #451a03; } 50% { background: #78350f; } 100% { background: #451a03; } }
    .victory-bg { animation: victory-glow 2s infinite; }
  `}</style>
);

export default function Home() {
  // 상태 관리
  const [score, setScore] = useState(0);
  const [caughtCount, setCaughtCount] = useState(0);
  const [missedCount, setMissedCount] = useState(0);
  const [lives, setLives] = useState(5);
  const [gameState, setGameState] = useState('lobby'); // lobby, playing, victory, gameover
  const [rings, setRings] = useState([]);
  const [user, setUser] = useState(null);
  
  const bgmRef = useRef(null);

  // Pi SDK 인증 (팝업 강제 활성화 로직)
  useEffect(() => {
    const initPi = async () => {
      if (typeof window !== 'undefined' && window.Pi) {
        try {
          await window.Pi.init({ version: "2.0", sandbox: false });
          const auth = await window.Pi.authenticate(["username"], (e) => console.error(e));
          setUser(auth.user);
        } catch (e) { console.error("Pi SDK Init Failed", e); }
      }
    };
    initPi();
  }, []);

  // 보너스 및 승리 로직 체크
  useEffect(() => {
    if (score >= 2000 || caughtCount >= 100) setGameState('victory');
    else if (score >= 1500 || caughtCount >= 75) { // 슈퍼 보너스
      setMissedCount(0); setLives(5); setRings([]);
    } else if (score >= 1000 || caughtCount >= 50) { // 대박 보너스
      setMissedCount(0); setLives(5);
    } else if (score >= 500 || caughtCount >= 25) { // 일반 보너스
      setMissedCount(prev => Math.max(0, prev - 2)); setLives(prev => Math.min(5, prev + 2));
    }
  }, [score, caughtCount]);

  const startGame = () => {
    setScore(0); setCaughtCount(0); setMissedCount(0); setLives(5); setRings([]);
    setGameState('playing');
    if (bgmRef.current) bgmRef.current.play(); // 터치 시 BGM 재생
  };

  const handleRingClick = (id, isBomb) => {
    if (isBomb) {
      setLives(prev => { if (prev <= 1) { setGameState('gameover'); return 0; } return prev - 1; });
    } else {
      setScore(prev => prev + 50);
      setCaughtCount(prev => prev + 1);
    }
    setRings(prev => prev.filter(r => r.id !== id));
  };

  // 고리 생성 루프
  useEffect(() => {
    if (gameState !== 'playing') return;
    const interval = setInterval(() => {
      setRings(prev => [...prev, { id: Date.now(), x: 10 + Math.random() * 80, isBomb: Math.random() < 0.1 }]);
    }, 900);
    return () => clearInterval(interval);
  }, [gameState]);

  return (
    <div className="min-h-screen bg-[#050814] text-white flex flex-col items-center p-4">
      <GameStyles />
      <audio ref={bgmRef} src="/sounds/bgm.mp3" loop />

      <header className="w-full max-w-md flex justify-between p-4 bg-black/40 rounded-2xl mb-4 border border-white/10">
        <div>
          <p className="text-sky-400 text-xs font-bold">{user ? `@${user.username}` : "PI BROWSER REQUIRED"}</p>
          <h1 className="text-xl font-black italic text-yellow-400">PIONEERS!!</h1>
        </div>
        <div className="text-right">
          <p className="text-2xl font-black text-white">{score}</p>
          <p className="text-[10px] text-gray-400">RINGS: {caughtCount}</p>
        </div>
      </header>

      <main className="w-full max-w-md aspect-[9/16] relative bg-[#0a0f1e] rounded-[2rem] overflow-hidden border-4 border-[#1e293b]">
        {gameState === 'lobby' && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/80 p-6 text-center">
            <div className="text-6xl mb-4">π</div>
            <h2 className="text-2xl font-black mb-4">MISSION: MAINNET</h2>
            <p className="text-gray-400 text-sm mb-8">2000점을 얻어 최고의 개척자가 되세요!</p>
            <button onClick={startGame} className="w-full bg-yellow-500 text-black py-4 rounded-xl font-bold text-xl active:scale-95 transition-transform">START MISSION</button>
          </div>
        )}

        {gameState === 'victory' && (
          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center victory-bg p-6 text-center">
            <div className="text-7xl mb-4">🏆</div>
            <h2 className="text-3xl font-black text-yellow-400 mb-2">You are the best pioneer!!</h2>
            <p className="mb-8 font-bold text-white">최종 점수: {score}</p>
            <button onClick={startGame} className="bg-white text-black px-8 py-3 rounded-full font-bold">RETRY</button>
          </div>
        )}

        {gameState === 'playing' && rings.map(r => (
          <div key={r.id} onClick={() => handleRingClick(r.id, r.isBomb)}
            className={`absolute ring-fall w-16 h-16 flex items-center justify-center rounded-full border-4 cursor-pointer shadow-lg active:scale-90 transition-transform ${r.isBomb ? 'border-red-500 bg-red-900/50' : 'border-sky-400 bg-sky-500/20'}`}
            style={{ left: `${r.x}%` }}>
            <span className="text-2xl">{r.isBomb ? '💣' : 'π'}</span>
          </div>
        ))}
        
        {/* 중앙 막대 */}
        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-[70%] bg-gradient-to-t from-gray-800 to-gray-500 opacity-30" />
      </main>

      <footer className="mt-6 text-center">
        <p className="text-[10px] text-gray-500 font-bold tracking-widest">© 2026 RAPAJOCKDH • "Grit leads to the Mainnet."</p>
      </footer>
    </div>
  );
}
