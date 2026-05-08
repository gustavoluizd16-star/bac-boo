/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BacBoResult } from '../../types';
import { clsx } from 'clsx';
import { FileText, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { motion } from 'motion/react';

interface AuditLogProps {
  history: BacBoResult[];
}

export const AuditLog: React.FC<AuditLogProps> = ({ history }) => {
  const recentHistory = history.filter(h => h.betAmount !== undefined && h.betAmount > 0).slice(0, 10);

  if (recentHistory.length === 0) return null;

  return (
    <section className="glass-card p-6 space-y-4 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="flex items-center gap-2 mb-2 relative z-10">
        <FileText size={14} className="text-white/30" />
        <h2 className="text-xs font-black uppercase tracking-widest text-white/30">Log de Auditoria Real-Flow</h2>
      </div>

      <div className="space-y-2 relative z-10">
        {recentHistory.map((h, idx) => {
          const profit = (h.winnings || 0) - (h.betAmount || 0);
          const isWin = profit > 0;
          const isDraw = profit === 0;

          return (
            <motion.div 
              key={h.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="group flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 border border-white/5 rounded-xl transition-all"
            >
              <div className="flex items-center gap-3">
                <div className={clsx(
                  "w-8 h-8 rounded-lg flex items-center justify-center font-black text-[10px]",
                  h.outcome === 'P' && "bg-blue-500/10 text-blue-400",
                  h.outcome === 'B' && "bg-rose-500/10 text-rose-400",
                  h.outcome === 'T' && "bg-amber-500/10 text-amber-400"
                )}>
                  {h.outcome}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-white/80 uppercase tracking-tight">Soma {h.sum}</span>
                  <span className="text-[8px] font-bold text-white/20">{new Date(h.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="text-[8px] font-black text-white/20 mt-0.5 uppercase">Aposta</div>
                  <div className="text-[10px] font-black text-white/60 tracking-tighter">R$ {h.betAmount?.toFixed(2)}</div>
                </div>
                
                <div className="w-px h-6 bg-white/10" />

                <div className="text-right min-w-[60px]">
                   <div className="flex items-center justify-end gap-1">
                      {isWin ? (
                        <TrendingUp size={10} className="text-emerald-400" />
                      ) : isDraw ? (
                        <Minus size={10} className="text-white/40" />
                      ) : (
                        <TrendingDown size={10} className="text-rose-400" />
                      )}
                      <span className={clsx(
                        "text-[10px] font-black tracking-tighter",
                        isWin ? "text-emerald-400" : isDraw ? "text-white/40" : "text-rose-400"
                      )}>
                        {profit >= 0 ? '+' : ''}R$ {profit.toFixed(2)}
                      </span>
                   </div>
                   <div className="text-[8px] font-bold text-white/20 uppercase">Fluxo</div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
};
