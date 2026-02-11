
'use client';

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  Loader2,
  TrendingUp,
  Wallet,
  CalendarDays,
  ArrowUpRight,
  Activity
} from "lucide-react";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { fr } from "date-fns/locale";

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const firestore = useFirestore();
  const roomsRef = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  const resRef = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  const invoicesRef = useMemoFirebase(() => user ? collection(firestore, 'invoices') : null, [firestore, user]);

  const { data: rooms } = useCollection(roomsRef);
  const { data: reservations } = useCollection(resRef);
  const { data: invoices } = useCollection(invoicesRef);

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) router.push('/login');
  }, [user, isUserLoading, router]);

  const stats = useMemo(() => {
    if (!mounted || !invoices || !reservations) return [];
    
    const totalCollected = invoices.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
    
    const today = new Date();
    const todayResCount = reservations.filter(r => {
      const createdDate = r.createdAt ? new Date(r.createdAt) : new Date();
      return createdDate >= startOfDay(today) && createdDate <= endOfDay(today);
    }).length;

    const activeClientsCount = reservations.filter(r => r.status === 'Checked In').length;

    return [
      { 
        title: "Revenu Total", 
        value: `${totalCollected.toLocaleString()} $`, 
        trend: "+12.1%", 
        icon: Wallet, 
        color: "primary" 
      },
      { 
        title: "Nouvelles Résas", 
        value: todayResCount.toString(), 
        trend: `+${todayResCount}`, 
        icon: CalendarDays, 
        color: "primary" 
      },
      { 
        title: "Clients Actifs", 
        value: activeClientsCount.toString(), 
        trend: "+8.4%", 
        icon: Users, 
        color: "primary" 
      },
    ];
  }, [invoices, reservations, mounted]);

  const chartData = useMemo(() => {
    if (!rooms || !reservations || !invoices || !mounted) return [];
    
    const result = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayName = format(date, 'EEE', { locale: fr });

      const activeResCount = reservations.filter(r => 
        r.status !== 'Cancelled' && 
        r.checkInDate <= dateStr && 
        r.checkOutDate > dateStr
      ).length;

      const occupancy = rooms.length > 0 ? Math.round((activeResCount / rooms.length) * 100) : 0;

      const dailyRev = invoices
        .filter(inv => inv.status === 'Paid' && inv.paymentDate?.startsWith(dateStr))
        .reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);

      result.push({ 
        name: dayName.charAt(0).toUpperCase() + dayName.slice(1), 
        occupancy, 
        revenue: dailyRev 
      });
    }
    return result;
  }, [rooms, reservations, invoices, mounted]);

  if (!mounted || isUserLoading || !user) {
    return <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0a]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-white">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-transparent">
        <header className="flex h-16 items-center border-b border-white/5 px-6 bg-[#0a0a0a] sticky top-0 z-10">
          <SidebarTrigger className="text-white hover:bg-white/10" />
          <Separator orientation="vertical" className="mx-4 h-6 opacity-10" />
          <div className="flex-1 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h1 className="font-headline font-semibold text-sm uppercase tracking-widest text-white/70">Console de Performance</h1>
          </div>
        </header>

        <main className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
          <div className="grid gap-6 grid-cols-1 md:grid-cols-3">
            {stats.map((stat, i) => (
              <Card key={i} className="bg-[#141414] border-none rounded-[2rem] overflow-hidden shadow-2xl transition-transform hover:scale-[1.02]">
                <CardContent className="p-8">
                  <div className="flex justify-between items-start">
                    <div className="space-y-4">
                      <span className="text-xs font-black uppercase tracking-[0.2em] text-gray-500">{stat.title}</span>
                      <div className="text-4xl font-black font-headline tracking-tighter text-white">
                        {stat.value}
                      </div>
                      <div className="flex items-center gap-2 text-primary font-black text-xs">
                        <ArrowUpRight className="h-4 w-4" />
                        {stat.trend} <span className="text-gray-600 font-medium">vs hier</span>
                      </div>
                    </div>
                    <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shadow-inner">
                      <stat.icon className="h-7 w-7" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-[#141414] border-none rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="p-8 pb-0">
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle className="font-headline text-2xl font-black text-white">Performances Hebdomadaires</CardTitle>
                  <CardDescription className="text-gray-500 text-sm mt-1">Analyse croisée de l'occupation et des revenus réels.</CardDescription>
                </div>
                <div className="flex gap-4">
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-primary" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Occupation</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="h-3 w-3 rounded-full bg-accent" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">Revenus</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[450px] p-8">
              <DashboardCharts data={chartData} />
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </div>
  );
}
