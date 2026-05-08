/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { 
  Bot, 
  Ghost, 
  Volume2, 
  VolumeX, 
  Undo2, 
  Maximize, 
  Settings as SettingsIcon, 
  Activity,
  TrendingUp,
  History,
  Info,
  LayoutGrid,
  Monitor,
  Globe,
  Link as LinkIcon,
  Check,
  AlertCircle,
  Target,
  RotateCcw
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Outcome, 
  BacBoResult, 
  Prediction, 
  MatrixFlag, 
  AppSettings 
} from './types';
import { MatrixEngine } from './lib/bacbo/engine';
import { SignalCard } from './components/matriz/SignalCard';
import { FlagsGrid } from './components/matriz/FlagsGrid';
import { BankPanel } from './components/matriz/BankPanel';
import { PatternAnalytics } from './components/matriz/PatternAnalytics';
import { TieAnalyzer } from './components/matriz/TieAnalyzer';
import { BeadRoad } from './components/matriz/BeadRoad';
import { HistoryStats } from './components/matriz/HistoryStats';
import { PatternFrequency } from './components/matriz/PatternFrequency';
import { AuditLog } from './components/matriz/AuditLog';
import { SettingsModal } from './components/matriz/SettingsModal';
import { clsx } from 'clsx';

// Recharts for distributions
import { BarChart, Bar, XAxis, ResponsiveContainer, Cell } from 'recharts';

// --- Atomic Components for Performance ---
const SyncCountdown = ({ ticker }: { ticker: number }) => {
  const count = 5.0 - ((ticker % 50) / 10);
  return (
    <span className="bg-emerald-500/20 px-1.5 py-0.5 rounded text-[7px] border border-emerald-500/30 text-emerald-300">
      SYNC EM: {count.toFixed(1)}s
    </span>
  );
};

