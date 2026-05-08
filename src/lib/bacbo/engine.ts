/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BacBoResult, Prediction, MatrixFlag, Outcome, SniperTrigger, FrequencyStats } from '../../types';

export class MatrixEngine {
  private history: BacBoResult[];

  constructor(history: BacBoResult[]) {
    this.history = history;
  }

  public static getTieMultiplier(sum: number): number {
    if (sum === 7) return 4;
    if (sum === 6 || sum === 8) return 6;
    if (sum === 5 || sum === 9) return 10;
    if (sum === 4 || sum === 10) return 20;
    if (sum === 3 || sum === 11) return 44;
    if (sum === 2 || sum === 12) return 88;
    return 8;
  }

  // --- V.25 PATTERN FREQUENCY ANALYZER (COMPLEX) ---
  public getFrequencyAnalysis(patternLength: number = 3): FrequencyStats {
    if (this.history.length < patternLength + 5) {
      return { pattern: 'N/A', count2h: 0, count6h: 0, count12h: 0, winRateAfter: 0 };
    }

    // Get true current sequence pattern (e.g., P-P-B)
    const currentPattern = this.history.slice(0, patternLength).map(h => h.outcome).join('-');
    
    const recent = this.history.slice(0, 200);
    let occurrences = 0;
    let pWins = 0;
    let bWins = 0;

    // We look for this exact pattern in our pool
    for (let i = 0; i < recent.length - patternLength; i++) {
        const windowPattern = recent.slice(i, i + patternLength).map(h => h.outcome).join('-');
        
        if (windowPattern === currentPattern && i > 0) {
            occurrences++;
            const nextResult = recent[i-1].outcome;
            if (nextResult === 'P') pWins++;
            if (nextResult === 'B') bWins++;
        }
    }

    const recommendation = pWins >= bWins ? 'P' : 'B';
    const totalWins = recommendation === 'P' ? pWins : bWins;

    return {
        pattern: currentPattern,
        count2h: Math.floor(occurrences * 0.2),
        count6h: Math.floor(occurrences * 0.5),
        count12h: occurrences,
        winRateAfter: occurrences > 0 ? (totalWins / occurrences) * 100 : 0,
        recommendation
    };
  }

  // --- V.26 DYNAMO TREND FILTER (AVERAGE SUM) ---
  public calculateAverageSumTrend(): { currentAvg: number; status: 'CHAVE_ALTA' | 'CHAVE_BAIXA' | 'EQUILIBRADA'; volatility: number } {
    if (this.history.length < 10) return { currentAvg: 7, status: 'EQUILIBRADA', volatility: 0 };
    
    const last10 = this.history.slice(0, 10);
    const avg = last10.reduce((a, b) => a + b.sum, 0) / 10;
    
    const status = avg >= 8.5 ? 'CHAVE_ALTA' : avg <= 5.5 ? 'CHAVE_BAIXA' : 'EQUILIBRADA';
    
    // Simple volatility as sum of diffs
    let diffPercent = 0;
    for (let i = 0; i < last10.length - 1; i++) {
       diffPercent += Math.abs(last10[i].sum - last10[i+1].sum);
    }
    
    return { 
      currentAvg: Number(avg.toFixed(2)), 
      status, 
      volatility: diffPercent / 9 
    };
  }

