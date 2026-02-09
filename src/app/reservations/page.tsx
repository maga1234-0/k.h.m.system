
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
  Plus, 
  Loader2,
  User,
  CreditCard,
  MoreHorizontal,
  CheckCircle,
  LogOut,
  XCircle,
  Trash2,
  CalendarDays
} from "lucide-react";
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
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking,
  useUser 
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

type ActiveDialog = 'details' | 'cancel' | 'delete' | null;

export default function ReservationsPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  
  const [selectedRes, setSelectedRes] = useState<any>(null);
  const [activeDialog, setActiveDialog] = useState<ActiveDialog>(null);
  
  const [bookingForm, setBookingForm] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    roomId: "",
    checkInDate: "",
    checkOutDate: "",
    numberOfGuests: 1,
    totalAmount: ""
  });

  const firestore = useFirestore();
  const resCollection = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  const roomsCollection = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  
  const { data: reservations, isLoading: isResLoading } = useCollection(resCollection);
  const { data: rooms } = useCollection(roomsCollection);

  useEffect(() => {
    setMounted(true);
    if (!isAuthLoading && !user) router.push('/login');
  }, [user, isAuthLoading, router]);

  const handleOpenActionDialog = (res: any, type: ActiveDialog) => {
    setSelectedRes(res);
    // On laisse un tick pour permettre au dropdown de se fermer et éviter le conflit de focus
    setTimeout(() => {
      setActiveDialog(type);
    }, 100);
  };

  const handleSaveBooking = () => {
    if (!bookingForm.guestName || !bookingForm.roomId || !resCollection) {
      toast({ variant: "destructive", title: "Données manquantes", description: "Veuillez remplir les informations obligatoires." });
      return;
    }
    
    const selectedRoom = rooms?.find(r => r.id === bookingForm.roomId);
    if (!selectedRoom) return;

    const reservationData = { 
      ...bookingForm, 
      roomNumber: selectedRoom.roomNumber, 
      status: "Confirmée", 
      totalAmount: Number(bookingForm.totalAmount) || 0,
      createdAt: new Date().toISOString() 
    };

    addDocumentNonBlocking(resCollection, reservationData);
    updateDocumentNonBlocking(doc(firestore, 'rooms', bookingForm.roomId), { status: "Occupied" });
    
    setIsAddDialogOpen(false);
    setBookingForm({ guestName: "", guestEmail: "", guestPhone: "", roomId: "", checkInDate: "", checkOutDate: "", numberOfGuests: 1, totalAmount: "" });
    toast({ title: "Réservation Enregistrée", description: `Dossier de ${reservationData.guestName} créé.` });
  };

  const handleCheckIn = (res: any) => {
    const resRef = doc(firestore, 'reservations', res.id);
    updateDocumentNonBlocking(resRef, { status: "Checked In" });
    
    const roomRef = doc(firestore, 'rooms', res.roomId);
    updateDocumentNonBlocking(roomRef, { status: "Occupied" });

    const invCol = collection(firestore, 'invoices');
    addDocumentNonBlocking(invCol, {
      reservationId: res.id,
      guestName: res.guestName,
      guestPhone: res.guestPhone,
      amountDue: res.totalAmount,
      amountPaid: 0,
      status: 'Unpaid',
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000).toISOString()
    });

    setActiveDialog(null);
    toast({ title: "Check-in Effectué", description: `${res.guestName} est maintenant enregistré.` });
  };

  const handleCheckOut = (res: any) => {
    const resRef = doc(firestore, 'reservations', res.id);
    updateDocumentNonBlocking(resRef, { status: "Checked Out" });
    
    const roomRef = doc(firestore, 'rooms', res.roomId);
    updateDocumentNonBlocking(roomRef, { status: "Cleaning" });

    setActiveDialog(null);
    toast({ title: "Check-out Effectué", description: `La chambre ${res.roomNumber} est en cours de nettoyage.` });
  };

  const handleCancelRes = (res: any) => {
    const resRef = doc(firestore, 'reservations', res.id);
    updateDocumentNonBlocking(resRef, { status: "Cancelled" });
    
    const roomRef = doc(firestore, 'rooms', res.roomId);
    updateDocumentNonBlocking(roomRef, { status: "Available" });

    setActiveDialog(null);
    toast({ variant: "destructive", title: "Réservation Annulée", description: "La chambre a été libérée." });
  };

  const handleDeleteRes = (res: any) => {
    const resRef = doc(firestore, 'reservations', res.id);
    deleteDocumentNonBlocking(resRef);
    
    if (res.status !== 'Checked Out' && res.status !== 'Cancelled') {
      const roomRef = doc(firestore, 'rooms', res.roomId);
      updateDocumentNonBlocking(roomRef, { status: "Available" });
    }

    setActiveDialog(null);
    toast({ variant: "destructive", title: "Dossier Supprimé", description: "La réservation a été retirée du registre." });
  };

  const filteredReservations = reservations?.filter(res => 
    res.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    res.roomNumber?.includes(searchTerm)
  );

  const availableRooms = rooms?.filter(r => r.status === 'Available') || [];

  if (!mounted || isAuthLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Registre des Réservations</h1>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary gap-2">
            <Plus className="h-4 w-4" /> Nouvelle réservation
          </Button>
        </header>

        <main className="p-6">
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-muted/20">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher Nom du client..." 
                  className="pl-9" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du client</TableHead>
                  <TableHead>Chambre</TableHead>
                  <TableHead>Arrivée / Départ</TableHead>
                  <TableHead>Montant Total</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isResLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                    </TableCell>
                  </TableRow>
                ) : filteredReservations && filteredReservations.length > 0 ? (
                  filteredReservations.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell className="font-bold">{res.guestName}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-bold">N° {res.roomNumber}</Badge>
                      </TableCell>
                      <TableCell className="text-xs font-medium">
                        {res.checkInDate} <span className="text-muted-foreground mx-1">→</span> {res.checkOutDate}
                      </TableCell>
                      <TableCell className="font-bold text-primary">{Number(res.totalAmount).toFixed(2)} $</TableCell>
                      <TableCell>
                        <Badge variant={res.status === 'Checked In' ? 'default' : res.status === 'Checked Out' ? 'secondary' : 'outline'}>
                          {res.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleOpenActionDialog(res, 'details'); }}>
                              <CalendarDays className="h-4 w-4 mr-2" /> Détails complets
                            </DropdownMenuItem>
                            <Separator className="my-1" />
                            <DropdownMenuItem 
                              onSelect={(e) => { e.preventDefault(); handleOpenActionDialog(res, 'cancel'); }}
                              className="text-rose-500 font-bold"
                            >
                              <XCircle className="h-4 w-4 mr-2" /> Annuler séjour
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onSelect={(e) => { e.preventDefault(); handleOpenActionDialog(res, 'delete'); }}
                              className="text-destructive font-black"
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Supprimer définitif
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                      Aucun dossier trouvé.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </main>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Nouvelle Réservation</DialogTitle>
              <DialogDescription>Saisissez le nom du client et les détails du séjour.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nom du client</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9" placeholder="Nom du client" value={bookingForm.guestName} onChange={(e) => setBookingForm({...bookingForm, guestName: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Téléphone WhatsApp</Label>
                  <Input placeholder="+..." value={bookingForm.guestPhone} onChange={(e) => setBookingForm({...bookingForm, guestPhone: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date d'Arrivée</Label>
                  <Input type="date" value={bookingForm.checkInDate} onChange={(e) => setBookingForm({...bookingForm, checkInDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Date de Départ</Label>
                  <Input type="date" value={bookingForm.checkOutDate} onChange={(e) => setBookingForm({...bookingForm, checkOutDate: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Chambre Disponible</Label>
                  <Select value={bookingForm.roomId} onValueChange={(val) => setBookingForm({...bookingForm, roomId: val})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir une chambre" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableRooms.map((room) => (
                        <SelectItem key={room.id} value={room.id}>
                          N° {room.roomNumber} - {room.roomType}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Prix du séjour ($)</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className="pl-9" value={bookingForm.totalAmount} onChange={(e) => setBookingForm({...bookingForm, totalAmount: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSaveBooking}>Confirmer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialogues isolés de la table pour éviter le blocage du focus */}
        <Dialog open={activeDialog === 'details'} onOpenChange={(open) => !open && setActiveDialog(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Gestion du Dossier</DialogTitle>
              <DialogDescription className="sr-only">Visualisation et modification du statut de séjour.</DialogDescription>
            </DialogHeader>
            {selectedRes && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-[10px] uppercase font-bold">Client</Label>
                    <p className="font-bold text-lg">{selectedRes.guestName}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-muted-foreground text-[10px] uppercase font-bold">Chambre</Label>
                    <p className="font-bold text-lg">N° {selectedRes.roomNumber}</p>
                  </div>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <Label className="text-muted-foreground text-[10px] uppercase font-bold">Arrivée</Label>
                    <p>{selectedRes.checkInDate}</p>
                  </div>
                  <div>
                    <Label className="text-muted-foreground text-[10px] uppercase font-bold">Départ</Label>
                    <p>{selectedRes.checkOutDate}</p>
                  </div>
                </div>
                <div className="bg-muted/30 p-4 rounded-xl flex items-center justify-between">
                  <span className="text-sm font-bold">Statut: <Badge>{selectedRes.status}</Badge></span>
                  <div className="flex gap-2">
                    {selectedRes.status === 'Confirmée' && (
                      <Button size="sm" onClick={() => handleCheckIn(selectedRes)} className="bg-emerald-600 hover:bg-emerald-700">
                        <CheckCircle className="h-4 w-4 mr-2" /> Check-in
                      </Button>
                    )}
                    {selectedRes.status === 'Checked In' && (
                      <Button size="sm" onClick={() => handleCheckOut(selectedRes)} className="bg-amber-600 hover:bg-amber-700">
                        <LogOut className="h-4 w-4 mr-2" /> Check-out
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setActiveDialog(null)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={activeDialog === 'cancel'} onOpenChange={(open) => !open && setActiveDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
              <AlertDialogDescription>La chambre sera immédiatement remise en disponibilité dans l'inventaire.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Retour</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleCancelRes(selectedRes)} className="bg-rose-500 hover:bg-rose-600 text-white">Confirmer l'annulation</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={activeDialog === 'delete'} onOpenChange={(open) => !open && setActiveDialog(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer définitivement ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action est irréversible et retirera le dossier du registre hôtelier.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Retour</AlertDialogCancel>
              <AlertDialogAction onClick={() => handleDeleteRes(selectedRes)} className="bg-destructive hover:bg-destructive/90">Supprimer le dossier</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </div>
  );
}
