
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  Mail, 
  Phone, 
  MoreHorizontal, 
  UserPlus, 
  Loader2, 
  MapPin, 
  Heart,
  Trash2,
  Edit2,
  Calendar
} from "lucide-react";
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
import { Textarea } from "@/components/ui/textarea";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu";
import { useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

export default function ClientsPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<any>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [newClient, setNewClient] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    address: "",
    preferences: "",
    loyalty: "Nouveau"
  });

  const firestore = useFirestore();
  
  const clientsCollection = useMemoFirebase(() => user ? collection(firestore, 'clients') : null, [firestore, user]);
  const { data: clients, isLoading } = useCollection(clientsCollection);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  const getLoyaltyColor = (status: string) => {
    switch (status) {
      case "Diamond": return "bg-indigo-500/10 text-indigo-600 border-indigo-500/20";
      case "Gold": return "bg-amber-500/10 text-amber-600 border-amber-500/20";
      case "Silver": return "bg-slate-500/10 text-slate-600 border-slate-500/20";
      default: return "bg-emerald-500/10 text-emerald-600 border-emerald-500/20";
    }
  };

  const translateLoyalty = (status: string) => {
    switch (status) {
      case "New": return "Nouveau";
      default: return status;
    }
  }

  const handleRegisterClient = () => {
    if (!newClient.firstName || !newClient.lastName || !newClient.email || !clientsCollection) return;

    const clientData = {
      ...newClient,
      createdAt: new Date().toISOString(),
      stays: 0,
      lastVisit: "N/A"
    };

    addDocumentNonBlocking(clientsCollection, clientData);
    
    setIsAddDialogOpen(false);
    setNewClient({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      address: "",
      preferences: "",
      loyalty: "Nouveau"
    });

    toast({
      title: "Client Enregistré",
      description: `${clientData.firstName} ${clientData.lastName} a été ajouté au registre.`,
    });
  };

  const handleDeleteConfirm = () => {
    if (!clientToDelete) return;
    
    const clientRef = doc(firestore, 'clients', clientToDelete.id);
    deleteDocumentNonBlocking(clientRef);
    
    toast({
      variant: "destructive",
      title: "Client Retiré",
      description: `Le dossier pour ${clientToDelete.firstName} ${clientToDelete.lastName} a été supprimé.`,
    });
    
    setClientToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  if (!mounted || isAuthLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredClients = clients?.filter(client => 
    `${client.firstName} ${client.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phoneNumber?.includes(searchTerm)
  );

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Registre des Voyageurs</h1>
          </div>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                <UserPlus className="h-4 w-4" /> Enregistrer un Client
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Inscription Client</DialogTitle>
                <DialogDescription>Créez un profil pour un voyageur.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="firstName">Prénom</Label>
                    <Input 
                      id="firstName" 
                      value={newClient.firstName}
                      onChange={(e) => setNewClient({...newClient, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="lastName">Nom</Label>
                    <Input 
                      id="lastName" 
                      value={newClient.lastName}
                      onChange={(e) => setNewClient({...newClient, lastName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Adresse E-mail</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="email" 
                        type="email"
                        className="pl-9"
                        value={newClient.email}
                        onChange={(e) => setNewClient({...newClient, email: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">N° Téléphone</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="phone" 
                        className="pl-9"
                        value={newClient.phoneNumber}
                        onChange={(e) => setNewClient({...newClient, phoneNumber: e.target.value})}
                      />
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Adresse physique</Label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input 
                      id="address" 
                      className="pl-9"
                      value={newClient.address}
                      onChange={(e) => setNewClient({...newClient, address: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferences">Préférences & Notes</Label>
                  <div className="relative">
                    <Heart className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea 
                      id="preferences" 
                      className="pl-9 min-h-[80px]"
                      value={newClient.preferences}
                      onChange={(e) => setNewClient({...newClient, preferences: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
                <Button onClick={handleRegisterClient} disabled={!newClient.firstName || !newClient.lastName || !newClient.email}>Sauvegarder</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <main className="p-6">
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher..." 
                  className="pl-9 bg-background" 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Client</TableHead>
                  <TableHead>Coordonnées</TableHead>
                  <TableHead>Statut Fidélité</TableHead>
                  <TableHead>Séjours</TableHead>
                  <TableHead>Dernière Visite</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      <div className="flex items-center justify-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" /> Accès au registre...
                      </div>
                    </TableCell>
                  </TableRow>
                ) : filteredClients && filteredClients.length > 0 ? (
                  filteredClients.map((client) => (
                    <TableRow key={client.id} className="hover:bg-muted/30 transition-colors">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback>{client.firstName?.charAt(0)}{client.lastName?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="font-medium">{client.firstName} {client.lastName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col text-xs space-y-1">
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="h-3 w-3" /> {client.email}
                          </div>
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="h-3 w-3" /> {client.phoneNumber}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={getLoyaltyColor(client.loyalty)}>
                          {translateLoyalty(client.loyalty)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{client.stays || 0}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{client.lastVisit || 'Jamais'}</TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Edit2 className="mr-2 h-4 w-4" /> Modifier Profil
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Calendar className="mr-2 h-4 w-4" /> Historique Résas
                            </DropdownMenuItem>
                            <Separator className="my-1" />
                            <DropdownMenuItem 
                              onSelect={() => {
                                setClientToDelete(client);
                                setTimeout(() => setIsDeleteDialogOpen(true), 150);
                              }} 
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Supprimer Profil
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center text-muted-foreground">
                      {searchTerm ? "Aucun client." : "Le registre est vide."}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </main>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Êtes-vous absolument sûr ?</AlertDialogTitle>
              <AlertDialogDescription>
                Ceci supprimera définitivement le profil de <strong>{clientToDelete?.firstName} {clientToDelete?.lastName}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setClientToDelete(null)}>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Supprimer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </div>
  );
}
