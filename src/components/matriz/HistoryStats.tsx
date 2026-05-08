import React from 'react';
import { motion } from 'motion/react';
import { LayoutDashboard, Users, Landmark, Scale, Hash } from 'lucide-react';
import { clsx } from 'clsx';

interface HistoryStatsProps {
  stats: {
    player: number;
    banker: number;
    tie: number;
  };
}

export const HistoryStats: React.FC<HistoryStatsProps> = ({ stats }) => {
  const total = stats.player + stats.banker + stats.tie || 1;
  const playerPct = (stats.player / total) * 100;
  const bankerPct = (stats.banker / total) * 100;

  const cards = [
    {
      label: 'PLAYER',
      value: stats.player,
      pct: playerPct,
      color: 'text-blue-400',
      glowClass: 'text-glow-blue',
      stroke: 'stroke-blue-500'
    },
    {
      label: 'BANKER',
      value: stats.banker,
      pct: bankerPct,
      color: 'text-rose-500',
      glowClass: 'text-glow-rose',
      stroke: 'stroke-rose-500'
    },
    {
      label: 'TIE',
      value: stats.tie,
      color: 'text-amber-400',
      glowClass: 'text-glow-amber'
    },
    {
      label: 'TOTAL',
      value: total === 1 && stats.player + stats.banker + stats.tie === 0 ? 0 : stats.player + stats.banker + stats.tie,
      color: 'text-white',
      glowClass: 'text-glow-white'
    }
  ];

  return (
    <div className="glass-card p-5 mb-6 overflow-hidden">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <LayoutDashboard size={14} className="text-white/30" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
            Últimos Resultados
          </h2>
        </div>
        <div className="flex gap-4">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
            <span className="text-[9px] font-bold text-white/40 uppercase">Player {playerPct.toFixed(0)}%</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.5)]" />
            <span className="text-[9px] font-bold text-white/40 uppercase">Banker {bankerPct.toFixed(0)}%</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {cards.map((card, idx) => (
          <motion.div
            key={card.label}
            whileHover={{ scale: 1.02 }}
            className="relative flex flex-col items-center justify-center p-3 rounded-xl bg-white/[0.02] border border-white/[0.05]"
          >
            {card.pct !== undefined ? (
              <div className="relative w-16 h-16 mb-2">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="4"
                    className="text-white/5"
                  />
                  <motion.circle
                    cx="32"
                    cy="32"
                    r="28"
                    fill="transparent"
                    stroke="currentColor"
                    strokeWidth="4"
                    strokeDasharray={2 * Math.PI * 28}
                    initial={{ strokeDashoffset: 2 * Math.PI * 28 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 28 * (1 - card.pct / 100) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                    className={card.stroke}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className={clsx("text-xl font-black italic tracking-tighter", card.color, card.glowClass)}>
                    {card.value}
                  </span>
                </div>
              </div>
            ) : (
              <div className="mb-2 h-16 flex items-center justify-center">
                <span className={clsx("text-4xl font-black italic tracking-tighter", card.color, card.glowClass)}>
                  {card.value}
                </span>
              </div>
            )}
            
            <span className="text-[8px] font-black uppercase tracking-widest text-white/30">
              {card.label}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
};
