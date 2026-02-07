
"use client"

import { useState, useEffect, useMemo } from "react";
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
  Mail,
  Phone,
  MessageSquare,
  Trash2,
  Filter,
  AlertCircle
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking,
  setDocumentNonBlocking,
  useUser 
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

export default function ReservationsPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedResId, setSelectedResId] = useState<string | null>(null);
  const [resToDelete, setResToDelete] = useState<any>(null);
  
  const [newBooking, setNewBooking] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
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

  const selectedRes = useMemo(() => {
    if (!selectedResId || !reservations) return null;
    return reservations.find(r => r.id === selectedResId) || null;
  }, [selectedResId, reservations]);

  useEffect(() => {
    setMounted(true);
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
      case "Checked In": return <Badge className="bg-emerald-500 hover:bg-emerald-600 gap-1 text-[10px]"><CheckCircle2 className="h-3 w-3" /> In</Badge>;
      case "Checked Out": return <Badge variant="outline" className="text-muted-foreground gap-1 text-[10px]"><LogOut className="h-3 w-3" /> Out</Badge>;
      case "Confirmed": return <Badge className="bg-primary hover:bg-primary/90 gap-1 text-[10px]"><Calendar className="h-3 w-3" /> Confirmed</Badge>;
      case "Pending": return <Badge variant="secondary" className="gap-1 text-[10px]"><Clock className="h-3 w-3" /> Pending</Badge>;
      case "Cancelled": return <Badge variant="destructive" className="gap-1 text-[10px]"><XCircle className="h-3 w-3" /> Cancelled</Badge>;
      default: return <Badge variant="outline" className="text-[10px]">{status}</Badge>;
    }
  };

  const handleCreateBooking = () => {
    if (!newBooking.guestName || !newBooking.roomId || !resCollection) return;

    const selectedRoom = rooms?.find(r => r.id === newBooking.roomId);
    if (!selectedRoom) return;

    if (selectedRoom.status !== 'Available') {
      toast({
        variant: "destructive",
        title: "Booking Restricted",
        description: `Room ${selectedRoom.roomNumber} is currently ${selectedRoom.status} and cannot be booked.`,
      });
      return;
    }

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
    toast({
      title: "Reservation Created",
      description: `New booking confirmed for ${reservationData.guestName} in Room ${selectedRoom.roomNumber}.`,
    });
  };

  const handleSendConfirmation = (reservation: any, method: 'whatsapp' | 'email') => {
    let message = "";
    
    if (reservation.status === 'Checked Out') {
      message = `*THANK YOU FOR YOUR STAY - K.H.M.SYSTEM*\n-----------------------------\n*Guest:* ${reservation.guestName}\n*Status:* Checked Out\n*Room:* ${reservation.roomNumber}\n*Total Charges:* $${reservation.totalAmount}\n-----------------------------\nWe hope you enjoyed your time with us. See you again soon!`;
    } else if (reservation.status === 'Cancelled') {
      message = `*RESERVATION CANCELLED - K.H.M.SYSTEM*\n-----------------------------\n*Guest:* ${reservation.guestName}\n*Status:* Cancelled\n*Room:* ${reservation.roomNumber}\n-----------------------------\nThis is a confirmation that your booking has been cancelled. If you have questions, please reach out.`;
    } else {
      message = `*BOOKING CONFIRMATION - K.H.M.SYSTEM*\n-----------------------------\n*Guest:* ${reservation.guestName}\n*Status:* ${reservation.status}\n*Room:* ${reservation.roomNumber}\n*Check-In:* ${reservation.checkInDate}\n*Check-Out:* ${reservation.checkOutDate}\n*Amount:* $${reservation.totalAmount}\n-----------------------------\nWe look forward to welcoming you!`;
    }
    
    if (method === 'whatsapp') {
      if (!reservation.guestPhone) {
        toast({
          variant: "destructive",
          title: "Phone Missing",
          description: "This guest has no phone number saved for WhatsApp.",
        });
        return;
      }
      const phone = reservation.guestPhone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
    } else {
      if (!reservation.guestEmail) {
        toast({
          variant: "destructive",
          title: "Email Missing",
          description: "This guest has no email address saved for confirmation.",
        });
        return;
      }
      const mailtoUrl = `mailto:${reservation.guestEmail}?subject=Reservation Update - K.H.M.System&body=${encodeURIComponent(message)}`;
      window.open(mailtoUrl, '_blank');
    }
  };

  const handleCheckIn = (reservation: any) => {
    // Safety check: Is the room still occupied?
    const room = rooms?.find(r => r.id === reservation.roomId);
    if (room && room.status === 'Occupied') {
      // Check if it's occupied by someone else (not the current reservation)
      // Since rooms are currently marked "Occupied" as soon as they are booked, 
      // we need to be careful. However, for a strict check-out logic:
      toast({
        variant: "destructive",
        title: "Room Occupied",
        description: `Room ${room.roomNumber} is currently occupied. Please ensure previous guests have checked out.`,
      });
      // We still allow it if the user insists, but it's better to block or warn.
      // Based on "if room is occupied don't check out", let's be strict.
      return;
    }

    const resRef = doc(firestore, 'reservations', reservation.id);
    updateDocumentNonBlocking(resRef, { status: "Checked In" });
    
    const invoiceRef = doc(collection(firestore, 'invoices'));
    setDocumentNonBlocking(invoiceRef, {
      id: invoiceRef.id,
      reservationId: reservation.id,
      guestName: reservation.guestName,
      guestPhone: reservation.guestPhone || "",
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
      amountDue: Number(reservation.totalAmount) || 0,
      amountPaid: 0,
      status: "Unpaid"
    }, { merge: true });

    toast({
      title: "Guest Checked In",
      description: `${reservation.guestName} has checked in. Invoice generated.`,
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

  const handleDeleteConfirm = () => {
    if (!resToDelete) return;
    
    if (resToDelete.roomId && (resToDelete.status === 'Confirmed' || resToDelete.status === 'Checked In')) {
      const roomRef = doc(firestore, 'rooms', resToDelete.roomId);
      updateDocumentNonBlocking(roomRef, { status: "Available" });
    }

    const resRef = doc(firestore, 'reservations', resToDelete.id);
    deleteDocumentNonBlocking(resRef);
    
    toast({
      variant: "destructive",
      title: "Reservation Deleted",
      description: `Record for ${resToDelete.guestName} has been permanently removed.`,
    });
    
    setResToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  if (!mounted || isAuthLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredReservations = reservations?.filter(res => {
    const matchesSearch = 
      res.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      res.id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      res.roomNumber?.includes(searchTerm);
    
    const matchesStatus = statusFilter === "All" || res.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

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
            <DialogContent className="sm:max-w-[500px]">
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newGuestEmail">Email Address</Label>
                    <Input 
                      id="newGuestEmail" 
                      type="email"
                      placeholder="guest@example.com"
                      value={newBooking.guestEmail}
                      onChange={(e) => setNewBooking({...newBooking, guestEmail: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newGuestPhone">Phone (International)</Label>
                    <Input 
                      id="newGuestPhone" 
                      placeholder="e.g. 15551234567"
                      value={newBooking.guestPhone}
                      onChange={(e) => setNewBooking({...newBooking, guestPhone: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roomSelect">Assign Room</Label>
                  {availableRooms.length > 0 ? (
                    <Select 
                      value={newBooking.roomId} 
                      onValueChange={(val) => {
                        const room = rooms?.find(r => r.id === val);
                        setNewBooking({
                          ...newBooking, 
                          roomId: val, 
                          totalAmount: room ? (room.pricePerNight || 0) : 0 
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder={isRoomsLoading ? "Loading rooms..." : "Select an available room"} />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRooms.map((room) => (
                          <SelectItem key={room.id} value={room.id}>
                            Room {room.roomNumber} - {room.roomType} (${room.pricePerNight || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <div className="flex items-center gap-2 p-3 border rounded-lg bg-destructive/5 text-destructive text-sm font-medium">
                      <AlertCircle className="h-4 w-4" />
                      No rooms are currently available.
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="newCheckIn">Check-In</Label>
                    <Input 
                      id="newCheckIn" 
                      type="date" 
                      value={newBooking.checkInDate}
                      onChange={(e) => setNewBooking({...newBooking, checkInDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="newCheckOut">Check-Out</Label>
                    <Input 
                      id="newCheckOut" 
                      type="date" 
                      value={newBooking.checkOutDate}
                      onChange={(e) => setNewBooking({...newBooking, checkOutDate: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateBooking} disabled={!newBooking.guestName || !newBooking.roomId || availableRooms.length === 0}>Confirm Booking</Button>
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
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px] bg-background">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Statuses</SelectItem>
                    <SelectItem value="Confirmed">Confirmed</SelectItem>
                    <SelectItem value="Checked In">Checked In</SelectItem>
                    <SelectItem value="Checked Out">Checked Out</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[120px]">ID</TableHead>
                  <TableHead>Guest</TableHead>
                  <TableHead>Room</TableHead>
                  <TableHead>Dates</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isResLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Synchronizing...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredReservations && filteredReservations.length > 0 ? (
                  filteredReservations.map((res) => (
                    <TableRow key={res.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell className="font-mono text-[10px] font-semibold">{res.id.slice(0, 8)}...</TableCell>
                      <TableCell className="font-medium text-sm">
                        <div className="flex flex-col">
                          <span>{res.guestName}</span>
                          <span className="text-[10px] text-muted-foreground">{res.guestEmail || res.guestPhone || 'No contact info'}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">Room {res.roomNumber}</TableCell>
                      <TableCell className="text-xs">
                        <div className="flex flex-col">
                          <span>{res.checkInDate}</span>
                          <span className="text-muted-foreground">to {res.checkOutDate}</span>
                        </div>
                      </TableCell>
                      <TableCell>{getStatusBadge(res.status)}</TableCell>
                      <TableCell className="text-xs font-bold text-emerald-600">${res.totalAmount}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onSelect={() => {
                              setSelectedResId(res.id);
                              setTimeout(() => setIsDetailsDialogOpen(true), 150);
                            }}>
                              <Info className="mr-2 h-4 w-4" /> View Details
                            </DropdownMenuItem>
                            
                            <DropdownMenuSub>
                              <DropdownMenuSubTrigger>
                                <MessageSquare className="mr-2 h-4 w-4" /> Send Confirmation
                              </DropdownMenuSubTrigger>
                              <DropdownMenuSubContent>
                                <DropdownMenuItem onSelect={() => handleSendConfirmation(res, 'whatsapp')}>
                                  <Phone className="mr-2 h-4 w-4" /> via WhatsApp
                                </DropdownMenuItem>
                                <DropdownMenuItem onSelect={() => handleSendConfirmation(res, 'email')}>
                                  <Mail className="mr-2 h-4 w-4" /> via Email
                                </DropdownMenuItem>
                              </DropdownMenuSubContent>
                            </DropdownMenuSub>

                            <Separator className="my-1" />
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
                            {res.status !== 'Cancelled' && res.status !== 'Checked Out' && (
                              <DropdownMenuItem onSelect={() => handleCancelReservation(res)} className="text-destructive">
                                <Ban className="mr-2 h-4 w-4" /> Cancel Booking
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onSelect={() => {
                                setResToDelete(res);
                                setTimeout(() => setIsDeleteDialogOpen(true), 150);
                              }} 
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Record
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                      No records found for this filter.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </main>

        <Dialog open={isDetailsDialogOpen} onOpenChange={(open) => {
          setIsDetailsDialogOpen(open);
          if (!open) setTimeout(() => setSelectedResId(null), 200);
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Reservation Summary</DialogTitle>
              <DialogDescription>Overview of the guest's booking details.</DialogDescription>
            </DialogHeader>
            {selectedRes ? (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Guest</span>
                    <p className="text-sm font-semibold">{selectedRes.guestName}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedRes.guestEmail}</p>
                    <p className="text-[10px] text-muted-foreground">{selectedRes.guestPhone}</p>
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
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Room</span>
                    <p className="text-sm font-medium">Room {selectedRes.roomNumber}</p>
                  </div>
                  <div className="space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Guests</span>
                    <p className="text-sm font-medium">{selectedRes.numberOfGuests} Person(s)</p>
                  </div>
                </div>
                <Separator />
                <div className="flex justify-between items-center bg-muted/30 p-3 rounded-lg">
                  <span className="text-sm font-semibold">Total Amount</span>
                  <span className="text-lg font-bold text-emerald-600">${selectedRes.totalAmount}</span>
                </div>
              </div>
            ) : (
              <div className="flex justify-center p-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            )}
            <DialogFooter>
              <Button onClick={() => setIsDetailsDialogOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Reservation Record?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete the booking record for <strong>{resToDelete?.guestName}</strong>. 
                If the guest is currently checked in, the room will be marked as available. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setResToDelete(null)}>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete Record
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </div>
  );
}
