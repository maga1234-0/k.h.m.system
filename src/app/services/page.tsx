"use client"

import { useState, useEffect, useMemo, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { 
  Utensils, 
  Shirt, 
  ConciergeBell, 
  PlusCircle, 
  Loader2, 
  Search,
  Plus,
  DollarSign,
  Coffee,
  ChefHat
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
      default: return <PlusCircle className="h-6 w-6" />;
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
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-[#0a0a0a]">
        <header className="flex h-16 items-center border-b border-white/5 px-6 justify-between bg-[#0a0a0a] sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger className="text-white" />
            <Separator orientation="vertical" className="mx-4 h-6 bg-white/10" />
            <h1 className="font-headline font-semibold text-xl text-white">Service {getServiceTitle(activeTab)}</h1>
          </div>
          <Dialog open={isAddChargeOpen} onOpenChange={setIsAddChargeOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground font-black uppercase text-xs">
                <Plus className="h-4 w-4" /> Nouvelle Vente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Facturer un service</DialogTitle>
                <DialogDescription>Ajout de frais au dossier client.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label>Nom du client</Label>
                  <Select value={chargeData.reservationId} onValueChange={(val) => setChargeData({...chargeData, reservationId: val})}>
                    <SelectTrigger><SelectValue placeholder="Choisir un client..." /></SelectTrigger>
                    <SelectContent>
                      {activeReservations.length > 0 ? activeReservations.map((res) => (
                        <SelectItem key={res.id} value={res.id}>Ch. {res.roomNumber} - {res.guestName}</SelectItem>
                      )) : <div className="p-4 text-center text-xs text-muted-foreground italic">Aucun client en séjour.</div>}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Désignation</Label>
                  <Input placeholder="Entrez la description..." value={chargeData.description} onChange={(e) => setChargeData({...chargeData, description: e.target.value})} />
                </div>
                <div className="space-y-2">
                  <Label>Montant ($)</Label>
                  <Input type="number" placeholder="0.00" value={chargeData.amount} onChange={(e) => setChargeData({...chargeData, amount: e.target.value})} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddChargeOpen(false)}>Annuler</Button>
                <Button onClick={handleAddCharge} disabled={!chargeData.reservationId || !chargeData.amount}>Confirmer</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <main className="p-6 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-[#141414] border-none shadow-xl">
              <CardContent className="p-6 flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <DollarSign className="h-7 w-7" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Ventes du Jour</span>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-black font-headline text-white tracking-tighter">{dynamicStats.dailySales.toFixed(2)}</span>
                    <span className="text-lg font-bold text-primary">$</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#141414] border-none shadow-xl">
              <CardContent className="p-6 flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                  <Utensils className="h-7 w-7" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Commandes</span>
                  <span className="text-3xl font-black font-headline text-white tracking-tighter">{dynamicStats.orders}</span>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#141414] border-none shadow-xl">
              <CardContent className="p-6 flex items-center gap-5">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                  <Coffee className="h-7 w-7" />
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500 mb-1">Service Populaire</span>
                  <span className="text-xl font-black font-headline text-white truncate max-w-[150px]">{dynamicStats.popular}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="bg-[#141414] border-none shadow-xl text-white">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                  {getServiceIcon(activeTab)}
                </div>
                <div>
                  <CardTitle className="font-headline text-xl">{getServiceTitle(activeTab)}</CardTitle>
                  <CardDescription className="text-zinc-500">Facturation directe par chambre.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <Input placeholder="Rechercher..." className="pl-9 bg-zinc-900 border-none text-white placeholder:text-zinc-600" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
              </div>
              <div className="grid gap-4">
                {activeReservations.length > 0 ? activeReservations.map((res) => {
                  const inv = invoices?.find(i => i.reservationId === res.id);
                  return (
                    <div key={res.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl bg-zinc-900/50 border border-white/5 hover:bg-zinc-900 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">Ch. {res.roomNumber}</div>
                        <div className="flex flex-col">
                          <span className="font-bold text-lg text-white">{res.guestName}</span>
                          <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest">En séjour</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 mt-4 md:mt-0">
                        <div className="text-right">
                          <span className="block text-[10px] font-bold text-zinc-500 uppercase tracking-widest mb-1">Total Facturé</span>
                          <span className="text-xl font-black font-headline text-primary">{Number(inv?.amountDue || 0).toLocaleString()} $</span>
                        </div>
                        <Button className="bg-white text-black hover:bg-zinc-200 font-bold text-[10px] uppercase tracking-widest h-10 px-6 rounded-lg" onClick={() => { setChargeData({...chargeData, reservationId: res.id}); setIsAddChargeOpen(true); }}>Ajouter Frais</Button>
                      </div>
                    </div>
                  );
                }) : <div className="py-20 text-center opacity-20 border-2 border-dashed border-zinc-800 rounded-3xl"><p className="font-bold uppercase tracking-widest text-sm">Aucun client en séjour.</p></div>}
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