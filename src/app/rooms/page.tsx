
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
      amenities: ["Wi-Fi", "TV", "Climatisation"],
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
      title: "Chambre Mise à Jour",
      description: `La chambre ${editRoomData.roomNumber} a été mise à jour avec succès.`,
    });
  };

  const handleQuickBook = () => {
    if (!selectedRoom || !bookingData.guestName) return;

    if (selectedRoom.status !== 'Available') {
      toast({
        variant: "destructive",
        title: "Réservation Restreinte",
        description: `La chambre ${selectedRoom.roomNumber} est actuellement en statut ${selectedRoom.status} et ne peut pas être réservée.`,
      });
      setIsBookingOpen(false);
      return;
    }

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
      totalAmount: selectedRoom.pricePerNight || 0,
      status: "Confirmed",
      createdAt: new Date().toISOString()
    };

    addDocumentNonBlocking(resRef, reservation);
    
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
      title: "Réservation Confirmée",
      description: `Chambre ${selectedRoom.roomNumber} réservée pour ${reservation.guestName}.`,
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

  const translateStatus = (status: string) => {
    switch (status) {
      case "Available": return "Disponible";
      case "Occupied": return "Occupée";
      case "Maintenance": return "Maintenance";
      case "Cleaning": return "Nettoyage";
      default: return status;
    }
  }

  const filteredRooms = rooms?.filter(room => 
    room.roomNumber.includes(searchTerm) || 
    room.roomType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto">
        <header className="flex h-16 items-center border-b px-4 md:px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-2 md:mx-4 h-6" />
            <h1 className="font-headline font-semibold text-lg md:text-xl">Chambres</h1>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1 md:gap-2">
                <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Ajouter une chambre</span><span className="sm:hidden">Ajouter</span>
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] max-w-[95vw] rounded-lg">
              <DialogHeader>
                <DialogTitle>Enregistrer une nouvelle chambre</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="roomNumber" className="text-right text-xs">Numéro</Label>
                  <Input id="roomNumber" value={newRoom.roomNumber} onChange={(e) => setNewRoom({...newRoom, roomNumber: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right text-xs">Type</Label>
                  <Select value={newRoom.roomType} onValueChange={(val) => setNewRoom({...newRoom, roomType: val})}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Deluxe">Deluxe</SelectItem>
                      <SelectItem value="Suite">Suite</SelectItem>
                      <SelectItem value="Penthouse">Penthouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="floor" className="text-right text-xs">Étage</Label>
                  <Input id="floor" type="number" value={newRoom.floor} onChange={(e) => setNewRoom({...newRoom, floor: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right text-xs">Prix</Label>
                  <div className="col-span-3 relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="price" type="number" value={newRoom.pricePerNight} onChange={(e) => setNewRoom({...newRoom, pricePerNight: e.target.value})} className="pl-9" />
                  </div>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="capacity" className="text-right text-xs">Capacité</Label>
                  <div className="col-span-3 relative">
                    <UsersIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input id="capacity" type="number" value={newRoom.capacity} onChange={(e) => setNewRoom({...newRoom, capacity: e.target.value})} className="pl-9" />
                  </div>
                </div>
              </div>
              <DialogFooter className="flex-row gap-2">
                <Button variant="outline" className="flex-1" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
                <Button className="flex-1" onClick={handleAddRoom}>Créer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <main className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher des chambres..." 
                className="pl-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            {searchTerm && (
              <Button variant="ghost" className="w-full md:w-auto" onClick={() => setSearchTerm("")}>Effacer</Button>
            )}
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground text-sm">Synchronisation des données...</p>
            </div>
          ) : filteredRooms?.length === 0 ? (
            <div className="text-center p-12 bg-muted/20 rounded-xl border-2 border-dashed">
              <Bed className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold">Aucune chambre trouvée</h3>
              <p className="text-sm text-muted-foreground">Ajustez votre recherche ou ajoutez une chambre.</p>
            </div>
          ) : (
            <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredRooms?.map((room) => (
                <Card key={room.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group">
                  <div className={`h-1.5 w-full ${room.status === 'Available' ? 'bg-emerald-500' : room.status === 'Occupied' ? 'bg-amber-500' : room.status === 'Maintenance' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                  <CardHeader className="p-4 pb-2">
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-headline text-xl">Chambre {room.roomNumber}</CardTitle>
                      <Badge variant="outline" className={`${getStatusColor(room.status)} text-[10px] px-1.5 h-5`}>
                        {translateStatus(room.status)}
                      </Badge>
                    </div>
                    <span className="text-xs text-muted-foreground">{room.roomType} • Étage {room.floor ?? 'N/A'}</span>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 pb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-xl font-bold text-primary">{room.pricePerNight ?? 0} $</span>
                      <span className="text-[10px] text-muted-foreground">/ nuit</span>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/50 p-2 flex justify-end gap-1.5">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditRoomData({...room}); setIsEditDialogOpen(true); }}>
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setSelectedRoom(room); setIsDetailsOpen(true); }}>Détails</Button>
                    {room.status === 'Available' && (
                      <Button size="sm" className="h-8 text-xs bg-primary" onClick={() => { setSelectedRoom(room); setIsBookingOpen(true); }}>Réserver</Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </main>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px] max-w-[95vw] rounded-lg">
            <DialogHeader><DialogTitle>Modifier la chambre</DialogTitle></DialogHeader>
            {editRoomData && (
              <div className="grid gap-4 py-4 max-h-[70vh] overflow-y-auto px-1">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-xs">Numéro</Label>
                  <Input value={editRoomData.roomNumber} onChange={(e) => setEditRoomData({...editRoomData, roomNumber: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-xs">Type</Label>
                  <Select value={editRoomData.roomType} onValueChange={(val) => setEditRoomData({...editRoomData, roomType: val})}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Sélectionner" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Deluxe">Deluxe</SelectItem>
                      <SelectItem value="Suite">Suite</SelectItem>
                      <SelectItem value="Penthouse">Penthouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-xs">Étage</Label>
                  <Input type="number" value={editRoomData.floor} onChange={(e) => setEditRoomData({...editRoomData, floor: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-xs">Prix</Label>
                  <Input type="number" value={editRoomData.pricePerNight} onChange={(e) => setEditRoomData({...editRoomData, pricePerNight: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right text-xs">Capacité</Label>
                  <Input type="number" value={editRoomData.capacity} onChange={(e) => setEditRoomData({...editRoomData, capacity: e.target.value})} className="col-span-3" />
                </div>
              </div>
            )}
            <DialogFooter className="flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
              <Button className="flex-1" onClick={handleUpdateRoom}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogContent className="sm:max-w-[425px] max-w-[95vw] rounded-lg">
            <DialogHeader><DialogTitle>Réservation Rapide</DialogTitle></DialogHeader>
            <div className="grid gap-3 py-4 max-h-[70vh] overflow-y-auto px-1">
              <div className="space-y-1">
                <Label>Nom du client</Label>
                <Input value={bookingData.guestName} onChange={(e) => setBookingData({...bookingData, guestName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1"><Label>Arrivée</Label><Input type="date" value={bookingData.checkIn} onChange={(e) => setBookingData({...bookingData, checkIn: e.target.value})} /></div>
                <div className="space-y-1"><Label>Départ</Label><Input type="date" value={bookingData.checkOut} onChange={(e) => setBookingData({...bookingData, checkOut: e.target.value})} /></div>
              </div>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 flex justify-between items-center mt-2">
                <span className="text-xs font-medium">Total Estimé</span>
                <span className="text-lg font-bold text-primary">{selectedRoom?.pricePerNight ?? 0} $</span>
              </div>
            </div>
            <DialogFooter className="flex-row gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setIsBookingOpen(false)}>Annuler</Button>
              <Button className="flex-1" onClick={handleQuickBook} disabled={!bookingData.guestName}>Confirmer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </div>
  );
}
