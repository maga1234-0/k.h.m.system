
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
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
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
    const page = document.getElementById('invoice-single-page');
    
    if (!page) {
      setIsGeneratingPdf(false);
      return;
    }

    try {
      const canvas = await html2canvas(page, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 1000
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      pdf.save(`FACTURE-${selectedInvoice.guestName.toUpperCase().replace(/\s+/g, '-')}.pdf`);
      
      toast({ title: "Succès", description: "La facture a été téléchargée." });
    } catch (error) {
      console.error('PDF Error:', error);
      toast({ variant: "destructive", title: "Échec", description: "Erreur lors de la génération." });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  const invoiceExtras = useMemo(() => getExtrasForInvoice(selectedInvoice), [selectedInvoice, reservations]);
  const totalExtras = invoiceExtras.reduce((acc, e) => acc + parseFloat(e.amount), 0);
  const basePriceValue = useMemo(() => {
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
                      <Trash2 className="h-4 w-4" /> Purger
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Action Irréversible</AlertDialogTitle>
                      <AlertDialogDescription>Vider le registre de facturation ?</AlertDialogDescription>
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
                            <Button className="h-10 px-6 gap-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setInvoiceForPayment(inv); setIsPaymentDialogOpen(true); }}>
                              <DollarSign className="h-4 w-4" /> Encaisser
                            </Button>
                          )}
                          <Button variant="outline" size="icon" className="h-10 w-10 text-[#25D366] rounded-xl border-[#25D366]/20" onClick={() => handleSendWhatsApp(inv)}><MessageCircle className="h-5 w-5" /></Button>
                          <Button variant="secondary" size="sm" className="h-10 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl" onClick={() => { setSelectedInvoice(inv); setIsInvoiceDialogOpen(true); }}>Aperçu</Button>
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
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-headline">Valider le Paiement</DialogTitle>
            </DialogHeader>
            <div className="py-8">
              <div className="p-6 bg-emerald-500/5 rounded-[1.5rem] border border-emerald-500/10 text-center">
                <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-2">Montant</p>
                <h3 className="text-4xl font-black text-emerald-700">{invoiceForPayment ? Number(invoiceForPayment.amountDue).toFixed(2) : "0.00"} $</h3>
              </div>
            </div>
            <div className="flex justify-center gap-2">
              <Button variant="outline" onClick={() => setIsPaymentDialogOpen(false)}>Annuler</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleCollectPayment}>Confirmer</Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
          <DialogContent className="max-w-4xl w-[98vw] p-0 bg-slate-100 border-none shadow-2xl overflow-hidden rounded-3xl">
            <DialogHeader className="sr-only">
              <DialogTitle>Facture Officielle</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="flex flex-col h-full max-h-[92vh]">
                <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center">
                  <div className="w-full max-w-[210mm] bg-white p-12 shadow-2xl min-h-[297mm] flex flex-col text-slate-900 font-sans" id="invoice-single-page">
                    <div className="mb-12 border-b-2 border-primary pb-8">
                       <table className="w-full">
                          <tbody>
                            <tr>
                              <td className="w-2/3 align-middle">
                                <div className="flex items-center gap-4">
                                  <div className="h-16 w-16 rounded-2xl bg-primary flex items-center justify-center text-white shrink-0"><Hotel className="h-10 w-10" /></div>
                                  <div>
                                    <h1 className="font-headline font-black text-3xl text-primary leading-none uppercase">{settings?.hotelName || 'ImaraPMS'}</h1>
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mt-1">Hôtellerie de Prestige • Excellence</p>
                                  </div>
                                </div>
                              </td>
                              <td className="w-1/3 text-right align-middle">
                                <h2 className="text-3xl font-black uppercase text-slate-900 mb-0">FACTURE</h2>
                                <p className="text-lg font-bold text-primary">#INV-{selectedInvoice.id.slice(0, 8).toUpperCase()}</p>
                                <p className="text-xs text-slate-400 font-bold">{new Date(selectedInvoice.invoiceDate).toLocaleDateString('fr-FR')}</p>
                              </td>
                            </tr>
                          </tbody>
                       </table>
                    </div>

                    <div className="grid grid-cols-2 gap-12 mb-12">
                      <div className="space-y-2">
                        <h4 className="text-[10px] font-black text-primary uppercase border-b border-slate-100 pb-1">DESTINATAIRE</h4>
                        <div className="pt-2">
                          <p className="text-2xl font-black text-slate-900 leading-tight">{selectedInvoice.guestName}</p>
                          <p className="text-sm font-bold text-slate-500 mt-1">{selectedInvoice.guestPhone}</p>
                        </div>
                      </div>
                      <div className="space-y-2 text-right">
                        <h4 className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100 pb-1">ÉMETTEUR</h4>
                        <div className="pt-2">
                          <p className="text-lg font-black leading-tight">{settings?.hotelName || 'ImaraPMS Resort'}</p>
                          <p className="text-xs text-slate-400 font-bold max-w-[200px] ml-auto mt-1">{settings?.address || 'République Démocratique du Congo'}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex-1 mb-12">
                      <table className="w-full border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white text-[10px] font-bold uppercase">
                            <th className="py-4 px-6 text-left border-r border-slate-700">DESCRIPTION DES SERVICES</th>
                            <th className="py-4 px-6 text-right w-40">TOTAL ($)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 border-b-2 border-slate-900">
                          <tr>
                            <td className="py-6 px-6">
                              <p className="font-black text-lg text-slate-900 leading-tight">Hébergement & Prestations Incluses</p>
                              <p className="text-xs text-slate-400 mt-1">Séjour du {new Date(selectedInvoice.invoiceDate).toLocaleDateString('fr-FR')}</p>
                            </td>
                            <td className="py-6 px-6 text-right font-black text-xl text-slate-900 align-top">{basePriceValue.toFixed(2)} $</td>
                          </tr>
                          {invoiceExtras.map((e, i) => (
                            <tr key={i} className="bg-slate-50/50">
                              <td className="py-4 px-6">
                                <div className="flex items-center gap-3">
                                  <span className="text-[9px] font-black bg-slate-200 px-2 py-0.5 rounded text-slate-500 shrink-0">{e.date}</span>
                                  <span className="font-bold text-sm text-slate-700 leading-tight">{e.type} : {e.description}</span>
                                </div>
                              </td>
                              <td className="py-4 px-6 text-right font-bold text-slate-600 align-top">+{parseFloat(e.amount).toFixed(2)} $</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="mt-auto pt-8">
                       <table className="w-full">
                          <tbody>
                            <tr>
                              <td className="w-1/2 align-bottom pb-4">
                                <p className="text-[10px] font-black uppercase text-primary mb-2">SIGNATURE & CACHET</p>
                                <div className="min-h-[140px] flex flex-col justify-end">
                                  {settings?.signatureUrl ? (
                                    <img src={settings.signatureUrl} alt="Signature" className="h-24 w-auto object-contain mb-2 block mix-blend-multiply" />
                                  ) : (
                                    <div className="h-20 w-48 border-b-2 border-dashed border-slate-200 mb-2" />
                                  )}
                                  <p className="text-sm font-black uppercase tracking-widest">{settings?.managerName || 'La Direction'}</p>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase">Manager Officiel Fiesta Hotel</p>
                                </div>
                              </td>
                              <td className="w-1/2 text-right align-bottom">
                                <div className="inline-block bg-primary/5 p-8 rounded-3xl border-2 border-primary/20">
                                  <p className="text-[10px] font-black text-slate-400 uppercase mb-2">MONTANT NET À RÉGLER</p>
                                  <div className="text-5xl font-black text-slate-900 flex items-baseline justify-end gap-2">
                                    {Number(selectedInvoice.amountDue).toFixed(2)} <span className="text-2xl text-primary font-black">$</span>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                       </table>
                       <div className="mt-12 text-center">
                          <p className="text-[9px] text-slate-300 font-bold uppercase tracking-[0.3em]">ImaraPMS - Logiciel de gestion hôtelière certifié - Document Officiel</p>
                       </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 border-t flex justify-center items-center rounded-b-3xl">
                  <Button disabled={isGeneratingPdf} className="h-12 px-12 font-black uppercase text-xs gap-3 rounded-xl shadow-lg" onClick={handleDownloadPDF}>
                    {isGeneratingPdf ? <Loader2 className="h-5 w-5 animate-spin" /> : <Download className="h-5 w-5" />}
                    Télécharger la Facture (PDF)
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
