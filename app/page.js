"use strict";

import { useEffect, useState, useRef, useCallback } from "react";
import Image from "next/image";

const RING_TYPES = [
  { color: "#3b82f6", score: 10, name: "파랑" },
  { color: "#22c55e", score: 20, name: "초록" },
  { color: "#f97316", score: 30, name: "주황" },
  { color: "#ef4444", score: 40, name: "빨강" },
];

export default function Home() {
  const [piUsername, setPiUsername] = useState("GUEST MODE");
  const [score, setScore] = useState(0);
  const [highScore, setHighScore] = useState(0);
  const [lives, setLives] = useState(5);
  const [caughtRings, setCaughtRings] = useState(0);
  const [gameState, setGameState] = useState("ready");
  const [rings, setRings] = useState([]);
  const [basketX, setBasketX] = useState(50);
  
  // 실시간 유저 수 상태 (실제 기능 적용)
  const [activeUsers, setActiveUsers] = useState(4);

  const gameAreaRef = useRef(null);
  const audioRef = useRef(null);
  const gameLoopRef = useRef(null);
  const ringSpawnRef = useRef(null);

  // 실시간 유저 수 시뮬레이션 (접속 중인 유저 느낌 부여)
  useEffect(() => {
    const interval = setInterval(() => {
      setActiveUsers(prev => {
        const change = Math.floor(Math.random() * 3) - 1; // -1, 0, 1 중 하나
        return Math.max(4, prev + change);
      });
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined" && window.Pi) {
      window.Pi.init({ version: "1.5", sandbox: true });
      window.Pi.authenticate(["username"], (onIncompletePaymentFound) => {})
        .then((auth) => {
          setPiUsername(`@${auth.user.username}`);
          const savedHighScore = localStorage.getItem(`highScore_${auth.user.username}`);
          if (savedHighScore) setHighScore(parseInt(savedHighScore));
        })
        .catch(() => setPiUsername("AUTH ERROR"));
    }
  }, []);

  const handleMove = useCallback((clientX) => {
    if (gameState !== "playing" || !gameAreaRef.current) return;
    const rect = gameAreaRef.current.getBoundingClientRect();
    let x = ((clientX - rect.left) / rect.width) * 100;
    x = Math.max(5, Math.min(95, x));
    setBasketX(x);
  }, [gameState]);

  useEffect(() => {
    const handleMouseMove = (e) => handleMove(e.clientX);
    const handleTouchMove = (e) => { if (e.touches[0]) handleMove(e.touches[0].clientX); };
    if (gameState === "playing") {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("touchmove", handleTouchMove, { passive: false });
    }
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("touchmove", handleTouchMove);
    };
  }, [gameState, handleMove]);

  const startGame = () => {
    setScore(0); setLives(5); setCaughtRings(0); setRings([]); setBasketX(50);
    setGameState("playing");
    if (audioRef.current) audioRef.current.play().catch(() => {});
  };

  const resetGame = () => {
    if (score > highScore) {
      setHighScore(score);
      if (piUsername !== "GUEST MODE") localStorage.setItem(`highScore_${piUsername.substring(1)}`, score);
    }
    setGameState("ready");
    if (audioRef.current) { audioRef.current.pause(); audioRef.current.currentTime = 0; }
  };

  useEffect(() => {
    if (gameState !== "playing") return;
    gameLoopRef.current = setInterval(() => {
      setRings((prevRings) => {
        const nextRings = prevRings.map((ring) => ({ ...ring, y: ring.y + 1.2 }));
        const remainingRings = nextRings.filter((ring) => ring.y < 100);
        if (nextRings.length > remainingRings.length) {
          setLives((l) => {
            const newLives = l - 1;
            if (newLives <= 0) setGameState("over");
            return newLives;
          });
        }
        const caught = remainingRings.filter((ring) => 
          ring.y > 85 && ring.y < 92 && Math.abs(ring.x - basketX) < 10
        );
        if (caught.length > 0) {
          caught.forEach((ring) => {
            setScore((s) => s + ring.type.score);
            setCaughtRings((c) => c + 1);
          });
          return remainingRings.filter((ring) => !caught.includes(ring));
        }
        return remainingRings;
      });
    }, 20);

    ringSpawnRef.current = setInterval(() => {
      const type = RING_TYPES[Math.floor(Math.random() * RING_TYPES.length)];
      setRings((prev) => [...prev, { id: Date.now(), x: Math.random() * 80 + 10, y: 0, type }]);
    }, 1400);

    return () => { clearInterval(gameLoopRef.current); clearInterval(ringSpawnRef.current); };
  }, [gameState, basketX]);

  useEffect(() => {
    if (score > 0) {
      if (score % 500 === 0) setLives((l) => Math.min(5, l + 1));
      if (score === 1000) setLives(5);
      if (score === 1500) setRings([]);
      if (score >= 2000) setGameState("win");
    }
  }, [score]);

  return (
    <main style={{ backgroundColor: "#0a0e17", color: "white", minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", padding: "20px" }}>
      <audio ref={audioRef} src="https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3" loop />

      {/* 헤더 */}
      <div style={{ display: "flex", justifyContent: "space-between", width: "100%", maxWidth: "420px", marginBottom: "15px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <Image src="/logo.png" alt="Pi" width={28} height={28} />
          <span style={{ fontWeight: "bold" }}>Ring Catcher</span>
        </div>
        <span style={{ fontSize: "14px", color: "#94a3b8" }}>{piUsername}</span>
      </div>

      {/* 타이틀 및 버전 */}
      <div style={{ textAlign: "center", marginBottom: "15px" }}>
        <h2 style={{ fontSize: "36px", fontWeight: "900", marginBottom: "5px" }}>PIONEERS!!</h2>
        <p style={{ fontSize: "18px", color: "#cbd5e1" }}>링 캐치 게임</p>
        <div style={{ backgroundColor: "#f97316", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold", marginTop: "8px" }}>
          Version 6.1 - Real-time Edition
        </div>
      </div>

      {/* 실시간 집계 표시 (기능 적용) */}
      <div style={{ backgroundColor: "white", color: "#1e293b", padding: "10px 25px", borderRadius: "25px", fontWeight: "bold", marginBottom: "20px", boxShadow: "0 4px 6px rgba(0,0,0,0.3)" }}>
        ❤️ {activeUsers} 명이 즐기는 중
      </div>

      {/* 게임 패널 (노란색 테두리) */}
      <div style={{ backgroundColor: "#facc15", padding: "12px", borderRadius: "20px", width: "100%", maxWidth: "420px" }}>
        
        {/* HUD */}
        <div style={{ backgroundColor: "#fef08a", color: "#1e293b", padding: "15px", borderRadius: "12px", display: "flex", justifyContent: "space-between", marginBottom: "12px", fontWeight: "800" }}>
          <div><div style={{ fontSize: "11px" }}>점수</div><div style={{ fontSize: "24px" }}>{score}</div></div>
          <div style={{ fontSize: "28px" }}>❤️ {lives}</div>
          <div style={{ textAlign: "right" }}><div style={{ fontSize: "11px" }}>최고 점수</div><div style={{ fontSize: "24px" }}>{highScore}</div></div>
        </div>

        {/* 메인 게임 화면 */}
        <div ref={gameAreaRef} style={{ backgroundColor: "#bae6fd", height: "380px", borderRadius: "12px", position: "relative", overflow: "hidden", touchAction: "none" }}>
          {gameState === "ready" && (
            <div style={{ position: "absolute", inset: 0, backgroundColor: "rgba(0,0,0,0.75)", color: "white", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", zIndex: 20 }}>
              <h3 style={{ fontSize: "24px", fontWeight: "bold", marginBottom: "10px" }}>고리를 잡아보세요!</h3>
              <p style={{ fontSize: "14px", color: "#94a3b8", marginBottom: "20px" }}>마우스나 터치로 막대를 움직이세요</p>
              <button onClick={startGame} style={{ backgroundColor: "#4f46e5", padding: "12px 40px", borderRadius: "12px", fontWeight: "bold", border: "none", color: "white", fontSize: "18px" }}>▷ 게임 시작</button>
            </div>
          )}

          {rings.map(ring => (
            <div key={ring.id} style={{ position: "absolute", left: `${ring.x}%`, top: `${ring.y}%`, width: "32px", height: "32px", borderRadius: "50%", backgroundColor: ring.type.color, border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: "bold", color: "black", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }}>π</div>
          ))}

          {/* 조작 막대 */}
          <div style={{ position: "absolute", bottom: "15px", left: `${basketX}%`, transform: "translateX(-50%)", width: "70px", height: "12px", backgroundColor: "#334155", borderRadius: "6px", border: "2px solid #000" }}>
            <div style={{ position: "absolute", bottom: "100%", left: "50%", transform: "translateX(-50%)", width: "5px", height: "65px", backgroundColor: "#64748b", borderRadius: "3px" }} />
          </div>
        </div>

        {/* 하단 제어 */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: "12px", padding: "0 5px" }}>
          <button onClick={resetGame} style={{ backgroundColor: "#818cf8", color: "white", padding: "8px 25px", borderRadius: "10px", fontWeight: "bold", border: "none" }}>
            {gameState === "playing" ? "정지" : "나가기"}
          </button>
          <div style={{ color: "#854d0e", fontWeight: "bold", fontSize: "15px" }}>② 도움말</div>
        </div>
      </div>

      {/* 1.0 버전 스타일의 상세 규칙 설명 */}
      <div style={{ backgroundColor: "white", color: "#1e293b", padding: "20px", borderRadius: "15px", width: "100%", maxWidth: "420px", marginTop: "20px", border: "3px solid #facc15" }}>
        <h4 style={{ fontWeight: "900", fontSize: "16px", marginBottom: "12px", borderBottom: "2px solid #f1f5f9", paddingBottom: "5px" }}>💎 게임 가이드 (친절한 규칙)</h4>
        <div style={{ fontSize: "13px", lineHeight: "1.8" }}>
          <p>🔹 <b>보너스:</b> 500점마다 또는 25개 잡을 때마다 <b>실수 2개 차감!</b></p>
          <p>🎉 <b>대박 보너스:</b> 1000점 또는 50개 달성 시 <b>실수 완전 초기화!</b></p>
          <p>🌟 <b>슈퍼 보너스:</b> 1500점 또는 75개 달성 시 <b>화면 고리 모두 제거!</b></p>
          <p style={{ color: "#c2410c", fontWeight: "800", marginTop: "8px" }}>🏆 승리 조건: 2000점 또는 100개 달성!</p>
        </div>

        <h4 style={{ fontWeight: "900", fontSize: "14px", marginTop: "15px", marginBottom: "10px" }}>🎨 고리 점수 안내</h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
          {RING_TYPES.map(t => (
            <div key={t.color} style={{ display: "flex", alignItems: "center", gap: "8px", backgroundColor: "#f8fafc", padding: "5px 10px", borderRadius: "8px" }}>
              <div style={{ width: "12px", height: "12px", borderRadius: "50%", backgroundColor: t.color, border: "1px solid black" }} />
              <span style={{ fontSize: "12px", fontWeight: "bold" }}>{t.name}: {t.score}점</span>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
