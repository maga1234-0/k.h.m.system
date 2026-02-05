
"use client"

import { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Brain, Sparkles, Loader2, Calendar, TrendingUp } from "lucide-react";
import { forecastOccupancy, ForecastOccupancyOutput } from "@/ai/flows/occupancy-forecasting";
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from "recharts";

const MOCK_HISTORICAL = `date,occupancyRate
2024-05-01,65
2024-05-02,70
2024-05-03,85
2024-05-04,90
2024-05-05,75
2024-05-06,60
2024-05-07,65`;

export default function ForecastingPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ForecastOccupancyOutput | null>(null);
  const [bookingTrends, setBookingTrends] = useState("We have a major tech conference nearby from June 15-20. Previous years showed a 30% spike in demand during this window.");
  const [horizon, setHorizon] = useState(7);

  const handleForecast = async () => {
    setLoading(true);
    try {
      const output = await forecastOccupancy({
        historicalData: MOCK_HISTORICAL,
        bookingTrends,
        forecastHorizonDays: horizon
      });
      setResult(output);
    } catch (error) {
      console.error("Forecasting failed", error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = result ? JSON.parse(result.forecast) : [];

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 bg-background">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-4 h-6" />
          <h1 className="font-headline font-semibold text-xl">Occupancy Forecasting</h1>
        </header>

        <main className="p-6 max-w-5xl mx-auto w-full space-y-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold font-headline flex items-center gap-2">
              <Brain className="h-6 w-6 text-primary" /> AI Insights
            </h2>
            <p className="text-muted-foreground">Predict future occupancy rates using historical data and upcoming events to optimize your pricing strategy.</p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <div className="md:col-span-1 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Input Parameters</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Booking Trends & Events</label>
                    <Textarea 
                      placeholder="e.g., Local festival on the 20th..." 
                      className="min-h-[120px]"
                      value={bookingTrends}
                      onChange={(e) => setBookingTrends(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Forecast Horizon (Days)</label>
                    <Input 
                      type="number" 
                      min="1" 
                      max="30" 
                      value={horizon}
                      onChange={(e) => setHorizon(parseInt(e.target.value))}
                    />
                  </div>
                  <Button 
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground gap-2" 
                    onClick={handleForecast}
                    disabled={loading}
                  >
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                    Generate Forecast
                  </Button>
                </CardContent>
              </Card>

              <Card className="bg-secondary/30 border-none">
                <CardContent className="p-4 flex items-center gap-3">
                  <TrendingUp className="h-5 w-5 text-accent" />
                  <p className="text-xs">Historically, your occupancy spikes on Fridays. AI accounts for these patterns automatically.</p>
                </CardContent>
              </Card>
            </div>

            <div className="md:col-span-2 space-y-6">
              {result ? (
                <>
                  <Card className="border-primary/20 shadow-lg">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Calendar className="h-5 w-5 text-primary" /> Forecasted Occupancy
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          />
                          <YAxis 
                            domain={[0, 100]}
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                          />
                          <RechartsTooltip 
                            cursor={{ fill: 'hsl(var(--primary))', opacity: 0.1 }}
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                          />
                          <Bar dataKey="occupancyRate" radius={[4, 4, 0, 0]}>
                            {chartData.map((entry: any, index: number) => (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={entry.occupancyRate > 80 ? 'hsl(var(--primary))' : 'hsl(var(--accent))'} 
                              />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </CardContent>
                  </Card>

                  <Card className="bg-card">
                    <CardHeader>
                      <CardTitle className="text-lg">AI Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm leading-relaxed text-muted-foreground italic">
                        &ldquo;{result.explanation}&rdquo;
                      </p>
                    </CardContent>
                  </Card>
                </>
              ) : (
                <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-muted/20 rounded-xl border-2 border-dashed">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <Sparkles className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold">No Forecast Data</h3>
                  <p className="text-sm text-muted-foreground max-w-xs mx-auto">Click generate to let the AI analyze your hotel trends and provide predictions.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
