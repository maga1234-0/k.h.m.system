
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
  ArrowUpRight, 
  CreditCard,
  Loader2,
  CheckCircle2,
  Clock,
  Wrench
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
    if (!rooms) return { available: 0, occupied: 0, maintenance: 0, cleaning: 0, total: 0 };
    return {
      available: rooms.filter(r => r.status === 'Available').length,
      occupied: rooms.filter(r => r.status === 'Occupied').length,
      maintenance: rooms.filter(r => r.status === 'Maintenance').length,
      cleaning: rooms.filter(r => r.status === 'Cleaning').length,
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
      { title: "Occupation Actuelle", value: `${occupancyRate}%`, change: "+2%", trend: "up", icon: BedDouble },
      { title: "Revenu Encaissé", value: `${totalCollected.toLocaleString()} $`, change: "+12%", trend: "up", icon: CreditCard },
      { title: "Nouv. Réservations", value: reservations?.length.toString() || "0", change: "+5", trend: "up", icon: CalendarClock },
      { title: "Total Clients", value: clients?.length.toString() || "0", change: "+8", trend: "up", icon: Users },
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

      // Occupancy: count reservations covering this specific date
      const activeResCount = reservations.filter(r => 
        r.status !== 'Cancelled' && 
        r.checkInDate <= dateStr && 
        r.checkOutDate > dateStr
      ).length;

      const occupancy = rooms.length > 0 ? Math.round((activeResCount / rooms.length) * 100) : 0;

      // Revenue: sum of amountPaid for invoices paid on this exact day
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
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background/50">
        <header className="flex h-16 items-center border-b px-6 bg-background sticky top-0 z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-4 h-6" />
          <h1 className="font-headline font-semibold text-xl text-primary">Tableau de Bord</h1>
        </header>

        <main className="p-4 md:p-6 space-y-6">
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title} className="border-none shadow-sm hover:scale-[1.02] transition-transform duration-300 rounded-3xl">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">{stat.title}</CardTitle>
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center text-primary"><stat.icon className="h-4 w-4" /></div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-black font-headline text-foreground tracking-tight">{stat.value}</div>
                  <div className="flex items-center mt-1">
                    <ArrowUpRight className="h-3 w-3 text-emerald-500 mr-1" />
                    <span className="text-emerald-500 text-xs font-bold">{stat.change}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
            <Card className="lg:col-span-4 border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader>
                <CardTitle className="font-headline text-lg font-bold">Performance Réelle</CardTitle>
                <CardDescription>Analyse des 7 derniers jours basée sur vos activités.</CardDescription>
              </CardHeader>
              <CardContent className="h-[350px]"><DashboardCharts data={chartData} /></CardContent>
            </Card>

            <Card className="lg:col-span-3 border-none shadow-sm rounded-3xl overflow-hidden">
              <CardHeader>
                <CardTitle className="font-headline text-lg font-bold">Inventaire Réel</CardTitle>
                <CardDescription>État en direct des {roomStatusBreakdown.total} chambres.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                {[
                  { label: "Disponible", value: roomStatusBreakdown.available, color: "emerald-500", icon: CheckCircle2 },
                  { label: "Occupée", value: roomStatusBreakdown.occupied, color: "primary", icon: BedDouble },
                  { label: "Nettoyage", value: roomStatusBreakdown.cleaning, color: "accent", icon: Clock },
                  { label: "Maintenance", value: roomStatusBreakdown.maintenance, color: "rose-500", icon: Wrench }
                ].map((item) => (
                  <div key={item.label} className="flex items-center justify-between p-4 rounded-2xl bg-muted/20 border-none transition-all hover:bg-muted/30">
                    <div className="flex items-center gap-4">
                      <div className={`h-10 w-10 rounded-xl bg-${item.color}/10 flex items-center justify-center text-${item.color}`}><item.icon className="h-5 w-5" /></div>
                      <span className="font-bold text-xs uppercase tracking-widest text-muted-foreground">{item.label}</span>
                    </div>
                    <span className="text-2xl font-black font-headline">{item.value}</span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
