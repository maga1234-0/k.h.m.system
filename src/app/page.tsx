
"use client"

import { useMemo } from "react";
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
  TrendingUp,
  CreditCard
} from "lucide-react";
import { DashboardCharts } from "@/components/dashboard/DashboardCharts";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection } from "firebase/firestore";
import Link from "next/link";

export default function DashboardPage() {
  const firestore = useFirestore();
  const roomsRef = useMemoFirebase(() => collection(firestore, 'rooms'), [firestore]);
  const resRef = useMemoFirebase(() => collection(firestore, 'reservations'), [firestore]);
  const clientsRef = useMemoFirebase(() => collection(firestore, 'clients'), [firestore]);

  const { data: rooms } = useCollection(roomsRef);
  const { data: reservations } = useCollection(resRef);
  const { data: clients } = useCollection(clientsRef);

  const stats = useMemo(() => {
    const occupiedRooms = rooms?.filter(r => r.status === 'Occupied')?.length || 0;
    const occupancyRate = rooms && rooms.length > 0 ? Math.round((occupiedRooms / rooms.length) * 100) : 0;
    
    const totalRevenue = reservations?.reduce((acc, r) => acc + (Number(r.totalAmount) || 0), 0) || 0;
    const newBookingsToday = reservations?.filter(r => {
      const createdDate = r.createdAt ? new Date(r.createdAt).toDateString() : "";
      return createdDate === new Date().toDateString();
    })?.length || 0;

    return [
      { title: "Current Occupancy", value: `${occupancyRate}%`, change: "+2.1%", trend: "up", icon: BedDouble },
      { title: "Total Revenue", value: `$${totalRevenue.toLocaleString()}`, change: "+12.1%", trend: "up", icon: CreditCard },
      { title: "New Bookings (Today)", value: newBookingsToday.toString(), change: "+4", trend: "up", icon: CalendarClock },
      { title: "Active Guests", value: (occupiedRooms * 1.5).toFixed(0), change: "+8.4%", trend: "up", icon: Users }, // Mocking active guests based on rooms
    ];
  }, [rooms, reservations]);

  const recentReservations = useMemo(() => {
    if (!reservations) return [];
    return [...reservations]
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime())
      .slice(0, 4);
  }, [reservations]);

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background/50">
        <header className="flex h-16 items-center border-b px-6 bg-background">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-4 h-6" />
          <h1 className="font-headline font-semibold text-xl">Real-time Dashboard</h1>
        </header>

        <main className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
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

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
            <Card className="lg:col-span-4 border-none shadow-sm">
              <CardHeader>
                <CardTitle className="font-headline text-lg">Occupancy & Revenue Overview</CardTitle>
                <CardDescription>Visualizing performance based on current Firestore data.</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <DashboardCharts />
              </CardContent>
            </Card>

            <Card className="lg:col-span-3 border-none shadow-sm">
              <CardHeader>
                <CardTitle className="font-headline text-lg">Recent Reservations</CardTitle>
                <CardDescription>Latest updates from the front desk.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentReservations.length > 0 ? (
                    recentReservations.map((res, i) => (
                      <div key={i} className="flex items-center justify-between group">
                        <div className="flex flex-col">
                          <span className="font-medium text-sm group-hover:text-primary transition-colors">{res.guestName}</span>
                          <span className="text-xs text-muted-foreground">Room {res.roomNumber} • {new Date(res.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>
                        <Badge variant={res.status === 'Checked In' ? 'default' : res.status === 'Confirmed' ? 'primary' : 'outline'} className="text-[10px]">
                          {res.status}
                        </Badge>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground text-center py-8">No recent reservations found.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm bg-primary/5">
            <CardContent className="p-6 flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  <TrendingUp className="h-6 w-6" />
                </div>
                <div>
                  <h3 className="font-headline font-bold text-lg">AI Forecasting Available</h3>
                  <p className="text-sm text-muted-foreground">Predict occupancy surges based on your live inventory and seasonal trends.</p>
                </div>
              </div>
              <Link href="/forecasting">
                <Badge variant="accent" className="cursor-pointer px-4 py-2 text-sm bg-accent hover:bg-accent/80 transition-colors">
                  View Forecast
                </Badge>
              </Link>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </div>
  );
}
