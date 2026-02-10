
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

  const getCoordinates = (e: any) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = (e.touches && e.touches.length > 0) ? e.touches[0].clientX : e.clientX;
    const clientY = (e.touches && e.touches.length > 0) ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: any) => {
    if (e.type === 'touchstart') e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const coords = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(coords.x, coords.y);
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
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
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
    toast({ title: "Prêt", description: "Signature capturée." });
  };

  const handleSaveGeneral = () => {
    if (!settingsRef) return;
    setDocumentNonBlocking(settingsRef, formData, { merge: true });
    toast({ title: "Sauvegardé", description: "Paramètres mis à jour." });
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
      toast({ title: "Compte Mis à Jour" });
    } catch (error: any) {
      toast({ variant: "destructive", title: "Erreur", description: error.message });
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
          <h1 className="font-headline font-semibold text-xl">Paramètres</h1>
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
                  <CardTitle>Identité & Signature</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label>Nom de l'Hôtel</Label>
                    <Input value={formData.hotelName} onChange={(e) => setFormData({...formData, hotelName: e.target.value})} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Adresse</Label>
                    <Input value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
                  </div>
                  <Separator className="my-6" />
                  <div className="space-y-4">
                    <Label className="flex items-center gap-2 font-bold uppercase text-[10px] tracking-widest"><PenTool className="h-3 w-3" /> Signature Manager</Label>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Input value={formData.managerName} onChange={(e) => setFormData({...formData, managerName: e.target.value})} placeholder="Nom du manager" />
                        <div className="border rounded-xl p-2 bg-white space-y-2">
                          <canvas 
                            ref={canvasRef} width={300} height={120}
                            className="w-full h-[120px] bg-slate-50 border border-dashed rounded-lg cursor-crosshair touch-none"
                            onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                            onTouchStart={startDrawing}
                            onTouchMove={draw}
                            onTouchEnd={stopDrawing}
                          />
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" className="flex-1" onClick={clearSignature}><Eraser className="h-3 w-3 mr-2" /> Effacer</Button>
                            <Button variant="secondary" size="sm" className="flex-1" onClick={saveSignature}>Capturer</Button>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center justify-center p-6 bg-muted/30 rounded-2xl border-2 border-dashed">
                        {formData.signatureUrl ? <img src={formData.signatureUrl} alt="Signature" className="max-h-24" /> : <p className="text-xs text-muted-foreground italic">Aucune signature</p>}
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t p-4 flex justify-end"><Button onClick={handleSaveGeneral} className="gap-2"><Save className="h-4 w-4" /> Sauvegarder</Button></CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="reservations">
              <Card>
                <CardHeader><CardTitle>Politiques</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Check-in</Label><Input type="time" value={formData.checkInTime} onChange={(e) => setFormData({...formData, checkInTime: e.target.value})} /></div>
                  <div className="space-y-2"><Label>Check-out</Label><Input type="time" value={formData.checkOutTime} onChange={(e) => setFormData({...formData, checkOutTime: e.target.value})} /></div>
                </CardContent>
                <CardFooter className="border-t p-4 flex justify-end"><Button onClick={handleSaveGeneral} className="gap-2"><Save className="h-4 w-4" /> Sauvegarder</Button></CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="account">
              <Card>
                <CardHeader><CardTitle>Sécurité</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <Input value={accountData.email} readOnly disabled />
                  <Input type="password" placeholder="Nouveau mot de passe" value={accountData.newPassword} onChange={(e) => setAccountData({...accountData, newPassword: e.target.value})} />
                </CardContent>
                <CardFooter className="border-t p-4 flex justify-end"><Button onClick={handleUpdateAccount} disabled={isUpdatingAccount}>Mettre à jour</Button></CardFooter>
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
