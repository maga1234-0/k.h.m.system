
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
import jsPDF from 'jspdf'
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
    const hotelName = settings?.hotelName || 'ImaraPMS Resort';
    
    let message = `*${hotelName.toUpperCase()} - FACTURE OFFICIELLE*\n\n`;
    message += `Cher(e) ${invoice.guestName},\n\n`;
    message += `Veuillez trouver ci-dessous le détail de votre séjour :\n\n`;
    message += `*Détails des prestations :*\n`;
    message += `- Hébergement : ${basePrice.toFixed(2)} $\n`;
    
    extras.forEach(extra => {
      message += `- ${extra.type} (${extra.description}) : ${parseFloat(extra.amount).toFixed(2)} $\n`;
    });
    
    message += `\n*MONTANT NET À RÉGLER : ${Number(invoice.amountDue).toFixed(2)} $*\n\n`;
    message += `Merci de votre confiance.\nCordialement,\nLa Direction.`;

    const phone = invoice.guestPhone.replace(/\D/g, '');
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDownloadPDF = async () => {
    if (!selectedInvoice) return;

    setIsGeneratingPdf(true);
    const page1 = document.getElementById('invoice-page-1');
    const page2 = document.getElementById('invoice-page-2');
    
    if (!page1 || !page2) {
      setIsGeneratingPdf(false);
      return;
    }

    try {
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();

      const canvas1 = await html2canvas(page1, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const img1 = canvas1.toDataURL('image/png');
      const height1 = (canvas1.height * pdfWidth) / canvas1.width;
      pdf.addImage(img1, 'PNG', 0, 0, pdfWidth, height1);

      pdf.addPage();
      const canvas2 = await html2canvas(page2, { scale: 3, useCORS: true, backgroundColor: '#ffffff' });
      const img2 = canvas2.toDataURL('image/png');
      const height2 = (canvas2.height * pdfWidth) / canvas2.width;
      pdf.addImage(img2, 'PNG', 0, 0, pdfWidth, height2);

      pdf.save(`FACTURE-${selectedInvoice.guestName.toUpperCase().replace(/\s+/g, '-')}.pdf`);
      toast({ title: "Document Prêt", description: "Facture haute définition générée." });
      
      setTimeout(() => {
        handleSendWhatsApp(selectedInvoice);
      }, 1000);

    } catch (error) {
      console.error('PDF Error:', error);
      toast({ variant: "destructive", title: "Échec", description: "Erreur lors de la génération haute définition." });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const extras = useMemo(() => getExtrasForInvoice(selectedInvoice), [selectedInvoice, reservations]);
  const totalExtras = extras.reduce((acc, e) => acc + parseFloat(e.amount), 0);
  const basePrice = useMemo(() => {
    if (!selectedInvoice) return 0;
    return Math.max(0, Number(selectedInvoice.amountDue) - totalExtras);
  }, [selectedInvoice, totalExtras]);

  if (!mounted || isAuthLoading || !user) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 bg-background sticky top-0 z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-4 h-6" />
          <h1 className="font-headline font-semibold text-xl text-primary">Finance & Facturation</h1>
        </header>

        <main className="p-4 md:p-6 space-y-6">
          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
            <Card className="border-none shadow-sm bg-rose-500/5 border border-rose-500/10">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-rose-600 mb-1">Dettes Clients</p>
                    <h3 className="text-2xl md:text-3xl font-black font-headline tracking-tighter">{stats.unpaid.toLocaleString('fr-FR')} $</h3>
                  </div>
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-primary/5 border border-primary/10">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-1">Total Encaissé</p>
                    <h3 className="text-2xl md:text-3xl font-black font-headline tracking-tighter">{stats.revenue.toLocaleString('fr-FR')} $</h3>
                  </div>
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-accent/5 border border-accent/10">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-accent mb-1">Nombre Factures</p>
                    <h3 className="text-2xl md:text-3xl font-black font-headline tracking-tighter">{stats.totalCount}</h3>
                  </div>
                  <FileText className="h-5 w-5 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline text-lg font-bold">Registre de Facturation</CardTitle>
                <CardDescription>Suivi des documents officiels et encaissements.</CardDescription>
              </div>
              {invoices && invoices.length > 0 && (
                <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-2 h-8 text-xs font-bold uppercase tracking-widest">
                      <Trash2 className="h-4 w-4" /> Purger le registre
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Action Irréversible</AlertDialogTitle>
                      <AlertDialogDescription>Êtes-vous sûr de vouloir supprimer l'intégralité du registre de facturation ?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearRegistry} className="bg-destructive hover:bg-destructive/90">Purger tout</AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              )}
            </CardHeader>
            <CardContent>
              {isInvoicesLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : invoices && invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border bg-card hover:border-primary/30 transition-all gap-4">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                          {inv.status === 'Paid' ? <CheckCircle2 className="h-6 w-6" /> : <Receipt className="h-6 w-6" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-xs text-primary uppercase tracking-widest">#INV-{inv.id.slice(0, 6).toUpperCase()}</span>
                          <span className="text-sm font-bold text-slate-900">{inv.guestName}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(inv.invoiceDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-6">
                        <div className="text-right">
                          <span className="text-[10px] font-black uppercase text-muted-foreground block mb-1">Montant Du</span>
                          <span className="font-black text-lg tracking-tight">{Number(inv.amountDue).toFixed(2)} $</span>
                        </div>
                        <div className="flex gap-2">
                          {inv.status !== 'Paid' && (
                            <Button className="h-10 px-6 gap-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg shadow-emerald-500/20" onClick={() => { setInvoiceForPayment(inv); setIsPaymentDialogOpen(true); }}>
                              <DollarSign className="h-4 w-4" /> Encaisser
                            </Button>
                          )}
                          <Button variant="outline" size="icon" className="h-10 w-10 text-[#25D366] rounded-xl border-[#25D366]/20 hover:bg-[#25D366]/5" onClick={() => handleSendWhatsApp(inv)}><MessageCircle className="h-5 w-5" /></Button>
                          <Button variant="secondary" size="sm" className="h-10 px-4 gap-2 text-[10px] font-black uppercase tracking-widest rounded-xl" onClick={() => { setSelectedInvoice(inv); setIsInvoiceDialogOpen(true); }}>Aperçu PRO</Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-24 border-2 border-dashed rounded-[2rem] bg-muted/5">
                  <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-10" />
                  <p className="text-muted-foreground font-black text-sm uppercase tracking-[0.2em]">Aucun document émis</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>

        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-[2rem] border-none shadow-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-headline">Valider le Paiement</DialogTitle>
              <DialogDescription>Cette action marquera la facture comme réglée et mettra à jour votre trésorerie.</DialogDescription>
            </DialogHeader>
            {invoiceForPayment && (
              <div className="py-8">
                <div className="p-6 bg-emerald-500/5 rounded-[1.5rem] border border-emerald-500/10 text-center">
                  <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-2">Montant à Encaisser</p>
                  <h3 className="text-5xl font-black text-emerald-700 tracking-tighter tabular-nums">{Number(invoiceForPayment.amountDue).toFixed(2)} $</h3>
                </div>
              </div>
            )}
            <DialogFooter className="gap-2 sm:justify-center">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)} className="rounded-xl px-8 font-bold">Annuler</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-8 font-black uppercase tracking-widest h-11" onClick={handleCollectPayment}>Confirmer l'Encaissement</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
          <DialogContent className="max-w-5xl w-[98vw] p-0 bg-slate-100 border-none shadow-2xl overflow-hidden rounded-[2.5rem]">
            <DialogHeader className="sr-only">
              <DialogTitle>Aperçu Facture Fiesta Hotel</DialogTitle>
              <DialogDescription>Format haute définition pour impression et partage.</DialogDescription>
            </DialogHeader>
            {selectedInvoice && (
              <div className="flex flex-col h-full max-h-[92vh]">
                <div className="flex-1 overflow-auto p-4 md:p-8 space-y-12">
                  <div className="w-full flex justify-center">
                    <div className="scale-[0.35] sm:scale-[0.55] md:scale-[0.75] lg:scale-100 origin-top transform-gpu transition-transform duration-500">
                      
                      {/* PAGE 1 : RÉSUMÉ & SIGNATURE */}
                      <div id="invoice-page-1" className="bg-white p-16 shadow-2xl rounded-sm mx-auto w-[210mm] min-h-[297mm] flex flex-col">
                        <div className="flex justify-between items-start mb-20">
                          <div className="flex items-center gap-6 min-w-0 flex-1">
                            <div className="h-24 w-24 rounded-3xl bg-primary flex items-center justify-center text-white shadow-2xl shrink-0"><Hotel className="h-14 w-14" /></div>
                            <div className="flex flex-col min-w-0">
                              <span className="font-headline font-black text-6xl text-primary tracking-tighter leading-[0.9] truncate uppercase">{settings?.hotelName || 'ImaraPMS Resort'}</span>
                              <span className="text-[12px] font-black tracking-[0.5em] text-slate-400 mt-2">HOSPITALITÉ DE PRESTIGE</span>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end pt-2">
                            <h1 className="text-4xl font-black text-slate-900 uppercase tracking-tighter leading-none mb-3">FACTURE</h1>
                            <span className="text-xl font-black text-primary mb-1">#INV-{selectedInvoice.id.slice(0, 8).toUpperCase()}</span>
                            <p className="text-sm text-slate-400 font-bold uppercase tracking-widest">{new Date(selectedInvoice.invoiceDate).toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-20 mb-24">
                          <div className="space-y-6 border-l-8 border-primary/20 pl-8">
                            <p className="text-[12px] font-black text-primary uppercase tracking-[0.3em] border-b border-primary/10 pb-2 w-fit">DESTINATAIRE</p>
                            <div className="space-y-1">
                              <h3 className="text-4xl font-black text-slate-900 leading-tight">{selectedInvoice.guestName}</h3>
                              <p className="text-xl text-slate-500 font-bold">{selectedInvoice.guestPhone}</p>
                            </div>
                          </div>
                          <div className="text-right flex flex-col items-end space-y-6">
                            <p className="text-[12px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-900 pb-2 w-fit">ÉMETTEUR</p>
                            <div className="space-y-1">
                              <h3 className="text-2xl font-black text-slate-900 leading-tight">{settings?.hotelName || 'ImaraPMS Resort'}</h3>
                              <p className="text-[14px] text-slate-400 font-bold leading-relaxed max-w-[280px]">{settings?.address || 'Adresse officielle'}</p>
                            </div>
                          </div>
                        </div>

                        <div className="mb-auto">
                          <table className="w-full border-collapse">
                            <thead>
                              <tr className="bg-slate-900 text-white">
                                <th className="py-6 px-10 text-[11px] font-black uppercase tracking-[0.2em] text-left">DESCRIPTION DES PRESTATIONS</th>
                                <th className="py-6 px-10 text-[11px] font-black uppercase tracking-[0.2em] text-right">MONTANT ($)</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y-2 divide-slate-100">
                              <tr className="group">
                                <td className="py-12 px-10">
                                  <span className="font-black text-slate-800 text-2xl block mb-1">Frais de Séjour & Hébergement</span>
                                  <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">Base tarifaire standard avec services inclus</span>
                                </td>
                                <td className="py-12 px-10 text-right font-black text-3xl text-slate-900 tabular-nums">{basePrice.toFixed(2)} $</td>
                              </tr>
                              <tr className="bg-slate-50/50">
                                <td className="py-12 px-10">
                                  <span className="font-black text-slate-500 text-2xl block mb-1">Extras & Consommations Annexes</span>
                                  <span className="text-sm text-slate-400 font-bold uppercase tracking-widest">Voir détail chronologique en page 2</span>
                                </td>
                                <td className="py-12 px-10 text-right font-black text-3xl text-slate-400 tabular-nums">+{totalExtras.toFixed(2)} $</td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div className="flex justify-between items-end border-t-[12px] border-slate-900 pt-16 mt-20">
                          <div className="space-y-8">
                            <div className="flex flex-col">
                              <span className="text-[11px] font-black uppercase text-primary tracking-[0.3em] mb-4">SIGNATURE AUTORISÉE</span>
                              <div className="min-h-[160px] flex flex-col justify-end">
                                {settings?.signatureUrl ? (
                                  <img src={settings.signatureUrl} alt="Signature" className="h-32 w-auto object-contain mb-4 block mix-blend-multiply transition-opacity duration-300" />
                                ) : (
                                  <div className="h-24 w-64 border-b-2 border-dashed border-slate-200 mb-4 bg-slate-50/50" />
                                )}
                                <p className="text-xl font-black uppercase tracking-widest text-slate-900">{settings?.managerName || 'Le Directeur Général'}</p>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-[14px] font-black text-slate-400 uppercase mb-4 tracking-[0.4em]">TOTAL NET À PAYER</p>
                            <div className="bg-primary/5 p-6 rounded-3xl border border-primary/10">
                              <span className="text-7xl font-black text-slate-900 tracking-tighter tabular-nums leading-none block">{Number(selectedInvoice.amountDue).toFixed(2)} <span className="text-4xl text-primary">$</span></span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* PAGE 2 : DÉTAIL DES CONSOMMATIONS */}
                      <div id="invoice-page-2" className="bg-white p-16 shadow-2xl rounded-sm mx-auto w-[210mm] min-h-[297mm] mt-12 flex flex-col">
                        <div className="flex items-center gap-6 mb-16 border-b-2 border-slate-100 pb-10">
                          <div className="h-16 w-3 rounded-full bg-primary shadow-lg shadow-primary/20" />
                          <div>
                            <h2 className="text-3xl font-black uppercase tracking-[0.15em] text-slate-900 leading-none">RELEVÉ DÉTAILLÉ</h2>
                            <p className="text-[12px] font-black text-slate-400 uppercase tracking-widest mt-2">DÉTAIL DES CONSOMMATIONS ET SERVICES ANNEXES</p>
                          </div>
                        </div>

                        <table className="w-full border-collapse mb-auto">
                          <thead>
                            <tr className="bg-slate-50 border-y-2 border-slate-200">
                              <th className="py-6 px-10 text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">DATE</th>
                              <th className="py-6 px-10 text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] text-left">SERVICE / DÉSIGNATION</th>
                              <th className="py-6 px-10 text-[12px] font-black text-slate-400 uppercase tracking-[0.2em] text-right">MONTANT ($)</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {extras.length > 0 ? extras.map((e, i) => (
                              <tr key={i} className="hover:bg-slate-50/30 transition-colors">
                                <td className="py-8 px-10 text-sm font-black text-slate-400 tabular-nums uppercase">{e.date}</td>
                                <td className="py-8 px-10">
                                  <span className="font-black text-slate-800 text-xl block mb-1">{e.type}</span>
                                  <span className="text-xs text-slate-400 font-bold uppercase tracking-widest">{e.description}</span>
                                </td>
                                <td className="py-8 px-10 text-right font-black text-2xl text-slate-900 tabular-nums whitespace-nowrap">+{parseFloat(e.amount).toFixed(2)} $</td>
                              </tr>
                            )) : (
                              <tr>
                                <td colSpan={3} className="py-32 text-center text-slate-300 font-black italic text-2xl uppercase tracking-[0.4em] opacity-30">Aucun extra enregistré</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                        
                        <div className="mt-20 pt-12 border-t-[1px] border-slate-100 text-center">
                          <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.5em] mb-4">IMARAPMS - SOLUTION DE GESTION OFFICIELLE POUR ÉTABLISSEMENTS DE PRESTIGE</p>
                          <div className="flex justify-center gap-2">
                             {[1,2,3,4,5].map(s => <div key={s} className="h-2 w-2 rounded-full bg-primary/20" />)}
                          </div>
                        </div>
                      </div>

                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 md:p-10 border-t flex flex-col md:flex-row justify-end gap-5 rounded-b-[2.5rem]">
                  <Button disabled={isGeneratingPdf} className="w-full md:w-auto h-16 px-12 bg-slate-900 text-white rounded-[1.25rem] shadow-2xl hover:bg-slate-800 font-black text-[12px] uppercase tracking-[0.2em] gap-3 transition-all hover:-translate-y-1 active:scale-95" onClick={handleDownloadPDF}>
                    {isGeneratingPdf ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                    Générer la Facture HD (2 Pages)
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </div>
  );
}
