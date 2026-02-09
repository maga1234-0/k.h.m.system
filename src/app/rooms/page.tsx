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
  Edit2,
  LayoutGrid,
  CheckCircle2,
  Clock,
  Wrench
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
    capacity: "2",
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
      pricePerNight: Number(newRoom.pricePerNight) || 0,
      capacity: Number(newRoom.capacity) || 1,
      floor: Number(newRoom.floor) || 0,
    };

    setDocumentNonBlocking(roomRef, roomData, { merge: true });
    setIsAddDialogOpen(false);
    setNewRoom({
      roomNumber: "",
      roomType: "Standard",
      capacity: "2",
      pricePerNight: "",
      floor: "",
    });
    toast({
      title: "Chambre Ajoutée",
      description: `La chambre ${roomData.roomNumber} a été créée avec succès.`,
    });
  };

  const handleUpdateRoom = () => {
    if (!editRoomData || !editRoomData.id) return;

    const roomRef = doc(firestore, 'rooms', editRoomData.id);
    updateDocumentNonBlocking(roomRef, {
      ...editRoomData,
      pricePerNight: Number(editRoomData.pricePerNight),
      capacity: Number(editRoomData.capacity),
      floor: Number(editRoomData.floor),
    });

    setIsEditDialogOpen(false);
    toast({
      title: "Mise à jour réussie",
      description: `Les informations de la chambre ${editRoomData.roomNumber} ont été modifiées.`,
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
      totalAmount: selectedRoom.pricePerNight || 0,
      status: "Confirmed",
      createdAt: new Date().toISOString()
    };

    addDocumentNonBlocking(resRef, reservation);
    
    const roomRef = doc(firestore, 'rooms', selectedRoom.id);
    updateDocumentNonBlocking(roomRef, { status: "Occupied" });

    setIsBookingOpen(false);
    toast({
      title: "Réservation Confirmée",
      description: `Chambre ${selectedRoom.roomNumber} réservée pour ${reservation.guestName}.`,
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Available": return <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 gap-1"><CheckCircle2 className="h-3 w-3" /> Disponible</Badge>;
      case "Occupied": return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20 gap-1"><Bed className="h-3 w-3" /> Occupée</Badge>;
      case "Maintenance": return <Badge variant="outline" className="bg-rose-500/10 text-rose-600 border-rose-500/20 gap-1"><Wrench className="h-3 w-3" /> Maintenance</Badge>;
      case "Cleaning": return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/20 gap-1"><Clock className="h-3 w-3" /> Nettoyage</Badge>;
      default: return <Badge variant="outline">{status}</Badge>;
    }
  };

  const filteredRooms = rooms?.filter(room => 
    room.roomNumber.includes(searchTerm) || 
    room.roomType.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Gestion des Chambres</h1>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <Plus className="h-4 w-4" /> Ajouter une chambre
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Nouvelle Chambre</DialogTitle>
                <DialogDescription>Définissez les caractéristiques de la chambre.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="roomNumber" className="text-right">Numéro</Label>
                  <Input id="roomNumber" value={newRoom.roomNumber} onChange={(e) => setNewRoom({...newRoom, roomNumber: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="type" className="text-right">Type</Label>
                  <Select value={newRoom.roomType} onValueChange={(val) => setNewRoom({...newRoom, roomType: val})}>
                    <SelectTrigger className="col-span-3"><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Deluxe">Deluxe</SelectItem>
                      <SelectItem value="Suite">Suite</SelectItem>
                      <SelectItem value="Penthouse">Penthouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="floor" className="text-right">Étage</Label>
                  <Input id="floor" type="number" value={newRoom.floor} onChange={(e) => setNewRoom({...newRoom, floor: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="price" className="text-right">Prix ($)</Label>
                  <Input id="price" type="number" value={newRoom.pricePerNight} onChange={(e) => setNewRoom({...newRoom, pricePerNight: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor="capacity" className="text-right">Capacité</Label>
                  <Input id="capacity" type="number" value={newRoom.capacity} onChange={(e) => setNewRoom({...newRoom, capacity: e.target.value})} className="col-span-3" />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleAddRoom}>Créer la chambre</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <main className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher par numéro ou type..." 
                className="pl-9" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-muted-foreground mt-2">Accès à l'inventaire...</p>
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredRooms?.map((room) => (
                <Card key={room.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-shadow group">
                  <div className={`h-1.5 w-full ${room.status === 'Available' ? 'bg-emerald-500' : room.status === 'Occupied' ? 'bg-amber-500' : room.status === 'Maintenance' ? 'bg-rose-500' : 'bg-blue-500'}`} />
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start">
                      <CardTitle className="font-headline text-xl">Chambre {room.roomNumber}</CardTitle>
                      {getStatusBadge(room.status)}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{room.roomType} • Étage {room.floor}</p>
                  </CardHeader>
                  <CardContent className="px-4 pb-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-bold text-primary">{room.pricePerNight} $</span>
                      <span className="text-[10px] text-muted-foreground">/ nuit</span>
                    </div>
                  </CardContent>
                  <CardFooter className="bg-muted/30 p-2 flex justify-end gap-2">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditRoomData({...room}); setIsEditDialogOpen(true); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="sm" className="h-8 text-xs" onClick={() => { setSelectedRoom(room); setIsDetailsOpen(true); }}>
                      Détails
                    </Button>
                    {room.status === 'Available' && (
                      <Button size="sm" className="h-8 text-xs" onClick={() => { setSelectedRoom(room); setIsBookingOpen(true); }}>
                        Réserver
                      </Button>
                    )}
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </main>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Modifier la Chambre {editRoomData?.roomNumber}</DialogTitle>
              <DialogDescription>Mettez à jour les informations de la chambre.</DialogDescription>
            </DialogHeader>
            {editRoomData && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Numéro</Label>
                  <Input value={editRoomData.roomNumber} onChange={(e) => setEditRoomData({...editRoomData, roomNumber: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Type</Label>
                  <Select value={editRoomData.roomType} onValueChange={(val) => setEditRoomData({...editRoomData, roomType: val})}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Deluxe">Deluxe</SelectItem>
                      <SelectItem value="Suite">Suite</SelectItem>
                      <SelectItem value="Penthouse">Penthouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Statut</Label>
                  <Select value={editRoomData.status} onValueChange={(val) => setEditRoomData({...editRoomData, status: val})}>
                    <SelectTrigger className="col-span-3"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Disponible</SelectItem>
                      <SelectItem value="Occupied">Occupée</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                      <SelectItem value="Cleaning">Nettoyage</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Prix</Label>
                  <Input type="number" value={editRoomData.pricePerNight} onChange={(e) => setEditRoomData({...editRoomData, pricePerNight: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Étage</Label>
                  <Input type="number" value={editRoomData.floor} onChange={(e) => setEditRoomData({...editRoomData, floor: e.target.value})} className="col-span-3" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                  <Label className="text-right">Capacité</Label>
                  <Input type="number" value={editRoomData.capacity} onChange={(e) => setEditRoomData({...editRoomData, capacity: e.target.value})} className="col-span-3" />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleUpdateRoom}>Enregistrer les modifications</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Détails de la Chambre {selectedRoom?.roomNumber}</DialogTitle>
            </DialogHeader>
            {selectedRoom && (
              <div className="space-y-4 py-4">
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Type</span>
                  <span className="text-sm font-bold">{selectedRoom.roomType}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Statut Actuel</span>
                  <span>{getStatusBadge(selectedRoom.status)}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Prix par nuit</span>
                  <span className="text-sm font-bold">{selectedRoom.pricePerNight} $</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Localisation</span>
                  <span className="text-sm font-bold">Étage {selectedRoom.floor}</span>
                </div>
                <div className="flex justify-between border-b pb-2">
                  <span className="text-sm text-muted-foreground font-medium uppercase tracking-wider">Capacité d'accueil</span>
                  <div className="flex items-center gap-1">
                    <UsersIcon className="h-4 w-4 text-primary" />
                    <span className="text-sm font-bold">{selectedRoom.capacity} Personne(s)</span>
                  </div>
                </div>
                <div className="space-y-2 pt-2">
                  <span className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">Équipements</span>
                  <div className="flex flex-wrap gap-2">
                    {selectedRoom.amenities?.map((a: string) => (
                      <Badge key={a} variant="secondary" className="text-[10px]">{a}</Badge>
                    ))}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button className="w-full" onClick={() => setIsDetailsOpen(false)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Réservation Rapide</DialogTitle>
              <DialogDescription>Enregistrez un séjour pour la chambre {selectedRoom?.roomNumber}.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <Label>Nom du voyageur</Label>
                <Input value={bookingData.guestName} onChange={(e) => setBookingData({...bookingData, guestName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Arrivée</Label>
                  <Input type="date" value={bookingData.checkIn} onChange={(e) => setBookingData({...bookingData, checkIn: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Départ</Label>
                  <Input type="date" value={bookingData.checkOut} onChange={(e) => setBookingData({...bookingData, checkOut: e.target.value})} />
                </div>
              </div>
              <div className="p-3 bg-primary/5 rounded-lg border border-primary/10 flex justify-between items-center">
                <span className="text-sm font-medium">Total Estimé</span>
                <span className="text-xl font-bold text-primary">{selectedRoom?.pricePerNight} $</span>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBookingOpen(false)}>Annuler</Button>
              <Button onClick={handleQuickBook} disabled={!bookingData.guestName}>Confirmer la réservation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </div>
  );
}