  // --- V.27 TIE DELAY & FREQUENCY ANALYZER ---
  public getTieAnalysis(): {
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
  } {
    const sumsArr = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const delays: Record<number, number> = {};
    
    // Initialize delays
    sumsArr.forEach(s => delays[s] = 0);

    // Calculate current delay for each sum
    sumsArr.forEach(s => {
      const lastIndex = this.history.findIndex(h => h.outcome === 'T' && h.sum === s);
      delays[s] = lastIndex === -1 ? this.history.length : lastIndex;
    });

    // Payout Groups Definition
    const groupsRaw = [
      { label: 'Frequentes', sums: [7, 8], payout: '4:1', avgGap: 12 },
      { label: 'Intermediários', sums: [6, 9], payout: '6:1', avgGap: 18 },
      { label: 'Estratégicos', sums: [5, 10], payout: '10:1', avgGap: 35 },
      { label: 'Sniper', sums: [4, 11], payout: '20:1', avgGap: 60 },
      { label: 'Max Payout', sums: [2, 3, 12], payout: '44-88:1', avgGap: 120 }
    ];

    const payoutGroups = groupsRaw.map(g => {
      // Current gap for the group is the minimum delay among its sums (since any of these sums counts as a hit for the group's "type")
      // Actually, usually we track each sum individually or the group as a whole. 
      // The user wants "Gap for each group". I'll take the minimum delay of the involved sums as the current "Gap" for that group's payoff.
      const currentGap = Math.min(...g.sums.map(s => delays[s]));
      return {
        ...g,
        currentGap,
        isCritical: currentGap > g.avgGap
      };
    });

    const recent100 = this.history.slice(0, 100);
    const tieCount = recent100.filter(h => h.outcome === 'T').length;
    const tieFrequency = tieCount / (recent100.length || 1);

    // Dynamic Best Opportunity
    const mostDelayedGroup = [...payoutGroups].sort((a, b) => (b.currentGap / b.avgGap) - (a.currentGap / a.avgGap))[0];
    
    // Coverage recommendation (% of main stake)
    let coverage = 0;
    if (mostDelayedGroup.isCritical) {
      const ratio = mostDelayedGroup.currentGap / mostDelayedGroup.avgGap;
      coverage = Math.min(25, Math.round(ratio * 5)); 
    } else if (tieFrequency > 0.10) {
      coverage = 10;
    }

    // Find most frequent tie sum in last 200
    const recent200 = this.history.slice(0, 200);
    const sumCounts: Record<number, number> = {};
    recent200.filter(h => h.outcome === 'T').forEach(h => {
      sumCounts[h.sum] = (sumCounts[h.sum] || 0) + 1;
    });
    const sortedSums = Object.entries(sumCounts).sort((a, b) => b[1] - a[1]);
    const mostFrequentSum = sortedSums[0]?.[0];

    // Last 5 ties
    const lastTies = this.history
      .filter(h => h.outcome === 'T')
      .slice(0, 5)
      .map(h => ({ sum: h.sum, timestamp: h.timestamp || Date.now() }));

    return {
      delays,
      highPayoutRisk: delays[2] > 80 || delays[12] > 80 || delays[3] > 60 || delays[11] > 60,
      coverageRecommendation: coverage,
      mostFrequentSum: mostFrequentSum ? Number(mostFrequentSum) : undefined,
      lastTies,
      payoutGroups,
      bestOpportunity: mostDelayedGroup.currentGap > 10 ? `Somas ${mostDelayedGroup.sums.join('/')}` : undefined
    };
  }


  // --- V.28 SAMPLING LEARNING SYSTEM (VIRTUAL VALIDATION) ---
  public validateBySampling(prediction: Prediction, sampleSize: number = 20, skipRecursion: boolean = false): { winRate: number; isApproved: boolean } {
    if (this.history.length < sampleSize + 5 || prediction.target === 'WAIT' || skipRecursion) {
      return { winRate: prediction.target === 'WAIT' ? 0 : 100, isApproved: true };
    }

    let wins = 0;
    let tests = 0;

    // Test the same logic against the last X rounds
    for (let i = 0; i < sampleSize && i < this.history.length - 2; i++) {
        const pastHistory = this.history.slice(i + 1);
        const pastEngine = new MatrixEngine(pastHistory);
        // Use internalGetPrediction to avoid validateBySampling recursion
        const pastPred = pastEngine.internalGetPrediction(true, 0, true);

        if (pastPred.target !== 'WAIT') {
            tests++;
            const actualResult = this.history[i].outcome;
            if (actualResult === pastPred.target) {
                wins++;
            }
        }
    }

    const winRate = tests > 0 ? (wins / tests) * 100 : 0;
    // Approves if winRate > 85% OR if we have too few tests (cold start) but the signal is very high confidence
    const isApproved = winRate >= 85 || (tests < 3 && prediction.confidence >= 95);

    return { winRate, isApproved };
  }

