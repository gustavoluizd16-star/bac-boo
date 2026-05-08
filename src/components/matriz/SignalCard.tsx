/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { RadialConfidence } from './RadialConfidence';
import { Outcome, Prediction } from '../../types';
import { Zap, Target, AlertCircle, Check, AlertTriangle, TrendingUp, Activity, ShieldAlert } from 'lucide-react';
import { clsx } from 'clsx';
import { ResponsiveContainer, LineChart, Line, YAxis, ReferenceLine } from 'recharts';

import { QuickBetButton } from './QuickBetButton';

interface SignalCardProps {
  prediction: Prediction;
  isActive: boolean;
  onConfirm?: () => void;
  isPending?: boolean;
  lastBetResult?: 'WIN' | 'LOSS' | null;
  lastBetOutcome?: Outcome | null;
  winningsAmount?: number;
  stats?: { greens: number; reds: number; ties: number };
  onResetStats?: () => void;
}

export const SignalCard: React.FC<SignalCardProps> = ({ 
  prediction, 
  isActive, 
  onConfirm, 
  isPending,
  lastBetResult,
  lastBetOutcome,
  winningsAmount,
  stats,
  onResetStats
}) => {
  const targetLabel = (prediction.target === 'P' ? 'JOGADOR' : prediction.target === 'B' ? 'BANCA' : 'AGUARDE').toUpperCase();
  const targetColor = prediction.target === 'P' ? 'text-blue-400 text-glow-blue' : prediction.target === 'B' ? 'text-rose-500 text-glow-rose' : 'text-white/20';
  
  const getTargetColor = (target: Outcome | 'WAIT') => {
    switch (target) {
      case 'P': return '#60A5FA';
      case 'B': return '#F43F5E';
      case 'T': return '#fbbf24';
      default: return 'rgba(255,255,255,0.1)';
    }
  };

  // Generate fake wave data based on prediction energy
  const waveDataHigh = useMemo(() => {
    const val = prediction.energyForecast?.high || 50;
    return Array.from({ length: 12 }).map((_, i) => ({
      val: val + Math.sin(i + Date.now() / 2000) * 15
    }));
  }, [prediction.energyForecast?.high]);

  const waveDataLow = useMemo(() => {
    const val = prediction.energyForecast?.low || 50;
    return Array.from({ length: 12 }).map((_, i) => ({
      val: val + Math.cos(i + Date.now() / 2000) * 15
    }));
  }, [prediction.energyForecast?.low]);

  return (
    <section className={clsx(
      "glass-card p-6 md:p-8 relative overflow-hidden group transition-all duration-500",
      prediction.highTieRisk ? "border-amber-500/50" : 
      prediction.isObservationMode ? "border-rose-500/50" : "border-white/10"
    )}>
      {/* Seed DNA Visor */}
      <div className="absolute top-4 left-6 flex flex-col gap-1 opacity-40">
        <span className="text-[7px] font-black tracking-widest text-white/30 uppercase">Seed DNA</span>
        <span className="font-mono text-[9px] font-bold text-white/50 tracking-tighter bg-white/5 px-1.5 py-0.5 rounded leading-none">
          {prediction.seedDNA || '00000000'}
        </span>
      </div>

      {/* Prime branding mark */}
      <div className="absolute top-4 right-6 flex items-center gap-1.5 opacity-60">
        <span className="text-[10px] font-black tracking-[0.2em] text-slate-400 italic">SUAB‑Ω PRIME</span>
        <div className="w-1.5 h-1.5 bg-[#00FF9C] rounded-full animate-pulse shadow-[0_0_8px_#00FF9C]" />
      </div>

      {/* Statistical Anomaly Alert (Value Alert) */}
      <AnimatePresence>
        {prediction.isAnomaly && (
          <motion.div 
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="absolute top-12 right-6 z-20 flex items-center gap-2 bg-amber-500 text-black px-3 py-1.5 rounded-lg shadow-xl shadow-amber-500/20"
          >
            <AlertTriangle size={14} />
            <div className="flex flex-col">
              <span className="text-[8px] font-black uppercase leading-none mb-0.5">Alerta de Valor</span>
              <span className="text-[10px] font-bold uppercase tracking-tighter leading-none">Anomalia Estatística ({prediction.zScore?.toFixed(2)}σ)</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row gap-8 items-center relative z-10 pt-4">
        <div className="shrink-0 scale-90 md:scale-100">
           <RadialConfidence 
             value={prediction.confidence || 0} 
             color={getTargetColor(prediction.target || 'WAIT')} 
           />
        </div>

        <div className="flex-1 w-full text-center md:text-left">
           <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
              <span className="px-3 py-1 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-lg">
                 <Zap size={10} className="text-yellow-400 fill-yellow-400" />
                 SINAL PRIME ATIVO
              </span>
              {prediction.trigger && prediction.trigger !== 'WAIT' && (
                <span className={clsx(
                  "px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border shadow-sm",
                  prediction.trigger === 'COUNTER_STRIKE' ? "bg-rose-600 text-white border-rose-400 animate-pulse" : "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
                )}>
                   {prediction.trigger === 'COUNTER_STRIKE' ? 'CONTRA-GOLPE ATIVO' : `MODO: ${prediction.trigger}`}
                </span>
              )}
              {prediction.isObservationMode && (
                <span className="px-3 py-1 bg-rose-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse border border-rose-700">
                   SELF-CORRECTION: OBSERVATION
                </span>
              )}
           </div>

           <h2 className={clsx("text-6xl md:text-7xl font-black tracking-tighter mb-2 italic transition-all duration-700 uppercase", targetColor)}>
              {targetLabel}
           </h2>

           {prediction.trigger === 'COUNTER_STRIKE' && (
             <motion.div 
               initial={{ opacity: 0, x: -20 }}
               animate={{ opacity: 1, x: 0 }}
               className="flex items-center gap-2 bg-rose-600 text-white px-3 py-1.5 rounded-lg mb-3 shadow-[0_0_15px_rgba(225,29,72,0.4)] animate-pulse"
             >
                <ShieldAlert size={16} className="text-white" />
                <span className="text-[10px] font-black uppercase tracking-[0.1em]">ALERTA: CONTRA-GOLPE ATIVO (ANTIDRENO)</span>
             </motion.div>
           )}

           <div className="flex flex-col">
              <p className="text-white/40 text-xs font-medium max-w-md leading-relaxed">
                {prediction.reason || 'Conectando à matriz neural para extração de padrões...'}
              </p>
              {prediction.samplingResults && (
                <div className="mt-3 bg-[#0B0F19] rounded-xl border border-white/5 p-3 animate-in fade-in slide-in-from-left-2 duration-700">
                   <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                         <Activity size={12} className="text-cyan-400" />
                         <span className="text-[8px] font-black text-white/60 uppercase tracking-[0.15em]">Aprendizado por Amostragem</span>
                      </div>
                      <span className={clsx(
                        "text-[7px] font-black px-1.5 py-0.5 rounded uppercase tracking-widest",
                        prediction.samplingResults.isApproved ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" : "bg-rose-500/20 text-rose-400 border border-rose-500/30"
                      )}>
                        {prediction.samplingResults.isApproved ? 'validado' : 're-treinando'}
                      </span>
                   </div>
                   <div className="flex items-center gap-4">
                      <div className="flex-1 space-y-1">
                         <div className="flex justify-between items-end">
                            <span className="text-[7px] font-bold text-white/20 uppercase">Acerto Virtual (20r)</span>
                            <span className={clsx(
                               "text-[10px] font-black",
                               prediction.samplingResults.winRate >= 85 ? "text-emerald-400" : "text-amber-400"
                            )}>
                               {prediction.samplingResults.winRate.toFixed(1)}%
                            </span>
                         </div>
                         <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                            <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${prediction.samplingResults.winRate}%` }}
                              className={clsx(
                                "h-full transition-all duration-1000",
                                prediction.samplingResults.winRate >= 85 ? "bg-emerald-500 shadow-[0_0_8px_#10b981]" : "bg-amber-500 shadow-[0_0_8px_#f59e0b]"
                              )}
                            />
                         </div>
                      </div>
                      <div className="w-px h-6 bg-white/10" />
                      <div className="flex flex-col">
                         <span className="text-[7px] font-bold text-white/20 uppercase">Regra de Ouro</span>
                         <span className="text-[9px] font-black text-white/60 tracking-tighter italic">&gt; 85% SYNC</span>
                      </div>
                   </div>
                </div>
              )}
              {prediction.hftStatus && (
                <span className="text-[8px] font-black text-emerald-400 mt-1 uppercase tracking-widest opacity-80 decoration-emerald-500/30 decoration-dotted underline">
                  {prediction.hftStatus}
                </span>
              )}
           </div>

           <AnimatePresence mode="wait">
             <motion.div 
               key={prediction.target}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="mt-6 flex flex-wrap gap-4 items-center justify-center md:justify-start w-full"
             >
                {prediction.target !== 'WAIT' && !isPending && (
                  <QuickBetButton prediction={prediction} onConfirm={onConfirm || (() => {})} />
                )}

                {isPending && (
                  <div className="w-full px-8 py-4 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-2xl font-black text-xs uppercase tracking-widest flex items-center justify-center gap-2 animate-pulse">
                     <Activity size={16} className="animate-spin" />
                     Operação em Curso...
                  </div>
                )}
             </motion.div>
           </AnimatePresence>
        </div>

        <div className="flex items-center gap-3">
          {prediction.assertiveness !== undefined && (
            <div className={clsx(
              "px-3 py-1 rounded-lg flex flex-col items-center justify-center border",
              prediction.assertiveness >= 80 ? "bg-emerald-500/10 border-emerald-500/20" : 
              prediction.assertiveness >= 60 ? "bg-amber-500/10 border-amber-500/20" : "bg-rose-500/10 border-rose-500/20"
            )}>
              <span className="text-[7px] font-black uppercase text-white/30">Assertividade</span>
              <span className={clsx(
                "text-[10px] font-black tracking-tighter",
                prediction.assertiveness >= 80 ? "text-emerald-400" : 
                prediction.assertiveness >= 60 ? "text-amber-400" : "text-rose-400"
              )}>
                {prediction.assertiveness}%
              </span>
            </div>
          )}
          {prediction.confidenceLevel && (
            <div className="flex items-center gap-1 bg-white/5 rounded-lg px-2 py-1">
              {Array.from({ length: prediction.confidenceLevel || 0 }).map((_, i) => (
                <div key={i} className="w-1.5 h-3 bg-cyan-400 rounded-full" />
              ))}
            </div>
          )}
        </div>
      </div>

      <AnimatePresence>
        {lastBetResult && (
          <motion.div 
             initial={{ opacity: 0, scale: 0.9 }}
             animate={{ opacity: 1, scale: 1 }}
             exit={{ opacity: 0, scale: 0.9 }}
             className={clsx(
               "absolute inset-0 z-20 flex flex-col items-center justify-center backdrop-blur-md",
               lastBetResult === 'WIN' ? "bg-emerald-500/90" : "bg-rose-500/90"
             )}
          >
             <div className="bg-white/10 p-6 rounded-full border border-white/20 mb-4 animate-bounce">
                {lastBetResult === 'WIN' ? <Check size={48} className="text-white" /> : <AlertCircle size={48} className="text-white" />}
             </div>
             <h3 className="text-4xl font-black italic text-white tracking-widest mb-1">
                {lastBetResult === 'WIN' ? 'GREEN MATRIX!' : 'RED DETECTED'}
             </h3>
             <div className="flex items-center gap-3">
                <span className="text-white/60 text-[10px] font-black uppercase tracking-[0.3em]">Outcome: {lastBetOutcome}</span>
                {lastBetResult === 'WIN' && (
                  <span className="px-4 py-1.5 bg-white text-emerald-600 rounded-full text-base font-black italic shadow-2xl">
                    + R$ {winningsAmount?.toFixed(2)}
                  </span>
                )}
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 pt-6 border-t border-white/5 relative z-10">
        <AnimatePresence mode="wait">
            <motion.div
              key={prediction.target}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            >
              {prediction.deadSums && prediction.deadSums.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center md:justify-start mb-4">
                   <span className="text-[8px] font-black text-white/30 uppercase tracking-widest w-full">Gatilhos de Empate (Somas Mortas):</span>
                   {prediction.deadSums?.map(s => (
                     <span key={s} className="px-2 py-0.5 bg-amber-500/10 text-amber-400 text-[10px] font-black rounded-md border border-amber-500/20 animate-pulse shadow-[0_0_15px_rgba(245,158,11,0.2)]">
                        SOMA {s}
                     </span>
                   ))}
                </div>
              )}

              {prediction.delayedSums && prediction.delayedSums.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-2 justify-center md:justify-start">
                   <span className="text-[8px] font-black text-rose-400 uppercase tracking-widest w-full font-mono">Radar de Somas Atrasadas:</span>
                   {prediction.delayedSums?.map(item => (
                     <span key={item.sum} className="px-2 py-0.5 bg-rose-500/10 text-rose-400 text-[9px] font-black rounded-md border border-rose-500/20">
                        SOMA {item.sum} ({item.rounds}r)
                     </span>
                   ))}
                </div>
              )}

              <div className="flex gap-4 mt-4">
                {prediction.divergenceDetected && (
                  <div className="p-2 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest animate-pulse">Armadilha Visual Detectada!</span>
                  </div>
                )}
                {prediction.latencySuggestion && prediction.target !== 'WAIT' && (
                  <div className="flex items-center gap-2 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                    <Activity size={10} className="text-emerald-400" />
                    <span className="text-[10px] font-black text-emerald-400">Latência: {prediction.latencySuggestion}s</span>
                  </div>
                )}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-4 border-t border-white/5 relative z-10">
        <div className="flex flex-col items-center md:items-start">
           <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Peso da Mesa</span>
           <span className={clsx(
             "text-xs font-black italic",
             prediction.tableWeight === 'PESADA' ? "text-rose-400" : prediction.tableWeight === 'LEVE' ? "text-blue-400" : "text-emerald-400"
           )}>
             {prediction.tableWeight || 'EQUILIBRADA'}
           </span>
        </div>
        <div className="flex flex-col items-center md:items-start border-l border-white/5 pl-4">
           <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Neural Flow</span>
           <span className="text-xs font-black italic text-emerald-400">SINCRONIZADO</span>
        </div>
        <div className="flex flex-col items-center md:items-start border-l border-white/5 pl-4">
           <div className="flex justify-between items-center w-full min-w-[80px]">
             <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Entropia</span>
             <span className="text-[8px] font-black text-white/30 uppercase tracking-widest mb-1">Exaustão</span>
           </div>
           <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
             <div 
               className={clsx(
                 "h-full transition-all duration-1000",
                 (prediction.entropyLevel || 0) > 80 ? "bg-rose-500 shadow-[0_0_8px_#f43f5e]" : (prediction.entropyLevel || 0) > 50 ? "bg-amber-500 shadow-[0_0_8px_#f59e0b]" : "bg-emerald-500 shadow-[0_0_8px_#10b981]"
               )}
               style={{ width: `${prediction.entropyLevel || 0}%` }}
             />
           </div>
        </div>
      </div>

      <div className="mt-4 pt-6 border-t border-white/5 flex flex-col md:flex-row items-center justify-between gap-6 relative z-10">
        <div className="flex-1 w-full grid grid-cols-2 gap-4">
           {prediction.roadmapForecast && (
              <div className="col-span-2 mt-4 space-y-2 border-t border-white/5 pt-4">
                 <div className="flex justify-between items-center">
                    <span className="text-[7px] font-black uppercase tracking-widest text-white/30">Roadmap Preditivo (IA Tendência)</span>
                    <span className="text-[7px] font-black uppercase tracking-[0.2em] text-emerald-400 animate-pulse">Alpha-Omega Projecção</span>
                 </div>
                 <div className="flex items-center gap-1.5 overflow-x-hidden">
                    {(prediction.roadmapForecast || []).map((outcome, idx) => (
                      <div 
                        key={idx} 
                        className={clsx(
                          "w-3 h-3 rounded-full border border-white/20 shadow-sm transition-opacity hover:opacity-100",
                          outcome === 'P' ? "bg-blue-600 opacity-60" : "bg-rose-600 opacity-60"
                        )}
                        style={{ filter: `blur(${idx * 0.5}px)` }}
                      />
                    ))}
                    <div className="text-[8px] font-black text-white/40 italic ml-2">Tendência Estável</div>
                 </div>
              </div>
           )}

           {prediction.energyForecast && (
              <>
                <div className="space-y-2 relative">
                  <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-blue-400">
                     <span>ONDA DE ENERGIA: JOGADOR</span>
                     <span>{prediction.energyForecast?.low || 0}%</span>
                  </div>
                  <div className="h-12 w-full bg-blue-500/5 rounded-lg overflow-hidden border border-blue-500/10">
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={waveDataLow}>
                         <Line type="monotone" dataKey="val" stroke="#3b82f6" strokeWidth={2} dot={false} animationDuration={300} />
                         <ReferenceLine y={50} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                         <YAxis hide domain={[0, 100]} />
                       </LineChart>
                     </ResponsiveContainer>
                  </div>
                </div>
                <div className="space-y-2 relative">
                  <div className="flex justify-between text-[7px] font-black uppercase tracking-widest text-rose-400">
                     <span>ONDA DE ENERGIA: BANCA</span>
                     <span>{prediction.energyForecast?.high || 0}%</span>
                  </div>
                  <div className="h-12 w-full bg-rose-500/5 rounded-lg overflow-hidden border border-rose-500/10">
                     <ResponsiveContainer width="100%" height="100%">
                       <LineChart data={waveDataHigh}>
                         <Line type="monotone" dataKey="val" stroke="#f43f5e" strokeWidth={2} dot={false} animationDuration={300} />
                         <ReferenceLine y={50} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                         <YAxis hide domain={[0, 100]} />
                       </LineChart>
                     </ResponsiveContainer>
                  </div>
                  {prediction.energyForecast && prediction.energyForecast.high > (prediction.energyForecast?.low || 0) && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute -top-1 -right-1 z-10 bg-rose-600 text-[6px] font-black text-white px-1 py-0.5 rounded animate-bounce shadow-[0_0_10px_#f43f5e]"
                    >
                      FORTE TENDÊNCIA BANKER
                    </motion.div>
                  )}
                </div>
              </>
           )}

           {prediction.volatilityHistory && prediction.volatilityHistory.length > 0 && (
             <div className="col-span-2 mt-4 space-y-2 border-t border-white/5 pt-4 relative">
                <div className="flex justify-between items-center text-[7px] font-black uppercase tracking-widest text-white/30">
                   <div className="flex items-center gap-1.5">
                      <TrendingUp size={10} className="text-emerald-400" />
                      <span>Volatilidade de Fluxo (Last 10)</span>
                   </div>
                   <span className="text-emerald-400">Sistema Estável</span>
                </div>
                <div className="h-16 w-full bg-white/5 rounded-xl overflow-hidden border border-white/5 p-2">
                   <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={(prediction.volatilityHistory?.slice(0, 50) || []).map((v, i) => ({ name: i, val: v }))}>
                        <Line 
                          type="stepAfter" 
                          dataKey="val" 
                         stroke="#10b981" 
                         strokeWidth={2} 
                         dot={{ r: 2, fill: '#10b981', strokeWidth: 0 }} 
                         activeDot={{ r: 4, strokeWidth: 0 }}
                         animationDuration={1000} 
                       />
                       <ReferenceLine y={2} stroke="rgba(255,255,255,0.1)" strokeDasharray="3 3" />
                       <YAxis hide domain={[0, 10]} />
                     </LineChart>
                   </ResponsiveContainer>
                </div>
                {prediction.volatilityHistory[0] <= 2 && (
                   <motion.div 
                     initial={{ opacity: 0, y: 10 }}
                     animate={{ opacity: 1, y: 0 }}
                     className="absolute -bottom-2 right-0 bg-emerald-500 text-black text-[7px] font-black px-2 py-0.5 rounded shadow-lg animate-pulse"
                   >
                     MERCADO PADRONIZADO - HORA DE ENTRAR
                   </motion.div>
                )}
             </div>
           )}
        </div>
      </div>
    </section>
  );
};
