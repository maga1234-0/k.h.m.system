
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
  Filter, 
  Search, 
  Loader2, 
  Bed, 
  Users as UsersIcon,
  DollarSign
} from "lucide-react";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  setDocumentNonBlocking 
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

export default function RoomsPage() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [newRoom, setNewRoom] = useState({
    roomNumber: "",
    roomType: "Standard",
    capacity: 2,
    pricePerNight: 100,
    floor: 1,
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
      pricePerNight: Number(newRoom.pricePerNight),
      capacity: Number(newRoom.capacity),
      floor: Number(newRoom.floor),
    };

    setDocumentNonBlocking(roomRef, roomData, { merge: true });
    setIsAddDialogOpen(false);
    setNewRoom({
      roomNumber: "",
      roomType: "Standard",
      capacity: 2,
      pricePerNight: 100,
      floor: 1,
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
                    onChange={(e) => setNewRoom({...newRoom, floor: parseInt(e.target.value) || 1})} 
                    className="col-span-3"
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
                      onChange={(e) => setNewRoom({...newRoom, pricePerNight: parseInt(e.target.value) || 0})} 
                      className="pl-9"
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
                      onChange={(e) => setNewRoom({...newRoom, capacity: parseInt(e.target.value) || 1})} 
                      className="pl-9"
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
              <Button variant="outline" className="gap-2">
                <Filter className="h-4 w-4" /> Filters
              </Button>
              <Button variant="ghost" onClick={() => setSearchTerm("")}>Reset</Button>
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
                    <span className="text-sm text-muted-foreground">{room.roomType} • Floor {room.floor}</span>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-primary">${room.pricePerNight}</span>
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
          )}
        </main>
      </SidebarInset>
    </div>
  );
}
