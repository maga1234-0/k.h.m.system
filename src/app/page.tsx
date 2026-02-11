
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
  CheckCircle2,
  Clock,
  Wrench,
  LayoutDashboard,
  CalendarCheck,
  LogOut,
  LogIn
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

  const reservationStatusBreakdown = useMemo(() => {
    if (!reservations) return { confirmed: 0, checkedIn: 0, checkedOut: 0, cancelled: 0 };
    return {
      confirmed: reservations.filter(r => r.status === 'Confirmée').length,
      checkedIn: reservations.filter(r => r.status === 'Checked In').length,
      checkedOut: reservations.filter(r => r.status === 'Checked Out').length,
      cancelled: reservations.filter(r => r.status === 'Cancelled').length,
    };
  }, [reservations]);

  const totalCollected = useMemo(() => {
    return invoices?.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0) || 0;
  }, [invoices]);

  const stats = useMemo(() => {
    if (!mounted) return [];
    const occupancyRate = roomStatusBreakdown.total > 0 ? Math.round((roomStatusBreakdown.occupied / roomStatusBreakdown.total) * 100) : 0;
    
    return [
      { title: "Occupation", value: `${occupancyRate}%`, color: "primary", icon: BedDouble },
      { title: "Revenu", value: `${totalCollected.toLocaleString()} $`, color: "accent", icon: CreditCard },
      { title: "Réservations", value: reservations?.length.toString() || "0", color: "amber-500", icon: CalendarClock },
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
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background/50">
        <header className="flex h-16 items-center border-b px-6 bg-background sticky top-0 z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-4 h-6" />
          <h1 className="font-headline font-semibold text-xl text-primary">Tableau de Bord Prestige</h1>
        </header>

        <main className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat, i) => (
              <Card key={i} className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden transition-transform hover:scale-[1.02]">
                <CardContent className="p-8 flex items-center gap-6">
                  <div className={`h-16 w-16 rounded-[1.5rem] bg-${stat.color === 'primary' ? 'primary' : 'accent'}/10 flex items-center justify-center text-${stat.color === 'primary' ? 'primary' : 'accent'}`}>
                    <stat.icon className="h-8 w-8" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">{stat.title}</span>
                    <span className="text-3xl font-black font-headline text-foreground tracking-tighter">{stat.value}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-8 grid-cols-1 lg:grid-cols-7">
            <Card className="lg:col-span-4 border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
              <CardHeader className="p-8 pb-0">
                <div className="flex items-center gap-4 mb-2">
                  <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg">
                    <LayoutDashboard className="h-6 w-6" />
                  </div>
                  <div>
                    <CardTitle className="font-headline text-xl font-black">Performance Hôtelière</CardTitle>
                    <CardDescription className="font-medium">Analyse réelle de l'occupation et des revenus.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[380px] p-8 pt-4">
                <DashboardCharts data={chartData} />
              </CardContent>
            </Card>

            <div className="lg:col-span-3 space-y-8">
              <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
                <CardHeader className="p-6 pb-2">
                  <div className="flex items-center gap-3">
                    <CalendarCheck className="h-5 w-5 text-primary" />
                    <CardTitle className="text-sm font-black uppercase tracking-widest">Flux des Réservations</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {[
                      { label: "Confirmées", value: reservationStatusBreakdown.confirmed, icon: CalendarCheck, color: "primary", status: "WAITING" },
                      { label: "Arrivées", value: reservationStatusBreakdown.checkedIn, icon: LogIn, color: "emerald-500", status: "STAYING" },
                      { label: "Départs", value: reservationStatusBreakdown.checkedOut, icon: LogOut, color: "accent", status: "FINISHED" }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-5 hover:bg-primary/5 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-2xl bg-${item.color}/10 flex items-center justify-center text-${item.color} border border-${item.color}/20`}>
                            <item.icon className="h-5 w-5" />
                          </div>
                          <div className="flex flex-col">
                            <span className="font-black text-sm text-foreground uppercase tracking-tight">{item.label}</span>
                            <Badge variant="outline" className={`text-[8px] w-fit font-black bg-${item.color}/5 text-${item.color} border-${item.color}/10`}>{item.status}</Badge>
                          </div>
                        </div>
                        <span className="text-2xl font-black font-headline text-primary">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm rounded-[2.5rem] bg-white overflow-hidden">
                <CardHeader className="p-6 pb-2">
                  <div className="flex items-center gap-3">
                    <BedDouble className="h-5 w-5 text-accent" />
                    <CardTitle className="text-sm font-black uppercase tracking-widest">État des Chambres</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="divide-y">
                    {[
                      { label: "Libres", value: roomStatusBreakdown.available, icon: CheckCircle2, color: "emerald-500" },
                      { label: "Occupées", value: roomStatusBreakdown.occupied, icon: BedDouble, color: "primary" },
                      { label: "Ménage", value: roomStatusBreakdown.cleaning, icon: Clock, color: "accent" }
                    ].map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between p-5 hover:bg-accent/5 transition-all">
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-2xl bg-${item.color}/10 flex items-center justify-center text-${item.color} border border-${item.color}/20`}>
                            <item.icon className="h-5 w-5" />
                          </div>
                          <span className="font-black text-sm text-foreground uppercase tracking-tight">{item.label}</span>
                        </div>
                        <span className="text-2xl font-black font-headline text-accent">{item.value}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
