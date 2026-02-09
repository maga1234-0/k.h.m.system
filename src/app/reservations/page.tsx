
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
  Calendar, 
  Plus, 
  MoreHorizontal,
  CheckCircle2,
  Clock,
  XCircle,
  LogOut,
  Loader2,
  UserCheck,
  Ban,
  Info,
  Mail,
  Phone,
  MessageSquare,
  Trash2,
  Filter,
  AlertCircle
} from "lucide-react";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger
} from "@/components/ui/dropdown-menu";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
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
  setDocumentNonBlocking,
  useUser 
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

export default function ReservationsPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedResId, setSelectedResId] = useState<string | null>(null);
  const [resToDelete, setResToDelete] = useState<any>(null);
  
  const [newBooking, setNewBooking] = useState({
    guestName: "",
    guestEmail: "",
    guestPhone: "",
    roomId: "",
    checkInDate: "",
    checkOutDate: "",
    numberOfGuests: 1,
    totalAmount: 0
  });

  const firestore = useFirestore();
  const resCollection = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  const roomsCollection = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  
  const { data: reservations, isLoading: isResLoading } = useCollection(resCollection);
  const { data: rooms } = useCollection(roomsCollection);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !user) router.push('/login');
  }, [user, isAuthLoading, router]);

  const handleCreateBooking = () => {
    if (!newBooking.guestName || !newBooking.roomId || !resCollection) return;
    const selectedRoom = rooms?.find(r => r.id === newBooking.roomId);
    if (!selectedRoom) return;

    const reservationData = { ...newBooking, roomNumber: selectedRoom.roomNumber, status: "Confirmed", createdAt: new Date().toISOString() };
    addDocumentNonBlocking(resCollection, reservationData);
    updateDocumentNonBlocking(doc(firestore, 'rooms', selectedRoom.id), { status: "Occupied" });

    setIsAddDialogOpen(false);
    setNewBooking({ guestName: "", guestEmail: "", guestPhone: "", roomId: "", checkInDate: "", checkOutDate: "", numberOfGuests: 1, totalAmount: 0 });
    toast({ title: "Réservation Créée", description: `Nouvelle réservation confirmée pour ${reservationData.guestName}.` });
  };

  if (!mounted || isAuthLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const availableRooms = rooms?.filter(r => r.status === 'Available') || [];

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
          <Button onClick={() => setIsAddDialogOpen(true)} size="sm" className="bg-primary gap-2">
            <Plus className="h-4 w-4" /> Nouvelle réservation
          </Button>
        </header>

        <main className="p-6">
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-muted/20 flex gap-4 items-center">
              <div className="relative w-80">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Rechercher..." className="pl-9 bg-background" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nom du client</TableHead>
                  <TableHead>Chambre</TableHead>
                  <TableHead>Statut</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reservations?.map((res) => (
                  <TableRow key={res.id}>
                    <TableCell className="font-medium">{res.guestName}</TableCell>
                    <TableCell>N° {res.roomNumber}</TableCell>
                    <TableCell><Badge>{res.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => { setSelectedResId(res.id); setIsDetailsDialogOpen(true); }}>
                        <Info className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </main>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Créer une Réservation</DialogTitle>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label>Nom du client</Label>
                <Input value={newBooking.guestName} onChange={(e) => setNewBooking({...newBooking, guestName: e.target.value})} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Arrivée</Label>
                  <Input type="date" value={newBooking.checkInDate} onChange={(e) => setNewBooking({...newBooking, checkInDate: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Départ</Label>
                  <Input type="date" value={newBooking.checkOutDate} onChange={(e) => setNewBooking({...newBooking, checkOutDate: e.target.value})} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Chambre</Label>
                <Select value={newBooking.roomId} onValueChange={(val) => setNewBooking({...newBooking, roomId: val})}>
                  <SelectTrigger><SelectValue placeholder="Choisir..." /></SelectTrigger>
                  <SelectContent>
                    {availableRooms.map((room) => (
                      <SelectItem key={room.id} value={room.id}>N° {room.roomNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleCreateBooking}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </div>
  );
}
