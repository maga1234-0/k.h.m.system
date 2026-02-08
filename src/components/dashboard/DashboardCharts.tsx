
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
    label: "Occupancy %",
    color: "hsl(var(--primary))",
  },
  revenue: {
    label: "Daily Rev $",
    color: "hsl(var(--accent))",
  },
}

export function DashboardCharts({ data }: DashboardChartsProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex h-full w-full items-center justify-center text-muted-foreground text-sm italic">
        Insufficient data to generate performance trends.
      </div>
    );
  }

  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="colorOccupancy" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
              <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
            </linearGradient>
            <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="hsl(var(--accent))" stopOpacity={0.2}/>
              <stop offset="95%" stopColor="hsl(var(--accent))" stopOpacity={0}/>
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
            dy={10}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend 
            verticalAlign="top" 
            align="right" 
            iconType="circle" 
            wrapperStyle={{ fontSize: 10, paddingBottom: 20 }} 
          />
          <Area 
            type="monotone" 
            dataKey="occupancy" 
            stroke="hsl(var(--primary))" 
            fillOpacity={1} 
            fill="url(#colorOccupancy)" 
            strokeWidth={2}
          />
          <Area 
            type="monotone" 
            dataKey="revenue" 
            stroke="hsl(var(--accent))" 
            fillOpacity={1} 
            fill="url(#colorRevenue)" 
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
