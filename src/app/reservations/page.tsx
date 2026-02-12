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
} from "@/components/ui/alert-dialog";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { Logo } from "@/components/ui/logo";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  addDocumentNonBlocking, 
  updateDocumentNonBlocking, 
  deleteDocumentNonBlocking,
  useUser 
} from "@/firebase";
import { collection, doc, query, where, getDocs } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

export default function ReservationsPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
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

  const calculateTotal = (roomId: string, checkIn: string, checkOut: string) => {
    if (!roomId || !checkIn || !checkOut || !rooms) return "0";
    const selectedRoom = rooms.find(r => r.id === roomId);
    if (!selectedRoom) return "0";
    
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    
    if (end > start) {
      // Nettoyage des heures pour un calcul précis des nuitées
      const d1 = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      const d2 = new Date(end.getFullYear(), end.getMonth(), end.getDate());
      const diffTime = Math.abs(d2.getTime() - d1.getTime());
      const nights = Math.max(1, Math.round(diffTime / (1000 * 60 * 60 * 24)));
      const price = Number(selectedRoom.pricePerNight) || Number(selectedRoom.price) || 0;
      return (nights * price).toString();
    }
    return "0";
  };

  useEffect(() => {
    const total = calculateTotal(bookingForm.roomId, bookingForm.checkInDate, bookingForm.checkOutDate);
    if (total !== "0" && total !== bookingForm.totalAmount) {
      setBookingForm(prev => ({ ...prev, totalAmount: total }));
    }
  }, [bookingForm.roomId, bookingForm.checkInDate, bookingForm.checkOutDate, rooms]);

  useEffect(() => {
    if (editForm) {
      const total = calculateTotal(editForm.roomId, editForm.checkInDate, editForm.checkOutDate);
      if (total !== "0" && total !== editForm.totalAmount) {
        setEditForm((prev: any) => ({ ...prev, totalAmount: total }));
      }
    }
  }, [editForm?.roomId, editForm?.checkInDate, editForm?.checkOutDate, rooms]);

  const selectedRes = useMemo(() => 
    reservations?.find(r => r.id === activeResId) || null
  , [reservations, activeResId]);

  const handleOpenManage = (resId: string) => {
    setActiveResId(resId);
    setTimeout(() => setActiveDialog("manage"), 150);
  };

  const handleOpenEdit = (res: any) => {
    setEditForm({ ...res });
    setActiveResId(res.id);
    setTimeout(() => setActiveDialog("edit"), 150);
  };

  const handleSaveBooking = () => {
    if (!bookingForm.guestName || !bookingForm.roomId || !resCollection) {
      toast({ title: "Champ requis", description: "Veuillez remplir les informations client." });
      return;
    }
    
    const selectedRoom = rooms?.find(r => r.id === bookingForm.roomId);
    if (!selectedRoom) return;

    const reservationData = { 
      ...bookingForm, 
      roomNumber: selectedRoom.roomNumber,
      roomType: selectedRoom.roomType || "Standard",
      status: "Confirmée", 
      totalAmount: Number(bookingForm.totalAmount) || 0,
      createdAt: new Date().toISOString() 
    };

    addDocumentNonBlocking(resCollection, reservationData);
    updateDocumentNonBlocking(doc(firestore, 'rooms', selectedRoom.id), { status: "Occupied" });

    setIsAddDialogOpen(false);
    setBookingForm({ guestName: "", guestEmail: "", guestPhone: "", roomId: "", checkInDate: "", checkOutDate: "", numberOfGuests: 1, totalAmount: "" });
    toast({ title: "Réservation créée", description: "Dossier ajouté avec succès." });
  };

  const handleUpdateBooking = () => {
    if (!editForm || !editForm.id) return;

    const selectedRoom = rooms?.find(r => r.id === editForm.roomId);
    if (!selectedRoom) return;

    const resRef = doc(firestore, 'reservations', editForm.id);
    const updatedData = {
      ...editForm,
      roomNumber: selectedRoom.roomNumber,
      roomType: selectedRoom.roomType || "Standard",
      totalAmount: Number(editForm.totalAmount) || 0
    };

    updateDocumentNonBlocking(resRef, updatedData);
    setActiveDialog(null);
    setEditForm(null);
    toast({ title: "Mise à jour réussie", description: "Dossier client actualisé." });
  };

  const handleCheckIn = async () => {
    if (!selectedRes) return;
    
    const invCol = collection(firestore, 'invoices');
    const q = query(invCol, where("reservationId", "==", selectedRes.id));
    const snapshot = await getDocs(q);
    
    if (!snapshot.empty) {
      updateDocumentNonBlocking(doc(firestore, 'reservations', selectedRes.id), { status: "Checked In" });
      updateDocumentNonBlocking(doc(firestore, 'rooms', selectedRes.roomId), { status: "Occupied" });
      setActiveDialog(null);
      toast({ title: "Déjà facturé", description: "Arrivée validée." });
      return;
    }

    updateDocumentNonBlocking(doc(firestore, 'reservations', selectedRes.id), { status: "Checked In" });
    updateDocumentNonBlocking(doc(firestore, 'rooms', selectedRes.roomId), { status: "Occupied" });

    addDocumentNonBlocking(invCol, {
      reservationId: selectedRes.id,
      guestName: selectedRes.guestName,
      guestPhone: selectedRes.guestPhone,
      guestEmail: selectedRes.guestEmail || "",
      roomNumber: selectedRes.roomNumber,
      roomType: selectedRes.roomType || "Standard",
      checkInDate: selectedRes.checkInDate,
      checkOutDate: selectedRes.checkOutDate,
      stayAmount: Number(selectedRes.totalAmount) || 0,
      amountDue: Number(selectedRes.totalAmount) || 0,
      amountPaid: 0,
      status: 'Unpaid',
      invoiceDate: new Date().toISOString(),
      dueDate: new Date(Date.now() + 86400000).toISOString(),
      notes: ""
    });

    setActiveDialog(null);
    toast({ title: "Check-in effectué", description: "Facture générée automatiquement." });
  };

  const handleCheckOut = () => {
    if (!selectedRes) return;
    updateDocumentNonBlocking(doc(firestore, 'reservations', selectedRes.id), { status: "Checked Out" });
    updateDocumentNonBlocking(doc(firestore, 'rooms', selectedRes.roomId), { status: "Cleaning" });
    setActiveDialog(null);
    toast({ title: "Départ validé", description: "Chambre libérée pour nettoyage." });
  };

  const handleCancelReservation = () => {
    if (!selectedRes) return;
    updateDocumentNonBlocking(doc(firestore, 'reservations', selectedRes.id), { status: "Cancelled" });
    updateDocumentNonBlocking(doc(firestore, 'rooms', selectedRes.roomId), { status: "Available" });
    setActiveDialog(null);
    toast({ title: "Réservation Annulée", description: "Chambre remise en disponibilité." });
  };

  const handleDeleteIndividual = () => {
    if (!resToDelete) return;
    
    if (resToDelete.roomId && resToDelete.status !== 'Checked Out' && resToDelete.status !== 'Cancelled') {
      const roomRef = doc(firestore, 'rooms', resToDelete.roomId);
      updateDocumentNonBlocking(roomRef, { status: "Available" });
    }
    
    const resRef = doc(firestore, 'reservations', resToDelete.id);
    deleteDocumentNonBlocking(resRef);
    
    setIsDeleteDialogOpen(false);
    setResToDelete(null);
    toast({ title: "Dossier supprimé", description: "Données purgées du registre." });
  };

  const filteredReservations = reservations?.filter(res => 
    (res.guestName?.toLowerCase() || "").includes(searchTerm.toLowerCase()) || 
    (res.roomNumber || "").includes(searchTerm)
  );

  if (!mounted || isAuthLoading || !user) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex h-screen w-full animate-in fade-in duration-500 bg-background">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-transparent">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl text-primary flex items-center gap-2">
              <Logo size={24} /> Gestion des Séjours
            </h1>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 gap-2 h-9 text-xs font-bold uppercase tracking-widest shadow-lg shadow-primary/20">
            <Plus className="h-4 w-4" /> Nouvelle résa
          </Button>
        </header>

        <main className="p-4 md:p-6">
          <div className="bg-card rounded-[2rem] shadow-sm border overflow-hidden">
            <div className="p-6 border-b bg-muted/20">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher client ou chambre..." 
                  className="pl-9 bg-background rounded-xl" 
                  value={searchTerm} 
                  onChange={(e) => setSearchTerm(e.target.value)} 
                />
              </div>
            </div>
            
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
                  <TableRow><TableCell colSpan={6} className="text-center py-20 text-muted-foreground italic">Aucun dossier trouvé.</TableCell></TableRow>
                ) : filteredReservations?.map((res) => (
                  <TableRow key={res.id} className="hover:bg-primary/5 transition-colors">
                    <TableCell className="font-black text-xs">{res.guestName}</TableCell>
                    <TableCell><Badge variant="outline" className="font-bold border-primary/20 bg-primary/5 text-primary">N° {res.roomNumber}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{res.checkInDate} au {res.checkOutDate}</TableCell>
                    <TableCell className="font-black text-primary">{Number(res.totalAmount).toFixed(2)} $</TableCell>
                    <TableCell>
                      <Badge variant={res.status === 'Checked In' ? 'default' : res.status === 'Checked Out' ? 'secondary' : res.status === 'Cancelled' ? 'default' : 'outline'} className="text-[10px] font-black uppercase tracking-widest">
                        {res.status === 'Checked In' ? 'Arrivé' : res.status === 'Checked Out' ? 'Départ' : res.status === 'Cancelled' ? 'Annulé' : res.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-xl shadow-xl">
                          <DropdownMenuItem onSelect={() => handleOpenManage(res.id)} className="font-bold text-xs uppercase py-2 cursor-pointer">Gérer le séjour</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => handleOpenEdit(res)} className="font-bold text-xs uppercase py-2 cursor-pointer"><Edit2 className="mr-2 h-4 w-4" /> Modifier</DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onSelect={() => { 
                              setResToDelete(res); 
                              setTimeout(() => setIsDeleteDialogOpen(true), 150);
                            }} 
                            className="text-primary font-bold text-xs uppercase py-2 cursor-pointer"
                          >
                            <Trash2 className="mr-2 h-4 w-4" /> Supprimer
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </main>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[550px] rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-headline">Nouvelle Réservation</DialogTitle>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground">Client</label>
                <Input placeholder="Nom complet" className="rounded-xl h-11" value={bookingForm.guestName} onChange={(e) => setBookingForm({...bookingForm, guestName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Arrivée</label>
                  <Input type="date" className="rounded-xl h-11" value={bookingForm.checkInDate} onChange={(e) => setBookingForm({...bookingForm, checkInDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Départ</label>
                  <Input type="date" className="rounded-xl h-11" value={bookingForm.checkOutDate} onChange={(e) => setBookingForm({...bookingForm, checkOutDate: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Chambre</label>
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
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Montant Total ($)</label>
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

        <Dialog open={activeDialog === "edit"} onOpenChange={(open) => !open && setActiveDialog(null)}>
          <DialogContent className="sm:max-w-[550px] rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-headline">Modifier Réservation</DialogTitle>
            </DialogHeader>
            {editForm && (
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase text-muted-foreground">Client</label>
                  <Input className="rounded-xl h-11" value={editForm.guestName} onChange={(e) => setEditForm({...editForm, guestName: e.target.value})} />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Arrivée</label>
                    <Input type="date" className="rounded-xl h-11" value={editForm.checkInDate} onChange={(e) => setEditForm({...editForm, checkInDate: e.target.value})} />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Départ</label>
                    <Input type="date" className="rounded-xl h-11" value={editForm.checkOutDate} onChange={(e) => setEditForm({...editForm, checkOutDate: e.target.value})} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Chambre</label>
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
                    <label className="text-[10px] font-black uppercase text-muted-foreground">Montant Total ($)</label>
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
          <DialogContent className="sm:max-w-md rounded-[2rem]">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-headline">Gestion du Séjour</DialogTitle>
            </DialogHeader>
            {selectedRes && (
              <div className="space-y-6 py-6">
                <div className="grid grid-cols-2 gap-4 p-6 bg-primary/5 rounded-[1.5rem] border border-primary/10">
                  <div>
                    <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">Client</p>
                    <p className="font-black text-sm">{selectedRes.guestName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-black text-muted-foreground mb-1">Chambre</p>
                    <p className="font-black text-sm text-primary">N° {selectedRes.roomNumber}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-3">
                  {(selectedRes.status === 'Confirmée' || selectedRes.status === 'Confirmé') && (
                    <Button onClick={handleCheckIn} className="h-14 bg-primary font-black text-white rounded-xl shadow-lg uppercase tracking-widest text-xs">Valider le Check-in</Button>
                  )}
                  {selectedRes.status === 'Checked In' && (
                    <Button onClick={handleCheckOut} className="h-14 bg-primary/80 font-black text-white rounded-xl shadow-lg uppercase tracking-widest text-xs">Valider le Check-out</Button>
                  )}
                  <Button variant="outline" onClick={handleCancelReservation} className="h-14 text-primary border-primary/20 font-black rounded-xl uppercase tracking-widest text-[10px]">Annuler la réservation</Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Confirmer la suppression ?</AlertDialogTitle>
              <AlertDialogDescription>Le dossier de <strong>{resToDelete?.guestName}</strong> sera définitivement retiré du registre.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl" onClick={() => setResToDelete(null)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteIndividual} className="bg-primary text-white hover:bg-primary/90 rounded-xl">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </div>
  );
}