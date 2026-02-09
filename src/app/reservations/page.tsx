
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
  MoreHorizontal,
  Info,
  Loader2,
  Trash2,
  User,
  CreditCard,
  CheckCircle2,
  Edit2,
  LogOut
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
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
  const [selectedRes, setSelectedRes] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [resToDelete, setResToDelete] = useState<any>(null);
  
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
  const invoicesCollection = useMemoFirebase(() => user ? collection(firestore, 'invoices') : null, [firestore, user]);
  
  const { data: reservations, isLoading: isResLoading } = useCollection(resCollection);
  const { data: rooms } = useCollection(roomsCollection);

  useEffect(() => {
    setMounted(true);
    if (!isAuthLoading && !user) router.push('/login');
  }, [user, isAuthLoading, router]);

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
      status: selectedRes ? selectedRes.status : "Confirmée", 
      totalAmount: Number(bookingForm.totalAmount) || 0,
      createdAt: selectedRes ? selectedRes.createdAt : new Date().toISOString() 
    };

    if (selectedRes && isEditDialogOpen) {
      updateDocumentNonBlocking(doc(firestore, 'reservations', selectedRes.id), reservationData);
      setIsEditDialogOpen(false);
    } else {
      addDocumentNonBlocking(resCollection, reservationData);
      setIsAddDialogOpen(false);
    }
    
    setBookingForm({ guestName: "", guestEmail: "", guestPhone: "", roomId: "", checkInDate: "", checkOutDate: "", numberOfGuests: 1, totalAmount: "" });
    setSelectedRes(null);
    toast({ title: "Opération Réussie", description: `Dossier de ${reservationData.guestName} mis à jour.` });
  };

  const handleCheckIn = (res: any) => {
    if (!res || !invoicesCollection) return;
    
    const resRef = doc(firestore, 'reservations', res.id);
    updateDocumentNonBlocking(resRef, { status: "Checked In" });
    
    if (res.roomId) {
      updateDocumentNonBlocking(doc(firestore, 'rooms', res.roomId), { status: "Occupied" });
    }

    const invoiceData = {
      reservationId: res.id,
      guestName: res.guestName,
      guestPhone: res.guestPhone,
      invoiceDate: new Date().toISOString(),
      dueDate: new Date().toISOString(),
      amountDue: res.totalAmount,
      amountPaid: 0,
      status: "Unpaid"
    };
    addDocumentNonBlocking(invoicesCollection, invoiceData);

    toast({ title: "Check-in Réussi", description: `${res.guestName} est maintenant enregistré.` });
  };

  const handleCheckOut = (res: any) => {
    if (!res) return;
    const resRef = doc(firestore, 'reservations', res.id);
    updateDocumentNonBlocking(resRef, { status: "Checked Out" });
    if (res.roomId) {
      updateDocumentNonBlocking(doc(firestore, 'rooms', res.roomId), { status: "Available" });
    }
    toast({ title: "Check-out Réussi", description: `${res.guestName} a libéré la chambre.` });
  };

  const handleDeleteConfirm = () => {
    if (!resToDelete) return;
    deleteDocumentNonBlocking(doc(firestore, 'reservations', resToDelete.id));
    if (resToDelete.roomId) {
      updateDocumentNonBlocking(doc(firestore, 'rooms', resToDelete.roomId), { status: "Available" });
    }
    setIsDeleteDialogOpen(false);
    setResToDelete(null);
    toast({ variant: "destructive", title: "Réservation Annulée", description: "Le dossier a été supprimé." });
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

  const availableRooms = rooms?.filter(r => r.status === 'Available' || (selectedRes && r.id === selectedRes.roomId)) || [];

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
          <Button onClick={() => {
            setSelectedRes(null);
            setBookingForm({ guestName: "", guestEmail: "", guestPhone: "", roomId: "", checkInDate: "", checkOutDate: "", numberOfGuests: 1, totalAmount: "" });
            setIsAddDialogOpen(true);
          }} className="bg-primary gap-2">
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
                  className="pl-9 bg-background" 
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
                  <TableHead>Montant</TableHead>
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
                        <Badge variant={res.status === 'Checked In' ? 'default' : res.status === 'Checked Out' ? 'outline' : 'secondary'}>
                          {res.status === 'Checked In' ? 'Arrivé' : res.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-56">
                            <DropdownMenuItem onSelect={(e) => { 
                              e.preventDefault();
                              setSelectedRes(res); 
                              setTimeout(() => setIsDetailsDialogOpen(true), 150); 
                            }}>
                              <Info className="mr-2 h-4 w-4" /> Détails complets
                            </DropdownMenuItem>
                            <DropdownMenuItem onSelect={(e) => { 
                              e.preventDefault();
                              setSelectedRes(res); 
                              setBookingForm({
                                guestName: res.guestName,
                                guestEmail: res.guestEmail || "",
                                guestPhone: res.guestPhone || "",
                                roomId: res.roomId,
                                checkInDate: res.checkInDate,
                                checkOutDate: res.checkOutDate,
                                numberOfGuests: res.numberOfGuests,
                                totalAmount: res.totalAmount.toString()
                              });
                              setTimeout(() => setIsEditDialogOpen(true), 150); 
                            }}>
                              <Edit2 className="mr-2 h-4 w-4" /> Modifier le dossier
                            </DropdownMenuItem>
                            {res.status !== 'Checked In' && res.status !== 'Checked Out' && (
                              <DropdownMenuItem onSelect={() => handleCheckIn(res)}>
                                <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Marquer l'arrivée
                              </DropdownMenuItem>
                            )}
                            {res.status === 'Checked In' && (
                              <DropdownMenuItem onSelect={() => handleCheckOut(res)}>
                                <LogOut className="mr-2 h-4 w-4 text-rose-600" /> Marquer le départ
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive" onSelect={(e) => { 
                              e.preventDefault();
                              setResToDelete(res); 
                              setTimeout(() => setIsDeleteDialogOpen(true), 150); 
                            }}>
                              <Trash2 className="mr-2 h-4 w-4" /> Annuler résa
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground italic">
                      Aucune réservation trouvée.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <Dialog open={isAddDialogOpen || isEditDialogOpen} onOpenChange={(open) => {
            if (!open) {
              setIsAddDialogOpen(false);
              setIsEditDialogOpen(false);
              setSelectedRes(null);
            }
          }}>
            <DialogContent className="sm:max-w-[550px]">
              <DialogHeader>
                <DialogTitle>{isEditDialogOpen ? "Modifier Réservation" : "Nouvelle Réservation"}</DialogTitle>
                <DialogDescription>Gérez les informations du séjour client.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nom du client</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input className="pl-9" value={bookingForm.guestName} onChange={(e) => setBookingForm({...bookingForm, guestName: e.target.value})} />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>WhatsApp / Téléphone</Label>
                    <Input value={bookingForm.guestPhone} onChange={(e) => setBookingForm({...bookingForm, guestPhone: e.target.value})} />
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
                    <Label>Chambre disponible</Label>
                    <Select value={bookingForm.roomId} onValueChange={(val) => setBookingForm({...bookingForm, roomId: val})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choisir..." />
                      </SelectTrigger>
                      <SelectContent>
                        {availableRooms.length > 0 ? (
                          availableRooms.map((room) => (
                            <SelectItem key={room.id} value={room.id}>
                              N° {room.roomNumber} - {room.roomType}
                            </SelectItem>
                          ))
                        ) : (
                          <div className="p-2 text-xs text-center text-muted-foreground">Aucune chambre libre</div>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Montant du séjour ($)</Label>
                    <div className="relative">
                      <CreditCard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input type="number" className="pl-9" value={bookingForm.totalAmount} onChange={(e) => setBookingForm({...bookingForm, totalAmount: e.target.value})} />
                    </div>
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => {
                  setIsAddDialogOpen(false);
                  setIsEditDialogOpen(false);
                }}>Annuler</Button>
                <Button onClick={handleSaveBooking}>Confirmer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Détails du Dossier</DialogTitle>
              </DialogHeader>
              {selectedRes && (
                <div className="space-y-4 py-4">
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground font-bold uppercase">Nom du client</span>
                    <span className="text-sm font-black">{selectedRes.guestName}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground font-bold uppercase">Chambre</span>
                    <span className="text-sm font-black">N° {selectedRes.roomNumber}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground font-bold uppercase">Période</span>
                    <span className="text-sm font-bold">{selectedRes.checkInDate} au {selectedRes.checkOutDate}</span>
                  </div>
                  <div className="flex justify-between border-b pb-2">
                    <span className="text-sm text-muted-foreground font-bold uppercase">Statut</span>
                    <Badge>{selectedRes.status}</Badge>
                  </div>
                  <div className="flex justify-between items-center pt-2 bg-primary/5 p-3 rounded-lg border border-primary/10">
                    <span className="text-xs font-bold uppercase">Total Facturé</span>
                    <span className="text-xl font-black text-primary">{Number(selectedRes.totalAmount).toFixed(2)} $</span>
                  </div>
                </div>
              )}
              <DialogFooter>
                <Button className="w-full" onClick={() => setIsDetailsDialogOpen(false)}>Fermer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Supprimer cette réservation ?</AlertDialogTitle>
                <AlertDialogDescription>
                  Cette action annulera le séjour et libérera la chambre.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setResToDelete(null)}>Annuler</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Supprimer
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </main>
      </SidebarInset>
    </div>
  );
}
