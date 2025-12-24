import React from 'react';
import GlassCard from './ui/GlassCard';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const data = [
  { name: 'Jan', won: 4000, lost: 2400 },
  { name: 'Feb', won: 3000, lost: 1398 },
  { name: 'Mar', won: 2000, lost: 9800 },
  { name: 'Apr', won: 2780, lost: 3908 },
  { name: 'May', won: 1890, lost: 4800 },
  { name: 'Jun', won: 2390, lost: 3800 },
];

const Analytics: React.FC = () => {
  return (
    <div className="p-10">
      <h1 className="text-2xl font-bold text-slate-800 tracking-tight mb-6">Performance Analytics</h1>
      <div className="grid grid-cols-1 gap-6">
         <GlassCard className="p-6 h-[400px]">
            <h3 className="font-bold text-slate-800 mb-6">Win/Loss Ratio</h3>
            <ResponsiveContainer width="100%" height="85%">
              <BarChart data={data}>
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fontSize: 12}} />
                <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                <Bar dataKey="won" fill="#6366f1" radius={[4, 4, 0, 0]} stackId="a" />
                <Bar dataKey="lost" fill="#cbd5e1" radius={[4, 4, 0, 0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
         </GlassCard>
      </div>
    </div>
  );
};

export default Analytics;