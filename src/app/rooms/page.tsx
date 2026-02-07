'use client';

import { useState } from 'react';
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  Search, 
  Loader2, 
  Bed, 
  Users as UsersIcon,
  DollarSign,
  Info,
  CheckCircle2,
  CalendarDays,
  Edit2,
  Mail,
  Phone
} from "lucide-react";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  addDocumentNonBlocking
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
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
import { toast } from "@/hooks/use-toast";

export default function RoomsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [editRoomData, setEditRoomData] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [newRoom, setNewRoom] = useState<any>({
    roomNumber: "",
    roomType: "Standard",
    capacity: "",
    pricePerNight: "",
    floor: "",
  });

  const [bookingData, setBookingData] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    checkIn: new Date().toISOString().split('T')[0],
    checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
    guests: 1
  });

  const firestore = useFirestore();
  const roomsCollection = useMemoFirebase(() => collection(firestore, 'rooms'), [firestore]);
  const { data: rooms, isLoading } = useCollection(roomsCollection);

  const handleAddRoom = () => {
    if (!newRoom.roomNumber) return;

    const roomId = doc(collection(firestore, 'rooms')).id;
    const roomRef = doc(firestore, 'rooms', roomId);

    const roomData = {
      ...newRoom,
      id: roomId,
      status: "Available",
      amenities: ["Wi-Fi", "TV", "Air Conditioning"],
      pricePerNight: Number(newRoom.pricePerNight) || null,
      capacity: Number(newRoom.capacity) || null,
      floor: Number(newRoom.floor) || null,
    };

    setDocumentNonBlocking(roomRef, roomData, { merge: true });
    setIsAddDialogOpen(false);
    setNewRoom({
      roomNumber: "",
      roomType: "Standard",
      capacity: "",
      pricePerNight: "",
      floor: "",
    });
  };

  const handleUpdateRoom = () => {
    if (!editRoomData || !editRoomData.id) return;

    const roomRef = doc(firestore, 'rooms', editRoomData.id);
    updateDocumentNonBlocking(roomRef, {
      ...editRoomData,
      pricePerNight: editRoomData.pricePerNight === "" ? null : Number(editRoomData.pricePerNight),
      capacity: editRoomData.capacity === "" ? null : Number(editRoomData.capacity),
      floor: editRoomData.floor === "" ? null : Number(editRoomData.floor),
    });

    setIsEditDialogOpen(false);
    toast({
      title: "Room Updated",
      description: `Room ${editRoomData.roomNumber} has been updated successfully.`,
    });
  };

  const handleQuickBook = () => {
    if (!selectedRoom || !bookingData.guestName) return;

    const resRef = collection(firestore, 'reservations');
    const reservation = {
      roomId: selectedRoom.id,
      roomNumber: selectedRoom.roomNumber,
      guestName: bookingData.guestName,
      guestEmail: bookingData.guestEmail,
      guestPhone: bookingData.guestPhone,
      checkInDate: bookingData.checkIn,
      checkOutDate: bookingData.checkOut,
      numberOfGuests: bookingData.guests,
      totalAmount: selectedRoom.pricePerNight,
      status: "Confirmed",
      createdAt: new Date().toISOString()
    };

    addDocumentNonBlocking(resRef, reservation);
    
    // Update room status
    const roomRef = doc(firestore, 'rooms', selectedRoom.id);
    updateDocumentNonBlocking(roomRef, { status: "Occupied" });

    setIsBookingOpen(false);
    setBookingData({
      guestName: "",
      guestEmail: "",
      guestPhone: "",
      checkIn: new Date().toISOString().split('T')[0],
      checkOut: new Date(Date.now() + 86400000).toISOString().split('T')[0],
      guests: 1
    });

    toast({
      title: "Booking Confirmed",
      description: `Room ${selectedRoom.roomNumber} has been reserved for ${reservation.guestName}.`,
    });
  };

  const handleCheckOut = (room: any) => {
    const roomRef = doc(firestore, 'rooms', room.id);
    updateDocumentNonBlocking(roomRef, { status: "Available" });
    toast({
      title: "Check-out Complete",
      description: `Room ${room.roomNumber} is now available.`,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Available": return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
      case "Occupied": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "Maintenance": return "bg-rose-500/10 text-rose-600 border-rose-500/20";
      case "Cleaning": return "bg-blue-500/10 text-blue-600 border-blue-500/20";
      default: return "bg-slate-500/10 text-slate-600";
    }
  };

  const filteredRooms = rooms?.filter(room => 
    room.roomNumber.includes(searchTerm) || 
    room.roomType.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <Plus className="h-4 w-4" /> Add Room
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Register New Room</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="roomNumber" className="text-right text-xs">Number</Label>
                  <Input 
                    id="roomNumber" 
                    value={newRoom.roomNumber} 
                    onChange={(e) => setNewRoom({...newRoom, roomNumber: e.target.value})} 
                    className="col-span-3" 
                    placeholder="e.g. 101"
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right text-xs">Type</Label>
                  <Select 
                    value={newRoom.roomType} 
                    onValueChange={(val) => setNewRoom({...newRoom, roomType: val})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Deluxe">Deluxe</SelectItem>
                      <SelectItem value="Suite">Suite</SelectItem>
                      <SelectItem value="Penthouse">Penthouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="floor" className="text-right text-xs">Floor</Label>
                  <Input 
                    id="floor" 
                    type="number" 
                    value={newRoom.floor} 
                    onChange={(e) => setNewRoom({...newRoom, floor: e.target.value})} 
                    className="col-span-3"
                    placeholder=""
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right text-xs">Price</Label>
                  <div className="col-span-3 relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="price" 
                      type="number" 
                      value={newRoom.pricePerNight} 
                      onChange={(e) => setNewRoom({...newRoom, pricePerNight: e.target.value})} 
                      className="pl-9"
                      placeholder=""
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="capacity" className="text-right text-xs">Capacity</Label>
                  <div className="col-span-3 relative">
                    <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="capacity" 
                      type="number" 
                      value={newRoom.capacity} 
                      onChange={(e) => setNewRoom({...newRoom, capacity: e.target.value})} 
                      className="pl-9"
                      placeholder=""
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Cancel</Button>
                <Button onClick={handleAddRoom}>Create Room</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <main className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search room number or type..." 
                className="pl-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setSearchTerm("")}>Reset Search</Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground animate-pulse">Synchronizing room data...</p>
            </div>
          ) : filteredRooms?.length === 0 ? (
            <div className="text-center p-12 bg-muted/20 rounded-xl border-2 border-dashed">
              <Bed className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">No rooms found</h3>
              <p className="text-sm text-muted-foreground">Try adjusting your search or add a new room to the system.</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredRooms?.map((room) => (
                <Card key={room.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group">
                  <div className={`h-2 w-full ${room.status === 'Available' ? 'bg-emerald-500' : room.status === 'Occupied' ? 'bg-amber-500' : room.status === 'Maintenance' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-headline text-2xl">Room {room.roomNumber}</CardTitle>
                      <Badge variant="outline" className={`${getStatusColor(room.status)}`}>
                        {room.status}
                      </Badge>
                    </div>
                    <span className="text-sm text-muted-foreground">{room.roomType} • Floor {room.floor ?? 'N/A'}</span>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-primary">${room.pricePerNight ?? 0}</span>
                      <span className="text-xs text-muted-foreground">/ night</span>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/50 p-3 flex justify-end gap-2 group-hover:bg-muted transition-colors">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setEditRoomData({
                          ...room,
                          pricePerNight: room.pricePerNight ?? "",
                          capacity: room.capacity ?? "",
                          floor: room.floor ?? ""
                        });
                        setIsEditDialogOpen(true);
                      }}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedRoom(room);
                        setIsDetailsOpen(true);
                      }}
                    >
                      Details
                    </Button>
                    {room.status === 'Available' && (
                      <Button 
                        size="sm" 
                        className="bg-primary text-primary-foreground"
                        onClick={() => {
                          setSelectedRoom(room);
                          setIsBookingOpen(true);
                        }}
                      >
                        Book Now
                      </Button>
                    )}
                    {room.status === 'Occupied' && (
                      <Button 
                        variant="secondary" 
                        size="sm"
                        onClick={() => handleCheckOut(room)}
                      >
                        Check Out
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </main>

        {/* Edit Room Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Edit Room Details</DialogTitle>
              <DialogDescription>Update specifications for Room {editRoomData?.roomNumber}</DialogDescription>
            </DialogHeader>
            {editRoomData && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editRoomNumber" className="text-right text-xs">Number</Label>
                  <Input 
                    id="editRoomNumber" 
                    value={editRoomData.roomNumber} 
                    onChange={(e) => setEditRoomData({...editRoomData, roomNumber: e.target.value})} 
                    className="col-span-3" 
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editType" className="text-right text-xs">Type</Label>
                  <Select 
                    value={editRoomData.roomType} 
                    onValueChange={(val) => setEditRoomData({...editRoomData, roomType: val})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Deluxe">Deluxe</SelectItem>
                      <SelectItem value="Suite">Suite</SelectItem>
                      <SelectItem value="Penthouse">Penthouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editFloor" className="text-right text-xs">Floor</Label>
                  <Input 
                    id="editFloor" 
                    type="number" 
                    value={editRoomData.floor} 
                    onChange={(e) => setEditRoomData({...editRoomData, floor: e.target.value})} 
                    className="col-span-3"
                    placeholder=""
                  />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editPrice" className="text-right text-xs">Price</Label>
                  <div className="col-span-3 relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="editPrice" 
                      type="number" 
                      value={editRoomData.pricePerNight} 
                      onChange={(e) => setEditRoomData({...editRoomData, pricePerNight: e.target.value})} 
                      className="pl-9"
                      placeholder=""
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editCapacity" className="text-right text-xs">Capacity</Label>
                  <div className="col-span-3 relative">
                    <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="editCapacity" 
                      type="number" 
                      value={editRoomData.capacity} 
                      onChange={(e) => setEditRoomData({...editRoomData, capacity: e.target.value})} 
                      className="pl-9"
                      placeholder=""
                    />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="editStatus" className="text-right text-xs">Status</Label>
                  <Select 
                    value={editRoomData.status} 
                    onValueChange={(val) => setEditRoomData({...editRoomData, status: val})}
                  >
                    <SelectTrigger className="col-span-3">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="Occupied">Occupied</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Cleaning">Cleaning</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancel</Button>
              <Button onClick={handleUpdateRoom}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Room Details Dialog */}
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" /> Room {selectedRoom?.roomNumber} Specifications
              </DialogTitle>
            </DialogHeader>
            {selectedRoom && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Room Type</span>
                    <p className="font-semibold">{selectedRoom.roomType}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Nightly Rate</span>
                    <p className="font-semibold text-primary">${selectedRoom.pricePerNight ?? 0}</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Capacity</span>
                    <p className="font-semibold">{selectedRoom.capacity ?? 'N/A'} Guests</p>
                  </div>
                  <div className="p-3 bg-muted rounded-lg space-y-1">
                    <span className="text-[10px] uppercase text-muted-foreground font-bold">Location</span>
                    <p className="font-semibold">Floor {selectedRoom.floor ?? 'N/A'}</p>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="text-sm font-bold flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Standard Amenities</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoom.amenities?.map((amenity: string) => (
                      <Badge key={amenity} variant="secondary" className="font-normal">{amenity}</Badge>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Current Status</span>
                    <Badge variant="outline" className={getStatusColor(selectedRoom.status)}>{selectedRoom.status}</Badge>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => {
                      setEditRoomData({
                        ...selectedRoom,
                        pricePerNight: selectedRoom.pricePerNight ?? "",
                        capacity: selectedRoom.capacity ?? "",
                        floor: selectedRoom.floor ?? ""
                      });
                      setIsDetailsOpen(false);
                      setIsEditDialogOpen(true);
                    }}>Edit Room</Button>
                    {selectedRoom.status === 'Available' && (
                      <Button onClick={() => {
                        setIsDetailsOpen(false);
                        setIsBookingOpen(true);
                      }}>Proceed to Booking</Button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Quick Booking Dialog */}
        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Quick Reservation</DialogTitle>
              <DialogDescription>Book Room {selectedRoom?.roomNumber} instantly for a guest.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="guestName">Guest Name</Label>
                <Input 
                  id="guestName" 
                  placeholder="Full name of primary guest"
                  value={bookingData.guestName}
                  onChange={(e) => setBookingData({...bookingData, guestName: e.target.value})}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guestEmail">Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="guestEmail" 
                      type="email"
                      className="pl-9"
                      placeholder="guest@example.com"
                      value={bookingData.guestEmail}
                      onChange={(e) => setBookingData({...bookingData, guestEmail: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="guestPhone">WhatsApp / Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="guestPhone" 
                      className="pl-9"
                      placeholder="e.g. 243980453935"
                      value={bookingData.guestPhone}
                      onChange={(e) => setBookingData({...bookingData, guestPhone: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="checkIn">Check-In</Label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="checkIn" 
                      type="date" 
                      className="pl-9"
                      value={bookingData.checkIn}
                      onChange={(e) => setBookingData({...bookingData, checkIn: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="checkOut">Check-Out</Label>
                  <div className="relative">
                    <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="checkOut" 
                      type="date" 
                      className="pl-9"
                      value={bookingData.checkOut}
                      onChange={(e) => setBookingData({...bookingData, checkOut: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="numGuests">Number of Guests</Label>
                <Select 
                  value={bookingData.guests.toString()} 
                  onValueChange={(val) => setBookingData({...bookingData, guests: parseInt(val)})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select guests" />
                  </SelectTrigger>
                  <SelectContent>
                    {[...Array(selectedRoom?.capacity || 4)].map((_, i) => (
                      <SelectItem key={i+1} value={(i+1).toString()}>{i+1} {i === 0 ? 'Guest' : 'Guests'}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-4 bg-primary/5 rounded-lg border border-primary/10 flex justify-between items-center">
                <span className="text-sm font-medium">Estimated Total</span>
                <span className="text-lg font-bold text-primary">${selectedRoom?.pricePerNight ?? 0}</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBookingOpen(false)}>Cancel</Button>
              <Button onClick={handleQuickBook} disabled={!bookingData.guestName}>Confirm Booking</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </SidebarInset>
    </div>
  );
}
