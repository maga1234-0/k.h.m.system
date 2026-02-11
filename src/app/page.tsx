
'use client';

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { 
  Users, 
  BedDouble, 
  CalendarClock, 
  CreditCard,
  Loader2,
  LayoutDashboard
} from "lucide-react";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import { format, subDays } from "date-fns";
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

  const { data: rooms, isLoading: isRoomsLoading } = useCollection(roomsRef);
  const { data: reservations } = useCollection(resRef);
  const { data: clients } = useCollection(clientsRef);
  const { data: invoices } = useCollection(invoicesRef);

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) router.push('/login');
  }, [user, isUserLoading, router]);

  const roomStatusBreakdown = useMemo(() => {
    if (!rooms) return { available: 0, occupied: 0, total: 0 };
    return {
      available: rooms.filter(r => r.status === 'Available').length,
      occupied: rooms.filter(r => r.status === 'Occupied').length,
      total: rooms.length
    };
  }, [rooms]);

  const totalCollected = useMemo(() => {
    return invoices?.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0) || 0;
  }, [invoices]);

  const stats = useMemo(() => {
    if (!mounted) return [];
    const occupancyRate = roomStatusBreakdown.total > 0 ? Math.round((roomStatusBreakdown.occupied / roomStatusBreakdown.total) * 100) : 0;
    
    return [
      { title: "Occupation", value: `${occupancyRate}%`, color: "primary", icon: BedDouble },
      { title: "Revenu", value: `${totalCollected.toLocaleString()} $`, color: "accent", icon: CreditCard },
      { title: "Réservations", value: reservations?.length.toString() || "0", color: "accent", icon: CalendarClock },
      { title: "Clients", value: clients?.length.toString() || "0", color: "primary", icon: Users },
    ];
  }, [roomStatusBreakdown, reservations, totalCollected, clients, mounted]);

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
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex h-screen w-full bg-[#0f172a]">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-transparent">
        <header className="flex h-16 items-center border-b border-white/5 px-6 bg-transparent sticky top-0 z-10">
          <SidebarTrigger className="text-white" />
          <Separator orientation="vertical" className="mx-4 h-6 bg-white/10" />
          <h1 className="font-headline font-semibold text-xl text-white">Tableau de Bord</h1>
        </header>

        <main className="p-6 md:p-10 space-y-10 animate-in fade-in duration-700">
          <div className="grid gap-8 grid-cols-1 sm:grid-cols-2">
            {stats.map((stat, i) => (
              <Card key={i} className="border-none shadow-none rounded-[3.5rem] bg-white overflow-hidden">
                <CardContent className="p-10 flex items-center gap-8">
                  <div className={`h-24 w-24 rounded-[2rem] bg-${stat.color === 'primary' ? 'primary' : 'accent'}/10 flex items-center justify-center text-${stat.color === 'primary' ? 'primary' : 'accent'}`}>
                    <stat.icon className="h-12 w-12" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground/60 mb-2">{stat.title}</span>
                    <span className="text-5xl font-black font-headline text-[#0f172a] tracking-tighter">{stat.value}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-none shadow-none rounded-[3.5rem] bg-white overflow-hidden">
            <CardHeader className="p-10 pb-0">
              <div className="flex items-center gap-6">
                <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-xl">
                  <LayoutDashboard className="h-8 w-8" />
                </div>
                <div className="space-y-1">
                  <CardTitle className="font-headline text-3xl font-black text-[#0f172a]">Performance Hôtelière</CardTitle>
                  <CardDescription className="text-base font-medium text-muted-foreground">Analyse réelle de l'occupation et des revenus.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="h-[450px] p-10 pt-6">
              <DashboardCharts data={chartData} />
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </div>
  );
}
