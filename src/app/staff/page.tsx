
"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  Loader2,
  Edit2,
  Trash2,
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
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [memberToDelete, setMemberToDelete] = useState<any>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showEditPassword, setShowEditPassword] = useState(false);
  
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
    if (!newStaff.firstName || !newStaff.lastName || !newStaff.email || !newStaff.phoneNumber || !newStaff.accessCode || !staffCollection) {
      toast({ title: "Champ obligatoire", description: "Veuillez remplir toutes les informations incluant le numéro de téléphone et le mot de passe." });
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
    setNewStaff({
      firstName: "",
      lastName: "",
      email: "",
      phoneNumber: "",
      role: "Réceptionniste",
      status: "En Service",
      accessCode: "" 
    });
    toast({ title: "Compte Créé", description: `Profil de ${staffData.firstName} enregistré.` });
  };

  const handleUpdateStaff = () => {
    if (!editStaffData || !editStaffData.id) return;

    const staffRef = doc(firestore, 'staff', editStaffData.id);
    const { id, ...dataToUpdate } = editStaffData;
    
    updateDocumentNonBlocking(staffRef, dataToUpdate);

    if (dataToUpdate.role === 'Manager') {
      const adminRef = doc(firestore, 'roles_admin', editStaffData.id);
      setDocumentNonBlocking(adminRef, {
        id: editStaffData.id,
        email: editStaffData.email,
        role: 'Administrateur',
        createdAt: new Date().toISOString()
      }, { merge: true });
    }
    
    setIsEditDialogOpen(false);
    setEditStaffData(null);
    toast({ title: "Profil Mis à Jour", description: "Modifications enregistrées." });
  };

  const handleDeleteConfirm = () => {
    if (!memberToDelete) return;
    
    const staffRef = doc(firestore, 'staff', memberToDelete.id);
    deleteDocumentNonBlocking(staffRef);
    
    const adminRef = doc(firestore, 'roles_admin', memberToDelete.id);
    deleteDocumentNonBlocking(adminRef);

    toast({ title: "Accès Révoqué", description: "Le collaborateur a été retiré du système." });
    setMemberToDelete(null);
    setIsDeleteDialogOpen(false);
  };

  if (isAuthLoading || !user) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const filteredStaff = staff?.filter(member => 
    `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) || 
    member.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-slate-50 dark:bg-background">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-transparent">
        <header className="flex h-20 items-center border-b px-8 bg-white/80 dark:bg-background/80 backdrop-blur-xl sticky top-0 z-50 justify-between">
          <div className="flex items-center gap-4">
            <SidebarTrigger />
            <Separator orientation="vertical" className="h-8" />
            <h1 className="font-headline font-black text-xl text-primary tracking-tight">Ressources Humaines</h1>
          </div>
          <Button onClick={() => setIsAddDialogOpen(true)} className="bg-primary hover:bg-primary/90 text-white gap-2 rounded-2xl h-11 px-6 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
            <UserPlus className="h-4 w-4" /> Inviter Collaborateur
          </Button>
        </header>

        <main className="p-6 md:p-10 space-y-8 max-w-[1400px] mx-auto w-full">
          <div className="relative w-full md:w-[400px]">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Rechercher par nom ou rôle..." 
              className="pl-12 h-14 bg-white dark:bg-card border-none shadow-sm rounded-2xl font-bold" 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {isLoading ? (
              <div className="col-span-full flex justify-center py-20"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div>
            ) : filteredStaff?.map((member) => (
              <Card key={member.id} className="border-none shadow-sm hover:shadow-xl transition-all duration-500 rounded-[2.5rem] bg-white dark:bg-card group overflow-hidden relative">
                
                <div className="absolute top-6 right-6 z-20 flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary"
                    onClick={() => { setEditStaffData({...member}); setIsEditDialogOpen(true); }}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-10 w-10 rounded-xl hover:bg-primary/10 text-primary"
                    onClick={() => { setMemberToDelete(member); setIsDeleteDialogOpen(true); }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                <CardHeader className="flex flex-row items-center gap-6 p-8">
                  <Avatar className="h-16 w-16 rounded-2xl shadow-xl border-2 border-white dark:border-slate-800">
                    <AvatarFallback className="bg-primary/10 text-primary font-black uppercase">{member.firstName?.charAt(0)}{member.lastName?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <CardTitle className="text-xl font-black font-headline tracking-tighter leading-none">{member.firstName} {member.lastName}</CardTitle>
                    <Badge variant="outline" className="w-fit text-[9px] font-black uppercase tracking-widest border-primary/20 bg-primary/5 text-primary py-1 px-2 mt-2">
                      {member.role}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="px-8 pb-8 space-y-4">
                  <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                    <Mail className="h-4 w-4 text-primary" /> {member.email}
                  </div>
                  <div className="flex items-center gap-3 text-xs font-bold text-muted-foreground">
                    <Phone className="h-4 w-4 text-primary" /> {member.phoneNumber}
                  </div>
                  <div className={`mt-4 p-4 rounded-2xl border text-[10px] font-black uppercase tracking-widest flex items-center justify-between ${member.status === 'En Service' ? 'bg-emerald-500/5 text-emerald-600 border-emerald-500/10' : 'bg-amber-500/5 text-amber-600 border-amber-500/10'}`}>
                    {member.status}
                    <div className={`h-2 w-2 rounded-full ${member.status === 'En Service' ? 'bg-emerald-500' : 'bg-amber-500'} animate-pulse`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </main>

        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden">
            <div className="bg-primary/5 p-8 border-b border-primary/10">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black font-headline tracking-tighter text-primary">Nouveau Collaborateur</DialogTitle>
                <DialogDescription className="font-bold text-muted-foreground">Identifiants de connexion et coordonnées.</DialogDescription>
              </DialogHeader>
            </div>
            <div className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prénom</Label>
                  <Input value={newStaff.firstName} onChange={(e) => setNewStaff({...newStaff, firstName: e.target.value})} className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom</Label>
                  <Input value={newStaff.lastName} onChange={(e) => setNewStaff({...newStaff, lastName: e.target.value})} className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">E-mail</Label>
                  <Input type="email" value={newStaff.email} onChange={(e) => setNewStaff({...newStaff, email: e.target.value})} className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">N° Téléphone</Label>
                  <Input value={newStaff.phoneNumber} onChange={(e) => setNewStaff({...newStaff, phoneNumber: e.target.value})} className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rôle</Label>
                  <Select value={newStaff.role} onValueChange={(val) => setNewStaff({...newStaff, role: val})}>
                    <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold"><SelectValue /></SelectTrigger>
                    <SelectContent className="rounded-xl">
                      <SelectItem value="Manager">Manager (Accès Total)</SelectItem>
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
                      className="h-12 rounded-xl bg-primary/5 border border-primary/10 font-black text-primary pr-10" 
                    />
                    <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-primary" onClick={() => setShowPassword(!showPassword)}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter className="p-8 bg-muted/5 border-t gap-3">
              <Button variant="ghost" onClick={() => setIsAddDialogOpen(false)} className="flex-1 rounded-2xl font-black uppercase text-[10px] h-12">Annuler</Button>
              <Button onClick={handleAddStaff} className="flex-1 rounded-2xl font-black uppercase text-[10px] h-12 bg-primary text-white">Créer Accès</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px] rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden">
            <div className="bg-primary/5 p-8 border-b border-primary/10">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black font-headline tracking-tighter text-primary">Modifier Profil</DialogTitle>
                <DialogDescription className="font-bold text-muted-foreground">Mise à jour des accès et informations.</DialogDescription>
              </DialogHeader>
            </div>
            {editStaffData && (
              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Prénom</Label>
                    <Input value={editStaffData.firstName} onChange={(e) => setEditStaffData({...editStaffData, firstName: e.target.value})} className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom</Label>
                    <Input value={editStaffData.lastName} onChange={(e) => setEditStaffData({...editStaffData, lastName: e.target.value})} className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">E-mail</Label>
                    <Input value={editStaffData.email} onChange={(e) => setEditStaffData({...editStaffData, email: e.target.value})} className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">N° Téléphone</Label>
                    <Input value={editStaffData.phoneNumber} onChange={(e) => setEditStaffData({...editStaffData, phoneNumber: e.target.value})} className="h-12 rounded-xl bg-muted/30 border-none font-bold" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Rôle</Label>
                    <Select value={editStaffData.role} onValueChange={(val) => setEditStaffData({...editStaffData, role: val})}>
                      <SelectTrigger className="h-12 rounded-xl bg-muted/30 border-none font-bold"><SelectValue /></SelectTrigger>
                      <SelectContent className="rounded-xl">
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Réceptionniste">Réceptionniste</SelectItem>
                        <SelectItem value="Gouvernance">Gouvernance</SelectItem>
                        <SelectItem value="Sécurité">Sécurité</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Changer Mot de passe</Label>
                    <div className="relative">
                      <Input 
                        type={showEditPassword ? "text" : "password"} 
                        value={editStaffData.accessCode || ""} 
                        onChange={(e) => setEditStaffData({...editStaffData, accessCode: e.target.value})} 
                        className="h-12 rounded-xl bg-primary/5 border border-primary/10 font-black text-primary pr-10" 
                        placeholder="Laisser vide pour ne pas changer"
                      />
                      <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-primary" onClick={() => setShowEditPassword(!showEditPassword)}>
                        {showEditPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <DialogFooter className="p-8 bg-muted/5 border-t gap-3">
              <Button variant="ghost" onClick={() => setIsEditDialogOpen(false)} className="flex-1 rounded-2xl font-black uppercase text-[10px] h-12">Annuler</Button>
              <Button onClick={handleUpdateStaff} className="flex-1 rounded-2xl font-black uppercase text-[10px] h-12 bg-primary text-white">Sauvegarder</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <AlertDialogContent className="rounded-[2.5rem] p-10 text-center border-none shadow-2xl">
            <div className="mx-auto h-20 w-20 bg-primary/5 rounded-full flex items-center justify-center text-primary mb-6">
              <Trash2 className="h-10 w-10" />
            </div>
            <AlertDialogHeader>
              <AlertDialogTitle className="text-2xl font-black font-headline tracking-tighter">Révoquer cet accès ?</AlertDialogTitle>
              <AlertDialogDescription className="font-bold text-slate-500 mt-2">
                Le compte de <strong>{memberToDelete?.firstName} {memberToDelete?.lastName}</strong> sera définitivement supprimé.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="sm:justify-center mt-8 gap-3">
              <AlertDialogCancel className="rounded-2xl font-black uppercase text-[10px] h-12 px-8 border-none bg-slate-100">Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteConfirm} className="rounded-2xl font-black uppercase text-[10px] h-12 px-10 bg-primary text-white">Confirmer la suppression</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SidebarInset>
    </div>
  );
}
