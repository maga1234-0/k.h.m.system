
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
  Trash2
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
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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

export default function ReservationsPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  
  const [activeResId, setActiveResId] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<"manage" | null>(null);
  
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
    reservations?.find(r => r.id === activeResId) || null
  , [reservations, activeResId]);

  const handleOpenManage = (resId: string) => {
    setActiveResId(resId);
    // Timeout to ensure dropdown closes properly before dialog opens
    setTimeout(() => {
      setActiveDialog("manage");
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
    setIsAddDialogOpen(false);
    setBookingForm({ guestName: "", guestEmail: "", guestPhone: "", roomId: "", checkInDate: "", checkOutDate: "", numberOfGuests: 1, totalAmount: "" });
    toast({ title: "Succès", description: "La réservation a été créée." });
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
    toast({ variant: "destructive", title: "Réservation Annulée" });
  };

  const handleClearAll = () => {
    if (!reservations) return;
    reservations.forEach((res) => deleteDocumentNonBlocking(doc(firestore, 'reservations', res.id)));
    setIsClearDialogOpen(false);
    toast({ variant: "destructive", title: "Action effectuée", description: "Le registre a été purgé." });
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
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Réservations</h1>
          </div>
          <div className="flex gap-2">
            {reservations && reservations.length > 0 && (
              <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" className="text-muted-foreground hover:text-destructive gap-2 h-9 text-xs">
                    <Trash2 className="h-4 w-4" /> Purger
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-2xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirmer la purge ?</AlertDialogTitle>
                    <AlertDialogDescription>Ceci supprimera définitivement tout l'historique des réservations. Cette action est irréversible.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Annuler</AlertDialogCancel>
                    <AlertDialogAction onClick={handleClearAll} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Tout supprimer</AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            )}
            <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 h-9 text-xs">
              <Plus className="h-4 w-4" /> Nouvelle résa
            </Button>
          </div>
        </header>

        <main className="p-4 md:p-6">
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-muted/20">
              <div className="relative w-full max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher par nom ou chambre..." 
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
                    <TableHead>Séjour</TableHead>
                    <TableHead>Prix Total</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isResLoading ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12"><Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" /></TableCell></TableRow>
                  ) : filteredReservations?.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-12 text-muted-foreground">Aucun dossier de réservation trouvé.</TableCell></TableRow>
                  ) : filteredReservations?.map((res) => (
                    <TableRow key={res.id}>
                      <TableCell className="font-bold text-xs">{res.guestName}</TableCell>
                      <TableCell><Badge variant="outline">N° {res.roomNumber}</Badge></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{res.checkInDate} au {res.checkOutDate}</TableCell>
                      <TableCell className="font-bold text-primary">{Number(res.totalAmount).toFixed(2)} $</TableCell>
                      <TableCell>
                        <Badge variant={res.status === 'Checked In' ? 'default' : res.status === 'Checked Out' ? 'secondary' : res.status === 'Cancelled' ? 'destructive' : 'outline'}>
                          {res.status === 'Checked In' ? 'Arrivé' : res.status === 'Checked Out' ? 'Départ' : res.status === 'Cancelled' ? 'Annulé' : res.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onSelect={() => handleOpenManage(res.id)}>
                              Gérer le séjour
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
          <DialogContent className="sm:max-w-[550px]">
            <DialogHeader>
              <DialogTitle>Nouvelle Réservation</DialogTitle>
              <DialogDescription>Remplissez les informations du client et les dates de séjour.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase text-muted-foreground">Client</label>
                <Input placeholder="Nom complet" value={bookingForm.guestName} onChange={(e) => setBookingForm({...bookingForm, guestName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Téléphone</label>
                  <Input placeholder="+243..." value={bookingForm.guestPhone} onChange={(e) => setBookingForm({...bookingForm, guestPhone: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">E-mail</label>
                  <Input placeholder="client@exemple.com" value={bookingForm.guestEmail} onChange={(e) => setBookingForm({...bookingForm, guestEmail: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Arrivée</label>
                  <Input type="date" value={bookingForm.checkInDate} onChange={(e) => setBookingForm({...bookingForm, checkInDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Départ</label>
                  <Input type="date" value={bookingForm.checkOutDate} onChange={(e) => setBookingForm({...bookingForm, checkOutDate: e.target.value})} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase text-muted-foreground">Chambre</label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
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
                  <label className="text-xs font-bold uppercase text-muted-foreground">Prix Total ($)</label>
                  <Input type="number" value={bookingForm.totalAmount} onChange={(e) => setBookingForm({...bookingForm, totalAmount: e.target.value})} />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleSaveBooking} className="bg-primary text-primary-foreground">Confirmer la réservation</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={activeDialog === "manage"} onOpenChange={(open) => !open && setActiveDialog(null)}>
          <DialogContent className="sm:max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Gestion du Séjour</DialogTitle>
              <DialogDescription>Actions rapides pour l'arrivée ou le départ du client.</DialogDescription>
            </DialogHeader>
            {selectedRes && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-xl border">
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Voyageur</p>
                    <p className="font-bold text-sm">{selectedRes.guestName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Chambre</p>
                    <p className="font-bold text-sm">N° {selectedRes.roomNumber}</p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  {selectedRes.status === 'Confirmée' && (
                    <Button onClick={handleCheckIn} className="h-12 bg-emerald-600 hover:bg-emerald-700 font-bold text-white shadow-lg shadow-emerald-500/20">
                      Valider le Check-in
                    </Button>
                  )}
                  {selectedRes.status === 'Checked In' && (
                    <Button onClick={handleCheckOut} className="h-12 bg-primary hover:bg-primary/90 font-bold text-white shadow-lg shadow-primary/20">
                      Valider le Check-out
                    </Button>
                  )}
                  <Button variant="outline" onClick={handleCancelReservation} className="h-12 text-destructive border-destructive/20 hover:bg-destructive/10 font-bold">
                    Annuler la réservation
                  </Button>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="ghost" className="w-full" onClick={() => setActiveDialog(null)}>Fermer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </div>
  );
}