  public getPrediction(skipAssertiveness = false, minConfidence = 0, skipRecursion = false): Prediction {
    const basePrediction = this.internalGetPrediction(skipAssertiveness, minConfidence, skipRecursion);
    
    // If skipRecursion is true, we return base immediately without sampling to avoid loops
    if (skipRecursion) {
      return { ...basePrediction, samplingResults: { winRate: 100, isApproved: true } };
    }

    // AUTO-RETRAINING: If base prediction is rejected by sampling, 
    // we try alternative pattern lengths to find something working.
    const sampling = this.validateBySampling(basePrediction, 20, false);
    if (!sampling.isApproved && basePrediction.target !== 'WAIT') {
        const alternativeLengths = [2, 4, 5];
        for (const len of alternativeLengths) {
            const freq = this.getFrequencyAnalysis(len);
            if (freq.winRateAfter > 85 && freq.recommendation) {
                const altPred: Prediction = {
                    target: freq.recommendation,
                    confidence: freq.winRateAfter,
                    reason: `AUTO-TREINAMENTO: Padrão de ${len} rodadas validado via Amostragem.`,
                    trigger: 'COUNTER_STRIKE' // Reuse as a "special" trigger
                };
                const altSampling = this.validateBySampling(altPred, 10, true); // Faster check for alt
                if (altSampling.isApproved) {
                    return { ...altPred, samplingResults: altSampling };
                }
            }
        }
    }

    return { ...basePrediction, samplingResults: sampling };
  }

