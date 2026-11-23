"use client";

import { motion } from "motion/react";
import { useEffect } from "react";
import { TRIP } from "@/lib/types";

// Tela de abertura: pôr do sol retrô dos anos 80 sobre a serra,
// um coraçãozinho subindo a estrada e os nomes aparecendo letra por letra.
const ROAD =
  "M200 300 C 150 270, 260 250, 210 225 S 150 195, 196 178 S 214 162, 200 152";

export default function Splash({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3400);
    return () => clearTimeout(t);
  }, [onDone]);

  const names = TRIP.couple.split("");
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <motion.div
      className="splash"
      data-noheart
      onClick={onDone}
      initial={{ opacity: 1 }}
      exit={{ y: "-100%", borderBottomLeftRadius: 48, borderBottomRightRadius: 48 }}
      transition={{ duration: 0.75, ease: [0.76, 0, 0.24, 1] }}
      role="status"
      aria-label="Carregando o roteiro"
    >
      <svg className="splash-scene" viewBox="0 0 400 300" preserveAspectRatio="xMidYMax slice" aria-hidden>
        <defs>
          <linearGradient id="sun" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff3b8" />
            <stop offset="0.55" stopColor="#ffb08f" />
            <stop offset="1" stopColor="#ff7a9a" />
          </linearGradient>
          <mask id="sunStripes">
            <rect x="0" y="0" width="400" height="300" fill="#fff" />
            {[0, 1, 2, 3, 4].map((i) => (
              <rect key={i} x="0" y={128 + i * 11} width="400" height={2 + i * 1.3} fill="#000" />
            ))}
          </mask>
        </defs>

        {/* sol retrô nascendo */}
        <motion.g
          initial={{ y: 70, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.6, ease }}
        >
          <circle cx="200" cy="140" r="74" fill="url(#sun)" mask="url(#sunStripes)" />
        </motion.g>

        {/* montanhas ao fundo */}
        <motion.path
          d="M0 190 L60 150 L105 172 L165 128 L225 168 L280 135 L340 165 L400 140 L400 300 L0 300Z"
          fill="#c7b0f3"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.15, ease }}
        />
        <motion.path
          d="M0 215 L50 182 L110 205 L170 170 L240 200 L300 172 L360 198 L400 185 L400 300 L0 300Z"
          fill="#a183dc"
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1.2, delay: 0.3, ease }}
        />

        {/* chão e estrada */}
        <motion.g
          initial={{ y: 30, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 1, delay: 0.45, ease }}
        >
          <path d="M0 225 Q 200 200 400 225 L400 300 L0 300Z" fill="#6f4f9e" />
          <path d={ROAD} stroke="#ffe9e1" strokeWidth="11" fill="none" strokeLinecap="round" />
          <path d={ROAD} stroke="#f48aa4" strokeWidth="1.6" fill="none" strokeDasharray="5 6" />
        </motion.g>

        {/* pinheiros (araucárias) */}
        {[
          [40, 250, 1.1], [78, 262, 0.8], [330, 252, 1.2], [365, 266, 0.85], [118, 236, 0.6], [292, 238, 0.65],
        ].map(([x, y, s], i) => (
          <motion.g
            key={i}
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.7 + i * 0.07 }}
            style={{ transformOrigin: `${x}px ${y}px`, transformBox: "view-box" }}
          >
            <g transform={`translate(${x} ${y}) scale(${s})`}>
              <rect x="-1.6" y="-4" width="3.2" height="10" fill="#4a2d5e" />
              <path d="M0 -44 L-13 -14 L-6 -14 L-17 4 L17 4 L6 -14 L13 -14Z" fill="#4a2d5e" />
            </g>
          </motion.g>
        ))}

        {/* coraçãozinho subindo a estrada */}
        <motion.g initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}>
          <path
            d="M0 5.5s-6-3.7-7.4-7.7C-8.4-5-6.7-7.8-3.9-7.8c1.6 0 2.9.9 3.9 2.3 1-1.4 2.3-2.3 3.9-2.3 2.8 0 4.5 2.8 3.5 5.6C6 1.8 0 5.5 0 5.5Z"
            fill="#ef5a7c"
            stroke="#fff"
            strokeWidth="1.4"
          >
            <animateMotion
              path={ROAD}
              dur="2.1s"
              begin="0.9s"
              fill="freeze"
              calcMode="spline"
              keyTimes="0;1"
              keySplines="0.4 0 0.2 1"
            />
          </path>
        </motion.g>
      </svg>

      <div className="splash-text">
        <div className="splash-names display" aria-label={TRIP.couple}>
          {names.map((ch, i) => (
            <motion.span
              key={i}
              initial={{ y: 24, opacity: 0, filter: "blur(8px)" }}
              animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
              transition={{ duration: 0.7, delay: 0.35 + i * 0.045, ease }}
            >
              {ch}
            </motion.span>
          ))}
        </div>
        <motion.svg
          width="150"
          height="18"
          viewBox="0 0 150 18"
          style={{ display: "block", margin: "8px auto 0" }}
          aria-hidden
        >
          <motion.path
            d="M4 10 C 30 2, 50 16, 66 9 C 70 4, 78 4, 75 10 C 73 14, 68 13, 70 9 C 86 4, 110 16, 146 8"
            stroke="#fff"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 1.1, delay: 1.05, ease: "easeInOut" }}
          />
        </motion.svg>
        <motion.div
          className="splash-sub"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 0.92, y: 0 }}
          transition={{ delay: 1.5, duration: 0.6 }}
        >
          Gramado · Dezembro 2026
        </motion.div>
      </div>

      <motion.div className="splash-skip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }}>
        toque para entrar
      </motion.div>
    </motion.div>
  );
}
