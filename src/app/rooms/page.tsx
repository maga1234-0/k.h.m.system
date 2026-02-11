
'use client';

import { useState, useEffect } from 'react';
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
  Edit2,
  Trash2,
  CheckCircle2,
  Clock,
  Wrench,
  CalendarCheck
} from "lucide-react";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking,
  addDocumentNonBlocking,
  useUser
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
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
import { toast } from "@/hooks/use-toast";
import { useRouter } from 'next/navigation';

export default function RoomsPage() {
  const { user, isUserLoading } = useUser();
  const router = useRouter();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  
  const [selectedRoom, setSelectedRoom] = useState<any>(null);
  const [editRoomData, setEditRoomData] = useState<any>(null);
  const [roomToDelete, setRoomToDelete] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [newRoom, setNewRoom] = useState<any>({
    roomNumber: "",
    roomType: "Standard",
    capacity: "2",
    pricePerNight: "",
    floor: "1",
    amenities: "",
  });

  const [bookingForm, setBookingForm] = useState({
    guestName: "",
    guestPhone: "",
    checkInDate: "",
    checkOutDate: "",
    totalAmount: ""
  });

  const firestore = useFirestore();
  const roomsCollection = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  const { data: rooms, isLoading } = useCollection(roomsCollection);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  // Automatic Price Calculation for quick booking
  useEffect(() => {
    if (selectedRoom && bookingForm.checkInDate && bookingForm.checkOutDate) {
      const start = new Date(bookingForm.checkInDate);
      const end = new Date(bookingForm.checkOutDate);
      if (end > start) {
        const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        const total = nights * (Number(selectedRoom.pricePerNight) || 0);
        setBookingForm(prev => ({ ...prev, totalAmount: total.toString() }));
      }
    }
  }, [bookingForm.checkInDate, bookingForm.checkOutDate, selectedRoom]);

  const handleAddRoom = () => {
    if (!newRoom.roomNumber || !roomsCollection) return;
    const roomId = doc(roomsCollection).id;
    const roomRef = doc(firestore, 'rooms', roomId);
    const amenitiesArray = newRoom.amenities ? newRoom.amenities.split(',').map((a: string) => a.trim()).filter((a: string) => a !== "") : [];
    const roomData = { ...newRoom, id: roomId, status: "Available", amenities: amenitiesArray, pricePerNight: Number(newRoom.pricePerNight) || 0, capacity: Number(newRoom.capacity) || 1, floor: Number(newRoom.floor) || 0 };
    setDocumentNonBlocking(roomRef, roomData, { merge: true });
    setIsAddDialogOpen(false);
    setNewRoom({ roomNumber: "", roomType: "Standard", capacity: "2", pricePerNight: "", floor: "1", amenities: "" });
    toast({ title: "Chambre Créée", description: `La chambre ${roomData.roomNumber} est disponible.` });
  };

  const handleUpdateRoom = () => {
    if (!editRoomData || !editRoomData.id) return;
    const amenitiesArray = editRoomData.amenitiesString ? editRoomData.amenitiesString.split(',').map((a: string) => a.trim()).filter((a: string) => a !== "") : [];
    const { amenitiesString, ...dataToSave } = editRoomData;
    const roomRef = doc(firestore, 'rooms', editRoomData.id);
    updateDocumentNonBlocking(roomRef, { ...dataToSave, amenities: amenitiesArray });
    setIsEditDialogOpen(false);
    toast({ title: "Modifiée", description: `Chambre ${editRoomData.roomNumber} mise à jour.` });
  };

  const handleDeleteRoom = () => {
    if (!roomToDelete) return;
    deleteDocumentNonBlocking(doc(firestore, 'rooms', roomToDelete.id));
    setIsDeleteDialogOpen(false);
    setRoomToDelete(null);
    toast({ variant: "destructive", title: "Supprimée", description: "Chambre retirée de l'inventaire." });
  };

  const handleConfirmBooking = () => {
    if (!selectedRoom || !bookingForm.guestName || !bookingForm.checkInDate) return;

    const resCol = collection(firestore, 'reservations');
    const reservationData = {
      guestName: bookingForm.guestName,
      guestPhone: bookingForm.guestPhone,
      roomId: selectedRoom.id,
      roomNumber: selectedRoom.roomNumber,
      checkInDate: bookingForm.checkInDate,
      checkOutDate: bookingForm.checkOutDate,
      totalAmount: Number(bookingForm.totalAmount) || 0,
      status: "Confirmée",
      createdAt: new Date().toISOString()
    };

    addDocumentNonBlocking(resCol, reservationData);
    updateDocumentNonBlocking(doc(firestore, 'rooms', selectedRoom.id), { status: "Occupied" });

    setIsBookingOpen(false);
    setBookingForm({ guestName: "", guestPhone: "", checkInDate: "", checkOutDate: "", totalAmount: "" });
    toast({ title: "Réservation effectuée", description: `La chambre ${selectedRoom.roomNumber} est maintenant Occupée.` });
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

  const filteredRooms = rooms?.filter(room => room.roomNumber.includes(searchTerm) || room.roomType.toLowerCase().includes(searchTerm.toLowerCase()));

  if (isUserLoading) return <div className="flex h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin" /></div>;

  return (
    <div className="flex h-screen w-full animate-in fade-in duration-500">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Gestion des Chambres</h1>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary gap-2 transition-transform hover:scale-105">
            <Plus className="h-4 w-4" /> Ajouter une chambre
          </Button>
        </header>

        <main className="p-6">
          <div className="relative mb-6 animate-in slide-in-from-top-2 duration-500">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Rechercher par numéro ou type..." className="pl-9 bg-background max-w-md" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" /> Accès à l'inventaire...
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredRooms?.map((room, idx) => (
                <Card key={room.id} className="overflow-hidden border-none shadow-sm hover:shadow-md transition-all hover:scale-[1.02] animate-in fade-in duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
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
                    {room.status === 'Available' && (
                      <Button variant="default" size="sm" className="h-8 text-[10px] font-bold uppercase gap-1" onClick={() => { setSelectedRoom(room); setIsBookingOpen(true); }}>
                        <CalendarCheck className="h-3 w-3" /> Réserver
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => { setRoomToDelete(room); setIsDeleteDialogOpen(true); }}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditRoomData({...room, amenitiesString: room.amenities?.join(', ') || ""}); setIsEditDialogOpen(true); }}>
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button variant="secondary" size="sm" className="h-8 text-[10px] font-bold uppercase" onClick={() => { setSelectedRoom(room); setIsDetailsOpen(true); }}>
                      Détails
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          )}
        </main>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[425px] animate-in zoom-in-95">
            <DialogHeader>
              <DialogTitle>Nouvelle Chambre</DialogTitle>
              <DialogDescription>Ajouter une nouvelle chambre à l'inventaire.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>N° Chambre</Label>
                  <Input value={newRoom.roomNumber} onChange={(e) => setNewRoom({...newRoom, roomNumber: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Type</Label>
                  <Select value={newRoom.roomType} onValueChange={(val) => setNewRoom({...newRoom, roomType: val})}>
                    <SelectTrigger><SelectValue placeholder="Type" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Standard">Standard</SelectItem>
                      <SelectItem value="Deluxe">Deluxe</SelectItem>
                      <SelectItem value="Suite">Suite</SelectItem>
                      <SelectItem value="Penthouse">Penthouse</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Prix / Nuit ($)</Label>
                  <Input type="number" value={newRoom.pricePerNight} onChange={(e) => setNewRoom({...newRoom, pricePerNight: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Étage</Label>
                  <Input type="number" value={newRoom.floor} onChange={(e) => setNewRoom({...newRoom, floor: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Équipements (séparés par virgule)</Label>
                <Input value={newRoom.amenities} placeholder="TV, WiFi, Balcon..." onChange={(e) => setNewRoom({...newRoom, amenities: e.target.value})} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleAddRoom}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isBookingOpen} onOpenChange={setIsBookingOpen}>
          <DialogContent className="sm:max-w-[425px] animate-in zoom-in-95">
            <DialogHeader>
              <DialogTitle>Réservation Rapide</DialogTitle>
              <DialogDescription>Chambre {selectedRoom?.roomNumber} - {selectedRoom?.roomType}</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-1">
                <Label>Nom du Client</Label>
                <Input value={bookingForm.guestName} onChange={(e) => setBookingForm({...bookingForm, guestName: e.target.value})} />
              </div>
              <div className="space-y-1">
                <Label>Téléphone</Label>
                <Input value={bookingForm.guestPhone} onChange={(e) => setBookingForm({...bookingForm, guestPhone: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label>Arrivée</Label>
                  <Input type="date" value={bookingForm.checkInDate} onChange={(e) => setBookingForm({...bookingForm, checkInDate: e.target.value})} />
                </div>
                <div className="space-y-1">
                  <Label>Départ</Label>
                  <Input type="date" value={bookingForm.checkOutDate} onChange={(e) => setBookingForm({...bookingForm, checkOutDate: e.target.value})} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Montant Total Automatique ($)</Label>
                <Input type="number" value={bookingForm.totalAmount} readOnly className="bg-muted font-bold" />
                <p className="text-[10px] text-muted-foreground">Calculé sur la base de {selectedRoom?.pricePerNight} $/nuit.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsBookingOpen(false)}>Annuler</Button>
              <Button onClick={handleConfirmBooking}>Confirmer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[425px] animate-in zoom-in-95">
            <DialogHeader>
              <DialogTitle>Modifier Chambre</DialogTitle>
              <DialogDescription>Mettre à jour les informations.</DialogDescription>
            </DialogHeader>
            {editRoomData && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>N° Chambre</Label>
                    <Input value={editRoomData.roomNumber} onChange={(e) => setEditRoomData({...editRoomData, roomNumber: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label>Type</Label>
                    <Select value={editRoomData.roomType} onValueChange={(val) => setEditRoomData({...editRoomData, roomType: val})}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Standard">Standard</SelectItem>
                        <SelectItem value="Deluxe">Deluxe</SelectItem>
                        <SelectItem value="Suite">Suite</SelectItem>
                        <SelectItem value="Penthouse">Penthouse</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label>Prix / Nuit ($)</Label>
                    <Input type="number" value={editRoomData.pricePerNight} onChange={(e) => setEditRoomData({...editRoomData, pricePerNight: e.target.value})} />
                  </div>
                  <div className="space-y-1">
                    <Label>Étage</Label>
                    <Input type="number" value={editRoomData.floor} onChange={(e) => setEditRoomData({...editRoomData, floor: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Équipements</Label>
                  <Input value={editRoomData.amenitiesString} onChange={(e) => setEditRoomData({...editRoomData, amenitiesString: e.target.value})} />
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleUpdateRoom}>Sauvegarder</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </div>
  );
}
