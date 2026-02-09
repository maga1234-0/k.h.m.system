"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  Receipt, 
  Printer, 
  Loader2, 
  CreditCard, 
  MessageCircle, 
  Hotel, 
  Trash2, 
  AlertCircle, 
  FileText, 
  Download,
  Phone
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export default function BillingPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [isInvoiceDialogOpen, setIsInvoiceDialogOpen] = useState(false);
  const [isClearDialogOpen, setIsClearDialogOpen] = useState(false);
  
  const firestore = useFirestore();
  const invoicesRef = useMemoFirebase(() => user ? collection(firestore, 'invoices') : null, [firestore, user]);
  const { data: invoices, isLoading: isInvoicesLoading } = useCollection(invoicesRef);

  useEffect(() => {
    setMounted(true);
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  const stats = useMemo(() => {
    if (!invoices) return { unpaid: 0, revenue: 0, totalCount: 0 };
    
    const unpaid = invoices.reduce((acc, inv) => inv.status !== 'Paid' ? acc + (Number(inv.amountDue) - Number(inv.amountPaid)) : acc, 0);
    const revenue = invoices.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
    
    return { unpaid, revenue, totalCount: invoices.length };
  }, [invoices]);

  const handleMarkAsPaid = (invoice: any) => {
    const invRef = doc(firestore, 'invoices', invoice.id);
    updateDocumentNonBlocking(invRef, {
      status: "Paid",
      amountPaid: invoice.amountDue,
      paymentDate: new Date().toISOString()
    });
    
    toast({
      title: "Paiement Confirmé",
      description: `La facture de ${invoice.guestName} a été marquée comme payée.`,
    });
  };

  const handleClearRegistry = () => {
    if (!invoices) return;
    
    invoices.forEach((inv) => {
      const invRef = doc(firestore, 'invoices', inv.id);
      deleteDocumentNonBlocking(invRef);
    });
    
    setIsClearDialogOpen(false);
    toast({
      variant: "destructive",
      title: "Registre Effacé",
      description: "Toutes les archives de factures ont été supprimées.",
    });
  };

  const handleSendWhatsApp = (invoice: any) => {
    if (!invoice.guestPhone) {
      toast({
        variant: "destructive",
        title: "Numéro Manquant",
        description: "Impossible d'envoyer le message sans numéro de téléphone.",
      });
      return;
    }
    
    const phone = invoice.guestPhone.replace(/\D/g, '');
    const invoiceId = invoice.id.slice(0, 8).toUpperCase();
    
    const message = `*IMARAPMS - FACTURE OFFICIELLE*\n\n📄 *N° de Facture :* #INV-${invoiceId}\n👤 *Client :* ${invoice.guestName}\n📅 *Date :* ${new Date(invoice.invoiceDate).toLocaleDateString('fr-FR')}\n💰 *Montant Total :* ${Number(invoice.amountDue).toFixed(2)} $\n✅ *Statut :* ${invoice.status === 'Paid' ? 'PAYÉE' : 'EN ATTENTE DE RÈGLEMENT'}\n\nMerci de votre confiance.\nCordialement,\n*L'équipe ImaraPMS*`;
    
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handlePrint = () => {
    window.print();
  };

  if (!mounted || isAuthLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto print:bg-white">
        <header className="flex h-16 items-center border-b px-6 bg-background sticky top-0 z-10 print:hidden">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-4 h-6" />
          <h1 className="font-headline font-semibold text-xl">Finance & Facturation</h1>
        </header>

        <main className="p-6 space-y-8 print:p-0">
          <div className="grid gap-6 md:grid-cols-3 print:hidden">
            <Card className="border-none shadow-sm bg-rose-500/5 border border-rose-500/10">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-rose-600 mb-1">Encours Client</p>
                    <h3 className="text-3xl font-bold font-headline">{stats.unpaid.toLocaleString('fr-FR')} $</h3>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-rose-500/10 flex items-center justify-center text-rose-600">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-primary/5 border border-primary/10">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-primary mb-1">Chiffre d'Affaires</p>
                    <h3 className="text-3xl font-bold font-headline">{stats.revenue.toLocaleString('fr-FR')} $</h3>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <CreditCard className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-accent/5 border border-accent/10">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-accent mb-1">Total Factures</p>
                    <h3 className="text-3xl font-bold font-headline">{stats.totalCount}</h3>
                  </div>
                  <div className="h-10 w-10 rounded-xl bg-accent/10 flex items-center justify-center text-accent">
                    <FileText className="h-5 w-5" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm print:shadow-none print:border-none">
            <CardHeader className="flex flex-row items-center justify-between print:hidden">
              <div>
                <CardTitle className="font-headline">Historique des Factures</CardTitle>
                <CardDescription>Consultez et gérez les transactions de vos clients.</CardDescription>
              </div>
              <div className="flex gap-2">
                {invoices && invoices.length > 0 && (
                  <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-2">
                        <Trash2 className="h-4 w-4" /> Purger
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Effacer tout le registre ?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Cette action supprimera définitivement toutes les factures archivées. Cette opération est irréversible.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Annuler</AlertDialogCancel>
                        <AlertDialogAction onClick={handleClearRegistry} className="bg-destructive hover:bg-destructive/90">Supprimer tout</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                )}
              </div>
            </CardHeader>
            <CardContent className="print:p-0">
              {isInvoicesLoading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : invoices && invoices.length > 0 ? (
                <div className="space-y-4 print:hidden">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border hover:bg-muted/10 transition-all gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center text-primary shrink-0">
                          <Receipt className="h-6 w-6" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-sm tracking-tight">INV-{inv.id.slice(0, 8).toUpperCase()}</span>
                          <span className="text-xs text-muted-foreground font-medium">{inv.guestName} • {new Date(inv.invoiceDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6 ml-auto md:ml-0">
                        <div className="flex flex-col items-end">
                          <span className="font-bold text-lg">{Number(inv.amountDue).toFixed(2)} $</span>
                          <Badge variant={inv.status === 'Paid' ? 'default' : 'secondary'} className="text-[10px] py-0 px-2 h-4">
                            {inv.status === 'Paid' ? 'Payée' : 'Impayée'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          {inv.status !== 'Paid' && (
                            <Button variant="outline" size="sm" className="h-9 px-3 gap-2" onClick={() => handleMarkAsPaid(inv)}>
                              <CreditCard className="h-4 w-4" /> Encaisser
                            </Button>
                          )}
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-9 px-3 gap-2"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsInvoiceDialogOpen(true);
                            }}
                          >
                            <FileText className="h-4 w-4" /> Aperçu
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-2xl print:hidden">
                  <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-10" />
                  <p className="text-muted-foreground font-medium">Aucune facture enregistrée dans le système.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>

      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-4xl p-0 bg-white border-none shadow-2xl overflow-hidden rounded-2xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Facture ImaraPMS</DialogTitle>
            <DialogDescription>Aperçu professionnel pour impression et archivage.</DialogDescription>
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="flex flex-col h-full max-h-[90vh]">
              <div className="flex-1 overflow-auto p-12 bg-white text-slate-900" id="invoice-printable">
                {/* Header Section */}
                <div className="flex justify-between items-start mb-16">
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="h-12 w-12 rounded-xl bg-slate-900 flex items-center justify-center text-white">
                        <Hotel className="h-7 w-7" />
                      </div>
                      <div>
                        <h2 className="text-2xl font-bold font-headline tracking-tighter">ImaraPMS</h2>
                        <p className="text-[10px] uppercase font-bold tracking-[0.2em] text-slate-400">LUXURY HOSPITALITY</p>
                      </div>
                    </div>
                    <div className="text-sm text-slate-500 leading-relaxed max-w-[240px]">
                      123 Avenue de l'Hospitalité<br />
                      Grand Central, GC 10023<br />
                      contact@imarapms.com<br />
                      +1 234 567 890
                    </div>
                  </div>
                  <div className="text-right">
                    <h1 className="text-6xl font-bold tracking-tighter text-slate-100 opacity-30 uppercase absolute right-12 top-10 pointer-events-none">Facture</h1>
                    <div className="pt-8 relative z-10 space-y-1">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Numéro de Facture</p>
                      <p className="text-xl font-bold font-mono">#INV-{selectedInvoice.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                </div>

                {/* Billing Info Grid - Styled to match screenshot */}
                <div className="grid grid-cols-3 gap-12 mb-16">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 border-b pb-2">Destinataire</p>
                    <h3 className="text-3xl font-bold text-slate-900 mb-3">{selectedInvoice.guestName}</h3>
                    <div className="space-y-1 text-sm text-slate-600">
                      <p className="flex items-center gap-2 font-medium"><Phone className="h-3 w-3" /> {selectedInvoice.guestPhone || "N/A"}</p>
                      <p className="flex items-center gap-2 font-medium">Client ID: {selectedInvoice.guestId?.slice(0, 8).toUpperCase() || "REG-9912"}</p>
                    </div>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 border-b pb-2">Émission</p>
                    <p className="text-base font-bold text-slate-900">{new Date(selectedInvoice.invoiceDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-4 border-b pb-2">Échéance</p>
                    <p className="text-base font-bold text-slate-900">{new Date(selectedInvoice.dueDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                  </div>
                </div>

                <Separator className="mb-12" />

                {/* Items Table */}
                <div className="mb-12">
                  <div className="rounded-2xl border border-slate-100 overflow-hidden">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="bg-slate-900 text-white">
                          <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest">Description</th>
                          <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-center">Qté</th>
                          <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-right">Prix Unit.</th>
                          <th className="px-8 py-5 text-[10px] font-bold uppercase tracking-widest text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        <tr>
                          <td className="px-8 py-8">
                            <p className="font-bold text-slate-900 mb-1">Services d'Hébergement</p>
                            <p className="text-xs text-slate-500 italic">Séjour hôtelier complet incluant l'accès à toutes les installations de l'hôtel.</p>
                          </td>
                          <td className="px-8 py-8 text-center text-sm font-medium">1</td>
                          <td className="px-8 py-8 text-right text-sm font-medium">{Number(selectedInvoice.amountDue).toFixed(2)} $</td>
                          <td className="px-8 py-8 text-right text-sm font-bold text-slate-900">{Number(selectedInvoice.amountDue).toFixed(2)} $</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Summary Section */}
                <div className="flex justify-end mb-20">
                  <div className="w-full max-w-sm space-y-4">
                    <div className="flex justify-between items-center px-4">
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Sous-total</span>
                      <span className="text-sm font-bold">{Number(selectedInvoice.amountDue).toFixed(2)} $</span>
                    </div>
                    <div className="flex justify-between items-center px-4">
                      <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Taxes (0%)</span>
                      <span className="text-sm font-bold">0.00 $</span>
                    </div>
                    <div className="h-px bg-slate-200 w-full" />
                    <div className="flex justify-between items-center px-4 py-2">
                      <span className="text-lg font-black uppercase tracking-tighter">Total à Payer</span>
                      <span className="text-4xl font-black font-headline text-slate-900 tracking-tighter">
                        {Number(selectedInvoice.amountDue).toFixed(2)} $
                      </span>
                    </div>
                    {selectedInvoice.status === 'Paid' && (
                      <div className="mx-4 p-3 bg-emerald-50 rounded-xl flex justify-between items-center border border-emerald-100">
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Montant Acquitté</span>
                        <span className="text-lg font-black text-emerald-600">-{Number(selectedInvoice.amountPaid).toFixed(2)} $</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Section */}
                <div className="border-t border-slate-100 pt-12">
                  <div className="grid grid-cols-2 gap-20">
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Note au Client</h4>
                      <p className="text-xs text-slate-500 leading-relaxed italic">
                        Nous espérons que votre séjour à ImaraPMS a été des plus agréables. 
                        Toute l'équipe se réjouit de vous accueillir à nouveau très prochainement pour une nouvelle expérience d'exception.
                      </p>
                    </div>
                    <div className="space-y-4">
                      <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-900">Conditions de Règlement</h4>
                      <p className="text-[10px] text-slate-400 leading-relaxed uppercase tracking-tighter">
                        Le paiement est dû dès réception. Tout retard de paiement au-delà de 30 jours fera l'objet d'une pénalité de retard égale à 3 fois le taux d'intérêt légal.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar - Styled to match screenshot buttons */}
              <div className="bg-slate-50 p-6 flex justify-end gap-3 border-t print:hidden">
                <Button variant="outline" className="h-12 px-8 gap-2 bg-white text-slate-900 font-bold uppercase tracking-widest text-[11px] border-slate-200 hover:bg-slate-100" onClick={() => handleSendWhatsApp(selectedInvoice)}>
                  <MessageCircle className="h-4 w-4" /> WhatsApp
                </Button>
                <Button variant="outline" className="h-12 px-8 gap-2 bg-[#1A1C1E] text-white font-bold uppercase tracking-widest text-[11px] hover:bg-slate-800" onClick={() => window.print()}>
                  <Download className="h-4 w-4" /> Télécharger
                </Button>
                <Button className="h-12 px-8 gap-2 bg-[#101419] hover:bg-black text-white font-bold uppercase tracking-widest text-[11px] shadow-lg shadow-slate-200" onClick={handlePrint}>
                  <Printer className="h-4 w-4" /> Imprimer la Facture
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
