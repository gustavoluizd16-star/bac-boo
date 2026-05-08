/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type Outcome = 'P' | 'B' | 'T'; // P = Player (Red), B = Banker (Blue), T = Tie (Gold)

export interface BacBoResult {
  id: string;
  outcome: Outcome;
  sum: number;
  d1: number;
  d2: number;
  timestamp: number;
  winnings?: number;
  betAmount?: number;
  mainAmount?: number;
  tieAmount?: number;
}

export type SniperTrigger = 'SURF' | 'REVERSAL' | 'BAIT' | 'EXHAUSTION' | 'WAIT' | 'SURF_MODE' | 'SATURATION' | 'LOCKDOWN' | 'CLOCK_BIAS' | 'VACUUM' | 'GAP_DISTORTION' | 'ENTROPY_EXHAUSTION' | 'OBSERVATION_MODE' | 'COUNTER_STRIKE';

export interface Prediction {
  target: Outcome | 'WAIT';
  confidence: number;
  reason: string;
  trigger?: SniperTrigger;
  tieScannerAlert?: string;
  highTieRisk?: boolean;
  serverHealth?: number;
  confidenceLevel?: 1 | 2 | 3;
  energyForecast?: {
    high: number;
    low: number;
  };
  tableStatus?: 'STABLE' | 'HOSTILE';
  deadSums?: number[];
  assertiveness?: number;
  isInertiaMode?: boolean;
  tableWeight?: 'PESADA' | 'LEVE' | 'EQUILIBRADA';
  riskLevel?: number; // 0 to 100
  divergenceDetected?: boolean;
  delayedSums?: { sum: number, rounds: number }[];
  latencySuggestion?: number;
  entropyLevel?: number;
  isObservationMode?: boolean;
  seedDNA?: string;
  hftStatus?: string;
  sumHeatmap?: Record<number, number>;
  tableDrainLevel?: number; // 0-100, > 80 means Drain Mode
  isDrainMode?: boolean;
  roadmapForecast?: Outcome[];
  volatilityHistory?: number[];
  zScore?: number;
  isAnomaly?: boolean;
  sumTrend?: {
    currentAvg: number;
    status: 'CHAVE_ALTA' | 'CHAVE_BAIXA' | 'EQUILIBRADA';
    volatility: number;
  };
  tieAnalysis?: {
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
  samplingResults?: { winRate: number; isApproved: boolean };
}

export type MatrixFlag = 
  | 'SIGA O FLUXO' 
  | 'MESA EM XADREZ' 
  | 'RUPTURA' 
  | 'EXAUSTÃO' 
  | 'PRESSÃO DE EMPATE' 
  | 'ZONA DE QUEBRA' 
  | 'DIFERENCIAL' 
  | 'MESA QUENTE' 
  | 'MESA FRIA' 
  | 'RADAR DE VÁCUO' 
  | 'SIMETRIA' 
  | 'SELO EV+' 
  | 'AI BOOST'
  | 'CONTRA-GOLPE'
  | 'DRENO'
  | 'SINGULARIDADE';

export interface SessionStats {
  winCount: number;
  lossCount: number;
  totalRounds: number;
  balance: number;
  currentStreak: number;
  history: BacBoResult[];
}

export interface FrequencyStats {
  pattern: string;
  count2h: number;
  count6h: number;
  count12h: number;
  winRateAfter: number;
  recommendation?: Outcome;
}

export interface AppSettings {
  autoBot: boolean;
  ghostMode: boolean;
  soundEnabled: boolean;
  minConfidence: number;
  timerMinutes: number;
  betUnit: number;
  sessionCookie?: string;
  externalApiUrl?: string;
  analysisCycle: 25 | 45 | 65;
  autoConfirm: boolean;
}
