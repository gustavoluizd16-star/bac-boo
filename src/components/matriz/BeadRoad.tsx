/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BacBoResult } from '../../types';
import { clsx } from 'clsx';
import { History as HistoryIcon, RefreshCcw } from 'lucide-react';
import { motion } from 'motion/react';

interface BeadRoadProps {
  history: BacBoResult[];
  onReset: () => void;
  onImport: () => void;
  selectedSum: number | null;
  onSelectSum: (sum: number | null) => void;
}

export const BeadRoad: React.FC<BeadRoadProps> = ({ 
  history, 
  onReset, 
  onImport, 
  selectedSum, 
  onSelectSum 
}) => {
  const rows = 6;
  const cols = 10; // 6 rows * 10 columns = 60 items as requested
  const totalCells = rows * cols;
  
  // 1. Optimized tendency calculations (Single Pass)
  const trends = React.useMemo(() => {
    const limits = [10, 50, 100, 200]; // Still process 200 for stats
    
    return limits.map(limit => {
      const subset = history.slice(0, limit);
      const total = subset.length;
      if (total === 0) return { n: limit, p: 0, b: 0, t: 0 };
      
      let p = 0, b = 0, t = 0;
      for (let i = 0; i < total; i++) {
        const outcome = subset[i].outcome;
        if (outcome === 'P') p++;
        else if (outcome === 'B') b++;
        else if (outcome === 'T') t++;
      }
      
      return {
        n: limit,
        p: (p / total) * 100,
        b: (b / total) * 100,
        t: (t / total) * 100
      };
    });
  }, [history]);

  // 2. Map cells for the windowed grid
  const cells = React.useMemo(() => {
    const visibleHistory = history.slice(0, totalCells);
    const result = new Array(totalCells).fill(null);
    for (let i = 0; i < visibleHistory.length; i++) {
      result[i] = visibleHistory[i];
    }
    return result;
  }, [history, totalCells]);

  return (
    <section className="glass-card p-3 lg:p-4 space-y-4 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      {/* Trends Bar */}
      <div className="grid grid-cols-3 gap-2 relative z-10 p-1 bg-black/40 rounded-2xl border border-white/5">
        {trends.map(t => (
          <div key={t.n} className="flex flex-col items-center py-2 px-1 border-r last:border-r-0 border-white/5">
            <span className="text-[7px] font-black text-white/30 uppercase tracking-widest mb-1">{t.n} RODADAS</span>
            <div className="flex gap-1 w-full h-1 rounded-full overflow-hidden">
               <div className="bg-blue-500 transition-all duration-1000" style={{ width: `${t.p}%` }} title={`Player: ${t.p.toFixed(0)}%`} />
               <div className="bg-amber-500 transition-all duration-1000" style={{ width: `${t.t}%` }} title={`Tie: ${t.t.toFixed(0)}%`} />
               <div className="bg-rose-500 transition-all duration-1000" style={{ width: `${t.b}%` }} title={`Banker: ${t.b.toFixed(0)}%`} />
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2">
              <HistoryIcon size={14} className="text-blue-400" />
              <h2 className="text-xs font-black uppercase tracking-widest text-white/30">Placa de Contas</h2>
           </div>
           
           <button 
             onClick={onReset}
             className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-white transition-all focus:outline-none focus:ring-1 focus:ring-white/20"
           >
             <RefreshCcw size={10} />
             Resetar
           </button>

           <button 
             onClick={onImport}
             className="flex items-center gap-1.5 px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/5 rounded-lg text-[9px] font-black uppercase tracking-widest text-emerald-400 transition-all focus:outline-none focus:ring-1 focus:ring-white/20"
           >
             <HistoryIcon size={10} />
             Importar
           </button>

           {selectedSum !== null && (
             <button 
               onClick={() => onSelectSum(null)}
               className="flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-black border border-amber-600 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all animate-pulse"
             >
               Limpar Destaque ({selectedSum})
             </button>
           )}
        </div>
        <div className="flex gap-3">
           <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-rose-600 shadow-[0_0_8px_rgba(225,29,72,0.4)]" />
              <span className="text-[10px] text-white/40 font-bold">B</span>
           </div>
           <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-blue-600 shadow-[0_0_8px_rgba(37,99,235,0.4)]" />
              <span className="text-[10px] text-white/40 font-bold">P</span>
           </div>
           <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
              <span className="text-[10px] text-white/40 font-bold">T</span>
           </div>
        </div>
      </div>

      <div 
        className="w-full overflow-x-auto pb-4 custom-scrollbar relative z-10 scroll-smooth"
      >
        <div 
          className="grid gap-2 p-3 bg-black/40 rounded-2xl border border-white/5 min-w-max shadow-inner"
          style={{ 
            gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gridAutoFlow: 'column'
          }}
        >
          {cells.map((cell, i) => {
            const cellId = cell?.id || `empty-${i}`;
            const isHighlighted = selectedSum !== null && cell?.sum === selectedSum;
            const isDimmed = selectedSum !== null && cell?.sum !== selectedSum;

            return (
              <div 
                key={cellId}
                onClick={() => cell && onSelectSum(selectedSum === cell.sum ? null : cell.sum)}
                className={clsx(
                  "w-12 h-12 sm:w-16 sm:h-16 rounded-xl border flex flex-col justify-center items-center transition-all duration-300 relative group/cell cursor-pointer",
                  cell?.outcome === 'P' && "bg-blue-600 border-blue-400/50 text-white shadow-[0_0_20px_rgba(37,99,235,0.2)]",
                  cell?.outcome === 'B' && "bg-rose-600 border-rose-400/50 text-white shadow-[0_0_20px_rgba(225,29,72,0.2)]",
                  cell?.outcome === 'T' && "bg-amber-500 border-amber-400/50 text-black shadow-[0_0_20px_rgba(245,158,11,0.2)]",
                  !cell && "bg-white/[0.02] border-white/5",
                  isHighlighted && "ring-4 ring-white border-white shadow-[0_0_25px_rgba(255,255,255,1)] z-20 scale-105",
                  isDimmed && "opacity-20 grayscale-[0.5] shadow-none border-transparent"
                )}
              >
                {cell && (
                  <motion.div
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex flex-col items-center justify-center w-full h-full relative"
                  >
                    <span className="text-sm sm:text-base font-black drop-shadow-md leading-none mb-1">{cell.sum}</span>
                    <span className="text-[8px] sm:text-[9px] font-bold opacity-60 tracking-tighter">
                      {new Date(cell.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                    <div className="absolute inset-0 bg-white/10 opacity-0 group-hover/cell:opacity-100 transition-opacity rounded-xl pointer-events-none" />
                  </motion.div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
};
