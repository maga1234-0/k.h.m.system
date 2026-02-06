
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
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
  LogOut,
  Loader2,
  CalendarDays,
  Users as UsersIcon,
  DollarSign,
  UserCheck,
  Ban
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter,
  DialogDescription
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

export default function ReservationsPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newBooking, setNewBooking] = useState({
    guestName: "",
    roomId: "",
    checkInDate: new Date().toISOString().split('T')[0],
    checkOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    numberOfGuests: 1,
    totalAmount: 0
  });

  const firestore = useFirestore();
  
  // Guard references with user check to prevent permission errors before redirect
  const resCollection = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  const roomsCollection = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  
  const { data: reservations, isLoading: isResLoading } = useCollection(resCollection);
  const { data: rooms, isLoading: isRoomsLoading } = useCollection(roomsCollection);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

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

  const handleCreateBooking = () => {
    if (!newBooking.guestName || !newBooking.roomId || !resCollection) return;

    const selectedRoom = rooms?.find(r => r.id === newBooking.roomId);
    if (!selectedRoom) return;

    const reservationData = {
      ...newBooking,
      roomNumber: selectedRoom.roomNumber,
      status: "Confirmed",
      createdAt: new Date().toISOString()
    };

    addDocumentNonBlocking(resCollection, reservationData);
    
    // Update room status
    const roomRef = doc(firestore, 'rooms', selectedRoom.id);
    updateDocumentNonBlocking(roomRef, { status: "Occupied" });

    setIsAddDialogOpen(false);
    setNewBooking({
      guestName: "",
      roomId: "",
      checkInDate: new Date().toISOString().split('T')[0],
      checkOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      numberOfGuests: 1,
      totalAmount: 0
    });

    toast({
      title: "Reservation Created",
      description: `New booking confirmed for ${reservationData.guestName} in Room ${selectedRoom.roomNumber}.`,
    });
  };

  const handleCancelReservation = (reservation: any) => {
    const resRef = doc(firestore, 'reservations', reservation.id);
    updateDocumentNonBlocking(resRef, { status: "Cancelled" });
    
    // Make room available again
    if (reservation.roomId) {
      const roomRef = doc(firestore, 'rooms', reservation.roomId);
      updateDocumentNonBlocking(roomRef, { status: "Available" });
    }

    toast({
      title: "Reservation Cancelled",
      description: `Booking for ${reservation.guestName} has been cancelled and Room ${reservation.roomNumber} is now available.`,
    });
  };

  const handleCheckIn = (reservation: any) => {
    const resRef = doc(firestore, 'reservations', reservation.id);
    updateDocumentNonBlocking(resRef, { status: "Checked In" });
    
    toast({
      title: "Guest Checked In",
      description: `${reservation.guestName} has successfully checked in to Room ${reservation.roomNumber}.`,
    });
  };

  const handleCheckOut = (reservation: any) => {
    const resRef = doc(firestore, 'reservations', reservation.id);
    updateDocumentNonBlocking(resRef, { status: "Checked Out" });
    
    if (reservation.roomId) {
      const roomRef = doc(firestore, 'rooms', reservation.roomId);
      updateDocumentNonBlocking(roomRef, { status: "Available" });
    }

    toast({
      title: "Guest Checked Out",
      description: `${reservation.guestName} has checked out. Room ${reservation.roomNumber} is now available.`,
    });
  };

  if (isAuthLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredReservations = reservations?.filter(res => 
    res.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    res.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    res.roomNumber?.includes(searchTerm)
  );

  const availableRooms = rooms?.filter(r => r.status === 'Available') || [];

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
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <Plus className="h-4 w-4" /> New Booking
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>New Reservation</DialogTitle>
                <DialogDescription>Enter guest details and assign a room to create a new booking.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="newGuestName">Guest Name</Label>
                  <Input 
                    id="newGuestName" 
                    placeholder="Full name of primary guest"
                    value={newBooking.guestName}
                    onChange={(e) => setNewBooking({...newBooking, guestName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roomSelect">Assign Room</Label>
                  <Select 
                    value={newBooking.roomId} 
                    onValueChange={(val) => {
                      const room = rooms?.find(r => r.id === val);
                      setNewBooking({
                        ...newBooking, 
                        roomId: val, 
                        totalAmount: room ? room.pricePerNight : 0 
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={isRoomsLoading ? "Loading rooms..." : "Select an available room"} />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          Room {room.roomNumber} - {room.roomType} (${room.pricePerNight})
                        </SelectItem>
                      ))}
                      {availableRooms.length === 0 && !isRoomsLoading && (
                        <div className="p-2 text-xs text-muted-foreground text-center">No rooms available</div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newCheckIn">Check-In</Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="newCheckIn" 
                        type="date" 
                        className="pl-9 text-xs"
                        value={newBooking.checkInDate}
                        onChange={(e) => setNewBooking({...newBooking, checkInDate: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newCheckOut">Check-Out</Label>
                    <div className="relative">
                      <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="newCheckOut" 
                        type="date" 
                        className="pl-9 text-xs"
                        value={newBooking.checkOutDate}
                        onChange={(e) => setNewBooking({...newBooking, checkOutDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newNumGuests">Guests</Label>
                    <div className="relative">
                      <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="newNumGuests" 
                        type="number" 
                        className="pl-9"
                        value={newBooking.numberOfGuests}
                        onChange={(e) => setNewBooking({...newBooking, numberOfGuests: parseInt(e.target.value) || 1})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newAmount">Total Amount</Label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="newAmount" 
                        type="number" 
                        className="pl-9"
                        value={newBooking.totalAmount}
                        onChange={(e) => setNewBooking({...newBooking, totalAmount: parseInt(e.target.value) || 0})}
                      />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateBooking} disabled={!newBooking.guestName || !newBooking.roomId}>Confirm Booking</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <main className="p-6">
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center justify-between">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search reservations by guest, room, or ID..." 
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
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isResLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Fetching live data...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredReservations && filteredReservations.length > 0 ? (
                  filteredReservations.map((res) => (
                    <TableRow key={res.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-[10px] font-semibold">{res.id.slice(0, 8)}...</TableCell>
                      <TableCell className="font-medium">{res.guestName}</TableCell>
                      <TableCell>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">Room {res.roomNumber}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">{res.checkInDate}</TableCell>
                      <TableCell className="text-sm">{res.checkOutDate}</TableCell>
                      <TableCell>{getStatusBadge(res.status)}</TableCell>
                      <TableCell>
                        <span className="text-xs font-medium text-emerald-600">
                          ${res.totalAmount}
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
                            {res.status === 'Confirmed' && (
                              <DropdownMenuItem onClick={() => handleCheckIn(res)} className="text-emerald-600">
                                <UserCheck className="mr-2 h-4 w-4" /> Check In
                              </DropdownMenuItem>
                            )}
                            {res.status === 'Checked In' && (
                              <DropdownMenuItem onClick={() => handleCheckOut(res)} className="text-blue-600">
                                <LogOut className="mr-2 h-4 w-4" /> Check Out
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem>Send Confirmation</DropdownMenuItem>
                            <Separator className="my-1" />
                            {res.status !== 'Cancelled' && res.status !== 'Checked Out' && (
                              <DropdownMenuItem onClick={() => handleCancelReservation(res)} className="text-destructive">
                                <Ban className="mr-2 h-4 w-4" /> Cancel Reservation
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      {searchTerm ? "No reservations match your search." : "No reservations found in the system."}
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
