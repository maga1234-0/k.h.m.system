
"use client"

import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer, Tooltip, YAxis, Line, LineChart, Legend } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

const data = [
  { name: "Mon", occupancy: 65, revenue: 4000 },
  { name: "Tue", occupancy: 70, revenue: 4200 },
  { name: "Wed", occupancy: 68, revenue: 3800 },
  { name: "Thu", occupancy: 82, revenue: 5100 },
  { name: "Fri", occupancy: 95, revenue: 6800 },
  { name: "Sat", occupancy: 98, revenue: 7500 },
  { name: "Sun", occupancy: 85, revenue: 5500 },
]

const chartConfig = {
  occupancy: {
    label: "Occupancy Rate %",
    color: "hsl(var(--primary))",
  },
  revenue: {
    label: "Revenue $",
    color: "hsl(var(--accent))",
  },
}

export function DashboardCharts() {
  return (
    <ChartContainer config={chartConfig} className="h-full w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <YAxis 
            axisLine={false} 
            tickLine={false} 
            tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
          />
          <ChartTooltip content={<ChartTooltipContent />} />
          <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 20 }} />
          <Line 
            type="monotone" 
            dataKey="occupancy" 
            stroke="var(--color-occupancy)" 
            strokeWidth={3} 
            dot={{ r: 4, strokeWidth: 2, fill: "white" }} 
            activeDot={{ r: 6 }}
          />
          <Line 
            type="monotone" 
            dataKey="revenue" 
            stroke="var(--color-revenue)" 
            strokeWidth={3} 
            dot={{ r: 4, strokeWidth: 2, fill: "white" }} 
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </ChartContainer>
  )
}
