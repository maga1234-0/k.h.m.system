
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
  Trash2, 
  AlertCircle, 
  FileText, 
  CheckCircle2,
  DollarSign,
  Share2,
  Printer,
  Download,
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/ui/logo"
import html2canvas from "html2canvas"
import { jsPDF } from "jspdf"
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
  const [isDeleteIndividualDialogOpen, setIsDeleteIndividualDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState<any>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  
  const firestore = useFirestore();
  const settingsRef = useMemoFirebase(() => doc(firestore, 'settings', 'general'), [firestore]);
  const { data: settings } = useDoc(settingsRef);

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

  const handleClearRegistry = () => {
    if (!invoices) return;
    invoices.forEach((inv) => deleteDocumentNonBlocking(doc(firestore, 'invoices', inv.id)));
    setIsClearDialogOpen(false);
    toast({ variant: "destructive", title: "Registre purgé" });
  };

  const handleDeleteIndividual = () => {
    if (!invoiceToDelete) return;
    deleteDocumentNonBlocking(doc(firestore, 'invoices', invoiceToDelete.id));
    setIsDeleteIndividualDialogOpen(false);
    setInvoiceToDelete(null);
    toast({ variant: "destructive", title: "Facture Supprimée" });
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
    toast({ title: "Paiement Enregistré" });
  };

  const generatePDFBlob = async (invoice: any) => {
    const input = document.getElementById('invoice-single-page');
    if (!input) {
      toast({ variant: "destructive", title: "Erreur technique", description: "Veuillez d'abord ouvrir l'aperçu." });
      return null;
    }

    setIsGeneratingPDF(true);
    try {
      const canvas = await html2canvas(input, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff'
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });
      
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      return pdf.output('blob');
    } catch (error) {
      console.error("PDF Generation failed", error);
      toast({ variant: "destructive", title: "Erreur PDF", description: "Impossible de générer le document." });
      return null;
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const handleShareInvoice = async (invoice: any) => {
    setSelectedInvoice(invoice);
    setIsInvoiceDialogOpen(true);

    toast({ title: "Préparation de la facture", description: "Génération du PDF Fiesta Hotel..." });

    // Petit délai pour laisser le dialogue s'ouvrir et le DOM se rendre
    setTimeout(async () => {
      const blob = await generatePDFBlob(invoice);
      if (!blob) return;

      const fileName = `facture-${invoice.id.slice(0, 8).toUpperCase()}.pdf`;
      
      // Téléchargement forcé
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      a.click();
      URL.revokeObjectURL(url);

      // Ouverture de WhatsApp avec message
      const phone = invoice.guestPhone?.replace(/\D/g, '');
      const hotel = settings?.hotelName || 'Fiesta Hotel';
      const message = `*FACTURE OFFICIELLE - ${hotel.toUpperCase()}*\n\n` +
        `Bonjour ${invoice.guestName},\n\n` +
        `Veuillez trouver ci-joint votre facture *#INV-${invoice.id.slice(0, 8).toUpperCase()}*.\n\n` +
        `• *Montant :* ${Number(invoice.amountDue).toFixed(2)} $\n` +
        `• *Statut :* ${invoice.status === 'Paid' ? 'PAYÉE' : 'EN ATTENTE'}\n\n` +
        `Merci pour votre confiance !\n\n` +
        `_Système ImaraPMS_`;

      const whatsappUrl = phone 
        ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
        : `https://wa.me/?text=${encodeURIComponent(message)}`;
      
      window.open(whatsappUrl, '_blank');
      
      toast({ 
        title: "Prêt pour WhatsApp", 
        description: "Veuillez joindre le PDF téléchargé à la discussion ouverte." 
      });
    }, 1000);
  };

  if (!mounted || isAuthLoading || !user) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex h-screen w-full animate-in fade-in duration-500 bg-background">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-transparent">
        <header className="flex h-16 items-center border-b px-6 bg-background sticky top-0 z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-4 h-6" />
          <h1 className="font-headline font-semibold text-xl text-primary">Finance & Facturation</h1>
        </header>

        <main className="p-4 md:p-6 space-y-6">
          <div className="grid gap-4 md:gap-6 grid-cols-1 md:grid-cols-3">
            {[
              { label: "Dettes Clients", value: stats.unpaid, icon: AlertCircle, color: "destructive" },
              { label: "Total Encaissé", value: stats.revenue, icon: CreditCard, color: "primary" },
              { label: "Nombre Factures", value: stats.totalCount, icon: FileText, color: "accent", isCount: true }
            ].map((stat, i) => (
              <Card key={i} className={`border-none shadow-sm bg-muted/30 rounded-[2rem]`}>
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className={`text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-1`}>{stat.label}</p>
                      <h3 className="text-2xl md:text-3xl font-black font-headline tracking-tighter text-foreground">
                        {stat.value.toLocaleString('fr-FR')} {stat.isCount ? '' : '$'}
                      </h3>
                    </div>
                    <stat.icon className={`h-5 w-5 text-primary`} />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden bg-card">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline text-lg font-bold">Registre de Facturation</CardTitle>
                <CardDescription>Suivi des documents officiels et encaissements.</CardDescription>
              </div>
              {invoices && invoices.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-muted-foreground hover:text-destructive gap-2 h-8 text-xs font-bold uppercase tracking-widest"
                  onClick={() => setIsClearDialogOpen(true)}
                >
                  <Trash2 className="h-4 w-4" /> Purger tout
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {isInvoicesLoading ? (
                <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
              ) : invoices && invoices.length > 0 ? (
                <div className="space-y-3">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-4 rounded-2xl border bg-background hover:border-primary/30 transition-all group">
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-destructive/10 text-destructive'}`}>
                          {inv.status === 'Paid' ? <CheckCircle2 className="h-6 w-6" /> : <Receipt className="h-6 w-6" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-xs text-primary uppercase tracking-widest">#INV-{inv.id.slice(0, 6).toUpperCase()}</span>
                          <span className="text-sm font-bold text-foreground">{inv.guestName}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(inv.invoiceDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right mr-3">
                          <span className="text-[10px] font-black uppercase text-muted-foreground block mb-1">Montant</span>
                          <span className="font-black text-lg tracking-tight text-foreground">{Number(inv.amountDue).toFixed(2)} $</span>
                        </div>
                        <div className="flex gap-2">
                          {inv.status !== 'Paid' && (
                            <Button className="h-10 px-4 gap-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md" onClick={() => { setInvoiceForPayment(inv); setIsPaymentDialogOpen(true); }}>
                              <DollarSign className="h-4 w-4" /> Encaisser
                            </Button>
                          )}
                          <Button variant="outline" size="icon" className="h-10 w-10 text-primary rounded-xl hover:bg-primary/5 border-primary/20" onClick={() => handleShareInvoice(inv)} disabled={isGeneratingPDF}>
                            {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-5 w-5" />}
                          </Button>
                          <Button variant="secondary" size="sm" className="h-10 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl" onClick={() => { setSelectedInvoice(inv); setIsInvoiceDialogOpen(true); }}>Aperçu</Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive hover:bg-destructive/5" onClick={() => { setInvoiceToDelete(inv); setIsDeleteIndividualDialogOpen(true); }}><Trash2 className="h-5 w-5" /></Button>
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

        <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 rounded-[2rem] border-none shadow-2xl">
            <DialogHeader className="p-6 border-b bg-muted/20">
              <DialogTitle className="font-headline font-black text-2xl text-primary">Facture Officielle</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div id="invoice-single-page" className="p-16 bg-white text-slate-900 font-sans min-h-[297mm] flex flex-col">
                <div className="flex justify-between items-center mb-10">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 bg-primary/10 rounded-2xl flex items-center justify-center text-primary border border-primary/20">
                      <Logo size={48} />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black font-headline tracking-tighter text-primary uppercase">{settings?.hotelName || 'Fiesta Hotel'}</h2>
                      <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Hôtellerie de Prestige • Excellence</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h1 className="text-4xl font-black font-headline tracking-tighter uppercase mb-1">Facture</h1>
                    <p className="text-sm font-black text-primary">#INV-{selectedInvoice.id.slice(0, 8).toUpperCase()}</p>
                    <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date(selectedInvoice.invoiceDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                <div className="h-0.5 w-full bg-primary/20 mb-12" />

                <div className="grid grid-cols-2 gap-20 mb-16">
                  <div>
                    <h4 className="text-[9px] font-black uppercase text-primary tracking-[0.2em] mb-6 opacity-50">Destinataire</h4>
                    <p className="font-black text-2xl text-slate-900 leading-tight mb-1">{selectedInvoice.guestName}</p>
                    <p className="text-sm font-bold text-slate-500">{selectedInvoice.guestPhone || 'Aucun contact'}</p>
                    {selectedInvoice.guestEmail && <p className="text-xs text-slate-400">{selectedInvoice.guestEmail}</p>}
                  </div>
                  <div className="text-right">
                    <h4 className="text-[9px] font-black uppercase text-slate-400 tracking-[0.2em] mb-6">Émetteur</h4>
                    <p className="font-black text-lg text-slate-900 leading-tight mb-1">{settings?.hotelName || 'Fiesta Hotel'}</p>
                    <p className="text-[10px] font-bold text-slate-400 max-w-[200px] ml-auto leading-relaxed">
                      {settings?.address || 'République Démocratique du Congo'}
                    </p>
                  </div>
                </div>

                <div className="flex-1">
                  <div className="w-full overflow-hidden rounded-t-2xl shadow-sm">
                    <div className="grid grid-cols-[1fr_150px] bg-[#0f172a] text-white p-5">
                      <span className="text-[10px] font-black uppercase tracking-widest">Description des Services</span>
                      <span className="text-[10px] font-black uppercase tracking-widest text-right">Total ($)</span>
                    </div>
                    
                    <div className="bg-slate-50/50">
                      <div className="grid grid-cols-[1fr_150px] items-center p-8 border-b border-slate-100">
                        <div>
                          <p className="font-black text-xl text-slate-900 mb-1">Hébergement & Séjour (Ch. {selectedInvoice.roomNumber})</p>
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Type: {selectedInvoice.roomType || 'Standard'} • Du {selectedInvoice.checkInDate} au {selectedInvoice.checkOutDate}</p>
                        </div>
                        <p className="text-right font-black text-2xl text-slate-900">
                          {(Number(selectedInvoice.stayAmount) || Number(selectedInvoice.amountDue)).toFixed(2)} $
                        </p>
                      </div>

                      {selectedInvoice.notes && selectedInvoice.notes.split('\n').map((line: string, i: number) => {
                        const amountMatch = line.match(/\(\+(\d+(?:\.\d+)?)\s*\$\)/);
                        if (!amountMatch) return null;
                        
                        const dateMatch = line.match(/\[(.*?)\]/);
                        const cleanDesc = line.replace(/\[.*?\]/, '').replace(/\(\+.*?\)/, '').trim();
                        
                        return (
                          <div key={i} className="grid grid-cols-[1fr_150px] items-center p-6 border-b border-slate-100/50 bg-white/50">
                            <div className="flex items-center gap-4">
                              {dateMatch && (
                                <Badge variant="secondary" className="bg-slate-100 text-slate-500 font-bold text-[8px] px-2 py-0.5 h-auto border-none">
                                  {dateMatch[1]}
                                </Badge>
                              )}
                              <p className="font-black text-sm text-slate-700 uppercase tracking-tight">{cleanDesc}</p>
                            </div>
                            <p className="text-right font-black text-lg text-slate-900">+{amountMatch[1]} $</p>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="mt-12 flex justify-between items-end">
                  <div>
                    <h4 className="text-[9px] font-black uppercase text-primary tracking-[0.2em] mb-6">Signature & Cachet</h4>
                    {settings?.signatureUrl && (
                      <img src={settings.signatureUrl} alt="Signature" className="h-20 mb-4 mix-blend-multiply opacity-90" />
                    )}
                    <div className="pt-2">
                      <p className="font-black text-sm text-slate-900 uppercase">La Direction</p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Manager Officiel {settings?.hotelName || 'Fiesta Hotel'}</p>
                    </div>
                  </div>

                  <div className="bg-[#f0f9f6] p-10 rounded-[3rem] min-w-[320px] text-right border border-primary/10 shadow-sm">
                    <p className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-4">Montant Net à Régler</p>
                    <div className="flex items-center justify-end gap-3">
                      <span className="text-6xl font-black font-headline text-[#0f172a] tracking-tighter leading-none">{Number(selectedInvoice.amountDue).toFixed(2)}</span>
                      <span className="text-4xl font-black text-primary">$</span>
                    </div>
                  </div>
                </div>

                <div className="mt-20 flex flex-col items-center gap-2">
                  <div className="h-px w-20 bg-slate-100" />
                  <p className="text-[8px] font-black uppercase tracking-[0.4em] text-slate-300">
                    ImaraPMS • Logiciel de gestion hôtelière certifié • Document Officiel
                  </p>
                </div>
              </div>
            )}
            <div className="p-6 border-t bg-muted/20 flex justify-end gap-4">
              <Button variant="outline" className="rounded-xl font-bold uppercase text-[10px] tracking-widest" onClick={() => setIsInvoiceDialogOpen(false)}>Fermer</Button>
              <Button variant="secondary" className="rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2" onClick={async () => {
                const blob = await generatePDFBlob(selectedInvoice);
                if (blob) {
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `facture-${selectedInvoice.id.slice(0, 8)}.pdf`;
                  a.click();
                  URL.revokeObjectURL(url);
                }
              }} disabled={isGeneratingPDF}>
                {isGeneratingPDF ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Télécharger PDF
              </Button>
              <Button className="rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2 bg-primary shadow-lg shadow-primary/20" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Imprimer
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Action Irréversible</AlertDialogTitle>
              <AlertDialogDescription>Purger le registre complet de facturation ?</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleClearRegistry} className="bg-destructive hover:bg-destructive/90 rounded-xl">Purger</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <AlertDialog open={isDeleteIndividualDialogOpen} onOpenChange={setIsDeleteIndividualDialogOpen}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer la facture ?</AlertDialogTitle>
              <AlertDialogDescription>Ceci supprimera définitivement le document pour <strong>{invoiceToDelete?.guestName}</strong>.</AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteIndividual} className="bg-destructive hover:bg-destructive/90 rounded-xl">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-3xl">
            <DialogHeader><DialogTitle className="text-2xl font-black font-headline">Valider le Paiement</DialogTitle></DialogHeader>
            <div className="py-8 text-center bg-emerald-500/5 rounded-[1.5rem] border border-emerald-500/10">
              <p className="text-[10px] font-black uppercase text-emerald-600 tracking-widest mb-2">Montant</p>
              <h3 className="text-4xl font-black text-emerald-700">{invoiceForPayment ? Number(invoiceForPayment.amountDue).toFixed(2) : "0.00"} $</h3>
            </div>
            <div className="flex justify-center gap-2 mt-4">
              <Button variant="outline" className="rounded-xl" onClick={() => setIsPaymentDialogOpen(false)}>Annuler</Button>
              <Button className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg" onClick={handleCollectPayment}>Confirmer</Button>
            </div>
          </DialogContent>
        </Dialog>
      </SidebarInset>
    </div>
  );
}

