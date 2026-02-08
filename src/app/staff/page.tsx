
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  Shield, 
  Calendar,
  MessageSquare,
  Loader2,
  Send,
  Clock,
  Edit2,
  Trash2,
  RefreshCw
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
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import { 
  useFirestore, 
  useCollection, 
  useMemoFirebase, 
  useUser, 
  setDocumentNonBlocking,
  updateDocumentNonBlocking,
  deleteDocumentNonBlocking
} from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

export default function StaffPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [isMessageOpen, setIsMessageOpen] = useState(false);
  const [isScheduleOpen, setIsScheduleOpen] = useState(false);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  
  const [messageText, setMessageText] = useState("");
  const [scheduleData, setScheduleData] = useState({
    date: "",
    shift: "Matin"
  });

  const [newStaff, setNewStaff] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    role: "Réceptionniste",
    status: "En Service"
  });

  const [editStaffData, setEditStaffData] = useState<any>(null);

  const staffCollection = useMemoFirebase(() => user ? collection(firestore, 'staff') : null, [firestore, user]);
  const { data: staff, isLoading } = useCollection(staffCollection);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    setScheduleData(prev => ({ ...prev, date: today }));
  }, []);

  const handleAddStaff = () => {
    if (!newStaff.firstName || !newStaff.lastName || !newStaff.email || !staffCollection) return;

    const staffId = doc(staffCollection).id;
    const staffRef = doc(firestore, 'staff', staffId);

    const staffData = {
      ...newStaff,
      id: staffId,
      createdAt: new Date().toISOString()
    };

    setDocumentNonBlocking(staffRef, staffData, { merge: true });
    
    setIsAddDialogOpen(false);
    setNewStaff({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      role: "Réceptionniste",
      status: "En Service"
    });

    toast({
      title: "Membre ajouté",
      description: `${staffData.firstName} ${staffData.lastName} a rejoint l'équipe.`,
    });
  };

  const handleUpdateStaff = () => {
    if (!editStaffData || !editStaffData.id) return;

    const { id, ...dataToUpdate } = editStaffData;
    const staffRef = doc(firestore, 'staff', id);
    updateDocumentNonBlocking(staffRef, dataToUpdate);
    
    setIsEditDialogOpen(false);
    setEditStaffData(null);
    toast({
      title: "Profil mis à jour",
      description: `Les détails de ${editStaffData.firstName} ont été sauvegardés.`,
    });
  };

  const handleDeleteStaff = (member: any) => {
    const staffRef = doc(firestore, 'staff', member.id);
    deleteDocumentNonBlocking(staffRef);
    toast({
      variant: "destructive",
      title: "Membre retiré",
      description: `${member.firstName} ${member.lastName} a été supprimé du répertoire.`,
    });
  };

  const handleSendMessage = () => {
    if (!messageText || !selectedStaff) return;
    
    const phone = selectedStaff.phoneNumber?.replace(/\D/g, '');

    if (phone) {
      const encodedMessage = encodeURIComponent(messageText);
      const whatsappUrl = `https://wa.me/${phone}?text=${encodedMessage}`;
      window.open(whatsappUrl, '_blank');

      toast({
        title: "Redirection WhatsApp",
        description: `Ouverture du chat avec ${selectedStaff.firstName}...`,
      });
    } else {
      toast({
        variant: "destructive",
        title: "Pas de téléphone",
        description: `Numéro non trouvé pour ${selectedStaff.firstName}.`,
      });
    }
    
    setIsMessageOpen(false);
    setMessageText("");
  };

  const handleUpdateSchedule = () => {
    if (!selectedStaff) return;
    
    toast({
      title: "Planning mis à jour",
      description: `${selectedStaff.firstName} a été assigné au shift de ${scheduleData.shift} le ${scheduleData.date}.`,
    });
    
    setIsScheduleOpen(false);
  };

  const translateStatus = (status: string) => {
    switch (status) {
      case "On Duty": return "En Service";
      case "On Break": return "En Pause";
      case "Offline": return "Hors ligne";
      default: return status;
    }
  }

  if (isAuthLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredStaff = staff?.filter(member => 
    member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Gestion du Personnel</h1>
          </div>
          
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <UserPlus className="h-4 w-4" /> Ajouter un membre
          </Button>
        </header>

        <main className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un membre..." 
                className="pl-9 bg-background" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="px-3 py-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                {staff?.filter(s => s.status === 'On Duty' || s.status === 'En Service').length || 0} En Service
              </Badge>
              <Badge variant="outline" className="px-3 py-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                {staff?.filter(s => s.status === 'On Break' || s.status === 'En Pause').length || 0} En Pause
              </Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStaff?.map((member) => (
                <Card key={member.id} className="border-none shadow-sm hover:shadow-md transition-shadow group relative overflow-hidden">
                  <div className="absolute top-2 right-2 z-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onSelect={() => {
                          setEditStaffData({...member});
                          setTimeout(() => setIsEditDialogOpen(true), 150);
                        }}>
                          <Edit2 className="h-4 w-4 mr-2" /> Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => {
                          const newStatus = member.status === 'On Duty' || member.status === 'En Service' ? 'En Pause' : 'En Service';
                          const staffRef = doc(firestore, 'staff', member.id);
                          updateDocumentNonBlocking(staffRef, { status: newStatus });
                          toast({
                            title: "Statut changé",
                            description: `${member.firstName} est maintenant ${newStatus}.`,
                          });
                        }}>
                          <RefreshCw className="h-4 w-4 mr-2" /> Basculer statut
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive" onSelect={() => handleDeleteStaff(member)}>
                          <Trash2 className="h-4 w-4 mr-2" /> Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/10">
                      <AvatarFallback>{member.firstName?.charAt(0)}{member.lastName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col pr-8">
                      <CardTitle className="text-lg font-headline truncate">{member.firstName} {member.lastName}</CardTitle>
                      <CardDescription className="flex items-center gap-1 font-medium text-primary">
                        <Shield className="h-3 w-3" /> {member.role || 'Personnel'}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Badge variant={member.status === 'On Duty' || member.status === 'En Service' ? 'default' : 'secondary'} className="text-[10px]">
                        {translateStatus(member.status)}
                      </Badge>
                      <div className="flex items-center text-xs text-muted-foreground gap-1">
                        <Clock className="h-3 w-3" /> Shift: 08:00 - 16:00
                      </div>
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground overflow-hidden">
                        <Mail className="h-3 w-3 shrink-0" /> <span className="truncate">{member.email}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3 shrink-0" /> {member.phoneNumber || 'N/A'}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1 gap-2"
                        onClick={() => {
                          setSelectedStaff(member);
                          setIsMessageOpen(true);
                        }}
                      >
                        <MessageSquare className="h-3 w-3" /> WhatsApp
                      </Button>
                      <Button 
                        variant="secondary" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => {
                          setSelectedStaff(member);
                          setIsScheduleOpen(true);
                        }}
                      >
                        Planning
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Ajouter un membre</DialogTitle>
              <DialogDescription>Créez un profil pour un nouveau membre de l'équipe.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">Prénom</Label>
                  <Input 
                    id="firstName" 
                    value={newStaff.firstName}
                    onChange={(e) => setNewStaff({...newStaff, firstName: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Nom</Label>
                  <Input 
                    id="lastName" 
                    value={newStaff.lastName}
                    onChange={(e) => setNewStaff({...newStaff, lastName: e.target.value})}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Adresse E-mail</Label>
                <Input 
                  id="email" 
                  type="email"
                  value={newStaff.email}
                  onChange={(e) => setNewStaff({...newStaff, email: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">N° Téléphone (Format international)</Label>
                <Input 
                  id="phone" 
                  placeholder="Ex: 33612345678"
                  value={newStaff.phoneNumber}
                  onChange={(e) => setNewStaff({...newStaff, phoneNumber: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Rôle</Label>
                <Select 
                  value={newStaff.role} 
                  onValueChange={(val) => setNewStaff({...newStaff, role: val})}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un rôle" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Manager">Manager</SelectItem>
                    <SelectItem value="Receptionist">Réceptionniste</SelectItem>
                    <SelectItem value="Housekeeping">Gouvernance</SelectItem>
                    <SelectItem value="Concierge">Concierge</SelectItem>
                    <SelectItem value="Security">Sécurité</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleAddStaff} disabled={!newStaff.firstName || !newStaff.lastName || !newStaff.email}>Ajouter</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) setEditStaffData(null);
        }}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Modifier Membre</DialogTitle>
              <DialogDescription>Mettez à jour les informations du profil.</DialogDescription>
            </DialogHeader>
            {editStaffData && (
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="editFirstName">Prénom</Label>
                    <Input 
                      id="editFirstName" 
                      value={editStaffData.firstName}
                      onChange={(e) => setEditStaffData({...editStaffData, firstName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="editLastName">Nom</Label>
                    <Input 
                      id="editLastName" 
                      value={editStaffData.lastName}
                      onChange={(e) => setEditStaffData({...editStaffData, lastName: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editEmail">Adresse E-mail</Label>
                  <Input 
                    id="editEmail" 
                    type="email"
                    value={editStaffData.email}
                    onChange={(e) => setEditStaffData({...editStaffData, email: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editPhone">Téléphone</Label>
                  <Input 
                    id="editPhone" 
                    value={editStaffData.phoneNumber}
                    onChange={(e) => setEditStaffData({...editStaffData, phoneNumber: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="editRole">Rôle</Label>
                  <Select 
                    value={editStaffData.role} 
                    onValueChange={(val) => setEditStaffData({...editStaffData, role: val})}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Choisir un rôle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Receptionist">Réceptionniste</SelectItem>
                      <SelectItem value="Housekeeping">Gouvernance</SelectItem>
                      <SelectItem value="Concierge">Concierge</SelectItem>
                      <SelectItem value="Security">Sécurité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Annuler</Button>
              <Button onClick={handleUpdateStaff}>Enregistrer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isMessageOpen} onOpenChange={setIsMessageOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" /> 
                WhatsApp {selectedStaff?.firstName}
              </DialogTitle>
              <DialogDescription>
                Envoyez un message direct sur le compte WhatsApp de ce membre.
              </DialogDescription>
            </DialogHeader>
            <div className="py-4">
              <Textarea 
                placeholder="Tapez votre message ici..." 
                className="min-h-[120px]"
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsMessageOpen(false)}>Annuler</Button>
              <Button onClick={handleSendMessage} disabled={!messageText} className="gap-2">
                <Send className="h-4 w-4" /> Envoyer via WhatsApp
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isScheduleOpen} onOpenChange={setIsScheduleOpen}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" /> 
                Assigner Shift: {selectedStaff?.firstName}
              </DialogTitle>
              <DialogDescription>
                Attribuez ou modifiez le planning de travail pour cet employé.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="shiftDate">Date</Label>
                <Input 
                  id="shiftDate" 
                  type="date" 
                  value={scheduleData.date}
                  onChange={(e) => setScheduleData({...scheduleData, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="shiftType">Type de Shift</Label>
                <Select 
                  value={scheduleData.shift} 
                  onValueChange={(val) => setScheduleData({...scheduleData, shift: val})}
                >
                  <SelectTrigger id="shiftType">
                    <SelectValue placeholder="Choisir un shift" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Morning">Matin (08:00 - 16:00)</SelectItem>
                    <SelectItem value="Afternoon">Après-midi (16:00 - 00:00)</SelectItem>
                    <SelectItem value="Night">Nuit (00:00 - 08:00)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsScheduleOpen(false)}>Annuler</Button>
              <Button onClick={handleUpdateSchedule}>Confirmer</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </div>
  );
}
