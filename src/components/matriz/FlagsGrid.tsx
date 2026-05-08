/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { MatrixFlag } from '../../types';
import { clsx } from 'clsx';
import { Activity, ShieldCheck, Flame, RefreshCcw, TrendingUp, Cpu } from 'lucide-react';

interface FlagsGridProps {
  flags: MatrixFlag[];
}

const FLAG_CONFIG: Record<string, { icon: React.ReactNode, color: string }> = {
  'SIGA O FLUXO': { icon: <TrendingUp size={12} />, color: 'border-cyan-500/20 text-cyan-400 bg-cyan-500/10' },
  'MESA EM XADREZ': { icon: <Activity size={12} />, color: 'border-purple-500/20 text-purple-400 bg-purple-500/10' },
  'RUPTURA': { icon: <RefreshCcw size={12} />, color: 'border-orange-500/20 text-orange-400 bg-orange-500/10' },
  'EXAUSTÃO': { icon: <Flame size={12} />, color: 'border-rose-500/20 text-rose-400 bg-rose-500/10' },
  'AI BOOST': { icon: <Cpu size={12} />, color: 'border-emerald-500/20 text-emerald-400 bg-emerald-500/10' },
  'SELO EV+': { icon: <ShieldCheck size={12} />, color: 'border-amber-500/20 text-amber-400 bg-amber-500/10' },
};

export const FlagsGrid: React.FC<FlagsGridProps> = ({ flags }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
      {(flags || []).map((flag) => {
        const config = FLAG_CONFIG[flag] || { icon: <Activity size={12} />, color: 'border-white/10 text-white/40 bg-white/5' };
        return (
          <div 
            key={flag}
            className={clsx(
              "flex items-center gap-2 px-3 py-2 rounded-xl border text-[10px] font-black italic tracking-widest transition-all hover:scale-105 active:scale-95 shadow-lg",
              config.color
            )}
          >
            {config.icon}
            <span className="uppercase">{flag}</span>
          </div>
        );
      })}
      {flags.length === 0 && (
         <div className="col-span-full border border-white/5 bg-white/5 rounded-xl p-3 text-center shadow-inner">
            <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.4em]">Aguardando Sincronização de Gatilhos...</span>
         </div>
      )}
    </div>
  );
};