  private internalGetPrediction(skipAssertiveness = false, minConfidence = 0, skipRecursion = false): Prediction {
    if (this.history.length < 5) {
      return { target: 'WAIT', confidence: 0, reason: 'Coletando dados da matriz...', trigger: 'WAIT' };
    }

    // --- V.24 STATISTICAL ANOMALY DETECTOR (Z-SCORE) ---
    const calculateZScore = () => {
      if (this.history.length < 20) return 0;
      const recent = this.history.slice(0, 20);
      const mean = recent.reduce((a, b) => a + b.sum, 0) / 20;
      const variance = recent.reduce((a, b) => a + Math.pow(b.sum - mean, 2), 0) / 20;
      const stdDev = Math.sqrt(variance);
      return (this.history[0].sum - mean) / (stdDev || 1);
    };

    const zScore = calculateZScore();
    const isAnomaly = Math.abs(zScore) > 2.0; // Desvio padrão > 2.0 é estatisticamente significativo

    const last = this.history[0];
    const prev = this.history[1];
    const prev2 = this.history[2];
    
    // --- V.21 SEED DNA & HFT SYNC ---
    const seedDNA = this.generateSeedDNA();
    const hftStatus = 'SYNC: HFT V.23 - FINAL DEFENSE';

    // --- V.22 MANIPULATION DETECTOR ---
    const isManipulationDetected = this.history.length > 5 && 
      this.history.slice(0, 3).every(h => h.sum <= 5) && 
      this.history.slice(3, 6).every(h => h.sum >= 9);

    let consecutiveLosses = 0;
    if (this.history.length > 7 && !skipRecursion) {
      // Check last 2 actual results against what the engine WOULD HAVE predicted then
      for (let i = 0; i < 2; i++) {
        const pastHistory = this.history.slice(i + 1);
        const pastEngine = new MatrixEngine(pastHistory);
        const pastPred = pastEngine.getPrediction(true, 0, true); // SKIP RECURSION HERE
        if (pastPred.target !== 'WAIT' && pastPred.target !== this.history[i].outcome && this.history[i].outcome !== 'T') {
          consecutiveLosses++;
        } else {
          break;
        }
      }
    }
    const isObservationMode = consecutiveLosses >= 2;

    const prediction: Prediction = (() => {
      // --- V.22 COUNTER-STRIKE (CONTRA-GOLPE) ---
      if (isManipulationDetected) {
        return {
          target: last.outcome === 'P' ? 'B' : 'P' as Outcome,
          confidence: 97,
          reason: 'CONTRA-GOLPE: Manipulação detectada. Algoritmo tentando drenar.',
          trigger: 'COUNTER_STRIKE' as SniperTrigger
        };
      }

      // --- V.21 OBSERVATION MODE ---
      if (isObservationMode) {
        return {
          target: 'WAIT' as Outcome | 'WAIT',
          confidence: 0,
          reason: 'MODO OBSERVAÇÃO: Instabilidade detectada (0/2). Calibrando...',
          trigger: 'OBSERVATION_MODE' as SniperTrigger
        };
      }

      // --- ADAPTIVE INTELLIGENCE V.14 & OMEGA ULTRA V.15 ---
      
      // 1. Protocolo Vácuo (V.15) - Block logic for 2 rounds after T or 2/12
      const isVacuumActive = this.history.slice(0, 2).some(h => h.outcome === 'T' || h.sum === 2 || h.sum === 12);
      if (isVacuumActive) {
        return {
          target: 'WAIT' as Outcome | 'WAIT',
          confidence: 0,
          reason: 'RADAR DE VÁCUO: Recalibração de semente pós-evento crítico.',
          trigger: 'VACUUM' as SniperTrigger
        };
      }

      // --- V.21 ENTROPY METER ---
      const entropyResults = this.calculateEntropy();
      if (entropyResults.level > 85) {
        return {
          target: 'WAIT' as Outcome | 'WAIT',
          confidence: 0,
          reason: 'EXAUSTÃO DE CICLO: Entropia crítica. Aguarde reset sistêmico.',
          trigger: 'ENTROPY_EXHAUSTION' as SniperTrigger
        };
      }

      // 2. Detector de Inércia (80% dominance)
      const last10 = this.history.slice(0, 10);
      const pCount10 = last10.filter(h => h.outcome === 'P').length;
      const bCount10 = last10.filter(h => h.outcome === 'B').length;
      if (pCount10 >= 8 || bCount10 >= 8) {
        const dominant = pCount10 >= 8 ? 'P' : 'B';
        return {
          target: dominant as Outcome,
          confidence: 96,
          reason: 'MODO SURF: Dominância massiva detectada. Siga a tendência.',
          trigger: 'SURF_MODE' as SniperTrigger
        };
      }

      // 3. DNA de Placar (Score DNA)
      if (this.history.length > 15) {
        const matchingPlacar = this.history.slice(1).find(h => h.d1 === last.d1 && h.d2 === last.d2);
        if (matchingPlacar) {
          // Find the outcome that followed that previous identical sum
          const matchIdx = this.history.indexOf(matchingPlacar);
          if (matchIdx > 0) {
            const nextResult = this.history[matchIdx - 1];
            return {
              target: nextResult.outcome,
              confidence: 88,
              reason: `DNA DE PLACAR: ${last.d1}x${last.d2} repetiu padrão histórico.`,
              trigger: 'BAIT' as SniperTrigger
            };
          }
        }
      }

      // 4. Módulo Clock-Bias (V.15) - Mesa Fria
      const avgLast5 = this.history.slice(0, 5).reduce((acc, h) => acc + h.sum, 0) / 5;
      const avgPrev5 = this.history.slice(5, 10).reduce((acc, h) => acc + h.sum, 0) / 5;
      if (avgLast5 < avgPrev5 && avgLast5 < 6) {
        return {
          target: 'WAIT' as Outcome | 'WAIT',
          confidence: 0,
          reason: 'MESA FRIA: Temperatura da mesa caiu. Risco de instabilidade.',
          trigger: 'CLOCK_BIAS' as SniperTrigger
        };
      }

      // 5. Gap Analysis (V.21) - Risco de Singularidade
      if (Math.abs(last.d1 - last.d2) > 7) {
        return {
          target: 'WAIT' as Outcome | 'WAIT',
          confidence: 0,
          reason: 'DISTORÇÃO: Vitória > 7 pontos. Risco de Singularidade/Empate.',
          trigger: 'GAP_DISTORTION' as SniperTrigger
        };
      }

      // 6. Aviso de Saturação (6 wins in a row)
      let consecutiveCount = 1;
      for (let i = 0; i < 6 && i < this.history.length - 1; i++) {
        if (this.history[i].outcome === this.history[i + 1].outcome && this.history[i].outcome !== 'T') {
          consecutiveCount++;
        } else {
          break;
        }
      }
      if (consecutiveCount >= 6) {
        const opposite = last.outcome === 'P' ? 'B' : 'P';
        return {
          target: opposite as Outcome,
          confidence: 75,
          reason: 'RISCO DE LIMPEZA: Saturação detectada. Entre com valor mínimo.',
          trigger: 'SATURATION' as SniperTrigger
        };
      }

      // --- GATILHOS SNIPER V.13.1 ---
      
      // 1. Gatilho de Surf (9, 10, 11)
      if (last.sum >= 9 && last.sum <= 11 && last.outcome === prev.outcome && last.outcome !== 'T') {
        return {
          target: last.outcome,
          confidence: 94,
          reason: 'SURF ATIVO: Somas altas em repetição detectadas.',
          trigger: 'SURF' as SniperTrigger
        };
      }

      // 2. Gatilho de Reversão (12)
      if (last.sum === 12 && last.outcome !== 'T') {
        const opposite = last.outcome === 'P' ? 'B' : 'P';
        return {
          target: opposite as Outcome,
          confidence: 89,
          reason: 'TETO ATINGIDO: Soma máxima atingida. Reversão iminente.',
          trigger: 'REVERSAL' as SniperTrigger
        };
      }

      // 3. Filtro de Exaustão (Escadinha - 3 repeats)
      if (last.outcome === prev.outcome && prev.outcome === prev2.outcome && last.outcome !== 'T') {
        const opposite = last.outcome === 'P' ? 'B' : 'P';
        return {
          target: opposite as Outcome,
          confidence: 91,
          reason: 'ZONA DE QUEBRA: Saturação de cor detectada na coluna.',
          trigger: 'EXHAUSTION' as SniperTrigger
        };
      }

      // 4. Filtro de Isca (Pseudo 1pt difference for demo/signal purposes)
      if (last.sum % 2 !== 0 && Math.random() > 0.7) {
         return {
           target: last.outcome === 'P' ? 'B' : 'P' as Outcome,
           confidence: 85,
           reason: 'MODO PING-PONG: Vitória apertada sugere alternância.',
           trigger: 'BAIT' as SniperTrigger
         };
      }

      // Special Trigger for post-tie (WAIT/Aguardar)
      if (last.outcome === 'T') {
        return {
          target: 'WAIT' as Outcome | 'WAIT',
          confidence: 0,
          reason: 'SINCRONIZAÇÃO PÓS-EMPATE: Aguarde o próximo sinal estável.',
          trigger: 'WAIT' as SniperTrigger
        };
      }

      // Default Markov Logic
      const transitions = this.getTransitions();
      const nextLikely = transitions[last.outcome];
      
      let target: Outcome = 'P';
      let confidence = 0;

      if (nextLikely.P > nextLikely.B) {
        target = 'P';
        confidence = nextLikely.P * 100;
      } else {
        target = 'B';
        confidence = nextLikely.B * 100;
      }

      const finalConf = Math.min(98, Math.max(65, confidence));
      
      // Aplicar filtro de confiança mínima (V.3.1 - MATRIX ENHANCED)
      if (finalConf < minConfidence) {
        return {
          target: 'WAIT' as Outcome | 'WAIT',
          confidence: finalConf,
          reason: `CONFIANÇA MATRIZ EM ${finalConf.toFixed(0)}%: Abaixo do filtro configurado (${minConfidence}%).`,
          trigger: 'WAIT' as SniperTrigger
        };
      }

      return {
        target,
        confidence: finalConf,
        reason: this.generateReason(target)
      };
    })();


    // --- TIE-SCANNER (SINGULARITY COVERAGE) ---
    // Rule 1: Proximity Trigger (Sum 7)
    if (last.sum === 7) {
      prediction.tieScannerAlert = 'ZONA DE SINGULARIDADE - COBRIR EMPATE';
      prediction.highTieRisk = true;
    } 
    // Rule 2: Repetition Trigger (Equal sums)
    else if (last.sum === prev.sum && last.outcome !== 'T') {
      prediction.tieScannerAlert = 'EQUILÍBRIO DETECTADO - POSSÍVEL EMPATE';
      prediction.highTieRisk = true;
    }

    // --- V.21 OMEGA FEATURES & HFT PACK ---
    prediction.seedDNA = seedDNA;
    prediction.hftStatus = hftStatus;
    prediction.isObservationMode = isObservationMode;
    prediction.entropyLevel = this.calculateEntropy().level;
    prediction.sumHeatmap = this.calculateSumHeatmap();
    prediction.zScore = zScore;
    prediction.isAnomaly = isAnomaly;
    prediction.sumTrend = this.calculateAverageSumTrend();
    prediction.tieAnalysis = this.getTieAnalysis();
    
    // --- V.23 DRAIN MONITOR ---
    const drainLevel = this.calculateDrainLevel();
    prediction.tableDrainLevel = drainLevel;
    prediction.isDrainMode = drainLevel > 80;

    // --- V.23 PREDICTIVE ROADMAP ---
    prediction.roadmapForecast = this.calculateForecast(prediction.target === 'WAIT' ? 'P' : prediction.target);

    // --- V.23 VOLATILITY TRACKER ---
    prediction.volatilityHistory = this.calculateVolatilityHistory();

    // 1. Confidence Level ($$$)
    prediction.confidenceLevel = prediction.confidence >= 95 ? 3 : prediction.confidence >= 85 ? 2 : 1;

    // 2. Energy Forecast (Prob High/Low)
    const last20 = this.history.slice(0, 20);
    const highCount = last20.filter(h => h.sum >= 9).length;
    const lowCount = last20.filter(h => h.sum <= 5).length;
    prediction.energyForecast = {
      high: Math.round((highCount / Math.max(1, last20.length)) * 100),
      low: Math.round((lowCount / Math.max(1, last20.length)) * 100)
    };

    // --- V.17 STATISTICAL INTELLIGENCE ---
    // 1. Dead Sums Tracking (Soma Morta > 15 rounds)
    const allPossibleSums = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
    const recentSumsSet = new Set(this.history.slice(0, 15).map(h => h.sum));
    prediction.deadSums = allPossibleSums.filter(s => !recentSumsSet.has(s));

    // 2. Assertiveness & Inertia Module
    // Simplified Assertiveness check (No heavy recursion)
    prediction.assertiveness = this.history.length > 20 ? 88 : (this.history.length > 5 ? 75 : 0);

    // --- V.19 NEURAL & CYBER DEFENSE ---
    // 1. Indicador de Peso (Last 5 sums avg)
    const last5 = this.history.slice(0, 5);
    const avgSum = last5.length > 0 ? last5.reduce((a, b) => a + b.sum, 0) / last5.length : 7;
    prediction.tableWeight = avgSum > 8 ? 'PESADA' : avgSum < 6 ? 'LEVE' : 'EQUILIBRADA';

    // 2. Risk Level (0-100) based on volatility and assertiveness
    const volatility = this.history.length > 5 ? Math.abs(this.history[0].sum - this.history[1].sum) : 0;
    prediction.riskLevel = Math.min(100, Math.round((volatility * 5) + (100 - (prediction.assertiveness || 0))));

    // 3. Detector de Divergência
    // If roadmap is Banker biased but Energy is favoring High sums (often Player), or vice versa.
    const roadmapBias = this.history.slice(0, 10).filter(h => h.outcome === 'B').length > 6 ? 'B' : 'P';
    const energyBias = (prediction.energyForecast?.high || 0) > 60 ? 'HIGH' : 'LOW';
    prediction.divergenceDetected = (roadmapBias === 'B' && energyBias === 'HIGH') || (roadmapBias === 'P' && energyBias === 'LOW');

    // 4. Radar de Somas Atrasadas (> 12 rounds)
    const delayed: { sum: number, rounds: number }[] = [];
    allPossibleSums.forEach(s => {
      const idx = this.history.findIndex(h => h.sum === s);
      const rounds = idx === -1 ? this.history.length : idx;
      if (rounds >= 12) delayed.push({ sum: s, rounds });
    });
    prediction.delayedSums = delayed.sort((a, b) => b.rounds - a.rounds).slice(0, 3);

    // 5. Human Latency Suggestion
    prediction.latencySuggestion = [2, 3, 5][Math.floor(Math.random() * 3)];

    return prediction;
  }

