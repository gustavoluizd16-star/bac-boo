/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { BacBoResult, Outcome } from '../../types';
import { clsx } from 'clsx';

interface CasinoDNAProps {
  history: BacBoResult[];
}

export const CasinoDNA: React.FC<CasinoDNAProps> = ({ history }) => {
  const [view, setView] = useState<'grand' | 'big' | 'board'>('grand');

  // Bead Road (Placa de Contas)
  const renderBeadRoad = () => {
    const rows = 6;
    const cols = 50; // Largura estendida para preenchimento automático
    const grid = Array(rows).fill(null).map(() => Array(cols).fill(null));
    
    // Preenchimento coluna por coluna (padrão cassino)
    history.slice().reverse().forEach((res, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      if (col < cols) grid[row][col] = res;
    });

    return (
      <div className="w-full overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
        <div className="grid grid-rows-6 grid-flow-col gap-1 p-3 bg-black/20 rounded-xl border border-white/5 min-w-max">
          {grid.map((row, r) => row.map((cell, c) => (
            <div 
              key={`${r}-${c}`}
              className={clsx(
                "w-7 h-7 sm:w-9 sm:h-9 rounded-full border flex items-center justify-center text-[11px] font-black transition-all duration-300",
                cell?.outcome === 'P' && "bg-blue-600 border-white/20 text-white shadow-[0_0_10px_rgba(37,99,235,0.3)]",
                cell?.outcome === 'B' && "bg-rose-600 border-white/20 text-white shadow-[0_0_10px_rgba(225,29,72,0.3)]",
                cell?.outcome === 'T' && "bg-amber-500 border-white/20 text-black shadow-[0_0_10px_rgba(245,158,11,0.3)]",
                !cell && "bg-white/5 border-white/5"
              )}
            >
              {cell?.sum}
            </div>
          )))}
        </div>
      </div>
    );
  };

  // --- Road Logic Engine ---
  const getBigRoadMatrix = () => {
    const cols = 40;
    const rows = 6;
    const matrix: (Outcome | null)[][] = Array(rows).fill(null).map(() => Array(cols).fill(null));
    const logicalColumns: Outcome[][] = [];
    
    if (history.length === 0) return { matrix, logicalColumns };

    let currentPath: Outcome[] = [];
    let lastOutcome: Outcome | null = null;

    [...history].reverse().forEach((res) => {
      if (res.outcome === 'T') return;
      if (lastOutcome === null || res.outcome === lastOutcome) {
        currentPath.push(res.outcome);
      } else {
        logicalColumns.push(currentPath);
        currentPath = [res.outcome];
      }
      lastOutcome = res.outcome;
    });
    if (currentPath.length > 0) logicalColumns.push(currentPath);

    // Map to grid
    logicalColumns.forEach((column, cIdx) => {
      column.forEach((outcome, rIdx) => {
        if (cIdx < cols && rIdx < rows) {
          matrix[rIdx][cIdx] = outcome;
        }
      });
    });

    return { matrix, logicalColumns };
  };

  const getDerivedRoad = (logicalColumns: Outcome[][], offset: number) => {
    const results: ('red' | 'blue')[] = [];
    
    // Derived roads start processing after a certain point in Big Road
    // Offset 1 (Big Eye): Start at col 2 row 2 OR col 3 row 1
    // Offset 2 (Small): Start at col 3 row 2 OR col 4 row 1
    // Offset 3 (Cockroach): Start at col 4 row 2 OR col 5 row 1

    let currentEntryCount = 0;
    
    for (let c = offset; c < logicalColumns.length; c++) {
      const startRow = (c === offset) ? 1 : 0;
      for (let r = startRow; r < logicalColumns[c].length; r++) {
        const colBefore = logicalColumns[c - offset];
        const colImmediatelyBefore = logicalColumns[c - 1];

        if (r === 0) {
          // Rule for first row: compare lengths of the column before offset and the one immediately before
          results.push(colBefore.length === colImmediatelyBefore.length ? 'red' : 'blue');
        } else {
          // Rule for other rows: check if entry exists in colBefore at the current row
          results.push(colBefore[r] !== undefined ? 'red' : 'blue');
        }
      }
    }
    return results;
  };

  const renderDerivedRoad = (results: ('red' | 'blue')[], label: string) => {
    const cols = 24;
    const rows = 6;
    const grid = Array(rows).fill(null).map(() => Array(cols).fill(null));
    
    results.forEach((color, i) => {
      const col = Math.floor(i / rows);
      const row = i % rows;
      if (col < cols) grid[row][col] = color;
    });

    return (
      <div className="space-y-2">
        <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em]">{label}</span>
        <div className="grid grid-rows-6 grid-flow-col gap-0.5 border border-white/5 p-1 rounded bg-black/20">
          {grid.map((row, r) => row.map((cell, c) => (
            <div 
              key={`${r}-${c}`}
              className={clsx(
                "w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border",
                cell === 'red' ? "border-rose-500 bg-rose-500/30" : 
                cell === 'blue' ? "border-blue-500 bg-blue-500/30" : "border-transparent"
              )}
            />
          )))}
        </div>
      </div>
    );
  };

  // Big Road (Estrada Grande)
  const renderBigRoad = () => {
    const { matrix } = getBigRoadMatrix();
    
    if (history.length === 0) return (
      <div className="flex items-center justify-center h-40 bg-white/5 border border-white/5 rounded-xl">
        <span className="text-[10px] font-black text-white/20 tracking-widest uppercase italic">Aguardando dados...</span>
      </div>
    );

    return (
      <div className="grid grid-rows-6 grid-flow-col gap-1 w-full overflow-x-auto pb-2 scrollbar-none border border-white/5 p-2 rounded-lg bg-black/20">
        {matrix.map((row, r) => row.map((cell, c) => (
          <div 
            key={`${r}-${c}`}
            className={clsx(
              "w-4 h-4 sm:w-5 sm:h-5 rounded-full border-2",
              cell === 'P' ? "border-blue-600" : cell === 'B' ? "border-rose-600" : "border-transparent bg-white/5"
            )}
          />
        )))}
      </div>
    );
  };

  return (
    <section className="bg-[#161B29] border border-white/5 rounded-2xl p-4 lg:p-6 space-y-4 shadow-2xl relative overflow-hidden group">
      <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
        <h2 className="text-xs font-black uppercase tracking-widest text-cyan-500">Casino DNA</h2>
        <div className="flex gap-1 bg-black/20 p-1 rounded-lg self-start border border-white/5">
          {(['grand', 'big', 'derived', 'board'] as const).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={clsx(
                "px-3 py-1 rounded-md text-[9px] font-black uppercase tracking-widest transition-all",
                view === v ? "bg-cyan-500 text-white shadow-lg" : "text-white/40 hover:text-white"
              )}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-[160px] z-10">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.2 }}
          >
            {view === 'grand' && renderBeadRoad()}
            {view === 'big' && renderBigRoad()}
            {view === 'derived' && (
               <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {renderDerivedRoad(getDerivedRoad(getBigRoadMatrix().logicalColumns, 1), 'Olho Grande (Offset 1)')}
                  {renderDerivedRoad(getDerivedRoad(getBigRoadMatrix().logicalColumns, 2), 'Estrada Pequena (Offset 2)')}
                  {renderDerivedRoad(getDerivedRoad(getBigRoadMatrix().logicalColumns, 3), 'Estrada Barata (Offset 3)')}
               </div>
            )}
            {view === 'board' && (
               <div className="grid grid-cols-4 sm:grid-cols-8 lg:grid-cols-10 gap-1">
                  {history.slice(0, 100).map((h, i) => (
                    <div 
                        key={i} 
                        className={clsx(
                            "w-full aspect-square rounded-[2px] border border-white/10",
                            h.outcome === 'P' && "bg-blue-600 shadow-[0_0_5px_rgba(37,99,235,0.5)]",
                            h.outcome === 'B' && "bg-rose-600 shadow-[0_0_5px_rgba(225,29,72,0.5)]",
                            h.outcome === 'T' && "bg-amber-500 shadow-[0_0_5px_rgba(245,158,11,0.5)]"
                        )}
                    />
                  ))}
               </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
