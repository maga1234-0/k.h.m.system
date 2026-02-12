
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
  Lock,
  Copy,
  Check,
  X,
  MoreHorizontal,
  Eye,
  EyeOff
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  
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

  const handleAddStaff = () => {
    if (!newStaff.firstName || !newStaff.lastName || !newStaff.email || !newStaff.accessCode || !staffCollection) {
      toast({ title: "Champs requis", description: "Veuillez remplir tous les champs, y compris le mot de passe." });
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
      description: `Le profil de ${staffData.firstName} a été créé avec succès.`,
    });
  };

  const handleUpdateStaff = () => {
    if (!editStaffData || !editStaffData.id) return;

    const staffRef = doc(firestore, 'staff', editStaffData.id);
    const { id, ...dataToUpdate } = editStaffData;
    
    updateDocumentNonBlocking(staffRef, dataToUpdate);
    
    setIsEditDialogOpen(false);
    setEditStaffData(null);
    toast({
      title: "Profil mis à jour",
      description: `Les modifications pour ${editStaffData.firstName} ont été enregistrées.`,
    });
  };

  const handleDeleteConfirm = () => {
    if (!memberToDelete) return;
    const staffRef = doc(firestore, 'staff', memberToDelete.id);
    deleteDocumentNonBlocking(staffRef);
    
    const adminRef = doc(firestore, 'roles_admin', memberToDelete.id);
    deleteDocumentNonBlocking(adminRef);

    toast({
      title: "Membre retiré",
      description: "Le profil a été supprimé du registre avec succès.",
    });
    
    setMemberToDelete(null);
    setIsDeleteDialogOpen(false);
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
              <h1 className="font-headline font-black text-xl text-primary tracking-tight leading-none">Ressources Humaines</h1>
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mt-1">Gestion des accès et rôles</span>
            </div>
          </div>
          <Button onClick={() => {
            setNewStaff({
              firstName: "",
              lastName: "",
              email: "",
              phoneNumber: "",
              role: "Réceptionniste",
              status: "En Service",
              accessCode: ""
            });
            setIsAddDialogOpen(true);
          }} className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2 rounded-2xl h-12 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 transition-transform active:scale-95">
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
              {filteredStaff?.map((member, idx) => (
                <Card key={member.id} className="border-none shadow-sm hover:shadow-2xl transition-all duration-500 rounded-[2.5rem] bg-white dark:bg-card group overflow-hidden animate-in fade-in slide-in-from-bottom-4 relative" style={{ animationDelay: `${idx * 100}ms` }}>
                  
                  {/* Actions Rapides */}
                  <div className="absolute top-6 right-6 z-20 flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary transition-all active:scale-90"
                      onClick={() => { 
                        setEditStaffData({...member}); 
                        setIsEditDialogOpen(true); 
                      }}
                    >
                      <Edit2 className="h-5 w-5" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary transition-all active:scale-90"
                      onClick={() => { 
                        setMemberToDelete(member); 
                        setIsDeleteDialogOpen(true); 
                      }}
                    >
                      <Trash2 className="h-5 w-5" />
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-xl hover:bg-primary/5 text-muted-foreground hover:text-primary">
                          <MoreHorizontal className="h-5 w-5" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl border-none">
                        <DropdownMenuItem onSelect={() => {
                          const newStatus = member.status === 'En Service' ? 'En Pause' : 'En Service';
                          updateDocumentNonBlocking(doc(firestore, 'staff', member.id), { status: newStatus });
                          toast({ title: "Statut actualisé" });
                        }} className="rounded-xl font-bold text-xs uppercase py-3 cursor-pointer">
                          <RefreshCw className="h-4 w-4 mr-2" /> Changer Statut
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  <CardHeader className="flex flex-row items-center gap-6 p-8">
                    <div className="relative">
                      <Avatar className="h-20 w-20 rounded-3xl shadow-xl border-4 border-white dark:border-slate-800 transition-transform group-hover:scale-105">
                        <AvatarFallback className="bg-primary/10 text-primary text-2xl font-black">{member.firstName?.charAt(0)}{member.lastName?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-1 -right-1 h-6 w-6 rounded-full border-4 border-white dark:border-slate-800 shadow-md ${member.status === 'En Service' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    </div>
                    <div className="flex flex-col space-y-1">
                      <CardTitle className="text-2xl font-black font-headline tracking-tighter leading-none">{member.firstName} {member.lastName}</CardTitle>
                      <Badge variant="outline" className="w-fit text-[9px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary py-1 px-3 mt-2">
                        {member.role || 'Personnel'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="px-8 pb-8 space-y-6">
                    <div className="p-4 bg-slate-50 dark:bg-background rounded-3xl border border-slate-100 dark:border-slate-800 group-hover:border-primary/20 transition-colors">
                      <span className="text-[8px] font-black uppercase tracking-[0.2em] text-muted-foreground block mb-2">Mot de passe assigné</span>
                      <div className="flex items-center justify-between">
                        <span className="font-black text-primary font-mono text-sm tracking-wider">••••••••</span>
                        <div className="flex gap-2">
                           <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[8px] font-black">MANAGER-ONLY</Badge>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-3 pt-4 border-t border-slate-100 dark:border-slate-800">
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

        {/* Dialogues */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden bg-background">
            <div className="bg-primary/5 p-8 border-b border-primary/10">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black font-headline tracking-tighter text-primary">Nouveau Collaborateur</DialogTitle>
                <DialogDescription className="font-bold text-muted-foreground mt-2">L'administrateur définit le mot de passe initial.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prénom</Label>
                  <Input value={newStaff.firstName} onChange={(e) => setNewStaff({...newStaff, firstName: e.target.value})} className="h-12 rounded-2xl bg-muted/30 border-none font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom</Label>
                  <Input value={newStaff.lastName} onChange={(e) => setNewStaff({...newStaff, lastName: e.target.value})} className="h-12 rounded-2xl bg-muted/30 border-none font-bold" />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">E-mail Professionnel</Label>
                <Input type="email" value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} className="h-12 rounded-2xl bg-muted/30 border-none font-bold" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rôle</Label>
                  <Select value={newStaff.role} onValueChange={(val) => setNewStaff({...newStaff, role: val})}>
                    <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-none font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="Manager">Manager</SelectItem>
                      <SelectItem value="Réceptionniste">Réceptionniste</SelectItem>
                      <SelectItem value="Gouvernance">Gouvernance</SelectItem>
                      <SelectItem value="Sécurité">Sécurité</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Mot de passe</Label>
                  <div className="relative">
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      value={newStaff.accessCode} 
                      onChange={(e) => setNewStaff({...newStaff, accessCode: e.target.value})} 
                      className="h-12 rounded-2xl bg-primary/5 border border-primary/10 font-black text-primary pr-10" 
                      placeholder="Assigner MDP"
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-primary" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="p-8 bg-muted/5 border-t gap-3">
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="flex-1 rounded-2xl font-black uppercase text-[10px] h-14">Annuler</Button>
              <Button onClick={handleAddStaff} className="flex-1 rounded-2xl font-black uppercase text-[10px] h-14 shadow-lg shadow-primary/20">Créer le compte</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden bg-background">
            <div className="bg-primary/5 p-8 border-b border-primary/10">
              <DialogHeader>
                <DialogTitle className="text-3xl font-black font-headline tracking-tighter text-primary">Modifier Collaborateur</DialogTitle>
                <DialogDescription className="font-bold text-muted-foreground mt-2">Mise à jour des informations et du mot de passe.</DialogDescription>
              </DialogHeader>
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
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rôle</Label>
                    <Select value={editStaffData.role} onValueChange={(val) => setEditStaffData({...editStaffData, role: val})}>
                      <SelectTrigger className="h-12 rounded-2xl bg-muted/30 border-none font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-2xl">
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Réceptionniste">Réceptionniste</SelectItem>
                        <SelectItem value="Gouvernance">Gouvernance</SelectItem>
                        <SelectItem value="Sécurité">Sécurité</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nouveau Mot de passe</Label>
                    <Input 
                      type="text" 
                      value={editStaffData.accessCode} 
                      onChange={(e) => setEditStaffData({...editStaffData, accessCode: e.target.value})} 
                      className="h-12 rounded-2xl bg-primary/5 border border-primary/10 font-bold text-primary" 
                    />
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="p-8 bg-muted/5 border-t gap-3">
              <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="flex-1 rounded-2xl font-black uppercase text-[10px] h-14">Annuler</Button>
              <Button onClick={handleUpdateStaff} className="flex-1 rounded-2xl font-black uppercase text-[10px] h-14 shadow-lg shadow-primary/20">Sauvegarder</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="rounded-[2.5rem] border-none shadow-2xl p-10 text-center">
            <div className="mx-auto h-20 w-20 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-6">
              <Trash2 className="h-10 w-10" />
            </div>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black font-headline tracking-tighter">Retirer du personnel ?</AlertDialogTitle>
              <AlertDialogDescription className="font-bold text-slate-500 mt-2">
                Le compte de <strong>{memberToDelete?.firstName} {memberToDelete?.lastName}</strong> sera définitivement supprimé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center mt-8 gap-3">
              <AlertDialogCancel className="rounded-2xl font-black uppercase text-[10px] h-14 px-8 border-none bg-slate-100">Garder</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="rounded-2xl font-black uppercase text-[10px] h-14 px-10 bg-primary shadow-lg shadow-primary/20 text-white">
                Confirmer
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </div>
  );
}