export default function App() {
  const [history, setHistory] = useState<BacBoResult[]>(() => {
    const saved = localStorage.getItem('bacbo_history_v3');
    return saved ? JSON.parse(saved) : [];
  });

  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('bacbo_settings_v3');
    const defaultSettings: AppSettings = {
      soundEnabled: true,
      minConfidence: 75,
      timerMinutes: 2,
      betUnit: 10,
      sessionCookie: '',
      analysisCycle: 45,
      autoBot: false,
      ghostMode: false,
      autoConfirm: true
    };
    return saved ? { ...defaultSettings, ...JSON.parse(saved) } : defaultSettings;
  });

  const [balance, setBalance] = useState<number>(() => {
    const saved = localStorage.getItem('bacbo_balance_v3');
    return saved ? parseFloat(saved) : 1000;
  });

  const [ticker, setTicker] = useState(0);
  const [selectedSum, setSelectedSum] = useState<number | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importText, setImportText] = useState('');

  // Persistence Effects
  useEffect(() => localStorage.setItem('bacbo_history_v3', JSON.stringify(history)), [history]);
  useEffect(() => localStorage.setItem('bacbo_settings_v3', JSON.stringify(settings)), [settings]);
  useEffect(() => localStorage.setItem('bacbo_balance_v3', balance.toString()), [balance]);

  const [activeBet, setActiveBet] = useState<{ mainTarget: Outcome; mainAmount: number; tieAmount: number } | null>(null);
  const [lastBetResult, setLastBetResult] = useState<'WIN' | 'LOSS' | null>(null);
  const [lastBetOutcome, setLastBetOutcome] = useState<Outcome | null>(null);
  const [winningsAmount, setWinningsAmount] = useState<number>(0);
  const [consecutiveLosses, setConsecutiveLosses] = useState(0);

  useEffect(() => {
    document.documentElement.classList.add('scrollbar-none');
    return () => document.documentElement.classList.remove('scrollbar-none');
  }, []);

  const [gameUrl, setGameUrl] = useState<string>(() => localStorage.getItem('bacbo_game_url') || '');
  const [urlInput, setUrlInput] = useState(gameUrl);
  const [isSplitView, setIsSplitView] = useState(() => localStorage.getItem('bacbo_view_mode') === 'split');

  const handleConnectUrl = () => {
    if (urlInput.trim()) {
      setGameUrl(urlInput.trim());
      localStorage.setItem('bacbo_game_url', urlInput.trim());
    }
  };

  const [sessionStart] = useState(Date.now());
  const [maxMultiplier, setMaxMultiplier] = useState(() => {
    const saved = localStorage.getItem('bacbo_max_multiplier');
    return saved ? parseInt(saved) : 0;
  });

  const [gameStats, setStats] = useState(() => {
    const saved = localStorage.getItem('bacbo_persistent_stats_v3');
    return saved ? JSON.parse(saved) : { greens: 0, reds: 0, ties: 0 };
  });

  const [processedIds, setProcessedIds] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('processed_ids_v3');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const [pendingSignal, setPendingSignal] = useState<{
    id: string;
    target: Outcome;
    timestamp: number;
  } | null>(() => {
    const saved = localStorage.getItem('bacbo_pending_signal_v3');
    return saved ? JSON.parse(saved) : null;
  });

  useEffect(() => localStorage.setItem('bacbo_persistent_stats_v3', JSON.stringify(gameStats)), [gameStats]);
  useEffect(() => localStorage.setItem('processed_ids_v3', JSON.stringify(Array.from(processedIds))), [processedIds]);
  useEffect(() => localStorage.setItem('bacbo_pending_signal_v3', JSON.stringify(pendingSignal)), [pendingSignal]);
  useEffect(() => localStorage.setItem('bacbo_max_multiplier', maxMultiplier.toString()), [maxMultiplier]);

  // --- Auto-Reset on Cycle Change ---
  useEffect(() => {
    setStats({ greens: 0, reds: 0, ties: 0 });
  }, [settings.analysisCycle]);

  const [lastSync, setLastSync] = useState<number | null>(null);

  // --- Actions ---
  const handleAddResult = useCallback((sum: number, outcome: Outcome, source: 'manual' | 'ai' | 'robot' | 'broadcast' = 'manual') => {
    // Validation Logic for Persistent Stats
    if (pendingSignal) {
       if (outcome === 'T') {
         setStats(prev => ({ ...prev, ties: prev.ties + 1 }));
       } else if (outcome === pendingSignal.target) {
         setStats(prev => ({ ...prev, greens: prev.greens + 1 }));
       } else {
         setStats(prev => ({ ...prev, reds: prev.reds + 1 }));
       }
       setPendingSignal(null);
    }

    let localWinnings = 0;
    let totalBet = 0;

    if (activeBet) {
      const { mainTarget, mainAmount, tieAmount } = activeBet;
      totalBet = mainAmount + tieAmount;

      if (outcome === mainTarget && (outcome === 'P' || outcome === 'B')) {
        localWinnings += mainAmount * 2;
      }

      if (outcome === 'T') {
        const multiplier = sum >= 0 && sum <= 25 ? MatrixEngine.getTieMultiplier(sum) : 8;
        localWinnings += tieAmount * multiplier;
        localWinnings += mainAmount * 0.9;
        
        if (multiplier >= 25 && settings.soundEnabled) {
          const cashSound = new Audio('https://assets.mixkit.co/active_storage/sfx/2013/2013-preview.mp3');
          cashSound.play().catch(() => {});
        }
      }

      if (localWinnings > 0) {
        setBalance(prev => prev + localWinnings);
      }
      setWinningsAmount(localWinnings);
      const isWin = localWinnings > 0;
      setLastBetResult(isWin ? 'WIN' : 'LOSS');
      if (isWin) setLastBetOutcome(outcome);
      
      if (isWin) {
        setConsecutiveLosses(0);
      } else {
        setConsecutiveLosses(prev => prev + 1);
      }
      
      setTimeout(() => setLastBetResult(null), 5000);
      setActiveBet(null);
    }

    const stableUniqueId = `manual-${outcome}-${sum}-${Date.now()}`;
    const newResult: BacBoResult = {
      id: stableUniqueId,
      timestamp: Date.now(),
      sum,
      outcome,
      d1: 0,
      d2: 0,
      winnings: localWinnings,
      betAmount: totalBet,
      mainAmount: activeBet?.mainAmount || 0,
      tieAmount: activeBet?.tieAmount || 0
    };

    setHistory(prev => {
      const existingIds = new Set();
      for (let i = 0; i < prev.length; i++) existingIds.add(prev[i].id);
      if (existingIds.has(stableUniqueId)) return prev;
      return [newResult, ...prev].slice(0, 200);
    });

    setSelectedSum(null);

    if (settings.autoBot && source !== 'broadcast') {
      const channel = new BroadcastChannel('fluxo_bacbo_matriz');
      channel.postMessage({ sum, outcome, type: 'new_entry', source: 'matrix_deus' });
      channel.close();
    }
  }, [activeBet, balance, settings.soundEnabled, settings.autoBot, pendingSignal]);

  const handleConfirmBet = () => {
    if (prediction.target === 'WAIT' || activeBet) return;
    
    if (lastBetResult === 'LOSS' && history.length > 0 && history[0].betAmount && history[0].betAmount > 0) {
      console.warn("TRAVA ANTI-TILT ATIVA: Aguarde um sinal de confirmação após o erro.");
      return;
    }

    setWinningsAmount(0);
    setLastBetOutcome(null);

    const mainBetAmount = balance * 0.01; 
    const tieBetAmount = prediction.highTieRisk ? (mainBetAmount * 0.1) : (mainBetAmount * 0.02);

    if (balance < (mainBetAmount + tieBetAmount)) return;

    setBalance(prev => prev - (mainBetAmount + tieBetAmount));
    setActiveBet({
      mainTarget: prediction.target as Outcome,
      mainAmount: mainBetAmount,
      tieAmount: tieBetAmount
    });

    setPendingSignal({
      id: history[0]?.id || 'initial',
      target: prediction.target as Outcome,
      timestamp: Date.now()
    });

    if (settings.soundEnabled) {
      const audio = new Audio('https://assets.mixkit.net/active_storage/sfx/2568/2568-preview.mp3');
      audio.play().catch(() => {});
    }
  };

  const handleUndo = () => setHistory(prev => prev.slice(1));
  
  const handleResetStats = () => {
    setStats({ greens: 0, reds: 0, ties: 0 });
  };

  const handleReset = () => {
    setBalance(1000);
    setHistory([]);
    setSelectedSum(null);
    setWinningsAmount(0);
    setLastBetOutcome(null);
    setStats({ greens: 0, reds: 0, ties: 0 });
    localStorage.removeItem('bacbo_history_v3');
    localStorage.setItem('bacbo_balance_v3', '1000');
  };

  const handleExport = () => {
    const totalProfit = balance - 1000;
    const report = {
      tempoSessao: `${Math.floor((Date.now() - sessionStart) / 60000)} min`,
      totalRounds: history.length,
      assertividadeMedia: `${prediction.assertiveness}%`,
      profit: totalProfit
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorio_bacbo_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
  };

  const toggleAutoBot = () => setSettings(s => ({ ...s, autoBot: !s.autoBot }));
  const toggleGhost = () => setSettings(s => ({ ...s, ghostMode: !s.ghostMode }));
  const toggleSound = () => setSettings(s => ({ ...s, soundEnabled: !s.soundEnabled }));

  // --- BroadcastChannel for AUTO-BOT ---
  useEffect(() => {
    const channel = new BroadcastChannel('fluxo_bacbo_matriz');
    channel.onmessage = (event) => {
      if (settings.autoBot && event.data.source !== 'matrix_deus') {
        const { sum, outcome } = event.data;
        if (sum !== undefined && outcome) {
          handleAddResult(sum, outcome, 'broadcast');
        }
      }
    };
    return () => channel.close();
  }, [settings.autoBot, handleAddResult]);

  // --- API Global Robot Integration (SSE) ---
  const [robotStatus, setRobotStatus] = useState<{ connected: boolean, logs: string[] }>({ 
    connected: false,
    logs: []
  });

  const handleAddResultRef = React.useRef(handleAddResult);
  useEffect(() => {
    handleAddResultRef.current = handleAddResult;
  }, [handleAddResult]);

  useEffect(() => {
    let eventSource: EventSource | null = null;
    let reconnectTimeout: any = null;

    const connectSSE = () => {
      const sseUrl = `${window.location.origin}/api/events`;
      eventSource = new EventSource(sseUrl);
      
      eventSource.onopen = () => {
        setRobotStatus(prev => ({ ...prev, connected: true }));
        console.log('✅ Robô Conectado');
      };

      eventSource.onerror = () => {
        setRobotStatus(prev => ({ ...prev, connected: false }));
        eventSource?.close();
        reconnectTimeout = setTimeout(connectSSE, 3000);
      };

      eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'ping') return;
          if (data.results && Array.isArray(data.results)) {
    const syncResults: BacBoResult[] = data.results.map((res: any) => ({
      id: res.id || Math.random().toString(36).substr(2, 9),
      timestamp: Date.now(),
      sum: Number(res.sum || 0),
      outcome: res.outcome as Outcome,
      d1: res.d1 || 0,
      d2: res.d2 || 0,
      winnings: 0,
      betAmount: 0,
      mainAmount: 0,
      tieAmount: 0
    }));
             setHistory(syncResults);
             return;
          }
          
          const { outcome, sum } = data;
          if (outcome && sum !== undefined) {
            handleAddResultRef.current(Number(sum), outcome as Outcome, 'robot');
            setRobotStatus(prev => ({ 
              ...prev, 
              logs: [`[${new Date().toLocaleTimeString()}] ✔️ GRAVADO: ${outcome} (${sum})`, ...prev.logs].slice(0, 5)
            }));
          }
        } catch (err) {
          console.error('Falha no processamento do dado:', err);
        }
      };
    };

    connectSSE();
    return () => {
      eventSource?.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, []);

  const [isScanning, setIsScanning] = useState(false);
  const isRobotConnected = robotStatus.connected;

  const [delayedPrediction, setDelayedPrediction] = useState<Prediction | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const engine = useMemo(() => new MatrixEngine(history.slice(0, settings.analysisCycle)), [history, settings.analysisCycle]);
  const rawPrediction = useMemo(() => engine.getPrediction(false, settings.minConfidence), [engine, history, settings.minConfidence]);
  const freqStats = useMemo(() => engine.getFrequencyAnalysis(4), [engine, history]);
  const flags = useMemo(() => engine.getFlags(), [engine]);

  // Handle Manual Sync from Server API
  const handleManualSync = async () => {
    setIsSyncing(true);
    try {
      const response = await fetch(`${window.location.origin}/api/results/history`);
      if (response.ok) {
        const data = await response.json();
        // The history from API might be in reverse order or have different fields, 
        // basing on server.ts saveResult, it's an array of results.
        if (Array.isArray(data) && data.length > 0) {
          const syncResults: BacBoResult[] = data.reverse().map((res: any) => ({
            id: res.id || `sync-${Math.random().toString(36).substr(2, 9)}`,
            timestamp: res.timestamp || Date.now(),
            sum: Number(res.sum || 0),
            outcome: res.outcome as Outcome,
            d1: res.d1 || 0,
            d2: res.d2 || 0,
            winnings: 0,
            betAmount: 0,
            mainAmount: 0,
            tieAmount: 0
          }));
          setHistory(syncResults);
          console.log('✅ Sincronização manual concluída');
        }
      }
    } catch (err) {
      console.error('Erro na sincronização manual:', err);
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    if (history.length < 5) return;
    // Set prediction immediately if history is fresh
    setDelayedPrediction(rawPrediction);
  }, [rawPrediction, history.length]);

  const prediction = delayedPrediction || { 
    target: 'WAIT', 
    confidence: 0, 
    reason: 'Calculando...', 
    trigger: 'WAIT', 
    isDrainMode: false, 
    tableDrainLevel: 0, 
    assertiveness: 0,
    deadSums: [],
    delayedSums: [],
    roadmapForecast: [],
    confidenceLevel: 0,
    energyForecast: { high: 50, low: 50 },
    volatilityHistory: []
  };

  // Auto-Confirm Signal Logic
  useEffect(() => {
    // If autoConfirm is on and a valid prediction exists that passed sampling,
    // we confirm automatically as requested.
    if (settings.autoConfirm && 
        prediction.target !== 'WAIT' && 
        prediction.samplingResults?.isApproved && 
        !activeBet && !pendingSignal) {
       handleConfirmBet();
    }
  }, [prediction.target, prediction.samplingResults, activeBet, pendingSignal, settings.autoConfirm, handleConfirmBet]);

  const distributionStats = useMemo(() => {
    const analysisSlice = history.slice(0, settings.analysisCycle);
    const total = analysisSlice.length || 1;
    const pCount = analysisSlice.filter(h => h.outcome === 'P').length;
    const bCount = analysisSlice.filter(h => h.outcome === 'B').length;
    const tCount = analysisSlice.filter(h => h.outcome === 'T').length;
    
    const p = (pCount / total) * 100;
    const b = (bCount / total) * 100;
    const t = (tCount / total) * 100;
    
    const sumFreq: Record<number, number> = {};
    analysisSlice.forEach(h => {
        sumFreq[h.sum] = (sumFreq[h.sum] || 0) + 1;
    });

    const sumData = Object.entries(sumFreq).map(([s, count]) => ({
        name: s,
        value: count
    }));

    return { p, b, t, pCount, bCount, tCount, total: analysisSlice.length, sums: sumData };
  }, [history, settings.analysisCycle]);

  const eliteStats = useMemo(() => {
    const analysisSlice = history.slice(0, settings.analysisCycle);
    const validHistory = analysisSlice.filter(h => (h.betAmount || 0) > 0);
    const totalStaked = validHistory.reduce((acc, h) => acc + (h.betAmount || 0), 0);
    const totalWinnings = validHistory.reduce((acc, h) => acc + (h.winnings || 0), 0);
    const netProfit = totalWinnings - totalStaked;
    
    let totalMainBet = 0;
    let totalMainReturn = 0;
    validHistory.forEach(h => {
       totalMainBet += (h.mainAmount || 0);
       totalMainReturn += (h.winnings || 0);
    });

    const roi = totalMainBet > 0 ? (totalMainReturn / totalMainBet) * 100 : 100;
    const yieldVal = totalStaked > 0 ? (netProfit / totalStaked) * 100 : 0;
    
    // Calculate bank evolution (last 10 rounds yield)
    const evolution = history.slice(0, 10).map(h => {
      const stake = h.betAmount || 0;
      const win = h.winnings || 0;
      return stake > 0 ? (win / stake) * 50 + 20 : 20; // Some visualization logic
    }).reverse();

    return { roi, yield: yieldVal, evolution };
  }, [history, settings.analysisCycle]);

  const handleCloseSettings = () => setIsSettingsOpen(false);

  const handleManualImport = () => {
    if (!importText.trim()) return;
    
    // Simple parser for patterns like "P 8, B 10" or just "P B P T"
    const parts = importText.split(/[,\n]/).filter(p => p.trim());
    const newResults: BacBoResult[] = [];
    
    parts.forEach(p => {
       const [rawOutcome, rawSum] = p.trim().split(/\s+/);
       const outcome = rawOutcome.toUpperCase().charAt(0) as Outcome;
       const sum = rawSum ? parseInt(rawSum) : 7;
       
       if (['P', 'B', 'T'].includes(outcome)) {
         newResults.push({
           id: `import-${Math.random().toString(36).substr(2, 9)}`,
           timestamp: Date.now(),
           outcome,
           sum,
           d1: 0,
           d2: 0
         });
       }
    });

    if (newResults.length > 0) {
      setHistory(prev => [...newResults.reverse(), ...prev].slice(0, 200));
    }
    setImportText('');
    setIsImportModalOpen(false);
  };

  useEffect(() => {
    setTicker(t => t + 1);
  }, []);

  useEffect(() => {
    const timer = setInterval(() => setTicker(t => t + 1), 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={clsx(
      "h-screen overflow-hidden bg-[#0B0F19] matrix-bg selection:bg-[#00FF9C] selection:text-black font-sans relative flex flex-col",
      settings.ghostMode && "blur-[0.5px]"
    )}>
      {/* Matrix Aesthetic Background */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.08] z-0 overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.1),transparent_70%)]" />
        <div className="flex justify-around gap-4 h-full">
           {Array.from({ length: 20 }).map((_, i) => (
             <motion.div 
               key={i}
               initial={{ y: -100 }}
               animate={{ y: 1000 }}
               transition={{ duration: Math.random() * 5 + 3, repeat: Infinity, ease: 'linear', delay: Math.random() * 5 }}
               className="text-[8px] font-mono font-bold text-cyan-600 break-all w-1 leading-none">
               {Math.random().toString(16).slice(2, 12)}
             </motion.div>
           ))}
        </div>
      </div>

      <AnimatePresence>
        {prediction.isDrainMode && (
          <motion.div 
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-[60] bg-rose-600 text-white px-6 py-3 rounded-2xl shadow-2xl border-4 border-rose-400 flex items-center gap-4"
          >
             <div className="flex flex-col items-center">
                <div className="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center animate-spin">
                  ⚠️
                </div>
             </div>
             <div className="flex flex-col">
                <span className="text-sm font-black italic tracking-tighter">ALERTA NUCLEAR: MESA EM DRENO</span>
                <span className="text-[10px] font-bold uppercase tracking-widest opacity-80">Risco de Singularidade Alto. TROQUE DE MESA!</span>
             </div>
             <div className="bg-white/20 px-2 py-1 rounded text-xs font-black">{prediction.tableDrainLevel}%</div>
           </motion.div>
        )}
      </AnimatePresence>

      <header className="sticky top-0 z-50 bg-[#0B0F19]/80 backdrop-blur-xl border-b border-white/5 px-4 py-3 shadow-2xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
             <div className="flex flex-col">
                <h1 className="text-sm font-black italic tracking-tighter text-white flex items-center gap-2">
                 <div className="w-2 h-2 bg-[#00FF9C] rounded-full animate-pulse shadow-[0_0_8px_#00FF9C]" />
                 MATRIX-LOGIC <span className="text-emerald-400">v3.0</span>
               </h1>
               <div className="flex items-center gap-2 mt-0.5">
                  <div className="text-[8px] font-bold text-white/40 uppercase tracking-[0.2em]">Fluxo de Dados:</div>
                  <div className="text-[8px] font-black text-emerald-400 uppercase animate-pulse text-glow-emerald flex items-center gap-1.5">
                    Sincronizado
                    <SyncCountdown ticker={ticker} />
                  </div>
               </div>
             </div>

             <div className="flex flex-col ml-6 pl-6 border-l border-white/10 hidden xl:flex text-right">
                <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">IA Sincronizada</span>
                <span className="text-[10px] font-black text-emerald-400 italic tracking-tighter">ESTÁVEL</span>
             </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="hidden md:flex flex-col items-end gap-1">
              <div className={clsx(
                "flex items-center gap-2 px-3 py-1.5 rounded-full border transition-all duration-500",
                isRobotConnected ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" : "bg-rose-500/10 border-rose-500/30 text-rose-400"
              )}>
                 <div className={clsx("w-2 h-2 rounded-full", isRobotConnected ? "bg-emerald-500 animate-pulse" : "bg-rose-500")} />
                 <span className="text-[10px] font-black uppercase tracking-widest">
                    {isRobotConnected ? 'ROBOT LIVE' : 'ROBOT OFFLINE'}
                 </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="w-full h-1 bg-white/5 sticky top-[60px] z-40 overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${prediction.riskLevel || 0}%` }}
          className={clsx(
            "h-full transition-all duration-1000",
            (prediction.riskLevel || 0) < 40 ? "bg-emerald-500 shadow-[0_0_10px_#10b981]" : (prediction.riskLevel || 0) < 70 ? "bg-amber-500 shadow-[0_0_10px_#f59e0b]" : "bg-rose-600 shadow-[0_0_10px_#e11d48]"
          )}
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
           <span className="text-[6px] font-black text-white uppercase tracking-widest bg-black/40 px-2 py-0.5 rounded-full backdrop-blur-sm">
             Nível de Risco da Mesa: {prediction.riskLevel || 0}% {prediction.riskLevel && prediction.riskLevel > 70 ? '• MESA HOSTIL' : ''}
           </span>
        </div>
      </div>

      <AnimatePresence>
        {isSplitView && gameUrl && (
          <motion.div 
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "65vh", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="relative w-full border-b border-white/10 bg-black flex-none z-10"
          >
            <iframe 
              src={gameUrl} 
              className="w-full h-full border-none shadow-2xl"
              style={{ objectFit: 'cover' }}
              title="Bac Bo Live Stream"
              referrerPolicy="no-referrer"
              allow="autoplay; encrypted-media; fullscreen"
            />
            <div className="absolute top-4 left-4 flex gap-2 pointer-events-none">
               <div className="px-3 py-1 bg-black/60 backdrop-blur-md border border-white/10 rounded-full flex items-center gap-2">
                  <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_#10b981]" />
                  <span className="text-[8px] font-black text-white uppercase tracking-widest">LIVE MATRIX FEED v3.0</span>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="flex-1 overflow-y-auto scrollbar-none bg-[#0B0F19] p-0">
        <div className="w-full space-y-0.5">
          <div className="px-4 lg:px-8 pt-4 pb-2">
            <div className="flex flex-col gap-4 p-4 bg-[#161B29] border border-white/10 rounded-[1.5rem] shadow-xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent opacity-100" />
              
              <div className="flex flex-col xl:flex-row items-stretch xl:items-center justify-between gap-4 relative z-10">
                <div className="flex flex-col md:flex-row items-start md:items-center gap-6 relative z-0">
                  <div className="flex items-center gap-3">
                    <div className="bg-cyan-500/20 p-2 rounded-xl">
                      <History size={18} className="text-cyan-400" />
                    </div>
                    <div>
                      <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] leading-none mb-1">Ciclo de Análise</h3>
                      <p className="text-[9px] font-bold text-white/20 italic">Profundidade Estatística</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 bg-black/40 p-1 rounded-xl border border-white/5">
                    {[
                      { val: 25, label: 'Rápido', color: 'text-rose-400' },
                      { val: 45, label: 'Padrão', color: 'text-cyan-400' },
                      { val: 65, label: 'Preciso', color: 'text-emerald-400' }
                    ].map((cycle) => (
                      <button
                        key={cycle.val}
                        onClick={() => setSettings(s => ({ ...s, analysisCycle: cycle.val as any }))}
                        className={clsx(
                          "px-4 py-2 rounded-lg transition-all flex flex-col items-center gap-0.5 group/btn relative overflow-hidden",
                          settings.analysisCycle === cycle.val 
                            ? "bg-white/10 border-2 border-white/40 shadow-[0_0_15px_rgba(255,255,255,0.1)] ring-2 ring-white/10" 
                            : "hover:bg-white/5 border border-transparent"
                        )}
                      >
                        {settings.analysisCycle === cycle.val && (
                          <motion.div layoutId="cycle-active" className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                        )}
                        <span className={clsx(
                          "text-[10px] font-black uppercase tracking-widest relative z-10",
                          settings.analysisCycle === cycle.val ? cycle.color : "text-white/40"
                        )}>
                          {cycle.label}
                        </span>
                        <span className="text-[7px] font-bold text-white/20 uppercase tracking-tighter relative z-10">
                          {cycle.val} RODADAS
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="relative z-10 flex flex-wrap items-center gap-3 bg-black/40 px-4 py-2 rounded-2xl border border-white/5 shadow-2xl">
                  <div className="flex items-center gap-6 pr-6 border-r border-white/10">
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black text-emerald-400 uppercase tracking-[0.2em] mb-1">Greens</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white leading-none">{gameStats.greens}</span>
                          <Check size={12} className="text-emerald-400" />
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black text-rose-500 uppercase tracking-[0.2em] mb-1">Reds</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white leading-none">{gameStats.reds}</span>
                          <AlertCircle size={12} className="text-rose-500" />
                        </div>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-black text-amber-500 uppercase tracking-[0.2em] mb-1">Empates</span>
                        <div className="flex items-baseline gap-1">
                          <span className="text-2xl font-black text-white leading-none">{gameStats.ties}</span>
                          <Target size={12} className="text-amber-500" />
                        </div>
                      </div>
                  </div>

                  <button 
                    onClick={handleResetStats}
                    className="flex flex-col items-center gap-1 px-4 py-1.5 hover:bg-rose-500/10 rounded-xl transition-all group/reset"
                  >
                    <RotateCcw size={16} className="text-white/20 group-hover/reset:text-rose-400 group-hover/reset:rotate-180 transition-all duration-500" />
                      <span className="text-[8px] font-black text-white/20 group-hover/reset:text-rose-400 uppercase tracking-widest">Limpar Dados</span>
                  </button>
                </div>
              </div>

              {/* Row 2: Tendência do Ciclo */}
              <div className="mt-2 pt-4 border-t border-white/5 flex flex-wrap items-center gap-8 relative z-10 w-full animate-in fade-in slide-in-from-top-2 duration-500">
                <div className="flex items-center gap-3 group/stat">
                  <div className="w-1.5 h-6 bg-blue-500 rounded-full shadow-[0_0_12px_rgba(59,130,246,0.6)]" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Azul</span>
                    <span className="text-sm font-black text-blue-400 flex items-center gap-2">
                      {distributionStats.pCount} 
                      <span className="text-[10px] bg-blue-500/10 px-1.5 py-0.5 rounded border border-blue-500/20">{distributionStats.p.toFixed(1)}%</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 group/stat">
                  <div className="w-1.5 h-6 bg-rose-600 rounded-full shadow-[0_0_12px_rgba(225,29,72,0.6)]" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Vermelho</span>
                    <span className="text-sm font-black text-rose-500 flex items-center gap-2">
                      {distributionStats.bCount} 
                      <span className="text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">{distributionStats.b.toFixed(1)}%</span>
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3 group/stat">
                  <div className="w-1.5 h-6 bg-amber-500 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.6)]" />
                  <div className="flex flex-col">
                    <span className="text-[8px] font-black text-white/40 uppercase tracking-[0.2em]">Empate</span>
                    <span className="text-sm font-black text-amber-500 flex items-center gap-2">
                      {distributionStats.tCount} 
                      <span className="text-[10px] bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">{distributionStats.t.toFixed(1)}%</span>
                    </span>
                  </div>
                </div>

                <div className="ml-auto flex items-center gap-4 border-l border-white/5 pl-8 hidden lg:flex">
                  <div className="flex flex-col items-end">
                    <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.3em]">Mesa Analisada</span>
                    <span className="text-[10px] font-black text-white/60 tracking-tighter italic">{distributionStats.total} / {settings.analysisCycle} RODADAS</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="mb-0 px-4 pt-4 lg:px-8">
             <SignalCard 
               prediction={prediction} 
               isActive={history.length > 0} 
               onConfirm={handleConfirmBet}
               isPending={activeBet !== null}
               lastBetResult={lastBetResult}
               lastBetOutcome={lastBetOutcome}
               winningsAmount={winningsAmount}
             />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6 items-start px-4 pb-8 lg:px-8">
            <div className="space-y-6">
              <BankPanel 
                 balance={balance} 
                 onUpdateBalance={setBalance} 
                 onReset={handleReset} 
                 stats={eliteStats}
              />
              <BeadRoad 
                history={history} 
                onReset={handleReset} 
                onImport={() => setIsImportModalOpen(true)}
                selectedSum={selectedSum}
                onSelectSum={setSelectedSum}
              />
              <AuditLog history={history} />
              <TieAnalyzer analysis={prediction.tieAnalysis} />
            </div>

            <div className="space-y-6">
               <PatternFrequency history={history} limit={settings.analysisCycle} />
               <PatternAnalytics stats={freqStats} />
               
               <div className="space-y-4">
                  <div className="glass-card p-6 relative overflow-hidden group" id="profit-metrics">
                    <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 via-transparent to-transparent opacity-100" />
                    <div className="flex items-center justify-between mb-4 relative z-10">
                      <div className="flex items-center gap-2">
                         <TrendingUp className="w-4 h-4 text-emerald-400" />
                         <h2 className="text-xs font-black uppercase tracking-widest text-white/70">Performance</h2>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-3 relative z-10">
                       <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                          <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">ROI</span>
                          <span className={clsx(
                            "text-lg font-black tracking-tighter",
                            eliteStats.roi >= 100 ? "text-emerald-400" : "text-rose-400"
                          )}>
                            {eliteStats.roi.toFixed(1)}%
                          </span>
                       </div>
                       <div className="p-3 bg-white/5 rounded-xl border border-white/5 flex justify-between items-center">
                          <span className="text-[8px] font-black text-white/30 uppercase tracking-widest">YIELD</span>
                          <span className={clsx(
                            "text-lg font-black tracking-tighter",
                            eliteStats.yield >= 0 ? "text-cyan-400" : "text-rose-400"
                          )}>
                            {eliteStats.yield.toFixed(1)}%
                          </span>
                       </div>
                    </div>
                  </div>
               </div>

               <div className="bg-[#161B29] border border-white/5 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-100" />
                  <div className="flex items-center justify-between mb-6 relative z-10">
                    <div className="flex items-center gap-2">
                       <TrendingUp className="w-4 h-4 text-cyan-400" />
                       <h2 className="text-xs font-black uppercase tracking-widest text-white/70">Ondas Matrix</h2>
                    </div>
                  </div>
                  <div className="h-40 w-full relative z-10">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={distributionStats.sums.slice().sort((a,b) => parseInt(a.name) - parseInt(b.name))}>
                        <XAxis dataKey="name" axisLine={false} tickLine={false} fontSize={8} stroke="rgba(255,255,255,0.3)" />
                        <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                          {distributionStats.sums.slice().sort((a,b) => parseInt(a.name) - parseInt(b.name)).map((entry: any, index: number) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={
                                  parseInt(entry.name) >= 9 && parseInt(entry.name) <= 11 ? '#D90429' : 
                                  parseInt(entry.name) <= 4 ? '#01497C' : 'rgba(255,255,255,0.1)'
                              } 
                            />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>

                  <div className="grid grid-cols-3 gap-4 mt-6 relative z-10">
                     {[
                      { label: 'P', val: distributionStats.p, color: 'bg-[#01497C]' },
                      { label: 'B', val: distributionStats.b, color: 'bg-[#D90429]' },
                      { label: 'T', val: distributionStats.t, color: 'bg-[#FFB703]' },
                     ].map(item => (
                       <div key={item.label} className="space-y-1">
                          <div className="flex justify-between text-[8px] font-black uppercase tracking-widest text-white/40">
                            <span>{item.label}</span>
                            <span className="text-white">{item.val.toFixed(0)}%</span>
                          </div>
                          <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                             <motion.div 
                                initial={{ width: 0 }}
                                animate={{ width: `${item.val}%` }}
                                className={clsx("h-full", item.color)}
                             />
                          </div>
                       </div>
                     ))}
                  </div>
               </div>
               
               <FlagsGrid flags={flags} />
            </div>
          </div>
        </div>
      </main>

      {isSettingsOpen && (
        <SettingsModal 
          settings={settings}
          onUpdate={setSettings}
          onClose={handleCloseSettings}
        />
      )}

      <AnimatePresence>
        {isImportModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsImportModalOpen(false)}
              className="absolute inset-0 bg-slate-900/80 backdrop-blur-md"
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-lg bg-[#161B29] rounded-[2rem] p-8 shadow-2xl border border-white/10 overflow-hidden"
            >
              <div className="flex items-center gap-2 mb-4">
                <LinkIcon className="text-emerald-400" size={20} />
                <h2 className="text-xl font-black italic text-white tracking-tighter">IMPORTAÇÃO DIRETA</h2>
              </div>
              
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em] mb-4">
                Cole a sequência de resultados abaixo (Ex: P 8, B 10, T 7...)
              </p>

              <textarea 
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Ex: P 10, B 12, P 8, T 0, B 11..."
                className="w-full h-40 bg-black/40 border border-white/10 rounded-2xl p-4 text-emerald-400 font-mono text-sm focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all outline-none resize-none"
              />

              <div className="grid grid-cols-2 gap-4 mt-6">
                <button 
                  onClick={() => setIsImportModalOpen(false)}
                  className="py-3 px-6 bg-white/5 hover:bg-white/10 text-white/40 text-[10px] font-black uppercase tracking-widest rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleManualImport()}
                  className="py-3 px-6 bg-emerald-500 hover:bg-emerald-400 text-black text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-lg shadow-emerald-500/20"
                >
                  Processar Matrix
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <footer className="py-8 text-center border-t border-slate-200 mt-auto">
         <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
               <div className="text-[9px] font-black text-slate-400 uppercase tracking-[0.5em]">Powered by Omega Prime Engine • MATRIX v3.0</div>
            </div>
            <div className="flex items-center gap-6 text-[9px] font-black text-slate-400 uppercase tracking-widest">
               <span className="flex items-center gap-1"><Info size={10}/> Termos de Uso</span>
               <span>Licenciado: MODO DEUS</span>
            </div>
         </div>
      </footer>
    </div>
  );
}
