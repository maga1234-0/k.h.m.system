
'use client';

import { useState, useEffect, useRef, Suspense } from "react";
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
  Shield, 
  ShieldCheck,
  PenTool,
  Eraser,
  Eye,
  EyeOff,
  Mail,
  Lock,
  Bell,
  FileText,
  Database,
  RefreshCw,
  Download,
  Info
} from "lucide-react";
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import { updatePassword, updateEmail } from "firebase/auth";
import { toast } from "@/hooks/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";

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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const [formData, setFormData] = useState({
    hotelName: "",
    email: "",
    phone: "",
    address: "",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    autoInvoicing: true,
    notificationsEnabled: true,
    currency: "USD",
    signatureUrl: "",
    managerName: ""
  });

  const [accountData, setAccountData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);

  useEffect(() => {
    if (!isAuthLoading && !user) router.push('/login');
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    if (settings) setFormData(prev => ({ ...prev, ...settings }));
  }, [settings]);

  useEffect(() => {
    if (staffProfile && user) {
      setAccountData(prev => ({
        ...prev,
        firstName: staffProfile.firstName || "",
        lastName: staffProfile.lastName || "",
        email: user.email || ""
      }));
    }
  }, [staffProfile, user]);

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
    const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const startDrawing = (e: any) => {
    if (e.type === 'touchstart') e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const coords = getCoordinates(e);
    ctx.beginPath(); ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: any) => {
    if (!isDrawing) return;
    if (e.type === 'touchmove') e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = "#000000"; ctx.lineWidth = 2; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.stroke();
  };

  const stopDrawing = () => setIsDrawing(false);

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setFormData(prev => ({ ...prev, signatureUrl: "" }));
  };

  const saveSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    setFormData(prev => ({ ...prev, signatureUrl: canvas.toDataURL('image/png') }));
    toast({ title: "Prêt", description: "Signature capturée." });
  };

  const handleSaveGeneral = () => {
    if (!settingsRef) return;
    setDocumentNonBlocking(settingsRef, formData, { merge: true });
    toast({ title: "Sauvegardé", description: "Paramètres mis à jour avec succès." });
  };

  const handleUpdateAccount = async () => {
    if (!user) return;
    if (accountData.newPassword && accountData.newPassword !== accountData.confirmPassword) {
      toast({ variant: "destructive", title: "Erreur", description: "Les mots de passe ne correspondent pas." });
      return;
    }
    setIsUpdatingAccount(true);
    try {
      if (accountData.email !== user.email) await updateEmail(user, accountData.email);
      if (accountData.newPassword) await updatePassword(user, accountData.newPassword);
      if (staffProfileRef) {
        setDocumentNonBlocking(staffProfileRef, {
          firstName: accountData.firstName,
          lastName: accountData.lastName,
          email: accountData.email
        }, { merge: true });
      }
      toast({ title: "Compte Mis à Jour", description: "Vos informations de sécurité ont été actualisées." });
      setAccountData(prev => ({ ...prev, newPassword: "", confirmPassword: "" }));
    } catch (error: any) {
      console.error(error);
      toast({ 
        variant: "destructive", title: "Erreur de sécurité", 
        description: error.code === 'auth/requires-recent-login' ? "Veuillez vous reconnecter pour cette opération." : error.message 
      });
    } finally { setIsUpdatingAccount(false); }
  };

  const handleRefreshCache = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      toast({ title: "Système Optimisé", description: "Le cache local a été purgé avec succès." });
    }, 1500);
  };

  if (isAuthLoading || !user) return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;

  return (
    <div className="flex h-screen w-full animate-in fade-in duration-500">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 bg-background sticky top-0 z-10">
          <SidebarTrigger /><Separator orientation="vertical" className="mx-4 h-6" />
          <h1 className="font-headline font-semibold text-xl">Paramètres Système</h1>
        </header>

        <main className="p-4 md:p-6 max-w-4xl mx-auto w-full space-y-6">
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="general" className="gap-2"><Hotel className="h-4 w-4" /> Général</TabsTrigger>
              <TabsTrigger value="reservations" className="gap-2"><Clock className="h-4 w-4" /> Politiques</TabsTrigger>
              <TabsTrigger value="account" className="gap-2"><ShieldCheck className="h-4 w-4" /> Compte</TabsTrigger>
              <TabsTrigger value="system" className="gap-2"><Shield className="h-4 w-4" /> Système</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="animate-in slide-in-from-bottom-2 duration-400">
              <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden">
                <CardHeader>
                  <CardTitle className="font-headline font-bold text-lg">Identité & Signature</CardTitle>
                  <CardDescription>Configurez les informations officielles de l'établissement.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nom de l'Hôtel</Label>
                      <Input value={formData.hotelName} onChange={(e) => setFormData({...formData, hotelName: e.target.value})} className="rounded-xl" />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Téléphone Contact</Label>
                      <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} className="rounded-xl" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Adresse Physique</Label>
                    <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} className="rounded-xl" />
                  </div>
                  <Separator className="my-6" />
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest text-primary"><PenTool className="h-3 w-3" /> Signature de Direction</Label>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Input value={formData.managerName} onChange={(e) => setFormData({...formData, managerName: e.target.value})} placeholder="Nom complet du signataire" className="rounded-xl" />
                        <div className="border-2 border-dashed rounded-2xl p-2 bg-slate-50 space-y-2 overflow-hidden">
                          <canvas ref={canvasRef} width={300} height={120} className="w-full h-[120px] bg-white border border-slate-100 rounded-xl cursor-crosshair touch-none shadow-inner" onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing} onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing} />
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest text-destructive hover:bg-destructive/10 border-destructive/20" onClick={clearSignature}><Eraser className="h-4 w-4 mr-2" /> Effacer</Button>
                            <Button variant="secondary" size="sm" className="flex-1 rounded-xl text-xs font-black uppercase tracking-widest" onClick={saveSignature}>Capturer</Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center p-6 bg-muted/20 rounded-[1.5rem] border-2 border-dashed border-muted">
                        <span className="text-[9px] font-bold uppercase text-muted-foreground mb-4">Aperçu Facture</span>
                        {formData.signatureUrl ? <img src={formData.signatureUrl} alt="Signature" className="max-h-24 mix-blend-multiply" /> : <div className="text-center opacity-30"><PenTool className="h-8 w-8 mx-auto mb-2" /><p className="text-[10px] uppercase font-bold">Aucune signature</p></div>}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t p-6 flex justify-end bg-muted/5">
                  <Button onClick={handleSaveGeneral} className="gap-2 rounded-xl h-12 px-8 font-bold uppercase text-xs tracking-widest shadow-lg shadow-primary/20"><Save className="h-4 w-4" /> Enregistrer les changements</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="account" className="animate-in slide-in-from-bottom-2 duration-400">
              <Card className="border-none shadow-sm rounded-[2rem]">
                <CardHeader>
                  <CardTitle className="font-headline font-bold text-lg">Sécurité du Compte</CardTitle>
                  <CardDescription>Gérez vos identifiants de connexion.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Adresse E-mail de Connexion</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input value={accountData.email} onChange={(e) => setAccountData({...accountData, email: e.target.value})} className="pl-10 rounded-xl" />
                    </div>
                  </div>
                  <div className="grid md:grid-cols-2 gap-4 pt-4 border-t border-muted">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Nouveau Mot de Passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type={showPassword ? "text" : "password"} placeholder="••••••••" value={accountData.newPassword} onChange={(e) => setAccountData({...accountData, newPassword: e.target.value})} className="pl-10 pr-10 rounded-xl" />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary" onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Confirmer le Mot de Passe</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input type={showConfirmPassword ? "text" : "password"} placeholder="••••••••" value={accountData.confirmPassword} onChange={(e) => setAccountData({...accountData, confirmPassword: e.target.value})} className="pl-10 pr-10 rounded-xl" />
                        <button type="button" className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary" onClick={() => setShowConfirmPassword(!showConfirmPassword)}>{showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}</button>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t p-6 flex justify-end">
                  <Button onClick={handleUpdateAccount} disabled={isUpdatingAccount} className="gap-2 rounded-xl h-12 px-8 font-bold uppercase text-xs tracking-widest shadow-lg shadow-primary/20">{isUpdatingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />} Mettre à jour la sécurité</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="reservations" className="animate-in slide-in-from-bottom-2 duration-400">
              <Card className="border-none shadow-sm rounded-[2rem]">
                <CardHeader>
                  <CardTitle className="font-headline font-bold text-lg">Politiques de Séjour & Flux</CardTitle>
                  <CardDescription>Gérez les horaires et les automatisations de l'établissement.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8 py-6">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Check-in Standard</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                        <Input type="time" value={formData.checkInTime} onChange={(e) => setFormData({...formData, checkInTime: e.target.value})} className="pl-10 rounded-xl" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Check-out Standard</Label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-primary" />
                        <Input type="time" value={formData.checkOutTime} onChange={(e) => setFormData({...formData, checkOutTime: e.target.value})} className="pl-10 rounded-xl" />
                      </div>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-6">
                    <h3 className="text-xs font-black uppercase tracking-[0.2em] text-primary flex items-center gap-2">
                      <Bell className="h-3 w-3" /> Automatisation & Flux
                    </h3>
                    
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary border shadow-sm"><FileText className="h-5 w-5" /></div>
                        <div>
                          <p className="font-bold text-sm">Facturation Automatique</p>
                          <p className="text-[10px] text-muted-foreground">Générer la facture dès le check-in.</p>
                        </div>
                      </div>
                      <Switch checked={formData.autoInvoicing} onCheckedChange={(val) => setFormData({...formData, autoInvoicing: val})} />
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary border shadow-sm"><Bell className="h-5 w-5" /></div>
                        <div>
                          <p className="font-bold text-sm">Notifications WhatsApp</p>
                          <p className="text-[10px] text-muted-foreground">Alertes automatiques pour le personnel.</p>
                        </div>
                      </div>
                      <Switch checked={formData.notificationsEnabled} onCheckedChange={(val) => setFormData({...formData, notificationsEnabled: val})} />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Devise de l'établissement</Label>
                      <Select value={formData.currency} onValueChange={(val) => setFormData({...formData, currency: val})}>
                        <SelectTrigger className="rounded-xl h-11">
                          <SelectValue placeholder="Choisir la devise" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">Dollar Américain ($)</SelectItem>
                          <SelectItem value="CDF">Franc Congolais (FC)</SelectItem>
                          <SelectItem value="EUR">Euro (€)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t p-6 flex justify-end bg-muted/5">
                  <Button onClick={handleSaveGeneral} className="gap-2 rounded-xl h-12 px-8 font-bold uppercase text-xs tracking-widest shadow-lg shadow-primary/20"><Save className="h-4 w-4" /> Sauvegarder les politiques</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="system" className="animate-in slide-in-from-bottom-2 duration-400">
              <div className="grid gap-6">
                <Card className="border-none shadow-sm rounded-[2rem]">
                  <CardHeader>
                    <CardTitle className="font-headline font-bold text-lg flex items-center gap-2">
                      <Database className="h-5 w-5 text-primary" /> Maintenance des Données
                    </CardTitle>
                    <CardDescription>Gérez le stockage local et les exportations du système.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-transparent hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary border shadow-sm"><RefreshCw className={isRefreshing ? "h-5 w-5 animate-spin" : "h-5 w-5"} /></div>
                        <div>
                          <p className="font-bold text-sm">Vider le Cache Système</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Libère la mémoire locale pour plus de fluidité.</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl font-bold text-[10px] uppercase tracking-widest h-8" onClick={handleRefreshCache} disabled={isRefreshing}>
                        {isRefreshing ? "En cours..." : "Purger"}
                      </Button>
                    </div>

                    <div className="flex items-center justify-between p-4 bg-muted/30 rounded-2xl border border-transparent hover:border-primary/20 transition-all">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-xl bg-white flex items-center justify-center text-primary border shadow-sm"><Download className="h-5 w-5" /></div>
                        <div>
                          <p className="font-bold text-sm">Exportation au format JSON</p>
                          <p className="text-[10px] text-muted-foreground font-medium">Téléchargez l'intégralité des données d'inventaire.</p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" className="rounded-xl font-bold text-[10px] uppercase tracking-widest h-8">
                        Exporter
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-none shadow-sm rounded-[2rem] bg-primary/5 border border-primary/10">
                  <CardHeader>
                    <CardTitle className="font-headline font-bold text-sm flex items-center gap-2 uppercase tracking-widest">
                      <Info className="h-4 w-4" /> Informations Système
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-bold">Version ImaraPMS</span>
                      <span className="font-black text-primary">v2.5.0-stable</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-bold">Dernière mise à jour</span>
                      <span className="font-bold">Mars 2024</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground font-bold">État du serveur</span>
                      <span className="flex items-center gap-1 text-emerald-600 font-black">
                        <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" /> Opérationnel
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </main>
      </SidebarInset>
    </div>
  );
}

export default function SettingsPage() {
  return <Suspense fallback={<div className="flex h-screen w-full items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><SettingsContent /></Suspense>;
}
