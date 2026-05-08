/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, Shield, Cpu, Bell, Timer, Target } from 'lucide-react';
import { AppSettings } from '../../types';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdate: (s: AppSettings) => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({ settings, onUpdate, onClose }) => {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative bg-[#161B29] border border-white/5 w-full max-w-md rounded-[2rem] overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="bg-white/5 px-6 py-4 flex items-center justify-between border-b border-white/5">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-cyan-400" />
            <h2 className="text-xs font-black uppercase tracking-widest text-white/80">Configurações da Matriz</h2>
          </div>
          <button onClick={onClose} className="text-white/30 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Automação */}
          <div className="space-y-3">
             <div className="flex items-center gap-2 mb-2">
                <Cpu size={14} className="text-emerald-400" />
                <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Motor & Automação</span>
             </div>
             
             <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl shadow-inner">
                <div className="flex flex-col">
                   <span className="text-xs font-bold text-white/90">Auto-Bot (V3.0)</span>
                   <span className="text-[9px] text-white/30 font-medium">Sincroniza entradas via BroadcastChannel</span>
                </div>
                <input 
                   type="checkbox" 
                   checked={settings.autoBot}
                   onChange={(e) => onUpdate({ ...settings, autoBot: e.target.checked })}
                   className="w-10 h-5 appearance-none bg-white/10 checked:bg-emerald-500 rounded-full transition-all relative cursor-pointer
                   before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5
                   checked:before:left-5 before:transition-all shadow-md"
                />
             </div>

             <div className="flex items-center justify-between p-3 bg-white/5 border border-white/5 rounded-2xl shadow-inner">
                <div className="flex flex-col">
                   <span className="text-xs font-bold text-white/90">Auto-Confirmar Sinais</span>
                   <span className="text-[9px] text-white/30 font-medium">Aceita e confirma entradas automaticamente</span>
                </div>
                <input 
                   type="checkbox" 
                   checked={settings.autoConfirm}
                   onChange={(e) => onUpdate({ ...settings, autoConfirm: e.target.checked })}
                   className="w-10 h-5 appearance-none bg-white/10 checked:bg-cyan-500 rounded-full transition-all relative cursor-pointer
                   before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5
                   checked:before:left-5 before:transition-all shadow-md"
                />
             </div>
          </div>

          {/* Filtros de Precisão */}
          <div className="space-y-4">
             <div className="flex items-center gap-2">
                <Target size={14} className="text-rose-500" />
                <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Filtros de Precisão</span>
             </div>
             
             <div className="space-y-2">
                <div className="flex justify-between text-[10px] font-bold uppercase tracking-tighter">
                   <span className="text-white/40">Confiança Mínima</span>
                   <span className="text-emerald-400">{settings.minConfidence}%</span>
                </div>
                <input 
                   type="range" 
                   min="50" 
                   max="95" 
                   step="5"
                   value={settings.minConfidence}
                   onChange={(e) => onUpdate({ ...settings, minConfidence: parseInt(e.target.value) })}
                   className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-emerald-500"
                />
             </div>
          </div>

          {/* Integração API (V.3.5) */}
          <div className="space-y-3">
             <div className="flex items-center gap-2">
                <Target size={14} className="text-amber-500" />
                <span className="text-[10px] font-black uppercase text-white/30 tracking-widest">Sessão da API (Cookie)</span>
             </div>
             <div className="space-y-1">
                <input 
                   type="text" 
                   value={settings.sessionCookie || ''}
                   onChange={(e) => onUpdate({ ...settings, sessionCookie: e.target.value })}
                   placeholder="PHPSESSID=..."
                   className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-mono text-amber-400 outline-none focus:border-amber-500/50"
                />
                <span className="text-[7px] font-bold text-white/20 uppercase">Insira o cookie PHPSESSID se a sincronização parar.</span>
             </div>
          </div>

          <div className="bg-cyan-500/10 border border-cyan-500/20 p-4 rounded-xl relative group">
             <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
             <div className="flex items-start gap-3">
                <Bell size={16} className="text-cyan-400 mt-0.5" />
                <div className="space-y-1">
                   <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest block">Status do Kernel</span>
                   <p className="text-[9px] text-white/40 font-medium leading-relaxed">
                      O modo DEUS está operando com latência zero. Todas as configurações são persistidas na memória local da matriz.
                   </p>
                </div>
             </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-white/5 border-t border-white/5">
           <button 
             onClick={onClose}
             className="w-full py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-black italic rounded-xl text-xs uppercase shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all"
           >
             Sincronizar Parâmetros
           </button>
        </div>
      </div>
    </div>
  );
};
