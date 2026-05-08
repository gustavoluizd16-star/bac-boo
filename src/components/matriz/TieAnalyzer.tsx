/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { Layers, AlertCircle, TrendingUp, Info } from 'lucide-react';

interface TieAnalyzerProps {
  analysis?: {
    delays: Record<number, number>;
    highPayoutRisk: boolean;
    coverageRecommendation: number;
    mostFrequentSum?: number;
    lastTies: { sum: number; timestamp: number }[];
    payoutGroups: {
      label: string;
      sums: number[];
      payout: string;
      currentGap: number;
      avgGap: number;
      isCritical: boolean;
    }[];
    bestOpportunity?: string;
  };
}

export const TieAnalyzer: React.FC<TieAnalyzerProps> = ({ analysis }) => {
  if (!analysis) return null;

  return (
    <div className="bg-[#161B29] border border-white/5 rounded-[2rem] p-6 space-y-6 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-amber-500/20 p-2 rounded-xl">
            <Layers size={20} className="text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">Análise de Empates</h3>
            <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest mt-1 block">Rastreador de Payout Max</span>
          </div>
        </div>
        
        {analysis.highPayoutRisk && (
          <motion.div 
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{ duration: 1.5, repeat: Infinity }}
            className="px-3 py-1 bg-rose-500/10 rounded-lg border border-rose-500/30 flex items-center gap-2"
          >
            <AlertCircle size={10} className="text-rose-400" />
            <span className="text-[9px] font-black text-rose-400 uppercase tracking-tighter">Delay Crítico 88:1</span>
          </motion.div>
        )}
      </div>

      {/* PAINEL DE GAPS POR GRUPO */}
      <div className="grid grid-cols-5 gap-2 relative z-10">
        {(analysis.payoutGroups || []).map((group, idx) => (
          <div key={idx} className={clsx(
            "bg-white/5 border rounded-xl p-2 text-center transition-all",
            group.isCritical ? "border-amber-500/50 bg-amber-500/10 shadow-[0_0_15px_rgba(245,158,11,0.1)]" : "border-white/5"
          )}>
            <div className="text-[6px] font-black text-white/40 uppercase mb-1">{group.payout}</div>
            <div className={clsx(
              "text-xs font-black leading-none",
              group.isCritical ? "text-amber-400" : "text-white"
            )}>
              {group.currentGap}
            </div>
            <div className="text-[6px] font-bold text-white/20 uppercase mt-1">Gap</div>
            {group.isCritical && (
              <div className="w-full h-0.5 bg-amber-500 mt-1 rounded-full animate-pulse" />
            )}
          </div>
        ))}
      </div>

      {/* Grid: Histórico de Empates & Frequência */}
      <div className="grid grid-cols-2 gap-4 relative z-10">
        <div className="bg-white/5 border border-white/5 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
            <span className="text-[8px] font-black text-white/40 uppercase tracking-widest">Últimos 5 Empates</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_#10b981]" />
          </div>
          <div className="space-y-2">
            {(analysis.lastTies || []).length > 0 ? (analysis.lastTies || []).map((tie, i) => (
              <div key={i} className="flex items-center justify-between group/tie">
                <div className="flex items-center gap-2">
                   <div className="w-5 h-5 rounded bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-[10px] font-black text-amber-400">
                     {tie.sum}
                   </div>
                   <span className="text-[8px] font-bold text-white/60">Soma {tie.sum}</span>
                </div>
                <span className="text-[7px] font-mono text-white/20">#{i + 1}</span>
              </div>
            )) : (
              <div className="h-20 flex items-center justify-center text-[8px] text-white/20 font-black uppercase tracking-tighter italic">
                Aguardando sinais...
              </div>
            )}
          </div>
        </div>

        <div className="bg-white/5 border border-white/5 rounded-2xl p-4 flex flex-col justify-center items-center text-center group/freq">
            <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-3">Tendência de Payout</span>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full border-2 border-emerald-500/30 flex items-center justify-center relative">
                 <span className="text-xl font-black text-white italic">{analysis.mostFrequentSum || '?'}</span>
                 <div className="absolute inset-0 rounded-full border-t-2 border-emerald-500 animate-spin transition-all" />
              </div>
              <div className="text-left">
                <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block">Mais Ativo</span>
                <span className="text-[10px] font-bold text-white/60">Soma {analysis.mostFrequentSum}</span>
              </div>
            </div>
            <div className="w-full h-1 bg-white/10 rounded-full mt-4 overflow-hidden">
               <div className="w-full h-full bg-gradient-to-r from-emerald-500 to-amber-500 opacity-30" />
            </div>
        </div>
      </div>

      {/* Coverage Recommendation Dynamic */}
      <div className={clsx(
        "p-4 rounded-2xl relative z-10 transition-all duration-500 border",
        analysis.bestOpportunity ? "bg-amber-500/20 border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.1)]" : "bg-white/5 border-white/5"
      )}>
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col">
            <div className="flex items-center gap-2 mb-1">
               <span className="text-[8px] font-black text-amber-400 uppercase tracking-widest">Sugestão de Cobertura</span>
               {analysis.bestOpportunity && (
                 <span className="px-1.5 py-0.5 bg-amber-500 text-black text-[7px] font-black rounded uppercase animate-bounce">Foco: {analysis.bestOpportunity}</span>
               )}
            </div>
            <span className="text-[10px] font-bold text-white/60">
              {analysis.bestOpportunity ? "Oportunidade Estatística Detectada" : "Percentual da Stake Principal"}
            </span>
          </div>
          <div className="text-right">
             <motion.span 
              key={analysis.coverageRecommendation}
              initial={{ scale: 1.2, x: 20 }}
              animate={{ scale: 1, x: 0 }}
              className="text-2xl font-black text-amber-400 italic block leading-none"
             >
               {analysis.coverageRecommendation}%
             </motion.span>
             <span className="text-[6px] font-black text-white/20 uppercase tracking-tighter">da stake</span>
          </div>
        </div>
        
        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
           <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${(analysis.coverageRecommendation / 25) * 100}%` }}
             className={clsx(
               "h-full rounded-full shadow-[0_0_15px_rgba(245,158,11,0.5)]",
               analysis.bestOpportunity ? "bg-amber-500" : "bg-amber-500/50"
             )}
           />
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/5 pt-3">
           <p className="text-[8px] text-white/40 flex items-center gap-1.5 font-medium leading-relaxed italic">
             <Info size={10} className="text-amber-500/50" />
             {analysis.bestOpportunity 
               ? `Forte tendência para payouts altos (${analysis.bestOpportunity}).` 
               : "Aguardando anomalia de payout para sinalizar."}
           </p>
           {analysis.bestOpportunity && (
             <div className="flex items-center gap-1">
                <AlertCircle size={10} className="text-amber-400" />
                <span className="text-[8px] font-black text-amber-400 uppercase">Gap Crítico</span>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};
