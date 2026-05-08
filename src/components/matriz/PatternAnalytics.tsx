/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { Activity, Clock, BarChart3, Info } from 'lucide-react';
import { FrequencyStats } from '../../types';

interface PatternAnalyticsProps {
  stats: FrequencyStats;
}

export const PatternAnalytics: React.FC<PatternAnalyticsProps> = ({ stats }) => {
  return (
    <div className="glass-card p-6 space-y-6 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-3">
          <div className="bg-rose-500/20 p-2 rounded-xl">
            <Activity size={20} className="text-rose-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-widest leading-none">Frequência de Padrão</h3>
            <span className="text-[8px] text-white/40 font-bold uppercase tracking-widest mt-1 block">Análise Histórica HFT</span>
          </div>
        </div>
        
        <div className="px-3 py-1 bg-rose-500/10 rounded-lg border border-rose-500/20">
          <span className="text-[10px] font-black text-rose-400 uppercase tracking-tighter truncate max-w-[100px]">
            {stats.pattern}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-2 relative z-10">
        {[
          { label: '2 Horas', val: stats.count2h, icon: Clock },
          { label: '6 Horas', val: stats.count6h, icon: BarChart3 },
          { label: '12 Horas', val: stats.count12h, icon: Activity },
        ].map((item, i) => (
          <div key={i} className="bg-white/5 border border-white/5 p-3 rounded-2xl flex flex-col items-center text-center">
            <item.icon size={12} className="text-white/20 mb-2" />
            <span className="text-[7px] font-black text-white/30 uppercase tracking-widest mb-1">{item.label}</span>
            <span className="text-sm font-black text-white">{item.val}x</span>
          </div>
        ))}
      </div>

      <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl relative z-10">
        <div className="flex justify-between items-center mb-3">
          <div className="flex flex-col">
            <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest">Assertividade Pós-Padrão</span>
            <span className="text-[10px] font-bold text-white/60">PRÓXIMA: {stats.recommendation === 'P' ? 'PLAYER' : 'BANKER'}</span>
          </div>
          <span className="text-xs font-black text-emerald-400">{stats.winRateAfter.toFixed(1)}%</span>
        </div>
        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
           <motion.div 
             initial={{ width: 0 }}
             animate={{ width: `${stats.winRateAfter}%` }}
             className="h-full bg-emerald-500"
           />
        </div>
        <p className="text-[8px] text-white/40 mt-3 flex items-center gap-1.5 font-medium leading-relaxed italic">
          <Info size={10} />
          Probabilidade calculada com base na recorrência do padrão nos últimos 100 ciclos.
        </p>
      </div>
    </div>
  );
};
