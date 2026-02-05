
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bed, Plus, Filter, Search } from "lucide-react";

export default function RoomsPage() {
  const rooms = [
    { id: "101", type: "Standard Single", status: "Available", price: 120, floor: 1 },
    { id: "102", type: "Standard Single", status: "Occupied", price: 120, floor: 1 },
    { id: "103", type: "Deluxe Double", status: "Maintenance", price: 200, floor: 1 },
    { id: "201", type: "Executive Suite", status: "Available", price: 450, floor: 2 },
    { id: "202", type: "Deluxe Double", status: "Occupied", price: 200, floor: 2 },
    { id: "301", type: "Penthouse", status: "Available", price: 1200, floor: 3 },
    { id: "302", type: "Standard Single", status: "Cleaning", price: 120, floor: 3 },
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "Occupied": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "Maintenance": return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      case "Cleaning": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default: return "bg-slate-500/10 text-slate-600";
    }
  };

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Room Management</h1>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> Add Room
          </Button>
        </header>

        <main className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search room number or type..." className="pl-9" />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" /> Filters
              </Button>
              <Button variant="ghost">Reset</Button>
            </div>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {rooms.map((room) => (
              <Card key={room.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group">
                <div className={`h-2 w-full ${room.status === 'Available' ? 'bg-emerald-500' : room.status === 'Occupied' ? 'bg-amber-500' : room.status === 'Maintenance' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="font-headline text-2xl">Room {room.id}</CardTitle>
                    <Badge variant="outline" className={`${getStatusColor(room.status)}`}>
                      {room.status}
                    </Badge>
                  </div>
                  <span className="text-sm text-muted-foreground">{room.type} • Floor {room.floor}</span>
                </CardHeader>
                <CardContent className="pb-4">
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-primary">${room.price}</span>
                    <span className="text-xs text-muted-foreground">/ night</span>
                  </div>
                </CardContent>
                <CardFooter className="bg-muted/50 p-3 flex justify-end gap-2 group-hover:bg-muted transition-colors">
                  <Button variant="ghost" size="sm">Details</Button>
                  {room.status === 'Available' && <Button size="sm" className="bg-primary text-primary-foreground">Book Now</Button>}
                  {room.status === 'Occupied' && <Button variant="secondary" size="sm">Check Out</Button>}
                </CardFooter>
              </Card>
            ))}
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
