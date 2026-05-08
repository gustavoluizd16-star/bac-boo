/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Wallet, TrendingUp, Info, RotateCcw } from 'lucide-react';
import { clsx } from 'clsx';
import { motion } from 'motion/react';

interface BankPanelProps {
  balance: number;
  onUpdateBalance: (val: number) => void;
  onReset: () => void;
  stats: {
    roi: number;
    yield: number;
    evolution: number[];
  };
}

export const BankPanel: React.FC<BankPanelProps> = ({ balance, onUpdateBalance, onReset, stats }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [inputVal, setInputVal] = useState(balance.toString());

  const suggestions = [
    { label: 'ENTRADA (1%)', val: balance * 0.01 },
    { label: 'AGRESSIVA (2.5%)', val: balance * 0.025 },
    { label: 'ELITE (5%)', val: balance * 0.05 },
    { label: 'PROTEÇÃO (1%)', val: balance * 0.01, isTie: true },
  ];

  return (
    <section className="glass-card p-6 space-y-6 relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="flex items-center justify-between relative z-10">
        <div className="flex items-center gap-2">
          <Wallet className="w-4 h-4 text-amber-500" />
          <h2 className="text-xs font-black uppercase tracking-widest text-amber-500">Painel da Banca</h2>
        </div>
        <button onClick={onReset} className="text-white/20 hover:text-white transition-colors">
          <RotateCcw size={14} />
        </button>
      </div>

      <div className="bg-white/5 border border-white/5 p-4 rounded-xl relative group z-10">
        <span className="text-[8px] font-black text-white/30 uppercase tracking-widest block mb-1">Saldo em Matriz</span>
        <div className="flex items-center justify-between">
          {isEditing ? (
            <input 
              autoFocus
              type="number"
              value={inputVal}
              onChange={(e) => setInputVal(e.target.value)}
              onBlur={() => {
                onUpdateBalance(parseFloat(inputVal) || 0);
                setIsEditing(false);
              }}
              className="text-3xl font-black text-white bg-transparent outline-none w-full border-b border-cyan-500"
            />
          ) : (
            <div className="flex items-baseline gap-2 cursor-pointer" onClick={() => setIsEditing(true)}>
              <span className="text-3xl font-black text-white italic tracking-tighter">
                R$ {balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </div>
          )}

          {/* Mini Sparkline Evolution */}
          <div className="flex gap-0.5 items-end h-8">
            {(stats.evolution || []).map((val, i) => (
              <div 
                key={i} 
                className="w-1 bg-cyan-500/30 rounded-t-sm transition-all hover:bg-cyan-400"
                style={{ height: `${Math.max(10, Math.min(100, val))}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* ROI & YIELD Metrics */}
      <div className="grid grid-cols-2 gap-2 relative z-10">
        <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
          <span className="text-[7px] font-black text-white/30 uppercase tracking-widest block mb-0.5">ROI (Retorno)</span>
          <span className={clsx(
            "text-sm font-black",
            stats.roi >= 100 ? "text-emerald-400" : "text-rose-400"
          )}>
            {stats.roi.toFixed(1)}%
          </span>
        </div>
        <div className="bg-white/5 border border-white/5 p-3 rounded-xl">
          <span className="text-[7px] font-black text-white/30 uppercase tracking-widest block mb-0.5">Yield (Eficiência)</span>
          <span className={clsx(
            "text-sm font-black",
            stats.yield >= 0 ? "text-cyan-400" : "text-rose-400"
          )}>
            {stats.yield >= 0 ? '+' : ''}{stats.yield.toFixed(1)}%
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 relative z-10">
        {suggestions.map((s) => (
          <button
            key={s.label}
            className={clsx(
              "p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 transition-all text-left flex flex-col gap-1",
              s.isTie && "border-amber-500/20 hover:border-amber-500/40"
            )}
          >
            <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">{s.label}</span>
            <span className={clsx("text-sm font-black italic", s.isTie ? "text-amber-400" : "text-white/80")}>
              R$ {s.val.toFixed(2).replace('.', ',')}
            </span>
          </button>
        ))}
      </div>

      <div className="pt-4 border-t border-white/5 space-y-3 relative z-10">
        <h3 className="text-[10px] font-black text-white/30 uppercase tracking-widest flex items-center gap-2">
          <Info size={10} /> Tabela de Pagamentos (Empate)
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-[9px] font-black">
          <div className="flex justify-between text-white/20"><span>Soma 2/12:</span> <span className="text-amber-500">88:1</span></div>
          <div className="flex justify-between text-white/20"><span>Soma 3/11:</span> <span className="text-amber-600">25:1</span></div>
          <div className="flex justify-between text-white/20"><span>Soma 4/10:</span> <span className="text-amber-600">10:1</span></div>
          <div className="flex justify-between text-white/20"><span>Soma 5-9:</span> <span className="text-amber-600">6:1</span></div>
        </div>
      </div>
    </section>
  );
};
