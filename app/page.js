"use client";

import { useEffect, useRef, useState } from "react";

// --- 게임 설정 상수 (2.0 정식 규격) ---
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const POLE_WIDTH = 10;
const POLE_HEIGHT = 380;
const RING_OUTER_RADIUS = 40;
const RING_THICKNESS = 18;
const INITIAL_DROP_SPEED = 3.0;
const INITIAL_LIVES = 5; // 5개로 복구
const CATCH_TOLERANCE = 15; // 1.0의 적절한 난이도
const GOAL_SCORE = 2000; // 최종 승리 목표

const RING_TYPES = [
  { color: "#3b82f6", points: 10, weight: 6 },   // 파랑: 기본
  { color: "#10b981", points: 30, weight: 3 },   // 초록: 고득점
  { color: "#fbbf24", points: 100, weight: 0.5 }, // 노랑: 대박
  { color: "#ef4444", points: -100, weight: 1.2 }, // 빨강: 폭탄(감점)
];

export default function RingCatcherGame() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [gameState, setGameState] = useState("START");
  const [username, setUsername] = useState("Pioneer");
  const [authStatus, setAuthStatus] = useState("");

  // 사운드 관리
  const sounds = useRef({
    bgm: typeof Audio !== "undefined" ? new Audio("/sounds/bgm.mp3") : null,
    catch: typeof Audio !== "undefined" ? new Audio("/sounds/catch.mp3") : null,
    bomb: typeof Audio !== "undefined" ? new Audio("/sounds/bomb.mp3") : null,
    gameover: typeof Audio !== "undefined" ? new Audio("/sounds/gameover.mp3") : null,
  });

  const playEffect = (type) => {
    const s = sounds.current[type];
    if (s) { s.currentTime = 0; s.play().catch(() => {}); }
  };

  // Pi SDK 인증 로직
  useEffect(() => {
    if (typeof window !== "undefined" && window.Pi) {
      const initPi = async () => {
        try {
          await window.Pi.init({ version: "1.5", sandbox: true });
          const auth = await window.Pi.authenticate(['username'], () => {});
          setUsername(auth.user.username);
        } catch (e) {
          setAuthStatus("인증 대기 중...");
        }
      };
      initPi();
    }
  }, []);

  const startGame = () => {
    setScore(0); setLives(INITIAL_LIVES);
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
    let rodX = CANVAS_WIDTH / 2; // 막대 위치 (자유 조작 유지)
    let rings = [];
    let caughtRings = [];
    let frameCount = 0;

    const gameLoop = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 상단 목표 게이지
      ctx.fillStyle = "#f1f5f9";
      ctx.fillRect(0, 0, CANVAS_WIDTH, 6);
      ctx.fillStyle = "#fbbf24";
      ctx.fillRect(0, 0, (score / GOAL_SCORE) * CANVAS_WIDTH, 6);

      // 막대 그리기
      ctx.fillStyle = "#475569";
      ctx.fillRect(rodX - POLE_WIDTH / 2, CANVAS_HEIGHT - POLE_HEIGHT, POLE_WIDTH, POLE_HEIGHT);

      // 링 생성 로직
      if (frameCount % Math.max(30, 80 - Math.floor(score / 300) * 10) === 0) {
        const totalWeight = RING_TYPES.reduce((acc, curr) => acc + curr.weight, 0);
        let random = Math.random() * totalWeight;
        let selected = RING_TYPES[0];
        for (const t of RING_TYPES) { if (random < t.weight) { selected = t; break; } random -= t.weight; }
       
        rings.push({
          x: Math.random() * (CANVAS_WIDTH - 100) + 50,
          y: -50,
          speed: INITIAL_DROP_SPEED + (score / 600),
          ...selected
        });
      }

      rings = rings.filter(ring => {
        ring.y += ring.speed;
        const dist = Math.abs(ring.x - rodX);
        const hitTop = CANVAS_HEIGHT - POLE_HEIGHT;

        // 충돌 판정
        if (dist < CATCH_TOLERANCE && ring.y > hitTop && ring.y < hitTop + 25) {
          if (ring.color === "#ef4444") { // 폭탄: 점수만 감점
            setScore(prev => Math.max(0, prev + ring.points));
            playEffect('bomb');
          } else { // 일반 링: 점수 획득
            setScore(prev => {
              const next = prev + ring.points;
              if (next >= GOAL_SCORE) setGameState("WIN");
              return next;
            });
            playEffect('catch');
            caughtRings.push({ ...ring, caughtY: CANVAS_HEIGHT - (caughtRings.length * 15) - 35 });
          }
          return false; // 화면에서 제거 (막대 초기화 없음)
        }

        // 바닥에 떨어졌을 때 (생명 차감 조건 분리)
        if (ring.y > CANVAS_HEIGHT) {
          if (ring.color !== "#ef4444") { // 폭탄이 아닌 링을 놓쳤을 때만 하트 감소
            setLives(prev => {
              if (prev <= 1) {
                setGameState("GAMEOVER");
                playEffect('gameover');
                if (sounds.current.bgm) sounds.current.bgm.pause();
              }
              return prev - 1;
            });
          }
          return false;
        }

        // 링 그리기
        ctx.beginPath();
        ctx.arc(ring.x, ring.y, RING_OUTER_RADIUS, 0, Math.PI * 2);
        ctx.strokeStyle = ring.color;
        ctx.lineWidth = RING_THICKNESS;
        ctx.stroke();
        return true;
      });

      // 잡은 링 렌더링
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
      rodX = Math.max(30, Math.min(CANVAS_WIDTH - 30, x)); // 위치 고정
    };

    canvas.addEventListener("mousemove", handleInput);
    canvas.addEventListener("touchmove", handleInput, { passive: false });
    gameLoop();
    return () => {
      cancelAnimationFrame(animationFrameId);
      canvas.removeEventListener("mousemove", handleInput);
      canvas.removeEventListener("touchmove", handleInput);
    };
  }, [gameState, score]);

  return (
    <div className="min-h-screen bg-[#0f172a] flex flex-col items-center p-4">
      <div className="w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border-[10px] border-[#fbbf24] relative">
        {/* 상단 점수/생명 UI */}
        <div className="p-5 flex justify-between items-center bg-gray-50 border-b-2">
          <div className="text-left">
            <p className="text-[10px] font-black text-blue-500">GOAL: {GOAL_SCORE}</p>
            <p className="text-4xl font-black text-slate-800 leading-none">{score}</p>
          </div>
          <div className="flex gap-1">
            {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
              <span key={i} className={`text-xl ${i < lives ? '' : 'grayscale opacity-20'}`}>❤️</span>
            ))}
          </div>
        </div>

        {/* 게임 캔버스 영역 */}
        <div className="relative bg-[#bae6fd]">
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-auto touch-none" />
         
          {/* 시작/종료 안내 화면 */}
          {gameState !== "PLAYING" && (
            <div className="absolute inset-0 bg-slate-900/90 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center text-white">
              <h2 className="text-[#fbbf24] text-5xl font-black mb-1 italic">PI-RING 2.0</h2>
              <p className="text-[10px] tracking-widest mb-8 opacity-60 uppercase">Grit leads to the Mainnet</p>
             
              <div className="bg-white/10 rounded-3xl p-6 mb-10 w-full text-left border border-white/10">
                <p className="text-sm mb-4">👋 Welcome, <span className="text-[#fbbf24] font-bold">{username}</span></p>
               
                <div className="space-y-3 text-[11px] leading-relaxed">
                  <p className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">❤️ 생명 차감:</span>
                    <span>파란/초록/노란 링을 <span className="text-red-400 underline underline-offset-2 font-bold">바닥에 놓치면</span> 하트가 차감됩니다!</span>
                  </p>
                  <p className="flex items-start gap-2">
                    <span className="text-orange-400 font-bold">🚫 폭탄 주의:</span>
                    <span>빨간 링을 잡으면 <span className="text-orange-400 font-bold">-100점</span> 감점! (피해도 무관)</span>
                  </p>
                  <p className="flex items-start gap-2 text-blue-300">
                    <span>✨ 팁: 막대는 중앙으로 돌아가지 않고 자유롭게 움직입니다.</span>
                  </p>
                </div>
                {authStatus && <p className="mt-4 text-[9px] text-center text-orange-400 animate-pulse">{authStatus}</p>}
              </div>

              <button onClick={startGame} className="bg-[#fbbf24] text-black text-2xl font-black py-5 px-16 rounded-2xl shadow-lg active:scale-95 transition-all">
                {gameState === "START" ? "START MISSION" : "RETRY"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
