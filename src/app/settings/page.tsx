'use client';

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Save, 
  Loader2, 
  Hotel, 
  Clock, 
  Bell, 
  Shield, 
  Globe,
  Mail,
  Phone,
  User,
  Key,
  ShieldCheck,
  Eye,
  EyeOff
} from "lucide-react";
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import { updatePassword, updateEmail } from "firebase/auth";
import { toast } from "@/hooks/use-toast";

function SettingsContent() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'general';
  
  const firestore = useFirestore();
  
  const settingsRef = useMemoFirebase(() => user ? doc(firestore, 'settings', 'general') : null, [firestore, user]);
  const staffProfileRef = useMemoFirebase(() => user ? doc(firestore, 'staff', user.uid) : null, [firestore, user]);
  
  const { data: settings } = useDoc(settingsRef);
  const { data: staffProfile } = useDoc(staffProfileRef);

  const [formData, setFormData] = useState({
    hotelName: "ImaraPMS",
    email: "contact@imarapms.com",
    phone: "+1 234 567 890",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    autoInvoicing: true,
    notificationsEnabled: true,
    currency: "EUR",
  });

  const [accountData, setAccountData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({ ...prev, ...settings }));
    }
  }, [settings]);

  useEffect(() => {
    if (staffProfile) {
      setAccountData(prev => ({
        ...prev,
        firstName: staffProfile.firstName || "",
        lastName: staffProfile.lastName || "",
        email: user?.email || ""
      }));
    }
  }, [staffProfile, user]);

  const handleSaveGeneral = () => {
    if (!settingsRef) return;
    setDocumentNonBlocking(settingsRef, formData, { merge: true });
    toast({
      title: "Paramètres Sauvegardés",
      description: "La configuration de l'hôtel a été mise à jour.",
    });
  };

  const handleUpdateAccount = async () => {
    if (!user || !staffProfileRef) return;
    
    if (accountData.newPassword && accountData.newPassword !== accountData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Erreur de Validation",
        description: "Les mots de passe ne correspondent pas.",
      });
      return;
    }

    setIsUpdatingAccount(true);
    try {
      updateDocumentNonBlocking(staffProfileRef, {
        firstName: accountData.firstName,
        lastName: accountData.lastName,
        email: accountData.email 
      });

      if (accountData.email !== user.email) {
        await updateEmail(user, accountData.email);
      }

      if (accountData.newPassword) {
        await updatePassword(user, accountData.newPassword);
      }

      toast({
        title: "Compte Mis à Jour",
        description: "Vos identifiants administrateur ont été synchronisés.",
      });
      
      setAccountData(prev => ({ ...prev, newPassword: "", confirmPassword: "" }));
    } catch (error: any) {
      const message = error.code === 'auth/requires-recent-login'
        ? "Le protocole de sécurité requiert une connexion récente pour changer les identifiants. Veuillez vous déconnecter et vous reconnecter."
        : error.message || "Échec de la mise à jour des identifiants.";
      
      toast({
        variant: "destructive",
        title: "Erreur de Sécurité",
        description: message,
      });
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  if (isAuthLoading || !user) {
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
        <header className="flex h-16 items-center border-b px-6 bg-background">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-4 h-6" />
          <h1 className="font-headline font-semibold text-xl">Paramètres Système</h1>
        </header>

        <main className="p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6">
          <Tabs defaultValue={defaultTab} className="w-full">
            <div className="overflow-x-auto pb-2">
              <TabsList className="grid w-full grid-cols-4 min-w-[500px]">
                <TabsTrigger value="general" className="gap-2">
                  <Hotel className="h-4 w-4" /> Général
                </TabsTrigger>
                <TabsTrigger value="reservations" className="gap-2">
                  <Clock className="h-4 w-4" /> Politiques
                </TabsTrigger>
                <TabsTrigger value="account" className="gap-2">
                  <ShieldCheck className="h-4 w-4" /> Compte
                </TabsTrigger>
                <TabsTrigger value="system" className="gap-2">
                  <Shield className="h-4 w-4" /> Système
                </TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Informations de l'Hôtel</CardTitle>
                  <CardDescription>Gérez l'identité publique de votre établissement.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="hotelName">Nom de l'Hôtel</Label>
                    <div className="relative">
                      <Hotel className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="hotelName" 
                        className="pl-9"
                        value={formData.hotelName}
                        onChange={(e) => setFormData({...formData, hotelName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">E-mail Officiel</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="email" 
                          type="email"
                          className="pl-9"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">N° de Contact</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="phone" 
                          className="pl-9"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 flex justify-end p-4">
                  <Button onClick={handleSaveGeneral} className="gap-2">
                    <Save className="h-4 w-4" /> Sauvegarder
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="reservations">
              <Card>
                <CardHeader>
                  <CardTitle>Politiques de Réservation</CardTitle>
                  <CardDescription>Définissez les horaires d'arrivée/départ et le comportement des réservations.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label>Heure d'Arrivée Standard</Label>
                      <Input 
                        type="time" 
                        value={formData.checkInTime}
                        onChange={(e) => setFormData({...formData, checkInTime: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Heure de Départ Standard</Label>
                      <Input 
                        type="time" 
                        value={formData.checkOutTime}
                        onChange={(e) => setFormData({...formData, checkOutTime: e.target.value})}
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Facturation Automatique</Label>
                      <p className="text-xs text-muted-foreground">Générer les factures dès l'arrivée d'un client.</p>
                    </div>
                    <Switch 
                      checked={formData.autoInvoicing}
                      onCheckedChange={(val) => setFormData({...formData, autoInvoicing: val})}
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 flex justify-end p-4">
                  <Button onClick={handleSaveGeneral} className="gap-2">
                    <Save className="h-4 w-4" /> Sauvegarder
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="account">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" /> Profil Administrateur
                    </CardTitle>
                    <CardDescription>Mettez à jour vos informations personnelles utilisées dans le système.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">Prénom</Label>
                        <Input 
                          id="firstName" 
                          value={accountData.firstName} 
                          onChange={(e) => setAccountData({...accountData, firstName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Nom</Label>
                        <Input 
                          id="lastName" 
                          value={accountData.lastName} 
                          onChange={(e) => setAccountData({...accountData, lastName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loginEmail">E-mail de Connexion</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="loginEmail" 
                          type="email"
                          className="pl-9"
                          value={accountData.email} 
                          onChange={(e) => setAccountData({...accountData, email: e.target.value})}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-primary" /> Identifiants de Sécurité
                    </CardTitle>
                    <CardDescription>Mettez à jour votre mot de passe d'accès au système.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPass">Nouveau Mot de Passe</Label>
                        <div className="relative">
                          <Input 
                            id="newPass" 
                            type={showPasswords ? 'text' : 'password'} 
                            value={accountData.newPassword}
                            onChange={(e) => setAccountData({...accountData, newPassword: e.target.value})}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                            onClick={() => setShowPasswords(!showPasswords)}
                          >
                            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPass">Confirmer Mot de Passe</Label>
                        <div className="relative">
                          <Input 
                            id="confirmPass" 
                            type={showPasswords ? 'text' : 'password'}
                            value={accountData.confirmPassword}
                            onChange={(e) => setAccountData({...accountData, confirmPassword: e.target.value})}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                            onClick={() => setShowPasswords(!showPasswords)}
                          >
                            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/20 flex justify-end p-4">
                    <Button onClick={handleUpdateAccount} disabled={isUpdatingAccount} className="gap-2">
                      {isUpdatingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Synchroniser Identifiants
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            </TabsContent>

            <TabsContent value="system">
              <Card>
                <CardHeader>
                  <CardTitle>Système & Préférences</CardTitle>
                  <CardDescription>Comportement global de l'application.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-accent" /> Notifications Push
                      </Label>
                      <p className="text-xs text-muted-foreground">Recevoir des alertes pour les nouvelles réservations.</p>
                    </div>
                    <Switch 
                      checked={formData.notificationsEnabled}
                      onCheckedChange={(val) => setFormData({...formData, notificationsEnabled: val})}
                    />
                  </div>
                  <Separator />
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-accent" /> Devise de Base
                    </Label>
                    <Input 
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value.toUpperCase()})}
                      placeholder="Ex: USD, EUR, CFA"
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 flex justify-end p-4">
                  <Button onClick={handleSaveGeneral} className="gap-2">
                    <Save className="h-4 w-4" /> Sauvegarder
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}
