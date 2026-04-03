"use client";

import { useEffect, useRef, useState } from "react";

// --- 게임 설정 상수 (2.0 버전 최적화) ---
const CANVAS_WIDTH = 400;
const CANVAS_HEIGHT = 600;
const POLE_WIDTH = 10;
const POLE_HEIGHT = 380;
const RING_OUTER_RADIUS = 40;
const RING_INNER_RADIUS = 20;
const RING_THICKNESS = 18;
const INITIAL_DROP_SPEED = 2.5; 
const INITIAL_LIVES = 5;
const CATCH_TOLERANCE = 18;

const RING_TYPES = [
  { color: "#3b82f6", points: 10, weight: 5 },
  { color: "#10b981", points: 20, weight: 3 },
  { color: "#f59e0b", points: 30, weight: 2 },
  { color: "#ef4444", points: 50, weight: 1 }, // 보너스 링
  { color: "#fbbf24", points: 100, weight: 0.3 }, // 레어 링
];

export default function RingCatcherGame() {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(INITIAL_LIVES);
  const [gameState, setGameState] = useState("START"); // START, PLAYING, GAMEOVER
  const [username, setUsername] = useState("Pioneer");
  const [combo, setCombo] = useState(0);
  const [authStatus, setAuthStatus] = useState("READY"); // 인증 상태 표시용

  // 사운드 관리 (sounds 복수형 경로)
  const sounds = useRef({
    bgm: typeof Audio !== "undefined" ? new Audio("/sounds/bgm.mp3") : null,
    catch: typeof Audio !== "undefined" ? new Audio("/sounds/catch.mp3") : null,
    bomb: typeof Audio !== "undefined" ? new Audio("/sounds/bomb.mp3") : null,
    fever: typeof Audio !== "undefined" ? new Audio("/sounds/fever.mp3") : null,
    gameover: typeof Audio !== "undefined" ? new Audio("/sounds/gameover.mp3") : null,
  });

  const playEffect = (type) => {
    try {
      const s = sounds.current[type];
      if (s) {
        s.currentTime = 0;
        s.play().catch(() => {});
      }
    } catch (e) {}
  };

  // --- [인증 강화] 파이 SDK 인증 로직 ---
  useEffect(() => {
    const initPi = async () => {
      if (window.Pi) {
        try {
          setAuthStatus("INITIALIZING...");
          // 실배포 시에는 sandbox: false로 설정하세요.
          await window.Pi.init({ version: "1.5", sandbox: true });
          
          // 팝업 차단 방지를 위한 약간의 지연 (0.8초)
          setTimeout(() => {
            window.Pi.authenticate(['username'], (payment) => {})
              .then((auth) => {
                setUsername(auth.user.username);
                setAuthStatus("SUCCESS");
              })
              .catch((err) => {
                console.error("Auth Error:", err);
                setAuthStatus("AUTH ERROR");
              });
          }, 800);
        } catch (err) {
          setAuthStatus("INIT ERROR");
        }
      }
    };
    initPi();
  }, []);

  const startGame = () => {
    setScore(0);
    setLives(INITIAL_LIVES);
    setCombo(0);
    setGameState("PLAYING");
    if (sounds.current.bgm) {
      sounds.current.bgm.loop = true;
      sounds.current.bgm.volume = 0.5;
      sounds.current.bgm.play().catch(() => {});
    }
  };

  useEffect(() => {
    if (gameState !== "PLAYING") return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    let animationFrameId;
    
    let rodX = CANVAS_WIDTH / 2;
    let rings = [];
    let caughtRings = [];
    let frameCount = 0;
    
    // 점수에 따른 가변 속도 계산 (2.0 핵심 로직)
    const getCurrentSpeed = (s) => INITIAL_DROP_SPEED + Math.floor(s / 300) * 0.5;

    const gameLoop = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      // 1. 가이드 텍스트
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)";
      ctx.font = "bold 16px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("VERSION 2.0 MAINNET EDITION", CANVAS_WIDTH / 2, 30);

      // 2. 막대 그리기
      ctx.fillStyle = "#64748b";
      ctx.fillRect(rodX - POLE_WIDTH / 2, CANVAS_HEIGHT - POLE_HEIGHT, POLE_WIDTH, POLE_HEIGHT);
      ctx.fillStyle = "#475569";
      ctx.fillRect(rodX - (POLE_WIDTH+4) / 2, CANVAS_HEIGHT - 20, POLE_WIDTH+4, 20);

      // 3. 링 생성 (점수가 높을수록 생성 간격 단축)
      const spawnInterval = Math.max(30, 90 - Math.floor(score / 500) * 10);
      if (frameCount % spawnInterval === 0) {
        const type = RING_TYPES[Math.floor(Math.random() * RING_TYPES.length)];
        rings.push({
          x: Math.random() * (CANVAS_WIDTH - 80) + 40,
          y: -50,
          ...type
        });
      }

      // 4. 링 이동 및 충돌
      rings = rings.filter(ring => {
        ring.y += getCurrentSpeed(score);

        const dist = Math.abs(ring.x - rodX);
        const hitTop = CANVAS_HEIGHT - POLE_HEIGHT;

        if (dist < CATCH_TOLERANCE && ring.y > hitTop && ring.y < hitTop + 25) {
          // 캐치 성공!
          const bonus = Math.floor(combo / 5) * 10; // 콤보 보너스
          setScore(prev => {
            const next = prev + ring.points + bonus;
            if (next > 0 && next % 500 === 0) playEffect('fever');
            return next;
          });
          setCombo(prev => prev + 1);
          playEffect('catch');
          caughtRings.push({ ...ring, caughtY: CANVAS_HEIGHT - (caughtRings.length * 15) - 35 });
          return false;
        }

        if (ring.y > CANVAS_HEIGHT) {
          // 놓침
          setLives(prev => {
            if (prev <= 1) {
              setGameState("GAMEOVER");
              playEffect('gameover');
              if (sounds.current.bgm) sounds.current.bgm.pause();
            }
            return prev - 1;
          });
          setCombo(0);
          playEffect('bomb');
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

      // 5. 쌓인 링
      caughtRings.slice(-25).forEach((r) => {
        ctx.beginPath();
        ctx.arc(rodX, r.caughtY, RING_OUTER_RADIUS / 1.5, 0, Math.PI * 2);
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
      rodX = Math.max(20, Math.min(CANVAS_WIDTH - 20, x));
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
      <div className="w-full max-w-md bg-white rounded-[2.5rem] overflow-hidden shadow-2xl border-[12px] border-[#fbbf24] relative">
        
        {/* 점수/라이프 UI */}
        <div className="p-6 flex justify-between items-center bg-gray-50 border-b-2">
          <div>
            <p className="text-[10px] font-black text-gray-400">SCORE</p>
            <p className="text-4xl font-black text-blue-600 leading-tight">{score}</p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-black text-orange-500 mb-1">{combo} COMBO</p>
            <div className="flex gap-1">
              {Array.from({ length: INITIAL_LIVES }).map((_, i) => (
                <span key={i} className={`text-xl ${i < lives ? '' : 'grayscale opacity-30'}`}>❤️</span>
              ))}
            </div>
          </div>
        </div>

        {/* 게임 화면 */}
        <div className="relative bg-[#bae6fd]">
          <canvas ref={canvasRef} width={CANVAS_WIDTH} height={CANVAS_HEIGHT} className="w-full h-auto touch-none" />
          
          {/* 시작/종료 오버레이 */}
          {gameState !== "PLAYING" && (
            <div className="absolute inset-0 bg-black/75 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center text-white">
              <h2 className="text-[#fbbf24] text-5xl font-black mb-1 italic">PI-RING</h2>
              <p className="text-[10px] tracking-widest font-black mb-6 opacity-60">VERSION 2.0 MAINNET EDITION</p>
              
              <div className="bg-white/10 rounded-2xl p-5 mb-8 w-full text-sm space-y-3">
                <p>🙋 ♂️ <span className="text-[#fbbf24]">{username}</span>님 환영합니다!</p>
                <p>🎯 <span className="text-blue-300">승리 조건:</span> 최대한 많은 링을 쌓으세요!</p>
                <p>📈 <span className="text-green-300">난이도:</span> 300점마다 속도가 빨라집니다.</p>
                <p>🎁 <span className="text-orange-300">보너스:</span> 5콤보마다 추가 점수 획득!</p>
                {authStatus !== "SUCCESS" && <p className="text-[10px] text-red-400">인증 상태: {authStatus}</p>}
              </div>

              <button 
                onClick={startGame}
                className="bg-[#fbbf24] hover:scale-105 active:scale-95 transition-all text-black text-2xl font-black py-5 px-14 rounded-full shadow-lg"
              >
                {gameState === "START" ? "START GAME" : "RETRY"}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
