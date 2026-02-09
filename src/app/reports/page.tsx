
'use client';

import { useMemo } from "react";
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
  Loader2
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";

export default function ReportsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  
  const roomsRef = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  const resRef = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  const invoicesRef = useMemoFirebase(() => user ? collection(firestore, 'invoices') : null, [firestore, user]);

  const { data: rooms, isLoading: isRoomsLoading } = useCollection(roomsRef);
  const { data: reservations } = useCollection(resRef);
  const { data: invoices } = useCollection(invoicesRef);

  const stats = useMemo(() => {
    if (!rooms || !reservations || !invoices) return { revPar: 0, adr: 0, occupancy: 0, totalRev: 0 };
    
    const totalRevenue = invoices.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
    const occupiedCount = rooms.filter(r => r.status === 'Occupied' || r.status === 'Cleaning').length;
    const occupancyRate = rooms.length > 0 ? (occupiedCount / rooms.length) * 100 : 0;
    
    // Simplified RevPAR and ADR for prototype
    const adr = occupiedCount > 0 ? totalRevenue / occupiedCount : 0;
    const revPar = rooms.length > 0 ? totalRevenue / rooms.length : 0;

    return { revPar, adr, occupancy: occupancyRate, totalRev: totalRevenue };
  }, [rooms, reservations, invoices]);

  const revenueData = useMemo(() => {
    // Mock data for trend visualization in prototype
    return [
      { month: 'Jan', rev: 4500 },
      { month: 'Feb', rev: 5200 },
      { month: 'Mar', rev: 4800 },
      { month: 'Apr', rev: 6100 },
      { month: 'May', rev: 5900 },
      { month: 'Jun', rev: stats.totalRev / 10 }, // Scale current rev for visualization
    ];
  }, [stats]);

  if (isRoomsLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background/50">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Analyses & Performance</h1>
          </div>
        </header>

        <main className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-bold tracking-widest">RevPAR</CardDescription>
                <CardTitle className="text-2xl font-bold font-headline">{stats.revPar.toFixed(2)} $</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-emerald-500 font-bold">
                  <ArrowUpRight className="h-3 w-3 mr-1" /> +4.2% ce mois
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-bold tracking-widest">Taux d'Occup.</CardDescription>
                <CardTitle className="text-2xl font-bold font-headline">{stats.occupancy.toFixed(1)}%</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-emerald-500 font-bold">
                  <ArrowUpRight className="h-3 w-3 mr-1" /> +12.5% vs N-1
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-bold tracking-widest">ADR (Prix Moyen)</CardDescription>
                <CardTitle className="text-2xl font-bold font-headline">{stats.adr.toFixed(2)} $</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs text-amber-500 font-bold">
                  Stable cette semaine
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-primary text-primary-foreground">
              <CardHeader className="pb-2">
                <CardDescription className="text-xs uppercase font-bold tracking-widest text-primary-foreground/70">CA Total (Réel)</CardDescription>
                <CardTitle className="text-2xl font-bold font-headline">{stats.totalRev.toLocaleString()} $</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center text-xs font-bold">
                  Encaissements cumulés
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-headline">Croissance des Revenus</CardTitle>
                <CardDescription>Tendance mensuelle sur le semestre en cours.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={revenueData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="rev" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm">
              <CardHeader>
                <CardTitle className="text-lg font-headline">Répartition par Segment</CardTitle>
                <CardDescription>Performance par type de chambre.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[
                    { name: 'Standard', val: 40 },
                    { name: 'Deluxe', val: 30 },
                    { name: 'Suite', val: 20 },
                    { name: 'Penthouse', val: 10 },
                  ]}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.1} />
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} />
                    <RechartsTooltip />
                    <Bar dataKey="val" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]}>
                      {[0, 1, 2, 3].map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index % 2 === 0 ? 'hsl(var(--primary))' : 'hsl(var(--accent))'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
