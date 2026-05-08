/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { motion } from 'motion/react';
import { clsx } from 'clsx';

interface RadialConfidenceProps {
  value: number;
  color: string;
  highTieRisk?: boolean;
}

export const RadialConfidence: React.FC<RadialConfidenceProps> = ({ value, color, highTieRisk }) => {
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (value / 100) * circumference;

  return (
    <div className="relative w-32 h-32 flex items-center justify-center">
      <svg className="w-full h-full transform -rotate-90">
        {/* Background Circle */}
        <circle
          cx="64"
          cy="64"
          r={radius}
          stroke="currentColor"
          strokeWidth="8"
          fill="transparent"
          className={highTieRisk ? "text-amber-500/10" : "text-white/5"}
        />
        {/* Progress Circle */}
        <motion.circle
          cx="64"
          cy="64"
          r={radius}
          stroke={highTieRisk ? "#FFB703" : color}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1, ease: "easeOut" }}
          strokeLinecap="round"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={clsx("text-2xl font-black transition-colors", highTieRisk ? "text-amber-400" : "text-white")}>
          {Math.round(value)}%
        </span>
        <span className="text-[8px] font-bold text-white/30 uppercase tracking-widest">Confiança</span>
      </div>
      
      {/* Glow Effect */}
      <div 
        className={clsx(
          "absolute inset-2 rounded-full blur-2xl transition-all duration-700",
          highTieRisk ? "opacity-30 scale-125" : "opacity-10"
        )}
        style={{ backgroundColor: highTieRisk ? "#FFB703" : color }}
      />
    </div>
  );
};
