
'use client';

import { useMemo, useState, useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip as RechartsTooltip, 
  ResponsiveContainer,
  LineChart,
  Line,
  Cell
} from "recharts";
import { 
  TrendingUp, 
  Users, 
  CreditCard, 
  Hotel,
  ArrowUpRight,
  Loader2,
  CalendarDays
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import { format, startOfMonth, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

export default function ReportsPage() {
  const { user, isUserLoading } = useUser();
  const [mounted, setMounted] = useState(false);
  const firestore = useFirestore();
  
  const roomsRef = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  const resRef = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  const invoicesRef = useMemoFirebase(() => user ? collection(firestore, 'invoices') : null, [firestore, user]);

  const { data: rooms, isLoading: isRoomsLoading } = useCollection(roomsRef);
  const { data: reservations } = useCollection(resRef);
  const { data: invoices } = useCollection(invoicesRef);

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = useMemo(() => {
    if (!rooms || !reservations || !invoices) return { revPar: 0, adr: 0, occupancy: 0, totalRev: 0 };
    
    const totalRevenue = invoices.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
    const occupiedCount = rooms.filter(r => r.status === 'Occupied' || r.status === 'Cleaning').length;
    const occupancyRate = rooms.length > 0 ? (occupiedCount / rooms.length) * 100 : 0;
    
    // RevPAR = Total Room Revenue / Total Available Rooms
    const revPar = rooms.length > 0 ? totalRevenue / rooms.length : 0;
    // ADR = Total Room Revenue / Number of Rooms Sold
    const adr = occupiedCount > 0 ? totalRevenue / occupiedCount : 0;

    return { revPar, adr, occupancy: occupancyRate, totalRev: totalRevenue };
  }, [rooms, reservations, invoices]);

  const revenueData = useMemo(() => {
    if (!invoices || !mounted) return [];
    
    const monthlyData: Record<string, number> = {};
    const last6Months = [];
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const key = format(d, 'MMM', { locale: fr });
      monthlyData[key] = 0;
      last6Months.push(key);
    }

    invoices.forEach(inv => {
      if (inv.status === 'Paid' && inv.paymentDate) {
        const date = parseISO(inv.paymentDate);
        const key = format(date, 'MMM', { locale: fr });
        if (monthlyData[key] !== undefined) {
          monthlyData[key] += Number(inv.amountPaid) || 0;
        }
      }
    });

    return last6Months.map(month => ({
      month,
      rev: Math.round(monthlyData[month])
    }));
  }, [invoices, mounted]);

  const segmentData = useMemo(() => {
    if (!rooms) return [];
    const counts: Record<string, number> = {};
    rooms.forEach(r => {
      counts[r.roomType] = (counts[r.roomType] || 0) + 1;
    });
    return Object.entries(counts).map(([name, val]) => ({ name, val }));
  }, [rooms]);

  if (!mounted || isUserLoading || isRoomsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full animate-in fade-in duration-500">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background/50">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Analyses & Performance Réelle</h1>
          </div>
        </header>

        <main className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-none shadow-sm hover:scale-105 transition-transform duration-300">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-primary">RevPAR (Revenu/Chambre)</CardDescription>
                <CardTitle className="text-2xl font-black font-headline tracking-tighter">{stats.revPar.toFixed(2)} $</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-emerald-500 font-bold">
                  <ArrowUpRight className="h-3 w-3 mr-1" /> Performance Directe
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover:scale-105 transition-transform duration-300">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-primary">Taux d'Occupation</CardDescription>
                <CardTitle className="text-2xl font-black font-headline tracking-tighter">{stats.occupancy.toFixed(1)}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-emerald-500 font-bold">
                  <TrendingUp className="h-3 w-3 mr-1" /> {rooms?.length} Chambres Total
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm hover:scale-105 transition-transform duration-300">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-primary">ADR (Prix Moyen)</CardDescription>
                <CardTitle className="text-2xl font-black font-headline tracking-tighter">{stats.adr.toFixed(2)} $</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-amber-500 font-bold">
                  Moyenne par nuitée
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-primary text-primary-foreground hover:scale-105 transition-transform duration-300 shadow-lg shadow-primary/20">
              <CardHeader className="pb-2">
                <CardDescription className="text-[10px] uppercase font-bold tracking-widest text-primary-foreground/70">CA Global Encaissé</CardDescription>
                <CardTitle className="text-2xl font-black font-headline tracking-tighter">{stats.totalRev.toLocaleString()} $</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs font-bold">
                  Encaissements cumulés réels
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card className="border-none shadow-sm animate-in slide-in-from-left-4 duration-700">
              <CardHeader>
                <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                  <CreditCard className="h-5 w-5 text-primary" /> Croissance Mensuelle
                </CardTitle>
                <CardDescription>Évolution des encaissements sur les 6 derniers mois.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} unit="$" />
                    <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                    <Line type="monotone" dataKey="rev" stroke="hsl(var(--primary))" strokeWidth={4} dot={{ r: 6, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm animate-in slide-in-from-right-4 duration-700">
              <CardHeader>
                <CardTitle className="text-lg font-headline font-bold flex items-center gap-2">
                  <Hotel className="h-5 w-5 text-primary" /> Capacité par Segment
                </CardTitle>
                <CardDescription>Répartition des chambres par type dans l'inventaire.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                {segmentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={segmentData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fontWeight: 'bold' }} />
                      <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }} />
                      <Bar dataKey="val" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]}>
                        {segmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))'} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-muted-foreground italic">
                    <CalendarDays className="h-12 w-12 mb-2 opacity-10" />
                    Pas de données d'inventaire
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
