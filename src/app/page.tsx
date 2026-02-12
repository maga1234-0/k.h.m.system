
'use client';

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  Bed, 
  Clock, 
  Wrench,
  Loader2,
  TrendingUp,
  Users,
  Zap
} from "lucide-react";
import { Logo } from "@/components/ui/logo";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from "@/firebase";
import { collection, query, orderBy, limit, doc } from "firebase/firestore";
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
  const staffRef = useMemoFirebase(() => user ? doc(firestore, 'staff', user.uid) : null, [firestore, user]);

  const { data: rooms } = useCollection(roomsRef);
  const { data: reservations } = useCollection(resRef);
  const { data: recentReservations } = useCollection(recentResRef);
  const { data: invoices } = useCollection(invoicesRef);
  const { data: staffProfile } = useDoc(staffRef);

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) router.push('/login');
  }, [user, isUserLoading, router]);

  const kpis = useMemo(() => {
    if (!rooms || !reservations || !invoices) return { monthlyRev: 0, adr: 0, revpar: 0, occupancy: 0, stayRev: 0, extraRev: 0 };
    
    const now = new Date();
    const startOfCurrentMonth = startOfMonth(now).toISOString();
    
    const paidInvoices = invoices.filter(inv => inv.status === 'Paid');
    const monthlyPaidInvoices = paidInvoices.filter(inv => inv.paymentDate && inv.paymentDate >= startOfCurrentMonth);
    
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

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] dark:bg-background animate-in fade-in duration-500">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-transparent">
        <header className="flex h-20 items-center border-b px-8 bg-white/80 dark:bg-background/80 backdrop-blur-xl sticky top-0 z-50 justify-between">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="h-10 w-10" />
            <Separator orientation="vertical" className="h-8" />
            <div className="flex flex-col">
              <h1 className="font-headline font-black text-2xl text-primary tracking-tight leading-none">ImaraPMS - Console de Gestion</h1>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mt-1">Hôtellerie de Prestige • {staffProfile?.firstName || 'Collaborateur'}</span>
            </div>
          </div>
          <div className="flex items-center gap-6">
            <div className="hidden md:flex flex-col items-end">
              <div className="flex items-center gap-2 text-primary">
                <Zap className="h-3 w-3 fill-current" />
                <span className="text-[10px] font-black uppercase tracking-widest">Système Live</span>
              </div>
              <span className="text-xs text-muted-foreground font-bold">{format(new Date(), 'EEEE d MMMM', { locale: fr })}</span>
            </div>
            <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center border border-primary/20 shadow-xl shadow-primary/5 group hover:scale-110 transition-transform">
              <Logo size={32} className="text-primary animate-pulse" />
            </div>
          </div>
        </header>

        <main className="p-6 md:p-10 space-y-10 max-w-[1600px] mx-auto w-full">
          <div className="relative overflow-hidden rounded-[2.5rem] bg-slate-900 p-8 md:p-12 text-white shadow-2xl animate-in slide-in-from-top-4 duration-1000">
            <div className="relative z-10 max-w-2xl">
              <Badge className="mb-4 bg-primary/20 text-primary border-none font-black text-[10px] uppercase tracking-[0.2em] py-1 px-3">Performance Hôtelière</Badge>
              <h2 className="text-3xl md:text-5xl font-black font-headline tracking-tighter leading-none mb-4">
                Bienvenue, {staffProfile?.firstName || 'Directeur'}
              </h2>
              <p className="text-slate-400 text-sm md:text-lg font-medium leading-relaxed">
                Votre établissement affiche un taux d'occupation de <span className="text-primary font-black">{kpis.occupancy}%</span> ce matin. 
                Les revenus du mois s'élèvent à <span className="text-white font-black">{kpis.monthlyRev.toLocaleString()} $</span>.
              </p>
            </div>
            <div className="absolute right-0 bottom-0 opacity-10 pointer-events-none translate-x-1/4 translate-y-1/4 scale-150">
              <Logo size={400} />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Chiffre d'Affaires", value: `${kpis.monthlyRev.toLocaleString()} $`, customIcon: Logo, trend: "+12%", color: "text-primary", bg: "bg-primary/5" },
              { label: "Prix Moyen (ADR)", value: `${kpis.adr.toFixed(2)} $`, icon: TrendingUp, trend: "Stable", color: "text-indigo-500", bg: "bg-indigo-500/5" },
              { label: "RevPAR", value: `${kpis.revpar.toFixed(2)} $`, customIcon: Logo, trend: "+5%", color: "text-emerald-500", bg: "bg-emerald-500/5" },
              { label: "Taux d'Occupation", value: `${kpis.occupancy}%`, icon: Users, trend: "-2%", color: "text-amber-500", bg: "bg-amber-500/5" }
            ].map((kpi, i) => (
              <Card key={i} className="border-none rounded-[2rem] overflow-hidden hover:shadow-2xl transition-all duration-500 shadow-sm bg-white dark:bg-card group">
                <CardContent className="p-8">
                  <div className="flex justify-between items-start mb-6">
                    <div className={`p-4 rounded-2xl ${kpi.bg} group-hover:scale-110 transition-transform ${kpi.color}`}>
                      {kpi.customIcon ? <kpi.customIcon size={24} /> : kpi.icon && <kpi.icon className="h-6 w-6" />}
                    </div>
                    <Badge variant="outline" className="border-none bg-muted font-black text-[9px] uppercase tracking-widest py-1 px-2">
                      {kpi.trend}
                    </Badge>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{kpi.label}</p>
                    <h3 className="text-3xl font-black font-headline tracking-tighter text-foreground">{kpi.value}</h3>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            <Card className="lg:col-span-2 border-none rounded-[3rem] overflow-hidden shadow-sm bg-white dark:bg-card">
              <CardHeader className="p-10 pb-0">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="font-headline text-3xl font-black text-foreground tracking-tighter">Analyse de Performance</CardTitle>
                    <CardDescription className="text-muted-foreground text-sm mt-2 font-medium">Comparaison hebdomadaire • Occupation vs Revenus.</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="rounded-xl font-bold text-[10px] uppercase tracking-widest border-muted">7 Jours</Button>
                    <Button variant="ghost" size="sm" className="rounded-xl font-bold text-[10px] uppercase tracking-widest text-muted-foreground">30 Jours</Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="h-[450px] p-10 pt-6">
                <DashboardCharts data={chartData} />
              </CardContent>
            </Card>

            <section className="space-y-8">
              <div className="px-4">
                <h2 className="font-headline text-2xl font-black flex items-center gap-3 text-primary tracking-tight">
                  <Logo size={28} className="text-primary" /> Statut Inventaire
                </h2>
                <p className="text-muted-foreground text-xs font-medium mt-2">Suivi temps réel de vos {inventoryStats.total} unités.</p>
              </div>
              <div className="grid gap-4 grid-cols-1">
                {[
                  { label: "DISPONIBLE", count: inventoryStats.available, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10", percent: rooms?.length ? (inventoryStats.available / rooms.length) * 100 : 0 },
                  { label: "OCCUPÉE", count: inventoryStats.occupied, icon: Bed, color: "text-primary", bg: "bg-primary/10", percent: rooms?.length ? (inventoryStats.occupied / rooms.length) * 100 : 0 },
                  { label: "NETTOYAGE", count: inventoryStats.cleaning, icon: Clock, color: "text-amber-500", bg: "bg-amber-500/10", percent: rooms?.length ? (inventoryStats.cleaning / rooms.length) * 100 : 0 },
                  { label: "MAINTENANCE", count: inventoryStats.maintenance, icon: Wrench, color: "text-rose-500", bg: "bg-rose-500/10", percent: rooms?.length ? (inventoryStats.maintenance / rooms.length) * 100 : 0 }
                ].map((stat, i) => (
                  <Card key={i} className="border-none rounded-3xl overflow-hidden hover:translate-x-2 transition-all duration-300 shadow-sm bg-white dark:bg-card">
                    <CardContent className="p-6 flex items-center justify-between">
                      <div className="flex items-center gap-5">
                        <div className={`h-14 w-14 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color} shadow-inner`}>
                          <stat.icon className="h-7 w-7" />
                        </div>
                        <div>
                          <div className="text-3xl font-black font-headline leading-none text-foreground tracking-tighter">{stat.count}</div>
                          <div className={`text-[10px] font-black uppercase tracking-[0.2em] ${stat.color} mt-2`}>{stat.label}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest block mb-1">Part</span>
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-sm font-black text-foreground">{Math.round(stat.percent)}%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
