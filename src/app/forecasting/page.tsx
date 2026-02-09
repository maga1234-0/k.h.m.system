
'use client';

import { useState, useMemo, useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  TrendingUp, 
  TrendingDown, 
  Minus, 
  Loader2, 
  BrainCircuit,
  ArrowRight
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import { forecastOccupancy, type ForecastOutput } from "@/ai/flows/occupancy-forecasting";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  Cell
} from "recharts";

export default function ForecastingPage() {
  const { user } = useUser();
  const [isGenerating, setIsGenerating] = useState(false);
  const [forecast, setForecast] = useState<ForecastOutput | null>(null);
  
  const firestore = useFirestore();
  const roomsRef = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  const resRef = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);

  const { data: rooms } = useCollection(roomsRef);
  const { data: reservations } = useCollection(resRef);

  const historyData = useMemo(() => {
    if (!rooms || !reservations) return [];
    
    const result = [];
    const today = new Date();
    for (let i = 7; i >= 1; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const activeOnDay = reservations.filter(r => 
        r.status !== 'Cancelled' && 
        r.checkInDate <= dateStr && 
        r.checkOutDate >= dateStr
      );

      const occupancy = rooms.length > 0 ? Math.round((activeOnDay.length / rooms.length) * 100) : 0;
      const revenue = activeOnDay.reduce((acc, r) => acc + (Number(r.totalAmount) / 2), 0); // Simplified daily share

      result.push({ date: dateStr, occupancy, revenue });
    }
    return result;
  }, [rooms, reservations]);

  const handleGenerateForecast = async () => {
    if (historyData.length === 0) return;
    
    setIsGenerating(true);
    try {
      const result = await forecastOccupancy({ history: historyData });
      setForecast(result);
    } catch (error) {
      console.error("Forecast failed", error);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background/50">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Intelligence Prédictive</h1>
          </div>
          <Button 
            onClick={handleGenerateForecast} 
            disabled={isGenerating || historyData.length === 0}
            className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20"
          >
            {isGenerating ? <Loader2 className="h-4 w-4 animate-spin" /> : <BrainCircuit className="h-4 w-4" />}
            Générer Prévisions IA
          </Button>
        </header>

        <main className="p-6 space-y-6">
          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <Card className="lg:col-span-2 border-none shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Tendance d'Occupation Prédite
                </CardTitle>
                <CardDescription>Analyse basée sur vos performances historiques et l'IA Gemini.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]">
                {forecast ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={forecast.forecast}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <YAxis unit="%" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
                      <RechartsTooltip 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                        cursor={{ fill: 'hsl(var(--primary))', opacity: 0.05 }}
                      />
                      <Bar dataKey="predictedOccupancy" radius={[6, 6, 0, 0]}>
                        {forecast.forecast.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.trend === 'up' ? 'hsl(var(--primary))' : entry.trend === 'down' ? 'hsl(var(--destructive))' : 'hsl(var(--accent))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex flex-col items-center justify-center text-muted-foreground bg-muted/20 rounded-xl border-2 border-dashed">
                    <Sparkles className="h-12 w-12 mb-4 opacity-20" />
                    <p className="text-sm">Cliquez sur "Générer" pour obtenir des analyses IA.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              <Card className="border-none shadow-sm bg-primary/5 border border-primary/10">
                <CardHeader>
                  <CardTitle className="text-sm font-bold uppercase tracking-widest text-primary">Analyse de l'IA</CardTitle>
                </CardHeader>
                <CardContent>
                  {forecast ? (
                    <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                      {forecast.explanation}
                    </p>
                  ) : (
                    <p className="text-sm text-muted-foreground italic">
                      En attente des données d'analyse...
                    </p>
                  )}
                </CardContent>
              </Card>

              {forecast && (
                <div className="grid gap-4">
                  {forecast.forecast.map((day, idx) => (
                    <Card key={idx} className="border-none shadow-sm">
                      <CardContent className="p-4 flex items-center justify-between">
                        <div>
                          <p className="text-[10px] uppercase font-bold text-muted-foreground">{day.day}</p>
                          <p className="text-lg font-bold">{day.predictedOccupancy}%</p>
                        </div>
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                          day.trend === 'up' ? 'bg-emerald-100 text-emerald-600' : 
                          day.trend === 'down' ? 'bg-rose-100 text-rose-600' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {day.trend === 'up' ? <TrendingUp className="h-5 w-5" /> : 
                           day.trend === 'down' ? <TrendingDown className="h-5 w-5" /> : <Minus className="h-5 w-5" />}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
