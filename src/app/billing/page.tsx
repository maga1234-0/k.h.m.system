
"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  Receipt, 
  Loader2, 
  CreditCard, 
  MessageCircle, 
  Trash2, 
  AlertCircle, 
  FileText, 
  Download,
  Hotel,
  CheckCircle2,
  DollarSign
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState<any>(null);
  
  const firestore = useFirestore();
  const settingsRef = useMemoFirebase(() => doc(firestore, 'settings', 'general'), [firestore]);
  const { data: settings } = useDoc(settingsRef);

  const invoicesRef = useMemoFirebase(() => user ? collection(firestore, 'invoices') : null, [firestore, user]);
  const { data: invoices, isLoading: isInvoicesLoading } = useCollection(invoicesRef);

  const resRef = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  const { data: reservations } = useCollection(resRef);

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

  const getExtrasForInvoice = (invoice: any) => {
    if (!invoice || !reservations) return [];
    const res = reservations.find(r => r.id === invoice.reservationId);
    if (!res || !res.notes) return [];

    const extras: { date: string, type: string, description: string, amount: string }[] = [];
    const lines = res.notes.split('\n');
    const regex = /\[(.*?)\] (.*?): (.*?) \(\+(.*?) \$\)/;
    lines.forEach(line => {
      const match = line.match(regex);
      if (match) {
        extras.push({
          date: match[1],
          type: match[2],
          description: match[3],
          amount: match[4]
        });
      }
    });
    return extras;
  };

  const handleClearRegistry = () => {
    if (!invoices) return;
    invoices.forEach((inv) => deleteDocumentNonBlocking(doc(firestore, 'invoices', inv.id)));
    setIsClearDialogOpen(false);
    toast({ variant: "destructive", title: "Action effectuée", description: "Le registre des factures a été purgé." });
  };

  const handleCollectPayment = () => {
    if (!invoiceForPayment) return;
    const invRef = doc(firestore, 'invoices', invoiceForPayment.id);
    updateDocumentNonBlocking(invRef, {
      amountPaid: Number(invoiceForPayment.amountDue),
      status: 'Paid',
      paymentDate: new Date().toISOString()
    });
    setIsPaymentDialogOpen(false);
    setInvoiceForPayment(null);
    toast({ title: "Paiement Enregistré", description: "La facture a été marquée comme réglée." });
  };

  const handleSendWhatsApp = (invoice: any) => {
    if (!invoice || !invoice.guestPhone) {
      toast({ variant: "destructive", title: "Erreur", description: "Numéro de téléphone manquant." });
      return;
    }
    
    const extras = getExtrasForInvoice(invoice);
    const totalExtras = extras.reduce((acc, e) => acc + parseFloat(e.amount), 0);
    const basePrice = Math.max(0, Number(invoice.amountDue) - totalExtras);
    const hotelName = settings?.hotelName || 'Fiesta hotel';
    
    let message = `*${hotelName.toUpperCase()} - FACTURE*\n\n`;
    message += `Bonjour ${invoice.guestName},\n\n`;
    message += `Veuillez trouver ci-dessous le détail de votre facture :\n\n`;
    message += `*Détails des prestations :*\n`;
    message += `- Services d'Hébergement (Base) : ${basePrice.toFixed(2)} $\n`;
    
    extras.forEach(extra => {
      message += `- ${extra.type} (${extra.description}) : ${parseFloat(extra.amount).toFixed(2)} $\n`;
    });
    
    message += `\n*TOTAL NET À PAYER : ${Number(invoice.amountDue).toFixed(2)} $*\n\n`;
    message += `Cordialement.`;

    const phone = invoice.guestPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDownloadPDF = async () => {
    if (!selectedInvoice) return;

    setIsGeneratingPdf(true);
    const element = document.getElementById('invoice-printable');
    if (!element) {
      setIsGeneratingPdf(false);
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        windowWidth: 800
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`facture-${selectedInvoice.guestName.replace(/\s+/g, '-')}.pdf`);
      
      toast({ title: "Document Prêt", description: "Le PDF a été généré avec succès." });
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast({ variant: "destructive", title: "Échec", description: "Erreur lors de la génération du PDF." });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const parsedExtras = useMemo(() => {
    return getExtrasForInvoice(selectedInvoice);
  }, [selectedInvoice, reservations]);

  const basePrice = useMemo(() => {
    if (!selectedInvoice) return 0;
    const totalExtras = parsedExtras.reduce((acc, e) => acc + parseFloat(e.amount), 0);
    return Math.max(0, Number(selectedInvoice.amountDue) - totalExtras);
  }, [selectedInvoice, parsedExtras]);

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
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 bg-background sticky top-0 z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-4 h-6" />
          <h1 className="font-headline font-semibold text-xl">Finance & Facturation</h1>
        </header>

        <main className="p-4 md:p-6 space-y-6">
          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
            <Card className="border-none shadow-sm bg-rose-500/5 border border-rose-500/10">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 mb-1">Encours Client</p>
                    <h3 className="text-2xl md:text-3xl font-bold font-headline">{stats.unpaid.toLocaleString('fr-FR')} $</h3>
                  </div>
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-primary/5 border border-primary/10">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Encaissements</p>
                    <h3 className="text-2xl md:text-3xl font-bold font-headline">{stats.revenue.toLocaleString('fr-FR')} $</h3>
                  </div>
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-accent/5 border border-accent/10">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1">Documents</p>
                    <h3 className="text-2xl md:text-3xl font-bold font-headline">{stats.totalCount}</h3>
                  </div>
                  <FileText className="h-5 w-5 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm rounded-2xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline text-lg">Registre des Factures</CardTitle>
                <CardDescription>Visualisation et encaissement des règlements.</CardDescription>
              </div>
              {invoices && invoices.length > 0 && (
                <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-2 h-8 text-xs">
                      <Trash2 className="h-4 w-4" /> Purger
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Confirmer la purge ?</AlertDialogTitle>
                      <AlertDialogDescription>Cette action est irréversible.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearRegistry} className="bg-destructive">Tout supprimer</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardHeader>
            <CardContent>
              {isInvoicesLoading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : invoices && invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-xl border bg-card hover:bg-muted/10 transition-all gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-10 w-10 rounded-xl flex items-center justify-center shrink-0 ${inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-secondary text-primary'}`}>
                          {inv.status === 'Paid' ? <CheckCircle2 className="h-5 w-5" /> : <Receipt className="h-5 w-5" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-bold text-xs md:text-sm">#INV-{inv.id.slice(0, 5).toUpperCase()}</span>
                          <span className="text-[10px] md:text-xs text-muted-foreground">{inv.guestName}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-6">
                        <div className="text-right">
                          <span className="font-bold text-sm md:text-lg">{Number(inv.amountDue).toFixed(2)} $</span>
                          {inv.status === 'Paid' && <p className="text-[10px] text-emerald-600 font-bold uppercase">Réglé</p>}
                        </div>
                        <div className="flex gap-2">
                          {inv.status !== 'Paid' && (
                            <Button 
                              variant="default" 
                              size="sm" 
                              className="h-9 px-4 gap-2 text-[10px] font-bold uppercase rounded-lg bg-emerald-600 hover:bg-emerald-700"
                              onClick={() => {
                                setInvoiceForPayment(inv);
                                setIsPaymentDialogOpen(true);
                              }}
                            >
                              <DollarSign className="h-4 w-4" /> Encaisser
                            </Button>
                          )}
                          <Button variant="outline" size="icon" className="h-9 w-9 text-[#25D366] rounded-lg" onClick={() => handleSendWhatsApp(inv)}>
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button 
                            variant="secondary" 
                            size="sm" 
                            className="h-9 px-3 gap-2 text-[10px] font-bold uppercase rounded-lg"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsInvoiceDialogOpen(true);
                            }}
                          >
                            Aperçu
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-20 border-2 border-dashed rounded-3xl">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-10" />
                  <p className="text-muted-foreground font-medium text-sm">Aucun document à afficher.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>

      <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-2xl">
          <DialogHeader>
            <DialogTitle>Valider l'Encaissement</DialogTitle>
            <DialogDescription>Confirmez la réception du paiement.</DialogDescription>
          </DialogHeader>
          {invoiceForPayment && (
            <div className="py-6 space-y-4">
              <div className="p-4 bg-muted/50 rounded-xl border">
                <p className="text-xs font-bold uppercase text-muted-foreground mb-1">Total à encaisser</p>
                <h3 className="text-3xl font-black text-primary tracking-tighter">{Number(invoiceForPayment.amountDue).toFixed(2)} $</h3>
              </div>
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Annuler</Button>
            <Button className="bg-emerald-600 hover:bg-emerald-700" onClick={handleCollectPayment}>Confirmer le paiement</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-4xl w-[95vw] p-0 bg-white border-none shadow-2xl overflow-hidden rounded-3xl">
          <DialogHeader className="sr-only">
            <DialogTitle>Aperçu Facture Fiesta Hotel</DialogTitle>
            <DialogDescription>Document de facturation officiel.</DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="flex flex-col h-full max-h-[90vh]">
              <div className="flex-1 overflow-auto p-6 md:p-12 bg-white text-slate-900" id="invoice-printable">
                {/* Header Section */}
                <div className="flex justify-between items-start mb-16">
                  <div className="flex items-center gap-3">
                    <div className="h-14 w-14 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                      <Hotel className="h-8 w-8" />
                    </div>
                    <span className="font-headline font-black text-3xl text-primary tracking-tighter">Fiesta hotel</span>
                  </div>
                  <div className="text-right">
                    <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">FACTURE #INV-{selectedInvoice.id.slice(0, 8).toUpperCase()}</h1>
                    <p className="text-sm text-slate-400 mt-1 font-bold">{new Date(selectedInvoice.invoiceDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                {/* Client & Emitter Section */}
                <div className="grid grid-cols-2 gap-12 mb-16">
                  <div className="space-y-4">
                    <div className="relative">
                      <p className="text-[10px] font-black text-primary uppercase tracking-[0.2em] mb-2">CLIENT</p>
                      <div className="h-[1.5px] w-full bg-primary/20 absolute -bottom-1" />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black tracking-tight text-slate-900">{selectedInvoice.guestName}</h3>
                      <p className="text-sm text-slate-500 font-bold mt-1">{selectedInvoice.guestPhone}</p>
                    </div>
                  </div>
                  <div className="space-y-4 text-right">
                    <div className="relative">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">ÉMETTEUR</p>
                      <div className="h-[1.5px] w-full bg-slate-900 absolute -bottom-1" />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900">Fiesta hotel</h3>
                      <p className="text-[11px] text-slate-400 font-bold leading-relaxed max-w-[220px] ml-auto mt-1">{settings?.address || 'Adresse non configurée'}</p>
                    </div>
                  </div>
                </div>

                {/* Services Table */}
                <div className="mb-16">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-slate-50">
                        <th className="py-5 px-6 text-[11px] uppercase font-black text-slate-400 tracking-[0.2em]">DÉSIGNATION</th>
                        <th className="py-5 px-6 text-[11px] uppercase font-black text-slate-400 tracking-[0.2em] text-right">MONTANT ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-6 px-6 font-black text-base text-slate-800">Services d'Hébergement (Base)</td>
                        <td className="py-6 px-6 text-right font-black text-lg text-slate-900 tracking-tighter">{basePrice.toFixed(2)} $</td>
                      </tr>
                      {parsedExtras.map((extra, idx) => (
                        <tr key={idx} className="bg-slate-50/20">
                          <td className="py-6 px-6">
                            <span className="text-[11px] font-black uppercase text-primary block mb-1 tracking-wider">{extra.type}</span>
                            <span className="text-sm font-bold text-slate-500">{extra.description} ({extra.date})</span>
                          </td>
                          <td className="py-6 px-6 text-right font-black text-base text-slate-900 tracking-tighter">+{parseFloat(extra.amount).toFixed(2)} $</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Total Section */}
                <div className="flex justify-end pt-8 border-t-2 border-slate-100">
                  <div className="w-full max-w-[320px] flex justify-between items-center">
                    <span className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400">Total Net à payer</span>
                    <span className="text-4xl font-black text-slate-900 tracking-tighter">{Number(selectedInvoice.amountDue).toFixed(2)} $</span>
                  </div>
                </div>
                
                {/* Footer Message */}
                <div className="mt-24 pt-10 border-t border-dashed border-slate-200 text-center">
                  <p className="text-[10px] uppercase font-black tracking-[0.4em] text-slate-300">Merci de votre confiance • Fiesta hotel</p>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="bg-slate-50 p-6 flex justify-end gap-4 border-t">
                <Button 
                  disabled={isGeneratingPdf}
                  className="h-12 px-10 gap-2 bg-slate-900 text-white rounded-xl shadow-xl hover:bg-slate-800 transition-all font-black text-[11px] uppercase tracking-widest" 
                  onClick={handleDownloadPDF}
                >
                  {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Générer PDF
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