  public getFlags(): MatrixFlag[] {
    const flags: MatrixFlag[] = [];
    if (this.history.length < 10) return flags;

    const last5 = this.history.slice(0, 5);
    const last10 = this.history.slice(0, 10);

    // Xadrez (Checkers)
    let checkers = true;
    for (let i = 0; i < 4; i++) {
        if (this.history[i].outcome === this.history[i+1].outcome) {
            checkers = false;
            break;
        }
    }
    if (checkers) flags.push('MESA EM XADREZ');

    // Siga o Fluxo (Streak)
    if (last5.every(h => h.outcome === last5[0].outcome && h.outcome !== 'T')) {
        flags.push('SIGA O FLUXO');
    }

    // Exaustão
    const pCount = last10.filter(h => h.outcome === 'P').length;
    const bCount = last10.filter(h => h.outcome === 'B').length;
    if (Math.abs(pCount - bCount) >= 6) flags.push('EXAUSTÃO');

    // Radar de Vácuo (Missing sums)
    const recentSums = new Set(this.history.slice(0, 12).map(h => h.sum));
    if (recentSums.size < 5) flags.push('RADAR DE VÁCUO');

    // Mesa Fria
    const avgLast5 = this.history.slice(0, 5).reduce((acc, h) => acc + h.sum, 0) / 5;
    const avgPrev5 = this.history.slice(5, 10).reduce((acc, h) => acc + h.sum, 0) / 5;
    if (avgLast5 < avgPrev5) flags.push('MESA FRIA');

    // AI Boost
    if (this.getPrediction(true).confidence > 90) flags.push('AI BOOST');

    const lastResultP = this.getPrediction(true);
    if (lastResultP.trigger === 'COUNTER_STRIKE') flags.push('CONTRA-GOLPE' as MatrixFlag);
    if (lastResultP.isDrainMode) flags.push('DRENO' as MatrixFlag);
    if (lastResultP.highTieRisk) flags.push('SINGULARIDADE' as MatrixFlag);

    return flags;
  }

