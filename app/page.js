"use client";

import { useEffect, useRef, useState } from "react";

const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const POLE_WIDTH = 10; 
const POLE_HEIGHT = 380;
const RING_OUTER_RADIUS = 40;
const RING_THICKNESS = 18;
const INITIAL_DROP_SPEED = 3.2; 
const MAX_LIVES = 5; 
const GOAL_SCORE = 2000;

const RING_TYPES = [
  { color: "#3b82f6", points: 10, label: "파랑", weight: 6 },
  { color: "#10b981", points: 30, label: "초록", weight: 3 },
  { color: "#fbbf24", points: 100, label: "노랑", weight: 0.5 },
  { color: "#ef4444", points: -100, label: "빨강", weight: 1.2 }, 
];

export default function RingCatcherGame() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(MAX_LIVES);
  const [gameState, setGameState] = useState("START");
  const [username, setUsername] = useState("Pioneer");
  const [authStatus, setAuthStatus] = useState("WAITING"); // WAITING, SUCCESS, ERROR
  const [lastBonusMilestone, setLastBonusMilestone] = useState(0);
  const [showFever, setShowFever] = useState(false);

  const sounds = useRef({
    bgm: typeof Audio !== "undefined" ? new Audio("/sounds/bgm.mp3") : null,
    catch: typeof Audio !== "undefined" ? new Audio("/sounds/catch.mp3") : null,
    bomb: typeof Audio !== "undefined" ? new Audio("/sounds/bomb.mp3") : null,
    fever: typeof Audio !== "undefined" ? new Audio("/sounds/fever.mp3") : null,
    gameover: typeof Audio !== "undefined" ? new Audio("/sounds/gameover.mp3") : null,
  });

  const playEffect = (type) => {
    const s = sounds.current[type];
    if (s) { s.currentTime = 0; s.play().catch(() => {}); }
  };

  // --- Pi SDK 인증 강화 로직 ---
  const handleAuth = async () => {
    if (typeof window !== "undefined" && window.Pi) {
      setAuthStatus("WAITING");
      try {
        await window.Pi.init({ version: "1.5", sandbox: true });
        const auth = await window.Pi.authenticate(['username'], () => {});
        setUsername(auth.user.username);
        setAuthStatus("SUCCESS");
      } catch (e) {
        setAuthStatus("ERROR");
      }
    }
  };

  useEffect(() => { handleAuth(); }, []);

  const startGame = () => {
    setScore(0); setLives(MAX_LIVES); setLastBonusMilestone(0);
    setGameState("PLAYING");
    if (sounds.current.bgm) {
      sounds.current.bgm.loop = true;
      sounds.current.bgm.play().catch(() => {});
    }
  };

  useEffect(() => {
    if (gameState !== "PLAYING") return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    let rodX = CANVAS_WIDTH / 2; // 사용자의 마우스/터치 위치를 저장하는 유일한 변수
    let rings = [];
    let caughtRings = [];
    let frameCount = 0;

    const gameLoop = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 상단 프로그레스 바
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(0, 0, CANVAS_WIDTH, 6);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(0, 0, (score / GOAL_SCORE) * CANVAS_WIDTH, 6);

      // 막대 렌더링 (중앙 복구 로직 절대 없음)
      ctx.fillStyle = "#475569";
      ctx.fillRect(rodX - POLE_WIDTH / 2, CANVAS_HEIGHT - POLE_HEIGHT, POLE_WIDTH, POLE_HEIGHT);

      const spawnRate = Math.max(18, 75 - Math.floor(score / 200) * 12);
      if (frameCount % spawnRate === 0) {
        const totalWeight = RING_TYPES.reduce((acc, curr) => acc + curr.weight, 0);
        let random = Math.random() * totalWeight;
        let selected = RING_TYPES[0];
        for (const t of RING_TYPES) { if (random < t.weight) { selected = t; break; } random -= t.weight; }
        rings.push({ x: Math.random() * (CANVAS_WIDTH - 100) + 50, y: -50, speed: INITIAL_DROP_SPEED + (score / 300), ...selected });
      }

      rings = rings.filter(ring => {
        ring.y += ring.speed;
        const dist = Math.abs(ring.x - rodX);
        const hitTop = CANVAS_HEIGHT - POLE_HEIGHT;

        if (dist < 20 && ring.y > hitTop && ring.y < hitTop + 25) {
          if (ring.color === "#ef4444") {
            setScore(prev => Math.max(0, prev + ring.points));
            playEffect('bomb');
          } else {
            setScore(prev => {
              const next = prev + ring.points;
              const currentMilestone = Math.floor(next / 500);
              if (currentMilestone > lastBonusMilestone) {
                setLives(MAX_LIVES);
                setLastBonusMilestone(currentMilestone);
                playEffect('fever');
                setShowFever(true);
                setTimeout(() => setShowFever(false), 2000);
              }
              if (next >= GOAL_SCORE) setGameState("WIN");
              return next;
            });
            playEffect('catch');
            caughtRings.push({ ...ring, caughtY: CANVAS_HEIGHT - (caughtRings.length * 14) - 35 });
          }
          return false; // 링만 제거하고 rodX는 그대로 유지
        }

        if (ring.y > CANVAS_HEIGHT) {
          if (ring.color !== "#ef4444") {
            setLives(prev => {
              if (prev <= 1) { setGameState("GAMEOVER"); playEffect('gameover'); if (sounds.current.bgm) sounds.current.bgm.pause(); }
              return prev - 1;
            });
          }
          return false;
        }

        ctx.beginPath();
        ctx.arc(ring.x, ring.y, RING_OUTER_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = RING_THICKNESS;
        ctx.stroke();
        return true;
      });

      caughtRings.slice(-30).forEach(r => {
        ctx.beginPath();
        ctx.arc(rodX, r.caughtY, RING_OUTER_RADIUS * 0.7, 0, Math.PI * 2);
        ctx.strokeStyle = r.color;
        ctx.lineWidth = 10;
        ctx.stroke();
      });

      frameCount++;
      animationFrameId = requestAnimationFrame(gameLoop);
    };

    const handleInput = (e) => {
      const rect = canvas.getBoundingClientRect();
      const x = (e.touches ? e.touches[0].clientX : e.clientX) - rect.left;
      rodX = Math.max(30, Math.min(CANVAS_WIDTH - 30, x)); // 오직 여기서만 rodX가 변경됨
    };

    canvas.addEventListener("mousemove", handleInput);
    canvas.addEventListener("touchmove", handleInput, { passive: false });
    gameLoop();
    return () => { cancelAnimationFrame(animationFrameId); canvas.removeEventListener("mousemove", handleInput); canvas.removeEventListener("touchmove", handleInput); };
  }, [gameState, score, lastBonusMilestone]);

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border-[10px] border-[#fbbf24] relative">
        <div className="p-5 flex justify-between items-center bg-gray-50 border-b-2">
          <div className="text-left">
            <p className="text-[10px] font-black text-blue-500 uppercase">Goal: {GOAL_SCORE}</p>
            <p className="text-4xl font-black text-slate-800 leading-none">{score}</p>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: MAX_LIVES }).map((_, i) => (
              <span key={i} className={`text-xl transition-all ${i < lives ? 'scale-110' : 'grayscale opacity-20'}`}>❤️</span>
            ))}
          </div>
        </div>

        <div className="relative bg-[#bae6fd]">
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-auto touch-none" />
          
          {showFever && (
            <div className="absolute top-1/4 left-0 w-full text-center pointer-events-none animate-bounce">
              <span className="bg-yellow-400 text-black px-4 py-2 rounded-full font-black text-xl border-2 border-white shadow-xl">FEVER! LIFE UP</span>
            </div>
          )}

          {gameState !== "PLAYING" && (
            <div className="absolute inset-0 bg-slate-900/95 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center text-white overflow-y-auto">
              <h2 className="text-[#fbbf24] text-4xl font-black mb-2 italic">PI-RING 2.0</h2>
              <p className="text-[9px] tracking-widest mb-6 opacity-60 uppercase">Grit leads to the Mainnet</p>
              
              <div className="bg-white/10 rounded-2xl p-4 mb-6 w-full text-left border border-white/10 text-[10px]">
                <div className="flex justify-between items-center mb-4 pb-2 border-b border-white/10">
                  <p>👋 Welcome, <span className="text-[#fbbf24] font-bold">{username}</span></p>
                  {authStatus !== "SUCCESS" && (
                    <button onClick={handleAuth} className="bg-red-500/20 text-red-400 px-2 py-1 rounded border border-red-500/50 animate-pulse">인증 재시도</button>
                  )}
                </div>

                {/* 색상별 점수 안내 추가 */}
                <div className="grid grid-cols-4 gap-2 mb-4 text-center">
                  {RING_TYPES.map(t => (
                    <div key={t.label} className="flex flex-col items-center">
                      <div className="w-4 h-4 rounded-full mb-1" style={{ backgroundColor: t.color }}></div>
                      <p className="font-bold">{t.points}점</p>
                    </div>
                  ))}
                </div>

                <div className="space-y-2 opacity-80">
                  <p>🎁 <span className="text-green-400 font-bold">500점 단위:</span> 하트가 5개로 즉시 충전됩니다!</p>
                  <p>⚠️ <span className="text-red-400 font-bold">생명 차감:</span> 링을 바닥에 놓치면 하트가 깎입니다.</p>
                </div>
              </div>

              <button onClick={startGame} className="bg-[#fbbf24] text-black text-xl font-black py-4 px-12 rounded-xl shadow-lg active:scale-95 transition-all">
                {gameState === "START" ? "START MISSION" : "RETRY MISSION"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
