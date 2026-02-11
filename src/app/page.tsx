
'use client';

import { useMemo, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle2, 
  Bed, 
  Clock, 
  Wrench,
  Loader2,
  Activity
} from "lucide-react";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection, query, orderBy, limit } from "firebase/firestore";
import { format, subDays } from "date-fns";
import { fr } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export default function DashboardPage() {
  const { user, isUserLoading } = userHook();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const firestore = useFirestore();
  const roomsRef = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  const resRef = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  const recentResRef = useMemoFirebase(() => user ? query(collection(firestore, 'reservations'), orderBy('createdAt', 'desc'), limit(5)) : null, [firestore, user]);
  const invoicesRef = useMemoFirebase(() => user ? collection(firestore, 'invoices') : null, [firestore, user]);

  const { data: rooms } = useCollection(roomsRef);
  const { data: reservations } = useCollection(resRef);
  const { data: recentReservations } = useCollection(recentResRef);
  const { data: invoices } = useCollection(invoicesRef);

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) router.push('/login');
  }, [user, isUserLoading, router]);

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

  function userHook() {
    return useUser();
  }

  if (!mounted || isUserLoading || !user) {
    return <div className="flex h-screen w-full items-center justify-center bg-[#0a0a0a]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex h-screen w-full bg-[#0a0a0a] text-white selection:bg-primary/30">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-transparent">
        <header className="flex h-16 items-center border-b border-white/5 px-6 bg-[#0a0a0a]/80 backdrop-blur-xl sticky top-0 z-50 justify-between">
          <div className="flex items-center">
            <SidebarTrigger className="text-white hover:bg-white/10" />
            <Separator orientation="vertical" className="mx-4 h-6 opacity-10" />
            <h1 className="font-headline font-bold text-lg tracking-tight">Tableau de bord temps réel</h1>
          </div>
          <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center border border-primary/20">
            <Activity className="h-4 w-4 text-primary animate-pulse" />
          </div>
        </header>

        <main className="p-4 md:p-8 space-y-8 animate-in fade-in duration-700">
          {/* Chart Section */}
          <Card className="bg-[#141414] border-none rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="p-8 pb-0">
              <CardTitle className="font-headline text-2xl font-black text-white">Aperçu Occupation & Revenus</CardTitle>
              <CardDescription className="text-gray-500 text-sm mt-1">Performance sur 7 jours basée sur les données réelles.</CardDescription>
            </CardHeader>
            <CardContent className="h-[400px] p-8">
              <DashboardCharts data={chartData} />
            </CardContent>
          </Card>

          {/* Inventory Section */}
          <section className="space-y-6">
            <div className="px-2">
              <h2 className="font-headline text-2xl font-black">Statut de l'Inventaire</h2>
              <p className="text-gray-500 text-sm">Répartition en direct de vos {inventoryStats.total} chambres.</p>
            </div>
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              {[
                { label: "DISPONIBLE", count: inventoryStats.available, icon: CheckCircle2, color: "text-emerald-500", bg: "bg-emerald-500/10" },
                { label: "OCCUPÉE", count: inventoryStats.occupied, icon: Bed, color: "text-amber-500", bg: "bg-amber-500/10" },
                { label: "NETTOYAGE", count: inventoryStats.cleaning, icon: Clock, color: "text-blue-500", bg: "bg-blue-500/10" },
                { label: "MAINTENANCE", count: inventoryStats.maintenance, icon: Wrench, color: "text-rose-500", bg: "bg-rose-500/10" }
              ].map((stat, i) => (
                <Card key={i} className="bg-[#141414] border-none rounded-3xl overflow-hidden hover:scale-[1.02] transition-transform duration-300">
                  <CardContent className="p-6 flex items-center gap-4">
                    <div className={`h-12 w-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                      <stat.icon className="h-6 w-6" />
                    </div>
                    <div>
                      <div className="text-3xl font-black font-headline leading-none">{stat.count}</div>
                      <div className={`text-[10px] font-black uppercase tracking-widest ${stat.color} mt-1`}>{stat.label}</div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>

          {/* Recent Reservations Section */}
          <Card className="bg-[#141414] border-none rounded-[2.5rem] overflow-hidden shadow-2xl">
            <CardHeader className="p-8">
              <CardTitle className="font-headline text-2xl font-black text-white">Réservations Récentes</CardTitle>
              <CardDescription className="text-gray-500 text-sm mt-1">Dernières mises à jour de la réception.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-white/5">
                {recentReservations && recentReservations.length > 0 ? recentReservations.map((res, idx) => (
                  <div key={res.id} className="p-6 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                    <div className="space-y-1">
                      <div className="font-bold text-lg">{res.guestName}</div>
                      <div className="text-sm text-gray-500">Chambre {res.roomNumber} • {res.createdAt ? format(new Date(res.createdAt), 'HH:mm', { locale: fr }) : '--:--'}</div>
                    </div>
                    <Badge variant="outline" className={`rounded-xl px-4 py-1.5 font-black text-[10px] uppercase tracking-widest border-none ${
                      res.status === 'Checked In' ? 'bg-emerald-500/20 text-emerald-400' : 
                      res.status === 'Checked Out' ? 'bg-blue-500/20 text-blue-400' : 
                      'bg-primary/20 text-primary'
                    }`}>
                      {res.status === 'Checked In' ? 'Arrivé' : res.status === 'Checked Out' ? 'Départ' : res.status}
                    </Badge>
                  </div>
                )) : (
                  <div className="p-12 text-center text-gray-600 italic">Aucune activité récente.</div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </div>
  );
}
