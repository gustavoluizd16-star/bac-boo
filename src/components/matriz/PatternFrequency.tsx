/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { BacBoResult, Outcome } from '../../types';
import { TrendingUp, Zap, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx } from 'clsx';

interface PatternFrequencyProps {
  history: BacBoResult[];
  limit: number;
}

interface PatternStats {
  pattern: string;
  count: number;
  winRate: number;
  recommendation: Outcome;
}

export const PatternFrequency: React.FC<PatternFrequencyProps> = ({ history, limit }) => {
  const [activeAlert, setActiveAlert] = React.useState<{ pattern: string; recommendation: Outcome; winRate: number } | null>(null);
  const [lastProcessedId, setLastProcessedId] = React.useState<string | null>(null);

  const topPatterns = useMemo(() => {
    if (history.length < 10) return [];

    // Analyze last X rounds (cycle limit)
    // history is [newest, ..., oldest]
    const lastX = [...history.slice(0, limit)].reverse(); // [oldest, ..., newest]
    const triggerCounts: Record<string, Record<Outcome, number>> = {};
    const totalTriggers: Record<string, number> = {};

    for (let i = 0; i <= lastX.length - 4; i++) {
        const t1 = lastX[i].outcome;
        const t2 = lastX[i+1].outcome;
        const t3 = lastX[i+2].outcome;
        const result = lastX[i+3].outcome;

        const trigger = `${t1}-${t2}-${t3}`;
        
        if (!triggerCounts[trigger]) {
            triggerCounts[trigger] = { P: 0, B: 0, T: 0 };
            totalTriggers[trigger] = 0;
        }
        triggerCounts[trigger][result]++;
        totalTriggers[trigger]++;
    }

    const stats: PatternStats[] = Object.keys(triggerCounts).map(trigger => {
        const counts = triggerCounts[trigger];
        const total = totalTriggers[trigger];
        
        // Find most frequent next result
        let bestOutcome: Outcome = 'P';
        let maxCount = -1;
        (['P', 'B', 'T'] as Outcome[]).forEach(o => {
            if (counts[o] > maxCount) {
                maxCount = counts[o];
                bestOutcome = o;
            }
        });

        const winRate = (maxCount / total) * 100;

        return {
            pattern: trigger,
            count: total,
            winRate,
            recommendation: bestOutcome
        };
    });

    // Sort by winRate descending, then count descending (min count 2)
    return stats
      .filter(s => s.count >= 2)
      .sort((a, b) => b.winRate - a.winRate || b.count - a.count)
      .slice(0, 5);
  }, [history, limit]);

  // Alert logic
  React.useEffect(() => {
    if (history.length < 5 || topPatterns.length === 0) return;
    const latestId = history[0].id;
    if (latestId === lastProcessedId) return;

    // Check if the current last 3 results match one of the top patterns
    const currentT3 = history[2].outcome;
    const currentT2 = history[1].outcome;
    const currentT1 = history[0].outcome;
    const currentTrigger = `${currentT3}-${currentT2}-${currentT1}`;

    const match = topPatterns.find(p => p.pattern === currentTrigger && p.winRate >= 60);
    if (match) {
        setActiveAlert({ pattern: match.pattern, recommendation: match.recommendation, winRate: match.winRate });
        setLastProcessedId(latestId);
        // Clear alert after 8 seconds
        setTimeout(() => setActiveAlert(null), 8000);
    }
  }, [history, topPatterns, lastProcessedId]);

  if (history.length < 10) return null;

  return (
    <div className="glass-card p-6 space-y-5 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <AnimatePresence>
        {activeAlert && (
          <motion.div 
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="absolute top-4 left-4 right-4 z-50 bg-emerald-500 shadow-[0_0_30px_rgba(16,185,129,0.5)] rounded-2xl p-4 border border-white/20 backdrop-blur-xl"
          >
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-2 rounded-xl animate-pulse">
                <Zap size={20} className="text-white" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] font-black text-white/80 uppercase tracking-widest mb-0.5">Padrão Identificado!</p>
                <p className="text-xs font-black text-white leading-tight">
                  Entrada confirmada na cor <span className="underline decoration-2 underline-offset-2">{activeAlert.recommendation === 'P' ? 'PLAYER' : activeAlert.recommendation === 'B' ? 'BANKER' : 'EMPATE'}</span> após a sequência {activeAlert.pattern}
                </p>
              </div>
              <div className="text-right">
                <span className="text-xl font-black text-white italic">{activeAlert.winRate.toFixed(0)}%</span>
                <p className="text-[8px] font-bold text-white/60 uppercase">Assertividade</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-cyan-500/20 p-2 rounded-xl">
            <TrendingUp size={18} className="text-cyan-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">Matriz de Sequências</h3>
            <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest mt-1 block">Análise de {limit} Rodadas</span>
          </div>
        </div>
      </div>

      <div className="space-y-3 relative z-10">
        <div className="flex items-center text-[8px] font-black text-white/20 uppercase tracking-widest px-3 mb-1">
          <span className="flex-1">Sequência Gatilho (3x)</span>
          <span className="w-20 text-center">Taxa Acerto</span>
          <span className="w-16 text-right">Entrada</span>
        </div>

        {topPatterns.length > 0 ? topPatterns.map((p, idx) => (
          <div key={p.pattern} className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
            <div className="flex-1 flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                {p.pattern.split('-').map((char, i) => (
                  <span 
                    key={i} 
                    className={clsx(
                      "w-6 h-6 flex items-center justify-center rounded-lg text-[10px] font-black",
                      char === 'P' ? "bg-rose-500 text-white shadow-[0_0_8px_rgba(244,63,94,0.4)]" :
                      char === 'B' ? "bg-blue-600 text-white shadow-[0_0_8px_rgba(37,99,235,0.4)]" :
                      "bg-amber-500 text-white shadow-[0_0_8px_rgba(245,158,11,0.4)]"
                    )}
                  >
                    {char}
                  </span>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">
                  Frequência: {p.count}x
                </span>
                <div className="w-1 h-1 rounded-full bg-white/10" />
                <span className="text-[8px] font-black text-cyan-400 uppercase tracking-widest">
                  Top #{idx + 1}
                </span>
              </div>
            </div>

            <div className="w-20 flex flex-col items-center gap-1.5 border-x border-white/5 mx-4">
              <div className="flex items-center gap-1.5">
                <Zap size={10} className="text-emerald-400" />
                <span className="text-xs font-black text-emerald-400">{p.winRate.toFixed(1)}%</span>
              </div>
              <div className="w-14 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${p.winRate}%` }}
                  className={clsx(
                    "h-full rounded-full",
                    p.winRate >= 70 ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" :
                    p.winRate >= 50 ? "bg-amber-400" :
                    "bg-rose-500"
                  )}
                />
              </div>
            </div>

            <div className="w-16 flex flex-col items-end gap-1">
               <span 
                className={clsx(
                  "w-10 h-10 flex items-center justify-center rounded-xl text-lg font-black shadow-lg animate-pulse",
                  p.recommendation === 'P' ? "bg-rose-500 text-white shadow-rose-500/40" :
                  p.recommendation === 'B' ? "bg-blue-600 text-white shadow-blue-600/40" :
                  "bg-amber-500 text-white shadow-amber-500/40"
                )}
              >
                {p.recommendation}
              </span>
              <span className="text-[7px] font-bold text-white/20 uppercase tracking-tighter">Próxima</span>
            </div>
          </div>
        )) : (
          <div className="py-8 text-center bg-white/5 border border-dashed border-white/10 rounded-2xl">
            <span className="text-[10px] font-black text-white/20 uppercase tracking-widest">Dados insuficientes para análise</span>
          </div>
        )}
      </div>

      <p className="text-[8px] text-white/30 flex items-center gap-2 italic leading-relaxed relative z-10 px-1">
        <Info size={10} className="flex-shrink-0" />
        A taxa de acerto indica a probabilidade do 3º elemento seguir os 2 primeiros com base no histórico.
      </p>
    </div>
  );
};
