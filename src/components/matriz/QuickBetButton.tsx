/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';
import { Target } from 'lucide-react';
import { Outcome } from '../../types';

interface QuickBetButtonProps {
  prediction: {
    target: Outcome | 'WAIT';
    confidence: number;
  };
  onConfirm: () => void;
  disabled?: boolean;
}

export const QuickBetButton: React.FC<QuickBetButtonProps> = ({ prediction, onConfirm, disabled }) => {
  const isWait = prediction.target === 'WAIT';
  
  // Semantic colors: Emerald for high confidence, Amber for mid, Rose/Slate for low/wait
  const getBtnColor = () => {
    if (isWait) return 'bg-slate-800 text-white/20 border-white/5';
    if (prediction.confidence >= 90) return 'bg-emerald-500 text-black border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.4)]';
    if (prediction.confidence >= 80) return 'bg-cyan-500 text-white border-cyan-400 shadow-[0_0_15px_rgba(6,182,212,0.3)]';
    return 'bg-amber-500 text-black border-amber-400 shadow-[0_0_15px_rgba(245,158,11,0.3)]';
  };

  return (
    <motion.button
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      onClick={onConfirm}
      disabled={disabled || isWait}
      className={clsx(
        "w-full py-4 rounded-2xl font-black text-sm uppercase tracking-[0.2em] transition-all border flex items-center justify-center gap-3",
        getBtnColor(),
        disabled && "opacity-50 cursor-not-allowed grayscale"
      )}
    >
      <Target size={18} />
      {isWait ? 'ANALISANDO MATRIZ...' : `ENTRADA CONFIRMADA (${prediction.confidence.toFixed(0)}%)`}
    </motion.button>
  );
};
