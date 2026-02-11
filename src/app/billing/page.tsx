
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
  Printer
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { Badge } from "@/components/ui/badge"
import { Logo } from "@/components/ui/logo"
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
  const [isDeleteIndividualDialogOpen, setIsDeleteIndividualDialogOpen] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<any>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);
  const [invoiceForPayment, setInvoiceForPayment] = useState<any>(null);
  
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
    toast({ variant: "destructive", title: "Action effectuée", description: "Le registre des factures a été purgé." });
  };

  const handleDeleteIndividual = () => {
    if (!invoiceToDelete) return;
    deleteDocumentNonBlocking(doc(firestore, 'invoices', invoiceToDelete.id));
    setIsDeleteIndividualDialogOpen(false);
    setInvoiceToDelete(null);
    toast({ variant: "destructive", title: "Facture Supprimée", description: "Le document a été retiré du registre." });
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

  const handleShareInvoice = async (invoice: any) => {
    setIsSharing(true);
    setSelectedInvoice(invoice);
    setIsInvoiceDialogOpen(true);
    
    await new Promise(r => setTimeout(r, 500));
    
    const page = document.getElementById('invoice-single-page');
    if (!page) {
      setIsSharing(false);
      return;
    }

    try {
      const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      const blob = pdf.output('blob');

      const fileName = `FACTURE-${invoice.guestName.replace(/\s+/g, '-')}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: `Facture ImaraPMS - ${invoice.guestName}`,
          text: `Bonjour ${invoice.guestName}, voici votre facture pour votre séjour au ${settings?.hotelName || 'ImaraPMS Resort'}.`,
        });
      } else {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        link.click();
        URL.revokeObjectURL(url);
        toast({ title: "Téléchargement lancé", description: "La facture est prête." });
      }
    } catch (error) {
      console.error('PDF Generation Error:', error);
      toast({ variant: "destructive", title: "Erreur", description: "Échec de génération du PDF." });
    } finally {
      setIsSharing(false);
    }
  };

  if (!mounted || isAuthLoading || !user) {
    return <div className="flex h-screen w-full items-center justify-center bg-background"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  return (
    <div className="flex h-screen w-full animate-in fade-in duration-500">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
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
              <Card key={i} className={`border-none shadow-sm bg-muted/30 animate-in slide-in-from-bottom-4 duration-500 rounded-[2rem]`} style={{ animationDelay: `${i * 100}ms` }}>
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

          <Card className="border-none shadow-sm rounded-[2rem] overflow-hidden animate-in fade-in duration-700">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline text-lg font-bold">Registre de Facturation</CardTitle>
                <CardDescription>Suivi des documents officiels et encaissements.</CardDescription>
              </div>
              {invoices && invoices.length > 0 && (
                <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-destructive gap-2 h-8 text-xs font-bold uppercase tracking-widest">
                      <Trash2 className="h-4 w-4" /> Purger tout
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent className="rounded-3xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Action Irréversible</AlertDialogTitle>
                      <AlertDialogDescription>Voulez-vous vraiment vider le registre complet de facturation ?</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className="rounded-xl">Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearRegistry} className="bg-destructive hover:bg-destructive/90 rounded-xl">Purger tout</AlertDialogAction>
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
                  {invoices.map((inv, idx) => (
                    <div key={inv.id} className="flex items-center justify-between p-4 rounded-2xl border bg-card hover:border-primary/30 transition-all group">
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
                          <Button variant="outline" size="icon" className="h-10 w-10 text-primary rounded-xl" onClick={() => handleShareInvoice(inv)} disabled={isSharing}>
                            {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-5 w-5" />}
                          </Button>
                          <Button variant="secondary" size="sm" className="h-10 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl" onClick={() => { setSelectedInvoice(inv); setIsInvoiceDialogOpen(true); }}>Aperçu</Button>
                          <Button variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => { setInvoiceToDelete(inv); setIsDeleteIndividualDialogOpen(true); }}><Trash2 className="h-5 w-5" /></Button>
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
              <DialogTitle className="font-headline font-black text-2xl text-primary">Aperçu du Document</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div id="invoice-single-page" className="p-12 bg-white text-slate-900 font-sans min-h-[297mm]">
                <div className="flex justify-between items-start mb-16">
                  <div>
                    <Logo size={80} className="text-primary mb-6" />
                    <h2 className="text-4xl font-black font-headline uppercase tracking-tighter text-slate-900">Facture Officielle</h2>
                    <p className="text-sm font-bold text-muted-foreground mt-1">N° Document : INV-{selectedInvoice.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <div className="text-right">
                    <h3 className="font-black text-xl text-primary uppercase">{settings?.hotelName || 'ImaraPMS Resort'}</h3>
                    <p className="text-xs text-muted-foreground max-w-[200px] ml-auto mt-2 leading-relaxed">{settings?.address || 'Adresse de l\'établissement hôtelier'}</p>
                    <p className="text-xs font-bold mt-1 text-slate-700">{settings?.phone || 'Contact Accueil'}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-12 mb-16 border-y-2 border-slate-100 py-10">
                  <div>
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-4">Destinataire (Client)</h4>
                    <p className="font-black text-2xl text-slate-900 mb-1">{selectedInvoice.guestName}</p>
                    <p className="text-sm font-medium text-slate-600">{selectedInvoice.guestPhone}</p>
                  </div>
                  <div className="text-right">
                    <h4 className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] mb-4">Détails de Facturation</h4>
                    <div className="space-y-2">
                      <p className="text-sm flex justify-end gap-4"><span className="text-muted-foreground font-bold">Émission:</span> <span className="font-black">{new Date(selectedInvoice.invoiceDate).toLocaleDateString('fr-FR')}</span></p>
                      <p className="text-sm flex justify-end gap-4"><span className="text-muted-foreground font-bold">Chambre:</span> <span className="font-black">N° {selectedInvoice.roomNumber}</span></p>
                      <p className="text-sm flex justify-end gap-4"><span className="text-muted-foreground font-bold">Statut:</span> <span className={`font-black uppercase text-[10px] px-2 py-0.5 rounded ${selectedInvoice.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>{selectedInvoice.status === 'Paid' ? 'Soldée' : 'À régler'}</span></p>
                    </div>
                  </div>
                </div>

                <table className="w-full mb-16">
                  <thead>
                    <tr className="border-b-4 border-slate-900">
                      <th className="text-left py-6 text-xs font-black uppercase tracking-widest text-slate-900">Désignation des Services</th>
                      <th className="text-right py-6 text-xs font-black uppercase tracking-widest text-slate-900">Montant</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    <tr>
                      <td className="py-8">
                        <p className="font-black text-lg text-slate-900">Hébergement & Prestations</p>
                        <p className="text-sm text-muted-foreground mt-1">Séjour complet incluant les services et prestations hôtelières.</p>
                      </td>
                      <td className="text-right py-8 font-black text-xl text-slate-900">{Number(selectedInvoice.amountDue).toFixed(2)} $</td>
                    </tr>
                  </tbody>
                </table>

                <div className="flex justify-end mb-20">
                  <div className="w-80 space-y-4 p-8 bg-slate-50 rounded-[2rem]">
                    <div className="flex justify-between border-t-2 border-slate-200 pt-4">
                      <span className="font-black uppercase text-sm tracking-widest text-primary">Total à Payer</span>
                      <span className="font-black text-3xl text-primary tracking-tighter">{Number(selectedInvoice.amountDue).toFixed(2)} $</span>
                    </div>
                  </div>
                </div>

                <div className="mt-auto flex justify-between items-end">
                  <div className="text-[10px] text-muted-foreground italic max-w-xs leading-relaxed border-l-2 border-slate-200 pl-4">
                    Document généré électroniquement par ImaraPMS. Toute réclamation doit être effectuée dans les 48h suivant l'émission. Merci de votre séjour !
                  </div>
                  <div className="text-center">
                    {settings?.signatureUrl && (
                      <img src={settings.signatureUrl} alt="Signature" className="h-20 mb-3 mx-auto mix-blend-multiply opacity-90" />
                    )}
                    <div className="w-48 border-t-2 border-slate-900 pt-3">
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-900">{settings?.managerName || 'Le Responsable de Gestion'}</p>
                      <p className="text-[8px] uppercase font-bold text-muted-foreground mt-1">Cachet & Signature</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="p-6 border-t bg-muted/20 flex justify-end gap-4">
              <Button variant="outline" className="rounded-xl font-bold uppercase text-[10px] tracking-widest" onClick={() => setIsInvoiceDialogOpen(false)}>Fermer</Button>
              <Button className="rounded-xl font-bold uppercase text-[10px] tracking-widest gap-2 bg-primary shadow-lg" onClick={() => window.print()}>
                <Printer className="h-4 w-4" /> Imprimer / PDF
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <AlertDialog open={isDeleteIndividualDialogOpen} onOpenChange={setIsDeleteIndividualDialogOpen}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer la facture ?</AlertDialogTitle>
              <AlertDialogDescription>Cette action supprimera définitivement le document pour <strong>{invoiceToDelete?.guestName}</strong>.</AlertDialogDescription>
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
