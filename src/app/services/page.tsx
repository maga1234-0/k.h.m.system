
"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Utensils, 
  Shirt, 
  ConciergeBell, 
  Loader2, 
  Search,
  Plus,
  DollarSign,
  Coffee,
  ChefHat,
  ArrowRight
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, useUser, updateDocumentNonBlocking } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"

function ServicesContent() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get('tab') || 'restaurant';
  
  const firestore = useFirestore();
  const resRef = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  const invRef = useMemoFirebase(() => user ? collection(firestore, 'invoices') : null, [firestore, user]);
  
  const { data: reservations, isLoading: isResLoading } = useCollection(resRef);
  const { data: invoices } = useCollection(invRef);

  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [mounted, setMounted] = useState(false);
  const [chargeData, setChargeData] = useState({
    reservationId: "",
    description: "",
    amount: "",
  });

  useEffect(() => {
    setMounted(true);
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  const activeReservations = useMemo(() => {
    return (reservations?.filter(r => r.status === 'Checked In') || []).filter(r => 
      r.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.roomNumber?.includes(searchTerm)
    );
  }, [reservations, searchTerm]);

  const dynamicStats = useMemo(() => {
    if (!reservations || !mounted) return { dailySales: 0, orders: 0, popular: "N/A" };
    
    const todayStr = new Date().toLocaleDateString('fr-FR');
    let totalToday = 0;
    let countToday = 0;
    const typeCounts: Record<string, number> = {};

    reservations.forEach(res => {
      if (!res.notes) return;
      const lines = res.notes.split('\n');
      lines.forEach(line => {
        if (line.includes(`[${todayStr}]`)) {
          countToday++;
          const amountMatch = line.match(/\(\+(\d+(?:\.\d+)?)\s*\$\)/);
          if (amountMatch) {
            totalToday += parseFloat(amountMatch[1]);
          }
          
          const typeMatch = line.match(/\]\s*([^:]+):/);
          if (typeMatch) {
            const type = typeMatch[1].trim();
            typeCounts[type] = (typeCounts[type] || 0) + 1;
          }
        }
      });
    });

    let popular = "N/A";
    let max = 0;
    Object.entries(typeCounts).forEach(([type, count]) => {
      if (count > max) {
        max = count;
        popular = type;
      }
    });

    return { dailySales: totalToday, orders: countToday, popular };
  }, [reservations, mounted]);

  const handleAddCharge = () => {
    if (!chargeData.reservationId || !chargeData.amount) return;
    const res = reservations?.find(r => r.id === chargeData.reservationId);
    if (!res) return;

    const additionalAmount = Number(chargeData.amount) || 0;
    const serviceType = getServiceTitle(activeTab).toUpperCase();
    const dateStr = new Date().toLocaleDateString('fr-FR');
    
    const resUpdateRef = doc(firestore, 'reservations', res.id);
    updateDocumentNonBlocking(resUpdateRef, {
      totalAmount: (Number(res.totalAmount) || 0) + additionalAmount,
      notes: (res.notes || "") + (res.notes ? "\n" : "") + `[${dateStr}] ${serviceType}: ${chargeData.description} (+${additionalAmount} $)`
    });

    const invoice = invoices?.find(inv => inv.reservationId === res.id);
    if (invoice) {
      const invoiceUpdateRef = doc(firestore, 'invoices', invoice.id);
      updateDocumentNonBlocking(invoiceUpdateRef, {
        amountDue: (Number(invoice.amountDue) || 0) + additionalAmount
      });
    }

    setIsAddChargeOpen(false);
    setChargeData({ reservationId: "", description: "", amount: "" });
    toast({ title: "Consommation Enregistrée", description: `Frais de ${additionalAmount} $ ajoutés.` });
  };

  const getServiceIcon = (tab: string) => {
    switch (tab) {
      case 'restaurant': return <ChefHat className="h-6 w-6" />;
      case 'laundry': return <Shirt className="h-6 w-6" />;
      case 'room-service': return <ConciergeBell className="h-6 w-6" />;
      default: return <Plus className="h-6 w-6" />;
    }
  };

  const getServiceTitle = (tab: string) => {
    switch (tab) {
      case 'restaurant': return "Restaurant & Bar";
      case 'laundry': return "Blanchisserie";
      case 'room-service': return "Room Service";
      default: return "Autres Frais";
    }
  };

  if (!mounted || isAuthLoading || !user) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex h-screen w-full animate-in fade-in duration-500">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background/50">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl text-primary">{getServiceTitle(activeTab)}</h1>
          </div>
          <Dialog open={isAddChargeOpen} onOpenChange={setIsAddChargeOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 h-9 rounded-xl">
                <Plus className="h-4 w-4" /> Nouvelle Vente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px] rounded-[2rem] animate-in zoom-in-95">
              <DialogHeader>
                <DialogTitle className="text-2xl font-black font-headline">Facturer un service</DialogTitle>
                <DialogDescription className="font-medium">Ajout de frais au dossier client.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nom du client</Label>
                  <Select value={chargeData.reservationId} onValueChange={(val) => setChargeData({...chargeData, reservationId: val})}>
                    <SelectTrigger className="h-11 rounded-xl">
                      <SelectValue placeholder="Choisir un client..." />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl">
                      {activeReservations.length > 0 ? activeReservations.map((res) => (
                        <SelectItem key={res.id} value={res.id}>Ch. {res.roomNumber} - {res.guestName}</SelectItem>
                      )) : <div className="p-4 text-center text-xs text-muted-foreground italic">Aucun client en séjour.</div>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Désignation</Label>
                  <Input placeholder="Entrez la description..." className="h-11 rounded-xl" value={chargeData.description} onChange={(e) => setChargeData({...chargeData, description: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Montant ($)</Label>
                  <Input type="number" placeholder="0.00" className="h-11 rounded-xl font-bold bg-primary/5 border-primary/10" value={chargeData.amount} onChange={(e) => setChargeData({...chargeData, amount: e.target.value})} />
                </div>
              </div>
              <DialogFooter className="gap-2">
                <Button variant="outline" className="rounded-xl" onClick={() => setIsAddChargeOpen(false)}>Annuler</Button>
                <Button onClick={handleAddCharge} disabled={!chargeData.reservationId || !chargeData.amount} className="rounded-xl font-bold uppercase text-[10px] tracking-widest h-11 px-8">Confirmer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <main className="p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
            <Card className="border-none shadow-sm rounded-3xl bg-white animate-in slide-in-from-bottom-4 duration-500">
              <CardContent className="p-6 flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <DollarSign className="h-7 w-7" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Ventes du Jour</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black font-headline text-foreground tracking-tighter">{dynamicStats.dailySales.toFixed(2)}</span>
                    <span className="text-lg font-bold text-primary">$</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl bg-white animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '100ms' }}>
              <CardContent className="p-6 flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Utensils className="h-7 w-7" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Commandes</span>
                  <span className="text-3xl font-black font-headline text-foreground tracking-tighter">{dynamicStats.orders}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="border-none shadow-sm rounded-3xl bg-white animate-in slide-in-from-bottom-4 duration-500" style={{ animationDelay: '200ms' }}>
              <CardContent className="p-6 flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Coffee className="h-7 w-7" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground mb-1">Plus Demandé</span>
                  <span className="text-xl font-black font-headline text-foreground truncate max-w-[150px]">{dynamicStats.popular}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm rounded-[2rem] bg-white overflow-hidden animate-in fade-in duration-700">
            <CardHeader className="border-b bg-muted/20 pb-4">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-md">
                  {getServiceIcon(activeTab)}
                </div>
                <div>
                  <CardTitle className="font-headline text-xl font-bold">Registre des Consommations</CardTitle>
                  <CardDescription>Facturation directe par chambre pour le séjour en cours.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="p-4 md:p-6 border-b">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Rechercher par chambre ou nom..." 
                    className="pl-9 bg-muted/30 border-none rounded-xl h-11" 
                    value={searchTerm} 
                    onChange={(e) => setSearchTerm(e.target.value)} 
                  />
                </div>
              </div>
              <div className="divide-y">
                {activeReservations.length > 0 ? activeReservations.map((res, idx) => {
                  const inv = invoices?.find(i => i.reservationId === res.id);
                  return (
                    <div key={res.id} className="flex flex-col md:flex-row md:items-center justify-between p-6 hover:bg-primary/5 transition-all group animate-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="flex items-center gap-4">
                        <div className="h-14 w-14 rounded-2xl bg-primary/10 flex flex-col items-center justify-center text-primary font-black border border-primary/20">
                          <span className="text-[8px] uppercase tracking-tighter">Chambre</span>
                          <span className="text-xl">{res.roomNumber}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-lg text-foreground">{res.guestName}</span>
                          <div className="flex items-center gap-2">
                             <Badge variant="outline" className="text-[8px] uppercase font-black bg-emerald-500/5 text-emerald-600 border-emerald-500/10">Actif</Badge>
                             <span className="text-[10px] text-muted-foreground font-medium">Arrivé le {res.checkInDate}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 mt-6 md:mt-0">
                        <div className="text-right">
                          <span className="block text-[10px] font-black text-muted-foreground uppercase tracking-widest mb-1">Encours Facturé</span>
                          <span className="text-2xl font-black font-headline text-primary tracking-tighter">{Number(inv?.amountDue || 0).toLocaleString()} <span className="text-sm">$</span></span>
                        </div>
                        <Button 
                          className="bg-primary hover:bg-primary/90 text-primary-foreground font-black text-[10px] uppercase tracking-widest h-12 px-8 rounded-xl shadow-md transition-transform active:scale-95 flex gap-2" 
                          onClick={() => { setChargeData({...chargeData, reservationId: res.id}); setIsAddChargeOpen(true); }}
                        >
                          Ajouter Frais
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="py-32 text-center">
                    <div className="h-20 w-20 bg-muted/20 rounded-full flex items-center justify-center mx-auto mb-4">
                      <ConciergeBell className="h-10 w-10 text-muted-foreground/30" />
                    </div>
                    <p className="font-black uppercase tracking-[0.2em] text-sm text-muted-foreground">Aucun client en séjour actif</p>
                    <p className="text-xs text-muted-foreground/60 mt-2">Seuls les clients ayant effectué leur Check-in apparaissent ici.</p>
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
  return <Suspense fallback={<div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}><ServicesContent /></Suspense>;
}
