import React, { useMemo } from 'react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { BacBoResult } from '../../types';
import { Activity } from 'lucide-react';

interface SumChartProps {
  history: BacBoResult[];
}

export const SumChart: React.FC<SumChartProps> = ({ history }) => {
  const data = useMemo(() => {
    const last20 = history.slice(-20);
    
    return last20.map((item, index) => {
      // Calculate 5-period moving average
      const windowSize = 5;
      const window = last20.slice(Math.max(0, index - windowSize + 1), index + 1);
      const avg = window.reduce((acc, curr) => acc + curr.sum, 0) / window.length;

      return {
        index: index + 1,
        sum: item.sum,
        ma: parseFloat(avg.toFixed(2)),
        outcome: item.outcome
      };
    });
  }, [history]);

  const currentMA = data.length > 0 ? data[data.length - 1].ma : 0;

  if (history.length === 0) return null;

  return (
    <div className="glass-card p-6 relative overflow-hidden group">
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-emerald-400" />
          <h2 className="text-[11px] font-black uppercase tracking-[0.2em] text-white/50">
            Frequência de Somas (20 Rodadas)
          </h2>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-emerald-400" />
             <span className="text-[9px] font-bold text-white/40 uppercase tracking-tighter">Média Móvel: {currentMA}</span>
          </div>
        </div>
      </div>

      <div className="h-[180px] w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorSum" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#ffffff05" vertical={false} />
            <XAxis 
              dataKey="index" 
              hide 
            />
            <YAxis 
              domain={[2, 12]} 
              ticks={[2, 6, 12]}
              stroke="#ffffff20"
              fontSize={10}
              fontWeight="bold"
            />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: '#1e1e2e', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px',
                fontSize: '10px',
                color: '#fff'
              }}
              itemStyle={{ color: '#fff' }}
              labelStyle={{ display: 'none' }}
            />
            <ReferenceLine y={7} stroke="#ffffff10" strokeDasharray="3 3" label={{ value: 'MÉDIA', position: 'right', fill: '#ffffff20', fontSize: 8 }} />
            <Line 
              type="monotone" 
              dataKey="sum" 
              stroke="#10b981" 
              strokeWidth={3} 
              dot={{ r: 4, fill: '#10b981', strokeWidth: 2, stroke: '#064e3b' }}
              activeDot={{ r: 6, strokeWidth: 0 }}
              animationDuration={1000}
            />
            <Line 
              type="monotone" 
              dataKey="ma" 
              stroke="#f59e0b" 
              strokeWidth={2} 
              strokeDasharray="5 5"
              dot={false}
              animationDuration={1000}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
