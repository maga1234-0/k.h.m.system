
'use client';

import { useState, useEffect, useMemo, Suspense } from "react";
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
  Utensils, 
  Shirt, 
  ConciergeBell, 
  PlusCircle, 
  Loader2, 
  Search,
  Plus,
  Receipt,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser, updateDocumentNonBlocking } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";

function ServicesContent() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'restaurant';
  
  const firestore = useFirestore();
  const reservationsRef = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  const { data: reservations, isLoading: isResLoading } = useCollection(reservationsRef);

  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [chargeData, setChargeData] = useState({
    reservationId: "",
    description: "",
    amount: "",
  });

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  const activeReservations = useMemo(() => {
    return reservations?.filter(r => r.status === 'Checked In') || [];
  }, [reservations]);

  const handleAddCharge = () => {
    if (!chargeData.reservationId || !chargeData.amount) return;

    const res = reservations?.find(r => r.id === chargeData.reservationId);
    if (!res) return;

    const currentTotal = Number(res.totalAmount) || 0;
    const additionalAmount = Number(chargeData.amount) || 0;
    
    const resRef = doc(firestore, 'reservations', res.id);
    updateDocumentNonBlocking(resRef, {
      totalAmount: currentTotal + additionalAmount,
      notes: (res.notes || "") + `\n[${new Date().toLocaleDateString()}] ${chargeData.description || activeTab.toUpperCase()}: +${additionalAmount} $`
    });

    setIsAddChargeOpen(false);
    setChargeData({ reservationId: "", description: "", amount: "" });
    
    toast({
      title: "Service Ajouté",
      description: `Frais de ${additionalAmount} $ ajoutés à la chambre ${res.roomNumber} (${res.guestName}).`,
    });
  };

  const getServiceIcon = (tab: string) => {
    switch (tab) {
      case 'restaurant': return <Utensils className="h-5 w-5" />;
      case 'laundry': return <Shirt className="h-5 w-5" />;
      case 'room-service': return <ConciergeBell className="h-5 w-5" />;
      default: return <PlusCircle className="h-5 w-5" />;
    }
  };

  const getServiceTitle = (tab: string) => {
    switch (tab) {
      case 'restaurant': return "Restaurant & Bar";
      case 'laundry': return "Blanchisserie";
      case 'room-service': return "Room Service";
      default: return "Autres Frais & Extras";
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
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Services & Extras</h1>
          </div>
          <Dialog open={isAddChargeOpen} onOpenChange={setIsAddChargeOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" /> Ajouter des frais
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Facturer un Service</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="space-y-2">
                  <Label>Client / Chambre</Label>
                  <Select value={chargeData.reservationId} onValueChange={(val) => setChargeData({...chargeData, reservationId: val})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {activeReservations.map((res) => (
                        <SelectItem key={res.id} value={res.id}>
                          Ch. {res.roomNumber} - {res.guestName}
                        </SelectItem>
                      ))}
                      {activeReservations.length === 0 && (
                        <p className="p-2 text-xs text-muted-foreground text-center">Aucun client en séjour</p>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input 
                    value={chargeData.description}
                    onChange={(e) => setChargeData({...chargeData, description: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Montant ($)</Label>
                  <Input 
                    type="number" 
                    value={chargeData.amount}
                    onChange={(e) => setChargeData({...chargeData, amount: e.target.value})}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddChargeOpen(false)}>Annuler</Button>
                <Button onClick={handleAddCharge} disabled={!chargeData.reservationId || !chargeData.amount}>Enregistrer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <main className="p-6">
          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                {getServiceIcon(activeTab)}
              </div>
              <div>
                <CardTitle className="font-headline">{getServiceTitle(activeTab)}</CardTitle>
                <CardDescription>Gérez les consommations.</CardDescription>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <div className="p-4 rounded-xl border bg-muted/20 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Revenus du Jour</span>
                  <span className="text-xl font-bold">145.00 $</span>
                </div>
                <div className="p-4 rounded-xl border bg-muted/20 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Commandes</span>
                  <span className="text-xl font-bold">12</span>
                </div>
                <div className="p-4 rounded-xl border bg-muted/20 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Temps Moyen</span>
                  <span className="text-xl font-bold">15 min</span>
                </div>
                <div className="p-4 rounded-xl border bg-muted/20 flex flex-col gap-1">
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Rentabilité</span>
                  <span className="text-xl font-bold text-emerald-600">+8%</span>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                  <Receipt className="h-4 w-4" /> Opérations en cours
                </h3>
                {activeReservations.length > 0 ? (
                  <div className="grid gap-4">
                    {activeReservations.slice(0, 5).map((res) => (
                      <div key={res.id} className="flex items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/10 transition-colors">
                        <div className="flex flex-col">
                          <span className="font-bold text-sm">Chambre {res.roomNumber}</span>
                          <span className="text-xs text-muted-foreground">{res.guestName}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <span className="block text-xs font-bold text-emerald-600">Total Séjour</span>
                            <span className="font-bold">{res.totalAmount} $</span>
                          </div>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-8 text-xs font-bold"
                            onClick={() => {
                              setChargeData({...chargeData, reservationId: res.id});
                              setIsAddChargeOpen(true);
                            }}
                          >
                            Facturer
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-12 text-center border-2 border-dashed rounded-xl opacity-40">
                    <ConciergeBell className="h-12 w-12 mx-auto mb-4" />
                    <p className="text-sm">Aucun client en séjour.</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </div>
  );
}

export default function ServicesPage() {
  return (
    <Suspense fallback={
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <ServicesContent />
    </Suspense>
  );
}
