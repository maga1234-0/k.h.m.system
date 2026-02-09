
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
  DollarSign,
  Coffee,
  GlassWater,
  ChefHat
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
  const resRef = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  const invRef = useMemoFirebase(() => user ? collection(firestore, 'invoices') : null, [firestore, user]);
  
  const { data: reservations, isLoading: isResLoading } = useCollection(resRef);
  const { data: invoices } = useCollection(invRef);

  const [isAddChargeOpen, setIsAddChargeOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
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
    return (reservations?.filter(r => r.status === 'Checked In') || []).filter(r => 
      r.guestName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
      r.roomNumber?.includes(searchTerm)
    );
  }, [reservations, searchTerm]);

  const handleAddCharge = () => {
    if (!chargeData.reservationId || !chargeData.amount) return;

    const res = reservations?.find(r => r.id === chargeData.reservationId);
    if (!res) return;

    const additionalAmount = Number(chargeData.amount) || 0;
    
    // 1. Update Reservation Notes & Total for record keeping
    const resUpdateRef = doc(firestore, 'reservations', res.id);
    updateDocumentNonBlocking(resUpdateRef, {
      totalAmount: (Number(res.totalAmount) || 0) + additionalAmount,
      notes: (res.notes || "") + `\n[${new Date().toLocaleDateString('fr-FR')}] ${getServiceTitle(activeTab).toUpperCase()}: ${chargeData.description} (+${additionalAmount} $)`
    });

    // 2. Update Invoice amountDue (CRITICAL for billing page)
    const invoice = invoices?.find(inv => inv.reservationId === res.id);
    if (invoice) {
      const invoiceUpdateRef = doc(firestore, 'invoices', invoice.id);
      updateDocumentNonBlocking(invoiceUpdateRef, {
        amountDue: (Number(invoice.amountDue) || 0) + additionalAmount
      });
    }

    setIsAddChargeOpen(false);
    setChargeData({ reservationId: "", description: "", amount: "" });
    
    toast({
      title: "Consommation Enregistrée",
      description: `Frais de ${additionalAmount} $ ajoutés à la facture de ${res.guestName}.`,
    });
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

  const serviceStats = useMemo(() => {
    // Prototype static stats
    return [
      { label: "Ventes du Jour", value: "342.00 $", icon: DollarSign, color: "text-emerald-600", bg: "bg-emerald-500/10" },
      { label: "Commandes", value: "14", icon: Utensils, color: "text-blue-600", bg: "bg-blue-500/10" },
      { label: "Populaire", value: "Dîner", icon: Coffee, color: "text-amber-600", bg: "bg-amber-500/10" },
    ];
  }, []);

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
      <SidebarInset className="flex flex-col overflow-auto bg-background/50">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Point de Vente {getServiceTitle(activeTab)}</h1>
          </div>
          <Dialog open={isAddChargeOpen} onOpenChange={setIsAddChargeOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2 bg-primary hover:bg-primary/90 shadow-lg shadow-primary/20">
                <Plus className="h-4 w-4" /> Nouvelle Vente
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[425px]">
              <DialogHeader>
                <DialogTitle>Facturer un service</DialogTitle>
                <DialogDescription>Les frais seront ajoutés à la facture finale du client.</DialogDescription>
              </DialogHeader>
              <div className="grid gap-6 py-4">
                <div className="space-y-2">
                  <Label>Sélectionner le client</Label>
                  <Select value={chargeData.reservationId} onValueChange={(val) => setChargeData({...chargeData, reservationId: val})}>
                    <SelectTrigger className="h-12">
                      <SelectValue placeholder="Choisir un client..." />
                    </SelectTrigger>
                    <SelectContent>
                      {activeReservations.length > 0 ? (
                        activeReservations.map((res) => (
                          <SelectItem key={res.id} value={res.id}>
                            Ch. {res.roomNumber} - {res.guestName}
                          </SelectItem>
                        ))
                      ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground italic">
                          Aucun client actuellement en séjour.
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Désignation du service</Label>
                  <Input 
                    placeholder="Ex: Dîner Gourmet, Lavage express..."
                    className="h-12"
                    value={chargeData.description}
                    onChange={(e) => setChargeData({...chargeData, description: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Montant à facturer ($)</Label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      type="number" 
                      className="pl-9 h-12"
                      value={chargeData.amount}
                      onChange={(e) => setChargeData({...chargeData, amount: e.target.value})}
                    />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" className="h-12 px-6" onClick={() => setIsAddChargeOpen(false)}>Annuler</Button>
                <Button className="h-12 px-8 font-bold" onClick={handleAddCharge} disabled={!chargeData.reservationId || !chargeData.amount}>Confirmer la Facturation</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </header>

        <main className="p-6 space-y-8">
          {/* Dashboard Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {serviceStats.map((stat, i) => (
              <Card key={i} className="border-none shadow-sm">
                <CardContent className="p-6 flex items-center gap-4">
                  <div className={`h-12 w-12 rounded-2xl ${stat.bg} flex items-center justify-center ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground">{stat.label}</span>
                    <span className="text-2xl font-bold font-headline">{stat.value}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="pb-0">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                  {getServiceIcon(activeTab)}
                </div>
                <div>
                  <CardTitle className="font-headline text-2xl">{getServiceTitle(activeTab)}</CardTitle>
                  <CardDescription>Gérez les consommations et extras par chambre.</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-8 space-y-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Rechercher un client ou une chambre..." 
                  className="pl-9 h-12 bg-muted/20 border-none shadow-none"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>

              <div className="space-y-4">
                <h3 className="font-bold text-xs uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2 mb-4">
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" /> Clients en Séjour
                </h3>
                
                {isResLoading ? (
                  <div className="flex justify-center p-12">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                  </div>
                ) : activeReservations.length > 0 ? (
                  <div className="grid gap-4">
                    {activeReservations.map((res) => {
                      const inv = invoices?.find(i => i.reservationId === res.id);
                      return (
                        <div key={res.id} className="flex flex-col md:flex-row md:items-center justify-between p-5 rounded-2xl border bg-card hover:bg-muted/5 transition-all group border-transparent hover:border-primary/20 shadow-sm">
                          <div className="flex items-center gap-5">
                            <div className="h-14 w-14 rounded-2xl bg-secondary flex items-center justify-center text-primary font-bold text-lg group-hover:scale-110 transition-transform">
                              {res.roomNumber}
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-lg leading-none mb-1">{res.guestName}</span>
                              <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">
                                {res.checkInDate} — {res.checkOutDate}
                              </span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-8 mt-4 md:mt-0">
                            <div className="text-right">
                              <span className="block text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1">Encours Facture</span>
                              <span className="text-2xl font-black font-headline text-primary">
                                {Number(inv?.amountDue || 0).toLocaleString()} $
                              </span>
                            </div>
                            <Button 
                              variant="secondary" 
                              className="h-12 px-8 font-bold text-xs uppercase tracking-widest shadow-sm hover:shadow-md transition-all"
                              onClick={() => {
                                setChargeData({...chargeData, reservationId: res.id});
                                setIsAddChargeOpen(true);
                              }}
                            >
                              Facturer
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-20 text-center border-2 border-dashed rounded-3xl opacity-30 bg-muted/10">
                    <ConciergeBell className="h-16 w-16 mx-auto mb-4" />
                    <p className="font-bold uppercase tracking-widest text-sm">Aucun client actif trouvé.</p>
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