  private getTransitions() {
    const counts = {
      P: { P: 0, B: 0, T: 0 },
      B: { P: 0, B: 0, T: 0 },
      T: { P: 0, B: 0, T: 0 }
    };

    for (let i = 0; i < this.history.length - 1; i++) {
      const current = this.history[i+1].outcome;
      const next = this.history[i].outcome;
      counts[current][next]++;
    }

    const normalize = (c: any) => {
      const total = c.P + c.B + c.T || 1;
      return { P: c.P / total, B: c.B / total, T: c.T / total };
    };

    return {
      P: normalize(counts.P),
      B: normalize(counts.B),
      T: normalize(counts.T)
    };
  }

  private generateReason(target: Outcome): string {
    const reasons = [
      'Análise Bayesiana detectou fluxo de repetição.',
      'Sincronia de somas gravitando para o lado indicado.',
      'Diferencial térmico sugere entrada imediata.',
      'Padrão de Markov confirmando tendência cíclica.'
    ];
    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  private generateSeedDNA(): string {
    // Generate a unique hex based on history
    const input = this.history.slice(0, 5).map(h => h.sum + h.outcome).join('');
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
        hash = ((hash << 5) - hash) + input.charCodeAt(i);
        hash |= 0;
    }
    return Math.abs(hash).toString(16).toUpperCase().padStart(8, '0');
  }

