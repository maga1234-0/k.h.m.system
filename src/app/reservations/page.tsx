
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
  Plus, 
  Loader2,
  User,
  CreditCard,
  MoreHorizontal,
  CheckCircle,
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

export default function ReservationsPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isManageDialogOpen, setIsManageDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedResId, setSelectedResId] = useState<string | null>(null);
  
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

  const selectedRes = useMemo(() => 
    reservations?.find(r => r.id === selectedResId) || null
  , [reservations, selectedResId]);

  const handleOpenManage = (resId: string) => {
    setSelectedResId(resId);
    setTimeout(() => {
      setIsManageDialogOpen(true);
    }, 100);
  };

  const handleOpenDelete = (resId: string) => {
    setSelectedResId(resId);
    setTimeout(() => {
      setIsDeleteDialogOpen(true);
    }, 100);
  };

  const handleSaveBooking = () => {
    if (!bookingForm.guestName || !bookingForm.roomId || !resCollection) {
      toast({ variant: "destructive", title: "Données manquantes", description: "Veuillez remplir les informations." });
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
    toast({ title: "Succès", description: "Réservation créée." });
  };

  const handleCheckIn = () => {
    if (!selectedRes) return;
    updateDocumentNonBlocking(doc(firestore, 'reservations', selectedRes.id), { status: "Checked In" });
    updateDocumentNonBlocking(doc(firestore, 'rooms', selectedRes.roomId), { status: "Occupied" });

    const invCol = collection(firestore, 'invoices');
    addDocumentNonBlocking(invCol, {
      reservationId: selectedRes.id,
      guestName: selectedRes.guestName,
      guestPhone: selectedRes.guestPhone,
      amountDue: selectedRes.totalAmount,
      amountPaid: 0,
      status: 'Unpaid',
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000).toISOString()
    });

    setIsManageDialogOpen(false);
    toast({ title: "Arrivée validée", description: "Le séjour a commencé." });
  };

  const handleCheckOut = () => {
    if (!selectedRes) return;
    updateDocumentNonBlocking(doc(firestore, 'reservations', selectedRes.id), { status: "Checked Out" });
    updateDocumentNonBlocking(doc(firestore, 'rooms', selectedRes.roomId), { status: "Cleaning" });

    setIsManageDialogOpen(false);
    toast({ title: "Départ validé", description: "La chambre a été libérée pour le ménage." });
  };

  const handleDeleteRes = () => {
    if (!selectedRes) return;
    
    // Libérer la chambre si elle était occupée
    if (selectedRes.roomId) {
      updateDocumentNonBlocking(doc(firestore, 'rooms', selectedRes.roomId), { status: "Available" });
    }
    
    deleteDocumentNonBlocking(doc(firestore, 'reservations', selectedRes.id));
    setIsDeleteDialogOpen(false);
    toast({ variant: "destructive", title: "Réservation supprimée", description: "Le dossier a été retiré et la chambre libérée." });
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
            <h1 className="font-headline font-semibold text-xl">Réservations</h1>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary gap-2 h-9 text-xs md:text-sm">
            <Plus className="h-4 w-4" /> <span className="hidden sm:inline">Nouvelle résa</span>
          </Button>
        </header>

        <main className="p-4 md:p-6">
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-muted/20">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher client..." 
                  className="pl-9 bg-background" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead>Chambre</TableHead>
                    <TableHead className="hidden md:table-cell">Dates</TableHead>
                    <TableHead>Prix</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
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
                        <TableCell className="font-bold text-xs md:text-sm">{res.guestName}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="font-bold text-[10px] md:text-xs">N° {res.roomNumber}</Badge>
                        </TableCell>
                        <TableCell className="text-[10px] md:text-xs font-medium hidden md:table-cell">
                          {res.checkInDate} <span className="text-muted-foreground mx-1">→</span> {res.checkOutDate}
                        </TableCell>
                        <TableCell className="font-bold text-primary text-xs md:text-sm">{Number(res.totalAmount).toFixed(2)} $</TableCell>
                        <TableCell>
                          <Badge variant={res.status === 'Checked In' ? 'default' : res.status === 'Checked Out' ? 'secondary' : 'outline'} className="text-[10px]">
                            {res.status === 'Checked In' ? 'En séjour' : res.status === 'Checked Out' ? 'Parti' : 'Confirmé'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem onSelect={() => handleOpenManage(res.id)}>
                                <CheckCircle className="h-4 w-4 mr-2" /> Gérer le séjour
                              </DropdownMenuItem>
                              <Separator className="my-1" />
                              <DropdownMenuItem onSelect={() => handleOpenDelete(res.id)} className="text-destructive">
                                <Trash2 className="h-4 w-4 mr-2" /> Annuler / Supprimer
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic text-xs">
                        Aucune réservation.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        </main>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[550px] w-[95vw] rounded-2xl">
            <DialogHeader>
              <DialogTitle>Nouvelle Réservation</DialogTitle>
              <DialogDescription>Remplissez les détails du séjour.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Nom du client</Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input className="pl-9 h-9 text-sm" placeholder="Nom complet" value={bookingForm.guestName} onChange={(e) => setBookingForm({...bookingForm, guestName: e.target.value})} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">WhatsApp</Label>
                  <Input className="h-9 text-sm" placeholder="+..." value={bookingForm.guestPhone} onChange={(e) => setBookingForm({...bookingForm, guestPhone: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Arrivée</Label>
                  <Input className="h-9 text-xs sm:text-sm" type="date" value={bookingForm.checkInDate} onChange={(e) => setBookingForm({...bookingForm, checkInDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs">Départ</Label>
                  <Input className="h-9 text-xs sm:text-sm" type="date" value={bookingForm.checkOutDate} onChange={(e) => setBookingForm({...bookingForm, checkOutDate: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs">Chambre</Label>
                  <Select value={bookingForm.roomId} onValueChange={(val) => setBookingForm({...bookingForm, roomId: val})}>
                    <SelectTrigger className="h-9 text-sm">
                      <SelectValue placeholder="Choisir..." />
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
                  <Label className="text-xs">Prix Total ($)</Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input type="number" className="pl-9 h-9 text-sm" value={bookingForm.totalAmount} onChange={(e) => setBookingForm({...bookingForm, totalAmount: e.target.value})} />
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="h-9 text-xs" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
              <Button className="h-9 text-xs" onClick={handleSaveBooking}>Confirmer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isManageDialogOpen} onOpenChange={setIsManageDialogOpen}>
          <DialogContent className="sm:max-w-md w-[90vw] rounded-2xl border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle>Gestion du Séjour</DialogTitle>
              <DialogDescription>Actions rapides pour le séjour de {selectedRes?.guestName}.</DialogDescription>
            </DialogHeader>
            {selectedRes && (
              <div className="space-y-6 py-4">
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-muted/30">
                  <div>
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Client</Label>
                    <p className="font-bold text-sm truncate">{selectedRes.guestName}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Chambre</Label>
                    <p className="font-bold text-sm">N° {selectedRes.roomNumber}</p>
                  </div>
                </div>
                
                <div className="flex flex-col gap-3">
                  <Label className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest px-1">Actions Disponibles</Label>
                  
                  {selectedRes.status === 'Confirmée' && (
                    <Button onClick={handleCheckIn} className="w-full h-12 gap-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-lg shadow-emerald-600/20">
                      <CheckCircle className="h-5 w-5" /> Enregistrer l'Arrivée (Check-in)
                    </Button>
                  )}
                  
                  {selectedRes.status === 'Checked In' && (
                    <Button onClick={handleCheckOut} className="w-full h-12 gap-3 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl shadow-lg shadow-primary/20">
                      <CalendarDays className="h-5 w-5" /> Enregistrer le Départ (Check-out)
                    </Button>
                  )}
                  
                  {selectedRes.status === 'Checked Out' && (
                    <div className="p-4 text-center border-2 border-dashed rounded-xl text-muted-foreground text-sm">
                      Ce séjour est déjà terminé.
                    </div>
                  )}
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" className="w-full h-10 text-xs font-bold uppercase tracking-widest" onClick={() => setIsManageDialogOpen(false)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="rounded-2xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Annuler cette réservation ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera le dossier et remettra la chambre N° {selectedRes?.roomNumber} en disponibilité immédiate.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Retour</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteRes} className="bg-destructive text-white hover:bg-destructive/90">
                Confirmer l'Annulation
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </SidebarInset>
    </div>
  );
}
