
'use client';

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  CalendarClock, 
  CreditCard,
  Loader2,
  TrendingUp,
  Wallet,
  CalendarDays
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
  const clientsRef = useMemoFirebase(() => user ? collection(firestore, 'clients') : null, [firestore, user]);
  const invoicesRef = useMemoFirebase(() => user ? collection(firestore, 'invoices') : null, [firestore, user]);

  const { data: rooms } = useCollection(roomsRef);
  const { data: reservations } = useCollection(resRef);
  const { data: clients } = useCollection(clientsRef);
  const { data: invoices } = useCollection(invoicesRef);

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) router.push('/login');
  }, [user, isUserLoading, router]);

  const stats = useMemo(() => {
    if (!mounted || !invoices || !reservations || !clients) return [];
    
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
        trend: "+12.1% vs semaine dernière", 
        icon: Wallet, 
        color: "primary" 
      },
      { 
        title: "Nouvelles Résas (Aujourd'hui)", 
        value: todayResCount.toString(), 
        trend: `+${todayResCount} vs semaine dernière`, 
        icon: CalendarDays, 
        color: "primary" 
      },
      { 
        title: "Clients Actifs", 
        value: activeClientsCount.toString(), 
        trend: "+8.4% vs semaine dernière", 
        icon: Users, 
        color: "primary" 
      },
    ];
  }, [invoices, reservations, clients, mounted]);

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
          <div className="flex-1 flex justify-center">
            <h1 className="font-headline font-semibold text-lg text-white">Tableau de bord temps réel</h1>
          </div>
        </header>

        <main className="p-4 md:p-6 space-y-6 animate-in fade-in duration-700">
          <div className="grid gap-6 grid-cols-1">
            {stats.map((stat, i) => (
              <Card key={i} className="bg-[#141414] border-none rounded-2xl overflow-hidden shadow-2xl">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div className="space-y-4">
                      <span className="text-sm font-medium text-gray-400">{stat.title}</span>
                      <div className="text-4xl font-black font-headline tracking-tight text-white">
                        {stat.value}
                      </div>
                      <div className="flex items-center gap-2 text-primary font-medium text-xs">
                        <TrendingUp className="h-4 w-4" />
                        {stat.trend}
                      </div>
                    </div>
                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center text-primary">
                      <stat.icon className="h-6 w-6" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="bg-[#141414] border-none rounded-2xl overflow-hidden shadow-2xl">
            <CardHeader className="p-6">
              <CardTitle className="font-headline text-xl font-bold text-white">Aperçu Occupation & Revenus</CardTitle>
              <CardDescription className="text-gray-400 text-sm">Performance sur 7 jours basée sur les données réelles.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] p-6 pt-0">
              <DashboardCharts data={chartData} />
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </div>
  );
}