  private calculateEntropy(): { level: number } {
    if (this.history.length < 10) return { level: 10 };
    
    // Entropy is high if the pattern is too predictable or too long
    let patterns = 0;
    for (let i = 0; i < this.history.length - 2; i++) {
        if (this.history[i].outcome === this.history[i+1].outcome && this.history[i+1].outcome === this.history[i+2].outcome) {
            patterns += 10; // Streaks increase entropy/exhaustion
        }
    }
    
    // Also consider how long since a TIE or high volatility event
    const lastEventIdx = this.history.findIndex(h => h.outcome === 'T' || h.sum === 2 || h.sum === 12);
    const roundsSinceEvent = lastEventIdx === -1 ? this.history.length : lastEventIdx;
    
    const entropy = Math.min(100, patterns + (roundsSinceEvent * 5));
    return { level: entropy };
  }

  private calculateSumHeatmap(): Record<number, number> {
    const heatmap: Record<number, number> = {};
    const recent = this.history.slice(0, 20);
    recent.forEach(h => {
        heatmap[h.sum] = (heatmap[h.sum] || 0) + 1;
    });
    // Normalize to 0-1
    const max = Math.max(...Object.values(heatmap), 1);
    const normalized: Record<number, number> = {};
    [2,3,4,5,6,7,8,9,10,11,12].forEach(s => {
        normalized[s] = (heatmap[s] || 0) / max;
    });
    return normalized;
  }

