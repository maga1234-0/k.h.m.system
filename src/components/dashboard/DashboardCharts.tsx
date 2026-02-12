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
      <div className="flex h-full w-full flex-col items-center justify-center text-muted-foreground text-sm italic border-2 border-dashed rounded-[3rem] bg-muted/5 gap-4">
        <div className="h-16 w-16 rounded-full bg-muted/20 animate-pulse flex items-center justify-center text-muted-foreground/30">
          📉
        </div>
        <p className="font-black uppercase tracking-[0.2em] text-[10px]">Collecte des données en cours...</p>
      </div>
    );
  }

  return (
    <div className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.6}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.3} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 800 }}
            dy={15}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))", fontWeight: 800 }}
          />
          <Tooltip 
            contentStyle={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.95)', 
              backdropFilter: 'blur(10px)',
              border: 'none', 
              borderRadius: '24px', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
              padding: '16px'
            }}
            itemStyle={{ fontSize: '11px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.05em' }}
            labelStyle={{ fontWeight: '900', marginBottom: '8px', color: 'hsl(var(--primary))', fontSize: '12px' }}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle" 
            wrapperStyle={{ fontSize: 10, paddingBottom: 40, fontWeight: '900', textTransform: 'uppercase', letterSpacing: '0.1em' }} 
          />
          <Area 
            type="monotone" 
            dataKey="occupancy" 
            stroke="hsl(var(--primary))" 
            fillOpacity={1} 
            fill="url(#colorOccupancy)" 
            strokeWidth={4}
            animationDuration={2000}
            name="Occupation (%)"
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="hsl(var(--accent))" 
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
            strokeWidth={4}
            animationDuration={2000}
            animationBegin={500}
            name="Revenus ($)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
