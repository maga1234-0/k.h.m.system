
'use client';

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Bed, 
  Clock, 
  Wrench,
  Loader2,
  TrendingUp,
  DollarSign,
  Users,
  ArrowUpRight
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { format, subDays, startOfMonth } from "date-fns";
import { fr } from "date-fns/locale";

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const firestore = useFirestore();
  const roomsRef = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  const resRef = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  const recentResRef = useMemoFirebase(() => user ? query(collection(firestore, 'reservations'), orderBy('createdAt', 'desc'), limit(6)) : null, [firestore, user]);
  const invoicesRef = useMemoFirebase(() => user ? collection(firestore, 'invoices') : null, [firestore, user]);

  const { data: rooms } = useCollection(roomsRef);
  const { data: reservations } = useCollection(resRef);
  const { data: recentReservations } = useCollection(recentResRef);
  const { data: invoices } = useCollection(invoicesRef);

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) router.push('/login');
  }, [user, isUserLoading, router]);

  const formatSafeTime = (dateStr: any) => {
    if (!dateStr) return '--:--';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return '--:--';
      return format(date, 'HH:mm', { locale: fr });
    } catch {
      return '--:--';
    }
  };

  const kpis = useMemo(() => {
    if (!rooms || !reservations || !invoices) return { monthlyRev: 0, adr: 0, revpar: 0, occupancy: 0, stayRev: 0, extraRev: 0 };
    
    const now = new Date();
    const startMonth = startOfMonth(now).toISOString();
    
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
    const monthlyPaidInvoices = paidInvoices.filter(inv => inv.paymentDate && inv.paymentDate >= startMonth);
    
    const monthlyRev = monthlyPaidInvoices.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
    const stayRev = monthlyPaidInvoices.reduce((acc, inv) => acc + (Number(inv.stayAmount) || 0), 0);
    const extraRev = Math.max(0, monthlyRev - stayRev);

    const occupiedCount = rooms.filter(r => r.status === 'Occupied' || r.status === 'Cleaning').length;
    const occupancyRate = rooms.length > 0 ? (occupiedCount / rooms.length) * 100 : 0;
    
    const totalRev = paidInvoices.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
    const adr = occupiedCount > 0 ? totalRev / occupiedCount : 0;
    const revpar = rooms.length > 0 ? totalRev / rooms.length : 0;

    return { 
      monthlyRev, 
      adr, 
      revpar, 
      occupancy: Math.round(occupancyRate),
      stayRev,
      extraRev
    };
  }, [rooms, reservations, invoices]);

  const inventoryStats = useMemo(() => {
    if (!rooms) return { available: 0, occupied: 0, cleaning: 0, maintenance: 0, total: 0 };
    return {
      available: rooms.filter(r => r.status === 'Available').length,
      occupied: rooms.filter(r => r.status === 'Occupied').length,
      cleaning: rooms.filter(r => r.status === 'Cleaning').length,
      maintenance: rooms.filter(r => r.status === 'Maintenance').length,
      total: rooms.length
    };
  }, [rooms]);

  const chartData = useMemo(() => {
    if (!rooms || !reservations || !invoices || !mounted) return [];
    const result = [];
    const today = new Date();
    for (let i = 6; i >= 0; i--) {
      const date = subDays(today, i);
      const dateStr = format(date, 'yyyy-MM-dd');
      const dayName = format(date, 'EEE', { locale: fr });
      const activeResCount = reservations.filter(r => r.status !== 'Cancelled' && r.checkInDate <= dateStr && r.checkOutDate > dateStr).length;
      const occupancy = rooms.length > 0 ? Math.round((activeResCount / rooms.length) * 100) : 0;
      const dailyRev = invoices.filter(inv => inv.status === 'Paid' && inv.paymentDate?.startsWith(dateStr)).reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
      result.push({ name: dayName.charAt(0).toUpperCase() + dayName.slice(1), occupancy, revenue: dailyRev });
    }
    return result;
  }, [rooms, reservations, invoices, mounted]);

  if (!mounted || isUserLoading || !user) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const stayPercent = kpis.monthlyRev > 0 ? (kpis.stayRev / kpis.monthlyRev) * 100 : 0;
  const extraPercent = kpis.monthlyRev > 0 ? (kpis.extraRev / kpis.monthlyRev) * 100 : 0;

  return (
    <div className="flex h-screen w-full bg-background animate-in fade-in duration-500">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-transparent">
        <header className="flex h-16 items-center border-b px-6 bg-background/80 backdrop-blur-xl sticky top-0 z-50 justify-between">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-bold text-lg text-primary tracking-tight">Console de Gestion Prestige</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden md:flex flex-col items-end mr-2">
              <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">Système Live</span>
              <span className="text-[9px] text-muted-foreground font-bold">{format(new Date(), 'EEEE d MMMM', { locale: fr })}</span>
            </div>
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-lg shadow-primary/5">
              <Logo size={24} className="text-primary animate-pulse" />
            </div>
          </div>
        </header>

        <main className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { label: "CA Mensuel (Payé)", value: `${kpis.monthlyRev.toLocaleString()} $`, icon: DollarSign, trend: "+12%", color: "text-primary", bg: "bg-primary/5" },
              { label: "ADR (Prix Moyen)", value: `${kpis.adr.toFixed(2)} $`, icon: TrendingUp, trend: "Stable", color: "text-primary", bg: "bg-primary/5" },
              { label: "RevPAR", value: `${kpis.revpar.toFixed(2)} $`, customIcon: Logo, trend: "+5%", color: "text-primary", bg: "bg-primary/5" },
              { label: "Taux d'Occupation", value: `${kpis.occupancy}%`, icon: Users, trend: "-2%", color: "text-primary", bg: "bg-primary/5" }
            ].map((kpi, i) => (
              <Card key={i} className="border-none rounded-3xl overflow-hidden group hover:shadow-md transition-all duration-300 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className={`p-3 rounded-2xl ${kpi.bg} group-hover:scale-110 transition-transform ${kpi.color}`}>
                      {kpi.customIcon ? <kpi.customIcon size={20} /> : kpi.icon && <kpi.icon className="h-5 w-5" />}
                    </div>
                    <Badge variant="outline" className="border-primary/20 bg-primary/5 text-primary text-[10px] font-bold">
                      {kpi.trend}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
                    <h3 className="text-2xl font-black font-headline tracking-tighter text-foreground">{kpi.value}</h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-none rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
              <CardHeader className="p-8 pb-0">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="font-headline text-2xl font-black text-foreground">Analyse de Performance</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm mt-1">Comparaison hebdomadaire Occupation vs Revenus.</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[400px] p-8 pt-4">
                <DashboardCharts data={chartData} />
              </CardContent>
            </Card>

            <section className="space-y-6">
              <div className="px-2">
                <h2 className="font-headline text-xl font-black flex items-center gap-2 text-primary">
                  <Logo size={20} className="text-primary" /> Statut Inventaire
                </h2>
                <p className="text-muted-foreground text-xs mt-1">Direct de vos {inventoryStats.total} unités.</p>
              </div>
              <div className="grid gap-4 grid-cols-1">
                {[
                  { label: "DISPONIBLE", count: inventoryStats.available, icon: CheckCircle2, color: "text-primary", bg: "bg-primary/10", percent: rooms?.length ? (inventoryStats.available / rooms.length) * 100 : 0 },
                  { label: "OCCUPÉE", count: inventoryStats.occupied, icon: Bed, color: "text-primary", bg: "bg-primary/10", percent: rooms?.length ? (inventoryStats.occupied / rooms.length) * 100 : 0 },
                  { label: "NETTOYAGE", count: inventoryStats.cleaning, icon: Clock, color: "text-primary", bg: "bg-primary/10", percent: rooms?.length ? (inventoryStats.cleaning / rooms.length) * 100 : 0 },
                  { label: "MAINTENANCE", count: inventoryStats.maintenance, icon: Wrench, color: "text-primary", bg: "bg-primary/10", percent: rooms?.length ? (inventoryStats.maintenance / rooms.length) * 100 : 0 }
                ].map((stat, i) => (
                  <Card key={i} className="border-none rounded-3xl overflow-hidden hover:translate-x-2 transition-transform duration-300 shadow-sm bg-card">
                    <CardContent className="p-5 flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                          <stat.icon className="h-6 w-6" />
                        </div>
                        <div>
                          <div className="text-2xl font-black font-headline leading-none text-foreground">{stat.count}</div>
                          <div className={`text-[10px] font-black uppercase tracking-widest ${stat.color} mt-1`}>{stat.label}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">Part</span>
                        <span className="text-xs font-black text-foreground/60">{Math.round(stat.percent)}%</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <Card className="lg:col-span-2 border-none rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
              <CardHeader className="p-8">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="font-headline text-2xl font-black text-foreground">Flux des Clients</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm mt-1">Dernières interactions de la réception.</CardDescription>
                  </div>
                  <Button variant="ghost" className="text-[10px] font-black uppercase text-primary hover:bg-primary/10 rounded-xl" onClick={() => router.push('/reservations')}>
                    Voir tout <ArrowUpRight className="ml-1 h-3 w-3" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="divide-y border-t">
                  {recentReservations && recentReservations.length > 0 ? recentReservations.map((res, idx) => (
                    <div key={res.id} className="p-6 flex items-center justify-between hover:bg-primary/5 transition-colors group">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-muted flex flex-col items-center justify-center font-black group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                          <span className="text-[8px] uppercase text-muted-foreground group-hover:text-primary/70">CH.</span>
                          <span className="text-lg leading-none">{res.roomNumber}</span>
                        </div>
                        <div className="space-y-0.5">
                          <div className="font-bold text-lg text-foreground">{res.guestName}</div>
                          <div className="text-xs text-muted-foreground flex items-center gap-2">
                            <Clock className="h-3 w-3" /> 
                            {formatSafeTime(res.createdAt)}
                            <Separator orientation="vertical" className="h-3 mx-1" />
                            {res.numberOfGuests || 1} client(s)
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className={`rounded-xl px-4 py-1.5 font-black text-[10px] uppercase tracking-widest border-none ${
                        res.status === 'Checked In' ? 'bg-primary/10 text-primary' : 
                        res.status === 'Checked Out' ? 'bg-muted text-muted-foreground' : 
                        'bg-primary/5 text-primary'
                      }`}>
                        {res.status === 'Checked In' ? 'Arrivé' : res.status === 'Checked Out' ? 'Départ' : res.status}
                      </Badge>
                    </div>
                  )) : (
                    <div className="p-16 text-center text-muted-foreground italic flex flex-col items-center">
                      <Logo size={48} className="mb-4 opacity-10" />
                      Aucune activité enregistrée aujourd'hui.
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card className="border-none rounded-[2.5rem] overflow-hidden shadow-sm bg-card">
              <CardHeader className="p-8">
                <CardTitle className="font-headline text-lg font-black text-primary flex items-center gap-2">
                  <Logo size={20} className="text-primary" /> Recap Opérationnel
                </CardTitle>
              </CardHeader>
              <CardContent className="p-8 pt-0 space-y-6">
                <div className="p-6 rounded-3xl bg-primary/5 border border-primary/10 shadow-inner">
                  <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-4">Focus Revenus (Réel)</p>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground font-bold">Services Extras</span>
                      <span className="text-sm font-black">{kpis.extraRev.toLocaleString()} $</span>
                    </div>
                    <Progress value={extraPercent} className="h-1.5" />
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground font-bold">Hébergement</span>
                      <span className="text-sm font-black">{kpis.stayRev.toLocaleString()} $</span>
                    </div>
                    <Progress value={stayPercent} className="h-1.5" />
                  </div>
                </div>

                <div className="p-6 rounded-3xl bg-background border space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Users className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Fidélité</p>
                      <p className="text-sm font-black">Répartition Membres</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <CheckCircle2 className="h-5 w-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Qualité Ménage</p>
                      <p className="text-sm font-black">Opérationnel</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
