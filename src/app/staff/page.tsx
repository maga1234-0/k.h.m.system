
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
  Clock,
  MessageSquare,
  Loader2,
  Send,
  Edit2,
  Trash2,
  RefreshCw,
  Key,
  Copy,
  Check,
  X
} from "lucide-react";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter,
  DialogDescription,
  DialogClose
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
import { Logo } from "@/components/ui/logo";

export default function StaffPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStaff, setSelectedStaff] = useState<any>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  const [newStaff, setNewStaff] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phoneNumber: "",
    role: "Réceptionniste",
    status: "En Service",
    accessCode: ""
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
    if (isAddDialogOpen) {
      const code = Math.floor(100000 + Math.random() * 900000).toString();
      setNewStaff(prev => ({ 
        ...prev, 
        accessCode: code,
        firstName: "",
        lastName: "",
        email: "",
        phoneNumber: "",
        role: "Réceptionniste"
      }));
    }
  }, [isAddDialogOpen]);

  const handleAddStaff = () => {
    if (!newStaff.firstName || !newStaff.lastName || !newStaff.email || !staffCollection) {
      toast({ title: "Champs requis", description: "Veuillez remplir le nom et l'email." });
      return;
    }

    const staffId = doc(staffCollection).id;
    const staffRef = doc(firestore, 'staff', staffId);

    const staffData = {
      ...newStaff,
      id: staffId,
      createdAt: new Date().toISOString()
    };

    setDocumentNonBlocking(staffRef, staffData, { merge: true });
    
    setIsAddDialogOpen(false);
    toast({
      title: "Membre ajouté",
      description: `Le profil de ${staffData.firstName} a été créé. Code: ${staffData.accessCode}`,
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
      description: `Modifications enregistrées.`,
    });
  };

  const handleDeleteConfirm = () => {
    if (!memberToDelete) return;
    const staffRef = doc(firestore, 'staff', memberToDelete.id);
    deleteDocumentNonBlocking(staffRef);
    
    toast({
      title: "Membre retiré",
      description: "Le profil a été supprimé du registre.",
    });
    
    setMemberToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  const copyToClipboard = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast({ title: "Code copié", description: "Le code d'accès est prêt à être partagé." });
  };

  if (isAuthLoading || !user) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const filteredStaff = staff?.filter(member => 
    member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-[#f8fafc] dark:bg-background">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-transparent">
        <header className="flex h-20 items-center border-b px-8 bg-white/80 dark:bg-background/80 backdrop-blur-xl sticky top-0 z-50 justify-between">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-8" />
            <div className="flex flex-col">
              <h1 className="font-headline font-black text-xl text-primary tracking-tight">Ressources Humaines</h1>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Gestion des accès et rôles</span>
            </div>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
            <UserPlus className="h-4 w-4" /> Nouveau Membre
          </Button>
        </header>

        <main className="p-6 md:p-10 space-y-8 max-w-[1400px] mx-auto w-full">
          <div className="flex flex-col md:flex-row gap-6 items-center justify-between">
            <div className="relative w-full md:w-[400px]">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Rechercher un collaborateur..." 
                className="pl-12 h-14 bg-white dark:bg-card border-none shadow-sm rounded-2xl font-bold" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-4">
              <div className="flex flex-col items-center px-6 py-3 bg-white dark:bg-card rounded-2xl shadow-sm border border-emerald-500/10">
                <span className="text-2xl font-black text-emerald-600">{staff?.filter(s => s.status === 'En Service').length || 0}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">En Service</span>
              </div>
              <div className="flex flex-col items-center px-6 py-3 bg-white dark:bg-card rounded-2xl shadow-sm border border-amber-500/10">
                <span className="text-2xl font-black text-amber-600">{staff?.filter(s => s.status === 'En Pause').length || 0}</span>
                <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground">En Pause</span>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : (
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStaff?.map((member) => (
                <Card key={member.id} className="border-none shadow-sm hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] bg-white dark:bg-card group overflow-hidden">
                  <div className="absolute top-4 right-4 z-20">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/5 text-muted-foreground hover:text-primary">
                          <Edit2 className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-none">
                        <DropdownMenuItem onSelect={() => { setEditStaffData({...member}); setIsEditDialogOpen(true); }} className="rounded-xl font-bold text-xs uppercase py-3"><Edit2 className="h-4 w-4 mr-2" /> Modifier</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => {
                          const newStatus = member.status === 'En Service' ? 'En Pause' : 'En Service';
                          updateDocumentNonBlocking(doc(firestore, 'staff', member.id), { status: newStatus });
                          toast({ title: "Statut actualisé" });
                        }} className="rounded-xl font-bold text-xs uppercase py-3"><RefreshCw className="h-4 w-4 mr-2" /> Changer Statut</DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-primary rounded-xl font-bold text-xs uppercase py-3" onSelect={() => { setMemberToDelete(member); setIsDeleteDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" /> Supprimer</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <CardHeader className="flex flex-row items-center gap-6 p-8">
                    <div className="relative">
                      <Avatar className="h-20 w-20 rounded-3xl shadow-xl border-4 border-white dark:border-slate-800">
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl font-black">{member.firstName?.charAt(0)}{member.lastName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-white dark:border-slate-800 shadow-md ${member.status === 'En Service' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <CardTitle className="text-2xl font-black font-headline tracking-tighter">{member.firstName} {member.lastName}</CardTitle>
                      <Badge variant="outline" className="w-fit text-[9px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary py-1 px-3">
                        {member.role || 'Personnel'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-8 pb-8 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 bg-slate-50 dark:bg-background rounded-3xl border border-slate-100 dark:border-slate-800">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">Code d'accès</span>
                        <div className="flex items-center justify-between">
                          <span className="font-black text-primary font-mono text-lg tracking-widest">••••••</span>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-primary" onClick={() => copyToClipboard(member.accessCode)}>
                            {copiedCode === member.accessCode ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>
                      </div>
                      <div className="p-4 bg-slate-50 dark:bg-background rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center items-center">
                        <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-2">Permissions</span>
                        <Logo size={24} className={member.role === 'Manager' ? 'text-primary' : 'text-muted-foreground opacity-20'} />
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t">
                      <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                        <Mail className="h-4 w-4 text-primary" /> {member.email}
                      </div>
                      <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                        <Phone className="h-4 w-4 text-primary" /> {member.phoneNumber || 'Non renseigné'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden bg-background">
            <div className="bg-primary/5 p-8 border-b border-primary/10">
              <DialogHeader>
                <div className="flex items-center justify-between">
                  <DialogTitle className="text-3xl font-black font-headline tracking-tighter text-primary">Nouveau Collaborateur</DialogTitle>
                  <DialogClose asChild>
                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-muted-foreground hover:text-primary">
                      <X className="h-5 w-5" />
                    </Button>
                  </DialogClose>
                </div>
                <DialogDescription className="font-bold text-muted-foreground mt-2">
                  Un code d'accès sera automatiquement généré pour la première connexion.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Prénom</Label>
                  <Input 
                    value={newStaff.firstName} 
                    onChange={(e) => setNewStaff({...newStaff, firstName: e.target.value})} 
                    className="h-12 rounded-2xl bg-muted/30 border-none font-bold focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Nom</Label>
                  <Input 
                    value={newStaff.lastName} 
                    onChange={(e) => setNewStaff({...newStaff, lastName: e.target.value})} 
                    className="h-12 rounded-2xl bg-muted/30 border-none font-bold focus:ring-2 focus:ring-primary/20" 
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">E-mail Professionnel</Label>
                <Input 
                  type="email" 
                  value={newStaff.email} 
                  onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} 
                  className="h-12 rounded-2xl bg-muted/30 border-none font-bold focus:ring-2 focus:ring-primary/20" 
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Rôle & Accès</Label>
                  <Select value={newStaff.role} onValueChange={(val) => setNewStaff({...newStaff, role: val})}>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-none font-bold focus:ring-2 focus:ring-primary/20">
                      <SelectValue placeholder="Sélectionner" />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="Manager">Manager (Accès Total)</SelectItem>
                      <SelectItem value="Réceptionniste">Réceptionniste</SelectItem>
                      <SelectItem value="Gouvernance">Gouvernance</SelectItem>
                      <SelectItem value="Sécurité">Sécurité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1 text-muted-foreground">Code d'Accès</Label>
                  <div className="h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center font-black text-primary tracking-widest text-xl shadow-inner">
                    {newStaff.accessCode}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-8 bg-muted/10 border-t flex flex-col sm:flex-row gap-3">
              <DialogClose asChild>
                <Button variant="ghost" className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest h-14">
                  Annuler
                </Button>
              </DialogClose>
              <Button 
                onClick={handleAddStaff} 
                disabled={!newStaff.firstName || !newStaff.email} 
                className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest h-14 shadow-lg shadow-primary/20"
              >
                Valider l'inscription
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={(open) => { setIsEditDialogOpen(open); if (!open) setEditStaffData(null); }}>
          <DialogContent className="sm:max-w-[500px] rounded-[3rem] p-0 border-none shadow-2xl overflow-hidden bg-background">
            <div className="bg-primary/5 p-8 border-b border-primary/10">
              <DialogHeader><DialogTitle className="text-3xl font-black font-headline tracking-tighter text-primary">Modifier Profil</DialogTitle></DialogHeader>
            </div>
            {editStaffData && (
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prénom</Label>
                    <Input value={editStaffData.firstName} onChange={(e) => setEditStaffData({...editStaffData, firstName: e.target.value})} className="h-12 rounded-2xl bg-muted/30 border-none font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom</Label>
                    <Input value={editStaffData.lastName} onChange={(e) => setEditStaffData({...editStaffData, lastName: e.target.value})} className="h-12 rounded-2xl bg-muted/30 border-none font-bold" />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rôle</Label>
                  <Select value={editStaffData.role} onValueChange={(val) => setEditStaffData({...editStaffData, role: val})}>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-none font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-2xl"><SelectItem value="Manager">Manager</SelectItem><SelectItem value="Réceptionniste">Réceptionniste</SelectItem><SelectItem value="Gouvernance">Gouvernance</SelectItem><SelectItem value="Sécurité">Sécurité</SelectItem></SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="p-8 bg-muted/10 border-t flex gap-3">
              <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest h-14">Annuler</Button>
              <Button onClick={handleUpdateStaff} className="flex-1 rounded-2xl font-black uppercase text-[10px] tracking-widest h-14">Enregistrer</Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10 text-center">
            <div className="mx-auto h-20 w-20 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-6"><Logo size={50} /></div>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black font-headline tracking-tighter">Retirer du personnel ?</AlertDialogTitle>
              <AlertDialogDescription className="font-bold text-slate-500">Le compte de {memberToDelete?.firstName} sera désactivé et ses accès révoqués.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center mt-6 gap-2">
              <AlertDialogCancel className="rounded-2xl font-black uppercase text-[10px] tracking-widest h-12 border-none bg-slate-50">Garder</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="rounded-2xl font-black uppercase text-[10px] tracking-widest h-12 px-10 bg-primary shadow-lg shadow-primary/20">Confirmer le retrait</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </div>
  );
}
