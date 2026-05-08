/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Terminal, Shield, Terminal as TerminalIcon } from 'lucide-react';
import { BacBoResult } from '../../types';

interface MatrixTerminalProps {
  history: BacBoResult[];
}

export const MatrixTerminal: React.FC<MatrixTerminalProps> = ({ history }) => {
  return (
    <section className="bg-black/40 backdrop-blur-md border border-white/5 rounded-xl p-4 font-mono h-full flex flex-col shadow-inner">
      <div className="flex items-center justify-between mb-3 pb-2 border-b border-white/5">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-3 h-3 text-cyan-400" />
          <h2 className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-400">Terminal de Log da Matriz</h2>
        </div>
        <Shield size={10} className="text-white/20" />
      </div>

      <div className="flex-1 space-y-1 overflow-y-auto pr-2 scrollbar-none text-[9px]">
        {history.length === 0 ? (
           <div className="text-white/20 italic animate-pulse">[SYSTEM] Aguardando inicialização de fluxo...</div>
        ) : (
          history.map((h, i) => (
            <div key={h.id || i} className="flex items-center gap-2 group animate-in fade-in slide-in-from-left-2 transition-all">
              <span className="text-white/20">[{new Date(h.timestamp).toLocaleTimeString()}]</span>
              <span className="text-white/40">ID#{(h.id || i).toString().slice(-4)}</span>
              <span className={h.outcome === 'P' ? 'text-blue-400' : h.outcome === 'B' ? 'text-rose-400' : 'text-amber-400'}>
                {h.outcome === 'P' ? 'PLAYER' : h.outcome === 'B' ? 'BANKER' : 'TIE'}
              </span>
              <span className="text-white/20">SOMA:{h.sum.toString().padStart(2, '0')}</span>
              <span className="text-emerald-500 opacity-0 group-hover:opacity-100 transition-opacity">OK</span>
            </div>
          ))
        )}
      </div>

      <div className="mt-4 pt-2 border-t border-white/5 text-white/20 text-[8px] flex justify-between uppercase font-bold tracking-widest">
         <span>Kernel: v3.0.DEUS</span>
         <span>Secure-Link: Estável</span>
      </div>
    </section>
  );
};
