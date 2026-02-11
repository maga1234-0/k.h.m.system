
"use client"

import { CartesianGrid, XAxis, ResponsiveContainer, YAxis, Legend, AreaChart, Area, Tooltip } from "recharts"

interface DashboardChartsProps {
  data: {
    name: string;
    occupancy: number;
    revenue: number;
  }[];
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-gray-500 text-sm italic border-2 border-dashed border-white/5 rounded-3xl">
        Données insuffisantes pour générer les tendances hebdomadaires.
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#66d3b2" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="#66d3b2" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff" opacity={0.05} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: "#9ca3af", fontWeight: 500 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: "#9ca3af" }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: '#1a1a1a', border: 'none', borderRadius: '12px', color: '#fff' }}
            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle" 
            wrapperStyle={{ fontSize: 11, paddingBottom: 25, color: '#9ca3af' }} 
          />
          <Area 
            type="monotone" 
            dataKey="occupancy" 
            stroke="#66d3b2" 
            fillOpacity={1} 
            fill="url(#colorOccupancy)" 
            strokeWidth={3}
            animationDuration={1500}
            name="occupancy"
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="#8b5cf6" 
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
            strokeWidth={3}
            animationDuration={1500}
            name="revenue"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
