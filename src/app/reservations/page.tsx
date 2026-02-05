
"use client"

import { useState } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Calendar, 
  Plus, 
  Filter, 
  MoreHorizontal,
  ArrowUpDown,
  CheckCircle2,
  Clock,
  XCircle,
  LogOut
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";

export default function ReservationsPage() {
  const [searchTerm, setSearchTerm] = useState("");

  const reservations = [
    { id: "RES-001", guest: "Alice Johnson", room: "302", type: "Standard", checkIn: "2024-05-24", checkOut: "2024-05-27", status: "Checked In", payment: "Paid" },
    { id: "RES-002", guest: "Robert Smith", room: "105", type: "Standard", checkIn: "2024-05-24", checkOut: "2024-05-25", status: "Pending", payment: "Unpaid" },
    { id: "RES-003", guest: "Michael Chang", room: "201", type: "Executive", checkIn: "2024-05-25", checkOut: "2024-05-30", status: "Confirmed", payment: "Partial" },
    { id: "RES-004", guest: "Emily Watson", room: "404", type: "Deluxe", checkIn: "2024-05-22", checkOut: "2024-05-24", status: "Checked Out", payment: "Paid" },
    { id: "RES-005", guest: "David Miller", room: "102", type: "Standard", checkIn: "2024-05-26", checkOut: "2024-05-28", status: "Confirmed", payment: "Paid" },
    { id: "RES-006", guest: "Sarah Smith", room: "202", type: "Deluxe", checkIn: "2024-05-20", checkOut: "2024-05-23", status: "Cancelled", payment: "Refunded" },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Checked In": return <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1"><CheckCircle2 className="h-3 w-3" /> In</Badge>;
      case "Checked Out": return <Badge variant="outline" className="text-muted-foreground gap-1"><LogOut className="h-3 w-3" /> Out</Badge>;
      case "Confirmed": return <Badge className="bg-primary hover:bg-primary/90 gap-1"><Calendar className="h-3 w-3" /> Confirmed</Badge>;
      case "Pending": return <Badge variant="secondary" className="gap-1"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "Cancelled": return <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Cancelled</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredReservations = reservations.filter(res => 
    res.guest.toLowerCase().includes(searchTerm.toLowerCase()) || 
    res.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.room.includes(searchTerm)
  );

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Reservations</h1>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <Plus className="h-4 w-4" /> New Booking
          </Button>
        </header>

        <main className="p-6">
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search reservations..." 
                  className="pl-9 bg-background" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex gap-2 w-full md:w-auto">
                <Button variant="outline" size="sm" className="gap-2 flex-1 md:flex-none">
                  <Filter className="h-4 w-4" /> Filter
                </Button>
                <Button variant="outline" size="sm" className="gap-2 flex-1 md:flex-none">
                  <ArrowUpDown className="h-4 w-4" /> Sort
                </Button>
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">ID</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Check In</TableHead>
                  <TableHead>Check Out</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReservations.length > 0 ? (
                  filteredReservations.map((res) => (
                    <TableRow key={res.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-xs font-semibold">{res.id}</TableCell>
                      <TableCell className="font-medium">{res.guest}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">Room {res.room}</span>
                          <span className="text-[10px] text-muted-foreground uppercase">{res.type}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{res.checkIn}</TableCell>
                      <TableCell className="text-sm">{res.checkOut}</TableCell>
                      <TableCell>{getStatusBadge(res.status)}</TableCell>
                      <TableCell>
                        <span className={`text-xs font-medium ${res.payment === 'Paid' ? 'text-emerald-600' : res.payment === 'Unpaid' ? 'text-rose-600' : 'text-amber-600'}`}>
                          {res.payment}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>View Details</DropdownMenuItem>
                            <DropdownMenuItem>Modify Booking</DropdownMenuItem>
                            <DropdownMenuItem>Send Confirmation</DropdownMenuItem>
                            <Separator className="my-1" />
                            <DropdownMenuItem className="text-destructive">Cancel Reservation</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      No reservations found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
