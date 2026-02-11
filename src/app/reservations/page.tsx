
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
  MoreHorizontal,
  Trash2,
  Edit2
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
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

export default function ReservationsPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [resToDelete, setResToDelete] = useState<any>(null);
  
  const [activeResId, setActiveResId] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<"manage" | "edit" | null>(null);
  
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

  const [editForm, setEditForm] = useState<any>(null);

  const firestore = useFirestore();
  const resCollection = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  const roomsCollection = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  
  const { data: reservations, isLoading: isResLoading } = useCollection(resCollection);
  const { data: rooms } = useCollection(roomsCollection);

  useEffect(() => {
    setMounted(true);
    if (!isAuthLoading && !user) router.push('/login');
  }, [user, isAuthLoading, router]);

  // Auto-calculate amount for new booking
  useEffect(() => {
    if (bookingForm.roomId && bookingForm.checkInDate && bookingForm.checkOutDate && rooms) {
      const selectedRoom = rooms.find(r => r.id === bookingForm.roomId);
      if (selectedRoom) {
        const start = new Date(bookingForm.checkInDate);
        const end = new Date(bookingForm.checkOutDate);
        if (end > start) {
          const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          const total = nights * (Number(selectedRoom.pricePerNight) || Number(selectedRoom.price) || 0);
          setBookingForm(prev => ({ ...prev, totalAmount: total.toString() }));
        }
      }
    }
  }, [bookingForm.roomId, bookingForm.checkInDate, bookingForm.checkOutDate, rooms]);

  // Auto-calculate amount for edit booking
  useEffect(() => {
    if (editForm && editForm.roomId && editForm.checkInDate && editForm.checkOutDate && rooms) {
      const selectedRoom = rooms.find(r => r.id === editForm.roomId);
      if (selectedRoom) {
        const start = new Date(editForm.checkInDate);
        const end = new Date(editForm.checkOutDate);
        if (end > start) {
          const nights = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
          const total = nights * (Number(selectedRoom.pricePerNight) || Number(selectedRoom.price) || 0);
          setEditForm((prev: any) => ({ ...prev, totalAmount: total.toString() }));
        }
      }
    }
  }, [editForm?.roomId, editForm?.checkInDate, editForm?.checkOutDate, rooms]);

  const selectedRes = useMemo(() => 
    reservations?.find(r => r.id === activeResId) || null
  , [reservations, activeResId]);

  const handleOpenManage = (resId: string) => {
    setActiveResId(resId);
    setTimeout(() => {
      setActiveDialog("manage");
    }, 150);
  };

  const handleOpenEdit = (res: any) => {
    setEditForm({ ...res });
    setActiveResId(res.id);
    setTimeout(() => {
      setActiveDialog("edit");
    }, 150);
  };

  const handleSaveBooking = () => {
    if (!bookingForm.guestName || !bookingForm.roomId || !resCollection) {
      toast({ variant: "destructive", title: "Données manquantes" });
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
    updateDocumentNonBlocking(doc(firestore, 'rooms', selectedRoom.id), { status: "Occupied" });

    setIsAddDialogOpen(false);
    setBookingForm({ guestName: "", guestEmail: "", guestPhone: "", roomId: "", checkInDate: "", checkOutDate: "", numberOfGuests: 1, totalAmount: "" });
    toast({ title: "Succès", description: "La réservation a été créée et la chambre bloquée." });
  };

  const handleUpdateBooking = () => {
    if (!editForm || !editForm.id) return;

    const selectedRoom = rooms?.find(r => r.id === editForm.roomId);
    if (!selectedRoom) return;

    const resRef = doc(firestore, 'reservations', editForm.id);
    const updatedData = {
      ...editForm,
      roomNumber: selectedRoom.roomNumber,
      totalAmount: Number(editForm.totalAmount) || 0
    };

    updateDocumentNonBlocking(resRef, updatedData);
    setActiveDialog(null);
    setEditForm(null);
    toast({ title: "Mise à jour réussie", description: "Le dossier a été actualisé." });
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
      roomNumber: selectedRes.roomNumber,
      amountDue: selectedRes.totalAmount,
      amountPaid: 0,
      status: 'Unpaid',
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000).toISOString()
    });

    setActiveDialog(null);
    toast({ title: "Arrivée validée (Check-in)" });
  };

  const handleCheckOut = () => {
    if (!selectedRes) return;
    updateDocumentNonBlocking(doc(firestore, 'reservations', selectedRes.id), { status: "Checked Out" });
    updateDocumentNonBlocking(doc(firestore, 'rooms', selectedRes.roomId), { status: "Cleaning" });
    setActiveDialog(null);
    toast({ title: "Départ validé (Check-out)" });
  };

  const handleCancelReservation = () => {
    if (!selectedRes) return;
    updateDocumentNonBlocking(doc(firestore, 'reservations', selectedRes.id), { status: "Cancelled" });
    updateDocumentNonBlocking(doc(firestore, 'rooms', selectedRes.roomId), { status: "Available" });
    setActiveDialog(null);
    toast({ variant: "destructive", title: "Réservation Annulée", description: "La chambre est à nouveau disponible." });
  };

  const handleDeleteIndividual = () => {
    if (!resToDelete) return;
    if (resToDelete.roomId) {
      updateDocumentNonBlocking(doc(firestore, 'rooms', resToDelete.roomId), { status: "Available" });
    }
    deleteDocumentNonBlocking(doc(firestore, 'reservations', resToDelete.id));
    setIsDeleteDialogOpen(false);
    setResToDelete(null);
    toast({ variant: "destructive", title: "Supprimé", description: "La réservation a été retirée du registre." });
  };

  const handleClearAll = () => {
    if (!reservations) return;
    reservations.forEach((res) => {
      if (res.roomId) {
        updateDocumentNonBlocking(doc(firestore, 'rooms', res.roomId), { status: "Available" });
      }
      deleteDocumentNonBlocking(doc(firestore, 'reservations', res.id));
    });
    setIsClearDialogOpen(false);
    toast({ variant: "destructive", title: "Registre Purgé", description: "Toutes les réservations ont été supprimées et les chambres libérées." });
  };

  const filteredReservations = reservations?.filter(res => 
    res.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    res.roomNumber?.includes(searchTerm)
  );

  if (!mounted || isAuthLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full animate-in fade-in duration-500">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl text-primary">Réservations</h1>
          </div>
          <div className="flex gap-2">
            {reservations && reservations.length > 0 && (
              <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-muted-foreground hover:text-destructive gap-2 h-9 text-xs font-bold uppercase tracking-widest">
                    <Trash2 className="h-4 w-4" /> Purger tout
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la purge complète ?</AlertDialogTitle>
                    <AlertDialogDescription>
                      Cette action supprimera toutes les réservations et libérera toutes les chambres occupées. C'est irréversible.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">Tout supprimer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9 text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20">
              <Plus className="h-4 w-4" /> Nouvelle résa
            </Button>
          </div>
        </header>

        <main className="p-4 md:p-6">
          <div className="bg-card rounded-[2rem] shadow-sm border overflow-hidden animate-in slide-in-from-bottom-4 duration-700">
            <div className="p-6 border-b bg-muted/20">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher par nom ou chambre..." 
                  className="pl-9 bg-background rounded-xl border-none shadow-inner" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/30">
                  <TableRow>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Client</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Chambre</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Séjour</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Prix Total</TableHead>
                    <TableHead className="font-black text-[10px] uppercase tracking-widest">Statut</TableHead>
                    <TableHead className="text-right font-black text-[10px] uppercase tracking-widest">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isResLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : filteredReservations?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground font-medium italic">Aucun dossier trouvé dans le registre.</TableCell></TableRow>
                  ) : filteredReservations?.map((res, idx) => (
                    <TableRow key={res.id} className="animate-in fade-in duration-500 hover:bg-primary/5 transition-colors" style={{ animationDelay: `${idx * 50}ms` }}>
                      <TableCell className="font-black text-xs text-foreground">{res.guestName}</TableCell>
                      <TableCell><Badge variant="outline" className="font-bold border-primary/20 bg-primary/5 text-primary">N° {res.roomNumber}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground font-medium">{res.checkInDate} au {res.checkOutDate}</TableCell>
                      <TableCell className="font-black text-primary">{Number(res.totalAmount).toFixed(2)} $</TableCell>
                      <TableCell>
                        <Badge variant={res.status === 'Checked In' ? 'default' : res.status === 'Checked Out' ? 'secondary' : res.status === 'Cancelled' ? 'destructive' : 'outline'} className="text-[10px] font-black uppercase tracking-widest">
                          {res.status === 'Checked In' ? 'Arrivé' : res.status === 'Checked Out' ? 'Départ' : res.status === 'Cancelled' ? 'Annulé' : res.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8 hover:scale-110 transition-transform"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56 animate-in slide-in-from-top-1 rounded-xl">
                            <DropdownMenuItem onSelect={() => handleOpenManage(res.id)} className="font-bold text-xs uppercase tracking-widest py-2">Gérer le séjour</DropdownMenuItem>
                            <DropdownMenuItem onSelect={() => handleOpenEdit(res)} className="font-bold text-xs uppercase tracking-widest py-2">
                              <Edit2 className="mr-2 h-4 w-4" /> Modifier les détails
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem 
                              onSelect={() => {
                                setResToDelete(res);
                                setTimeout(() => setIsDeleteDialogOpen(true), 150);
                              }} 
                              className="text-destructive font-bold text-xs uppercase tracking-widest py-2"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Supprimer du registre
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        </main>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[550px] animate-in zoom-in-95 duration-300 rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-headline">Nouvelle Réservation</DialogTitle>
              <DialogDescription className="font-medium">Veuillez renseigner les informations du voyageur.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Client</label>
                <Input placeholder="Nom complet" className="rounded-xl h-11" value={bookingForm.guestName} onChange={(e) => setBookingForm({...bookingForm, guestName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Téléphone</label>
                  <Input placeholder="+243..." className="rounded-xl h-11" value={bookingForm.guestPhone} onChange={(e) => setBookingForm({...bookingForm, guestPhone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">E-mail</label>
                  <Input placeholder="client@exemple.com" className="rounded-xl h-11" value={bookingForm.guestEmail} onChange={(e) => setBookingForm({...bookingForm, guestEmail: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Arrivée</label>
                  <Input type="date" className="rounded-xl h-11" value={bookingForm.checkInDate} onChange={(e) => setBookingForm({...bookingForm, checkInDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Départ</label>
                  <Input type="date" className="rounded-xl h-11" value={bookingForm.checkOutDate} onChange={(e) => setBookingForm({...bookingForm, checkOutDate: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Chambre</label>
                  <select 
                    className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                    value={bookingForm.roomId} 
                    onChange={(e) => setBookingForm({...bookingForm, roomId: e.target.value})}
                  >
                    <option value="">Sélectionner...</option>
                    {rooms?.filter(r => r.status === 'Available').map(r => (
                      <option key={r.id} value={r.id}>Ch. {r.roomNumber} ({r.roomType})</option>
                    ))}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Montant Total ($)</label>
                  <Input type="number" className="rounded-xl h-11 font-black text-primary bg-primary/5" value={bookingForm.totalAmount} onChange={(e) => setBookingForm({...bookingForm, totalAmount: e.target.value})} />
                </div>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSaveBooking} className="rounded-xl font-bold uppercase tracking-widest px-8">Confirmer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Dialog for Editing Reservation */}
        <Dialog open={activeDialog === "edit"} onOpenChange={(open) => !open && setActiveDialog(null)}>
          <DialogContent className="sm:max-w-[550px] animate-in zoom-in-95 duration-300 rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-headline">Modifier Réservation</DialogTitle>
              <DialogDescription className="font-medium">Mettre à jour les informations du dossier.</DialogDescription>
            </DialogHeader>
            {editForm && (
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Client</label>
                  <Input placeholder="Nom complet" className="rounded-xl h-11" value={editForm.guestName} onChange={(e) => setEditForm({...editForm, guestName: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Téléphone</label>
                    <Input placeholder="+243..." className="rounded-xl h-11" value={editForm.guestPhone} onChange={(e) => setEditForm({...editForm, guestPhone: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">E-mail</label>
                    <Input placeholder="client@exemple.com" className="rounded-xl h-11" value={editForm.guestEmail} onChange={(e) => setEditForm({...editForm, guestEmail: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Arrivée</label>
                    <Input type="date" className="rounded-xl h-11" value={editForm.checkInDate} onChange={(e) => setEditForm({...editForm, checkInDate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Départ</label>
                    <Input type="date" className="rounded-xl h-11" value={editForm.checkOutDate} onChange={(e) => setEditForm({...editForm, checkOutDate: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Chambre</label>
                    <select 
                      className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm font-bold focus:ring-2 focus:ring-primary/20 outline-none"
                      value={editForm.roomId} 
                      onChange={(e) => setEditForm({...editForm, roomId: e.target.value})}
                    >
                      {rooms?.map(r => (
                        <option key={r.id} value={r.id}>Ch. {r.roomNumber} ({r.roomType})</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Montant Total ($)</label>
                    <Input type="number" className="rounded-xl h-11 font-black text-primary bg-primary/5" value={editForm.totalAmount} onChange={(e) => setEditForm({...editForm, totalAmount: e.target.value})} />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2">
              <Button variant="outline" className="rounded-xl" onClick={() => setActiveDialog(null)}>Annuler</Button>
              <Button onClick={handleUpdateBooking} className="rounded-xl font-bold uppercase tracking-widest px-8">Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={activeDialog === "manage"} onOpenChange={(open) => !open && setActiveDialog(null)}>
          <DialogContent className="sm:max-w-md rounded-[2rem] animate-in zoom-in-95">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-headline">Gestion du Séjour</DialogTitle>
              <DialogDescription className="font-medium">Actions requises pour le cycle du voyageur.</DialogDescription>
            </DialogHeader>
            {selectedRes && (
              <div className="space-y-6 py-6">
                <div className="grid grid-cols-2 gap-4 p-6 bg-primary/5 rounded-[1.5rem] border border-primary/10 animate-in fade-in duration-500">
                  <div>
                    <p className="text-[10px] uppercase font-black text-muted-foreground mb-1 tracking-widest">Voyageur</p>
                    <p className="font-black text-sm text-foreground">{selectedRes.guestName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black text-muted-foreground mb-1 tracking-widest">Chambre</p>
                    <p className="font-black text-sm text-primary">N° {selectedRes.roomNumber}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {selectedRes.status === 'Confirmée' && (
                    <Button onClick={handleCheckIn} className="h-14 bg-emerald-600 hover:bg-emerald-700 font-black text-white rounded-xl shadow-lg uppercase tracking-widest text-xs">Valider le Check-in</Button>
                  )}
                  {selectedRes.status === 'Checked In' && (
                    <Button onClick={handleCheckOut} className="h-14 bg-primary hover:bg-primary/90 font-black text-white rounded-xl shadow-lg uppercase tracking-widest text-xs">Valider le Check-out</Button>
                  )}
                  <Button variant="outline" onClick={handleCancelReservation} className="h-14 text-destructive border-destructive/20 hover:bg-destructive/5 font-black rounded-xl uppercase tracking-widest text-[10px]">Annuler la réservation</Button>
                </div>
              </div>
            )}
            <DialogFooter><Button variant="ghost" className="w-full rounded-xl uppercase font-bold text-[10px] tracking-widest" onClick={() => setActiveDialog(null)}>Fermer</Button></DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle className="font-headline font-bold">Confirmer la suppression ?</AlertDialogTitle>
              <AlertDialogDescription>Le dossier de <strong>{resToDelete?.guestName}</strong> sera retiré du registre et la chambre {resToDelete?.roomNumber} sera libérée.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteIndividual} className="bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-xl">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </div>
  );
}
