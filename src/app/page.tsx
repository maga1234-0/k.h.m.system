
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

export default function DashboardPage() {
  const stats = [
    { title: "Current Occupancy", value: "78%", change: "+4.5%", trend: "up", icon: BedDouble },
    { title: "Total Revenue", value: "$45,231", change: "+12.1%", trend: "up", icon: CreditCard },
    { title: "New Bookings", value: "24", change: "-2.3%", trend: "down", icon: CalendarClock },
    { title: "Active Guests", value: "142", change: "+8.4%", trend: "up", icon: Users },
  ];

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
                <CardDescription>Visualizing performance over the last 30 days.</CardDescription>
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
                  {[
                    { guest: "Alice Johnson", room: "302", status: "Checked In", date: "Today, 10:45 AM" },
                    { guest: "Robert Smith", room: "105", status: "Pending", date: "Today, 09:12 AM" },
                    { guest: "Elena Rodriguez", room: "404", status: "Checked Out", date: "Yesterday" },
                    { guest: "Mark Thompson", room: "201", status: "Confirmed", date: "Today, 08:30 AM" },
                  ].map((res, i) => (
                    <div key={i} className="flex items-center justify-between group">
                      <div className="flex flex-col">
                        <span className="font-medium text-sm group-hover:text-primary transition-colors">{res.guest}</span>
                        <span className="text-xs text-muted-foreground">Room {res.room} • {res.date}</span>
                      </div>
                      <Badge variant={res.status === 'Checked In' ? 'default' : res.status === 'Pending' ? 'secondary' : 'outline'} className="text-[10px]">
                        {res.status}
                      </Badge>
                    </div>
                  ))}
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
                  <p className="text-sm text-muted-foreground">Our AI predicts a 15% surge in occupancy for the next weekend. Consider adjusting rates.</p>
                </div>
              </div>
              <Badge variant="accent" className="cursor-pointer px-4 py-2 text-sm bg-accent hover:bg-accent/80 transition-colors">
                View Forecast
              </Badge>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </div>
  );
}
