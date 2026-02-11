
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
      <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm italic border-2 border-dashed rounded-3xl">
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
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.5} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))", fontWeight: 500 }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
          />
          <Tooltip 
            contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '12px', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
            itemStyle={{ fontSize: '12px', fontWeight: 'bold' }}
          />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle" 
            wrapperStyle={{ fontSize: 11, paddingBottom: 25, color: 'hsl(var(--muted-foreground))' }} 
          />
          <Area 
            type="monotone" 
            dataKey="occupancy" 
            stroke="hsl(var(--primary))" 
            fillOpacity={1} 
            fill="url(#colorOccupancy)" 
            strokeWidth={3}
            animationDuration={1500}
            name="Occupation (%)"
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="hsl(var(--accent))" 
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
            strokeWidth={3}
            animationDuration={1500}
            name="Revenus ($)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  )
}