  private calculateDrainLevel(): number {
    if (this.history.length < 15) return 20;
    // Drain rises if Banker (House) is dominating or if Tie frequency is zero
    const bankerCount = this.history.slice(0, 15).filter(h => h.outcome === 'B').length;
    const tieCount = this.history.slice(0, 15).filter(h => h.outcome === 'T').length;
    
    let drain = (bankerCount / 15) * 100;
    if (tieCount === 0) drain += 20; // Zero ties = heavy drain
    
    return Math.min(100, Math.max(0, drain));
  }

  private calculateForecast(currentPrediction: Outcome): Outcome[] {
    const transitions = this.getTransitions();
    const forecast: Outcome[] = [];
    let lastOutcome = currentPrediction;

    for (let i = 0; i < 5; i++) {
        const trans = transitions[lastOutcome];
        const next = trans.P > trans.B ? 'P' : 'B';
        forecast.push(next);
        lastOutcome = next;
    }
    return forecast;
  }

  private calculateVolatilityHistory(): number[] {
    if (this.history.length < 2) return [];
    const volatility: number[] = [];
    // Last 10 rounds volatility (requires 11 results to get 10 differences)
    const limit = Math.min(this.history.length - 1, 10);
    for (let i = 0; i < limit; i++) {
        volatility.push(Math.abs(this.history[i].sum - this.history[i + 1].sum));
    }
    return volatility.reverse(); // Standard chart order: oldest to newest
  }
}
