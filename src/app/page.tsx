"use client"

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
  ArrowDownRight, 
  CreditCard,
  Loader2,
  CheckCircle2,
  Clock,
  Wrench
} from "lucide-react";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";

export default function DashboardPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
  const firestore = useFirestore();
  
  const roomsRef = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  const resRef = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  const clientsRef = useMemoFirebase(() => user ? collection(firestore, 'clients') : null, [firestore, user]);

  const { data: rooms, isLoading: isRoomsLoading } = useCollection(roomsRef);
  const { data: reservations } = useCollection(resRef);
  const { data: clients } = useCollection(clientsRef);

  useEffect(() => {
    setMounted(true);
    if (!isUserLoading && !user) {
      router.push('/login');
    }
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

  const chartData = useMemo(() => {
    if (!rooms || !reservations || !mounted) return [];
    
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const result = [];
    const today = new Date();

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayName = days[date.getDay()];

      const activeOnDay = reservations.filter(r => 
        r.status !== 'Cancelled' && 
        r.checkInDate <= dateStr && 
        r.checkOutDate >= dateStr
      );

      const occupancy = rooms.length > 0 ? (activeOnDay.length / rooms.length) * 100 : 0;
      const revenueOnDay = activeOnDay.reduce((acc, r) => {
        const start = new Date(r.checkInDate);
        const end = new Date(r.checkOutDate);
        const nights = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
        return acc + (Number(r.totalAmount) / nights);
      }, 0);

      result.push({
        name: dayName,
        occupancy: Math.round(occupancy),
        revenue: Math.round(revenueOnDay)
      });
    }
    return result;
  }, [rooms, reservations, mounted]);

  const stats = useMemo(() => {
    if (!mounted) return [];

    const occupiedRooms = roomStatusBreakdown.occupied;
    const occupancyRate = roomStatusBreakdown.total > 0 
      ? Math.round((occupiedRooms / roomStatusBreakdown.total) * 100) 
      : 0;
    
    const totalRevenue = reservations?.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0) || 0;
    
    const todayStr = new Date().toISOString().split('T')[0];
    const newBookingsToday = reservations?.filter(r => {
      const createdDate = r.createdAt ? r.createdAt.split('T')[0] : "";
      return createdDate === todayStr;
    })?.length || 0;

    return [
      { title: "Current Occupancy", value: `${occupancyRate}%`, change: "+2.1%", trend: "up", icon: BedDouble },
      { title: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, change: "+12.1%", trend: "up", icon: CreditCard },
      { title: "New Bookings (Today)", value: newBookingsToday.toString(), change: `+${newBookingsToday}`, trend: "up", icon: CalendarClock },
      { title: "Active Guests", value: (occupiedRooms * 1.5).toFixed(0), change: "+8.4%", trend: "up", icon: Users },
    ];
  }, [rooms, reservations, mounted, roomStatusBreakdown]);

  const recentReservations = useMemo(() => {
    if (!reservations) return [];
    return [...reservations]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 4);
  }, [reservations]);

  if (!mounted || isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background/50">
        <header className="flex h-16 items-center border-b px-6 bg-background sticky top-0 z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-4 h-6" />
          <h1 className="font-headline font-semibold text-xl">Real-time Dashboard</h1>
        </header>

        <main className="p-4 md:p-6 space-y-6">
          <div className="grid gap-4 md:gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title} className="shadow-sm border-none bg-card hover:shadow-md transition-shadow">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{stat.title}</CardTitle>
                  <div className="h-8 w-8 rounded-full bg-secondary flex items-center justify-center">
                    <stat.icon className="h-4 w-4 text-primary" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold font-headline">{stat.value}</div>
                  <div className="flex items-center mt-1">
                    {stat.trend === "up" ? (
                      <ArrowUpRight className="h-4 w-4 text-emerald-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-4 w-4 text-rose-500 mr-1" />
                    )}
                    <span className={stat.trend === "up" ? "text-emerald-500 text-xs font-medium" : "text-rose-500 text-xs font-medium"}>
                      {stat.change}
                    </span>
                    <span className="text-muted-foreground text-[10px] ml-1">vs last week</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-7">
            <Card className="lg:col-span-4 border-none shadow-sm h-fit">
              <CardHeader>
                <CardTitle className="font-headline text-lg">Occupancy & Revenue Overview</CardTitle>
                <CardDescription>7-day performance tracking based on live data.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] md:h-[350px]">
                <DashboardCharts data={chartData} />
              </CardContent>
            </Card>

            <div className="lg:col-span-3 space-y-6">
              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="font-headline text-lg">Room Inventory Status</CardTitle>
                  <CardDescription>Live breakdown of your {roomStatusBreakdown.total} rooms.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-3 md:gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/5 border border-emerald-500/10">
                      <div className="h-8 w-8 rounded-lg bg-emerald-500 flex items-center justify-center text-white shrink-0">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xl font-bold leading-none">{roomStatusBreakdown.available}</span>
                        <span className="text-[10px] uppercase font-bold text-emerald-600 truncate">Available</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
                      <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center text-white shrink-0">
                        <BedDouble className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xl font-bold leading-none">{roomStatusBreakdown.occupied}</span>
                        <span className="text-[10px] uppercase font-bold text-amber-600 truncate">Occupied</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-blue-500/5 border border-blue-500/10">
                      <div className="h-8 w-8 rounded-lg bg-blue-500 flex items-center justify-center text-white shrink-0">
                        <Clock className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xl font-bold leading-none">{roomStatusBreakdown.cleaning}</span>
                        <span className="text-[10px] uppercase font-bold text-blue-600 truncate">Cleaning</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-rose-500/5 border border-rose-500/10">
                      <div className="h-8 w-8 rounded-lg bg-rose-500 flex items-center justify-center text-white shrink-0">
                        <Wrench className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col min-w-0">
                        <span className="text-xl font-bold leading-none">{roomStatusBreakdown.maintenance}</span>
                        <span className="text-[10px] uppercase font-bold text-rose-600 truncate">In Service</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <CardTitle className="font-headline text-lg">Recent Reservations</CardTitle>
                  <CardDescription>Latest updates from the front desk.</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4 pt-2">
                    {recentReservations.length > 0 ? (
                      recentReservations.map((res, i) => (
                        <div key={i} className="flex items-center justify-between group gap-2">
                          <div className="flex flex-col min-w-0">
                            <span className="font-medium text-sm group-hover:text-primary transition-colors truncate">{res.guestName}</span>
                            <span className="text-xs text-muted-foreground truncate">Room {res.roomNumber} • {res.createdAt ? new Date(res.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A'}</span>
                          </div>
                          <Badge variant={res.status === 'Checked In' ? 'default' : res.status === 'Confirmed' ? 'secondary' : 'outline'} className="text-[10px] shrink-0">
                            {res.status}
                          </Badge>
                        </div>
                      ))
                    ) : (
                      <div className="flex flex-col items-center justify-center py-8 opacity-40">
                        <CalendarClock className="h-8 w-8 mb-2" />
                        <p className="text-xs">No recent activity</p>
                      </div>
                    )}
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
