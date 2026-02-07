
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
  MoreHorizontal,
  CheckCircle2,
  Clock,
  XCircle,
  LogOut,
  Loader2,
  CalendarDays,
  UserCheck,
  Ban,
  Info,
  Mail
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
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [selectedRes, setSelectedRes] = useState<any>(null);
  
  const [newBooking, setNewBooking] = useState({
    guestName: "",
    roomId: "",
    checkInDate: "",
    checkOutDate: "",
    numberOfGuests: 1,
    totalAmount: 0
  });

  const firestore = useFirestore();
  
  const resCollection = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  const roomsCollection = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  
  const { data: reservations, isLoading: isResLoading } = useCollection(resCollection);
  const { data: rooms, isLoading: isRoomsLoading } = useCollection(roomsCollection);

  // Fix hydration mismatch by setting initial dates on client mount
  useEffect(() => {
    setNewBooking(prev => ({
      ...prev,
      checkInDate: new Date().toISOString().split('T')[0],
      checkOutDate: new Date(Date.now() + 86400000).toISOString().split('T')[0]
    }));
  }, []);

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
    
    if (reservation.roomId) {
      const roomRef = doc(firestore, 'rooms', reservation.roomId);
      updateDocumentNonBlocking(roomRef, { status: "Available" });
    }

    toast({
      title: "Reservation Cancelled",
      description: `Booking for ${reservation.guestName} has been cancelled.`,
    });
  };

  const handleCheckIn = (reservation: any) => {
    const resRef = doc(firestore, 'reservations', reservation.id);
    updateDocumentNonBlocking(resRef, { status: "Checked In" });
    
    toast({
      title: "Guest Checked In",
      description: `${reservation.guestName} has successfully checked in.`,
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
      description: `${reservation.guestName} has checked out.`,
    });
  };

  const handleSendConfirmation = (reservation: any) => {
    toast({
      title: "Confirmation Sent",
      description: `Booking confirmation has been sent to ${reservation.guestName}.`,
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
                  placeholder="Search reservations..." 
                  className="pl-9 bg-background" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
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
                      <TableCell>Room {res.roomNumber}</TableCell>
                      <TableCell className="text-sm">{res.checkInDate}</TableCell>
                      <TableCell className="text-sm">{res.checkOutDate}</TableCell>
                      <TableCell>{getStatusBadge(res.status)}</TableCell>
                      <TableCell className="text-xs font-medium text-emerald-600">${res.totalAmount}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={(e) => {
                              e.preventDefault();
                              setSelectedRes(res);
                              setTimeout(() => setIsDetailsDialogOpen(true), 50);
                            }}>
                              <Info className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            {res.status === 'Confirmed' && (
                              <DropdownMenuItem onSelect={() => handleCheckIn(res)} className="text-emerald-600">
                                <UserCheck className="mr-2 h-4 w-4" /> Check In
                              </DropdownMenuItem>
                            )}
                            {res.status === 'Checked In' && (
                              <DropdownMenuItem onSelect={() => handleCheckOut(res)} className="text-blue-600">
                                <LogOut className="mr-2 h-4 w-4" /> Check Out
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem onSelect={() => handleSendConfirmation(res)}>
                              <Mail className="mr-2 h-4 w-4" /> Send Confirmation
                            </DropdownMenuItem>
                            <Separator className="my-1" />
                            {res.status !== 'Cancelled' && res.status !== 'Checked Out' && (
                              <DropdownMenuItem onSelect={() => handleCancelReservation(res)} className="text-destructive">
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
                      {searchTerm ? "No reservations match your search." : "No reservations found."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </main>

        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Reservation Details</DialogTitle>
              <DialogDescription>Full summary of the guest's booking.</DialogDescription>
            </DialogHeader>
            {selectedRes && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Guest Name</span>
                    <p className="text-sm font-semibold">{selectedRes.guestName}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Status</span>
                    <div>{getStatusBadge(selectedRes.status)}</div>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Check-In</span>
                    <p className="text-sm font-medium">{selectedRes.checkInDate}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Check-Out</span>
                    <p className="text-sm font-medium">{selectedRes.checkOutDate}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Room Assigned</span>
                    <p className="text-sm font-medium">Room {selectedRes.roomNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Guests</span>
                    <p className="text-sm font-medium">{selectedRes.numberOfGuests} Person(s)</p>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                  <span className="text-sm font-semibold">Total Amount Due</span>
                  <span className="text-lg font-bold text-emerald-600">${selectedRes.totalAmount}</span>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </div>
  );
}
