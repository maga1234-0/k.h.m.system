
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
import { 
  Save, 
  Loader2, 
  Hotel, 
  Clock, 
  Shield, 
  ShieldCheck,
  PenTool,
  Eraser
} from "lucide-react";
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useUser } from "@/firebase";
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

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);

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

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (e.cancelable) e.preventDefault();

    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (e.cancelable) e.preventDefault();

    const coords = getCoordinates(e);
    ctx.lineTo(coords.x, coords.y);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

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
    const dataUrl = canvas.toDataURL('image/png');
    setFormData(prev => ({ ...prev, signatureUrl: dataUrl }));
    toast({ title: "Signature Capturée", description: "Votre signature a été enregistrée." });
  };

  const handleSaveGeneral = () => {
    if (!settingsRef) return;
    setDocumentNonBlocking(settingsRef, formData, { merge: true });
    toast({
      title: "Paramètres Sauvegardés",
      description: "Configuration mise à jour.",
    });
  };

  const handleUpdateAccount = async () => {
    if (!user) return;
    
    if (accountData.newPassword && accountData.newPassword !== accountData.confirmPassword) {
      toast({ variant: "destructive", title: "Erreur", description: "Mots de passe différents." });
      return;
    }

    setIsUpdatingAccount(true);
    try {
      if (accountData.email !== user.email) await updateEmail(user, accountData.email);
      if (accountData.newPassword) await updatePassword(user, accountData.newPassword);
      toast({ title: "Compte Mis à Jour", description: "Identifiants synchronisés." });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur Sécurité", description: error.message });
    } finally {
      setIsUpdatingAccount(false);
    }
  };

  if (isAuthLoading || !user) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
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
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general"><Hotel className="h-4 w-4 mr-2" /> Général</TabsTrigger>
              <TabsTrigger value="reservations"><Clock className="h-4 w-4 mr-2" /> Politiques</TabsTrigger>
              <TabsTrigger value="account"><ShieldCheck className="h-4 w-4 mr-2" /> Compte</TabsTrigger>
              <TabsTrigger value="system"><Shield className="h-4 w-4 mr-2" /> Système</TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Identité de l'Hôtel</CardTitle>
                  <CardDescription>Gérez les informations publiques et votre signature.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Nom de l'Établissement</Label>
                    <Input value={formData.hotelName} onChange={(e) => setFormData({...formData, hotelName: e.target.value})} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label>E-mail</Label>
                      <Input value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
                    </div>
                    <div className="grid gap-2">
                      <Label>Téléphone</Label>
                      <Input value={formData.phone} onChange={(e) => setFormData({...formData, phone: e.target.value})} />
                    </div>
                  </div>
                  <div className="grid gap-2">
                    <Label>Adresse</Label>
                    <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                  </div>
                  
                  <Separator className="my-6" />
                  
                  <div className="space-y-4">
                    <Label className="text-sm font-bold uppercase tracking-wider flex items-center gap-2">
                      <PenTool className="h-4 w-4" /> Signature du Manager
                    </Label>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label>Nom du Signataire</Label>
                        <Input value={formData.managerName} onChange={(e) => setFormData({...formData, managerName: e.target.value})} placeholder="Manager Principal" />
                        <div className="p-4 border rounded-xl bg-white space-y-2">
                          <Label className="text-[10px] uppercase font-bold text-muted-foreground">Zone de Signature (Souris ou Tactile)</Label>
                          <canvas 
                            ref={canvasRef}
                            width={300}
                            height={120}
                            className="w-full h-[120px] bg-slate-50 border border-dashed rounded-lg cursor-crosshair touch-none"
                            onMouseDown={startDrawing}
                            onMouseMove={draw}
                            onMouseUp={stopDrawing}
                            onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                          />
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={clearSignature}>
                              <Eraser className="h-3 w-3 mr-2" /> Effacer
                            </Button>
                            <Button variant="secondary" size="sm" className="flex-1" onClick={saveSignature}>
                              Capturer
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col items-center justify-center p-6 bg-muted/30 rounded-2xl border-2 border-dashed border-muted">
                        {formData.signatureUrl ? (
                          <div className="space-y-3 text-center">
                            <img src={formData.signatureUrl} alt="Signature actuelle" className="max-h-24 mx-auto" />
                            <p className="text-[10px] font-bold uppercase text-emerald-600">Signature prête</p>
                          </div>
                        ) : (
                          <div className="text-center space-y-2 opacity-20">
                            <PenTool className="h-12 w-12 mx-auto" />
                            <p className="text-xs font-bold uppercase tracking-widest">Aucune signature</p>
                          </div>
                        )}
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
                  <CardTitle>Politiques de Séjour</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label>Check-in Standard</Label>
                      <Input type="time" value={formData.checkInTime} onChange={(e) => setFormData({...formData, checkInTime: e.target.value})} />
                    </div>
                    <div className="space-y-2">
                      <Label>Check-out Standard</Label>
                      <Input type="time" value={formData.checkOutTime} onChange={(e) => setFormData({...formData, checkOutTime: e.target.value})} />
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 flex justify-end p-4">
                  <Button onClick={handleSaveGeneral} className="gap-2"><Save className="h-4 w-4" /> Sauvegarder</Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="account">
              <Card>
                <CardHeader><CardTitle>Compte Administrateur</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <Input value={accountData.firstName} onChange={(e) => setAccountData({...accountData, firstName: e.target.value})} placeholder="Prénom" />
                    <Input value={accountData.lastName} onChange={(e) => setAccountData({...accountData, lastName: e.target.value})} placeholder="Nom" />
                  </div>
                  <Input value={accountData.email} onChange={(e) => setAccountData({...accountData, email: e.target.value})} placeholder="E-mail" />
                </CardContent>
                <CardFooter className="border-t bg-muted/20 flex justify-end p-4">
                  <Button onClick={handleUpdateAccount} disabled={isUpdatingAccount}>
                    {isUpdatingAccount ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    Mettre à jour
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
  return <Suspense fallback={<Loader2 className="h-8 w-8 animate-spin mx-auto mt-20" />}><SettingsContent /></Suspense>;
}
