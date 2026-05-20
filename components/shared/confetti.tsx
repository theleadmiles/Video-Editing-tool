"use client";

import { useEffect, useState } from "react";

interface ConfettiPiece {
  id: number;
  left: number;
  delay: number;
  duration: number;
  color: string;
  rotation: number;
}

const COLORS = ["#F0A500", "#FF4D4D", "#FFD700", "#FF8A00", "#FFFFFF"];

/**
 * Lightweight CSS-only confetti burst. Pass `trigger` (any changing value)
 * to fire a new burst. Auto-cleans after animation completes.
 */
export function Confetti({ trigger, count = 60 }: { trigger: unknown; count?: number }) {
  const [pieces, setPieces] = useState<ConfettiPiece[]>([]);

  useEffect(() => {
    if (!trigger) return;
    const newPieces: ConfettiPiece[] = Array.from({ length: count }, (_, i) => ({
      id: Date.now() + i,
      left: Math.random() * 100,
      delay: Math.random() * 0.3,
      duration: 2 + Math.random() * 1.5,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      rotation: Math.random() * 720 - 360,
    }));
    setPieces(newPieces);
    const timeout = setTimeout(() => setPieces([]), 4000);
    return () => clearTimeout(timeout);
  }, [trigger, count]);

  if (pieces.length === 0) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] overflow-hidden">
      {pieces.map((p) => (
        <span
          key={p.id}
          className="absolute top-[-20px] h-2.5 w-1.5 rounded-sm"
          style={{
            left: `${p.left}%`,
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ${p.delay}s linear forwards`,
            transform: `rotate(${p.rotation}deg)`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes confetti-fall {
          0% {
            transform: translateY(-20px) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(110vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
