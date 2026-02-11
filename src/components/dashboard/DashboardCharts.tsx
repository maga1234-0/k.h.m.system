"use client"

import { CartesianGrid, XAxis, ResponsiveContainer, YAxis, Legend, AreaChart, Area } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface DashboardChartsProps {
  data: {
    name: string;
    occupancy: number;
    revenue: number;
  }[];
}

const chartConfig = {
  occupancy: {
    label: "Occupation %",
    color: "hsl(var(--primary))",
  },
  revenue: {
    label: "Revenu Quotidien $",
    color: "hsl(var(--accent))",
  },
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
    <ChartContainer config={chartConfig} className="h-full w-full">
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
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.08} />
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
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle" 
            wrapperStyle={{ fontSize: 11, paddingBottom: 25, fontWeight: 600 }} 
          />
          <Area 
            type="monotone" 
            dataKey="occupancy" 
            stroke="hsl(var(--primary))" 
            fillOpacity={1} 
            fill="url(#colorOccupancy)" 
            strokeWidth={3}
            animationDuration={1500}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="hsl(var(--accent))" 
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
            strokeWidth={3}
            animationDuration={1500}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}