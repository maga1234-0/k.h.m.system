
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
  Loader2, 
  CreditCard, 
  MessageCircle, 
  Trash2, 
  AlertCircle, 
  FileText, 
  Download,
  Hotel
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, useUser, useDoc } from "@/firebase"
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
    toast({ variant: "destructive", title: "Registre Effacé", description: "Toutes les factures ont été supprimées." });
  };

  const handleSendWhatsApp = (invoice: any) => {
    if (!invoice || !invoice.guestPhone) {
      toast({ variant: "destructive", title: "Numéro Manquant", description: "Veuillez renseigner le téléphone du client." });
      return;
    }
    const phone = invoice.guestPhone.replace(/\D/g, '');
    const hotelName = settings?.hotelName || 'ImaraPMS';
    const message = `*${hotelName.toUpperCase()} — LUXURY HOSPITALITY*\n\nBonjour,\n\nVeuillez trouver ci-joint votre *facture officielle #INV-${invoice.id.slice(0, 8).toUpperCase()}* au format PDF.\n\nCordialement,\nL'équipe ${hotelName}`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handleDownloadPDF = async (invoiceToGen?: any) => {
    const inv = invoiceToGen || selectedInvoice;
    if (!inv) return;

    setIsGeneratingPdf(true);
    
    // If called from the list, we must open the dialog first to render the component
    if (invoiceToGen) {
      setSelectedInvoice(inv);
      setIsInvoiceDialogOpen(true);
      await new Promise(r => setTimeout(r, 600)); // Delay to allow rendering
    }

    const element = document.getElementById('invoice-printable');
    if (!element) {
      setIsGeneratingPdf(false);
      toast({ variant: "destructive", title: "Erreur", description: "Élément graphique introuvable." });
      return;
    }

    try {
      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
        logging: false,
        windowWidth: 800
      });
      
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgProps = pdf.getImageProperties(imgData);
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      pdf.save(`facture-${inv.guestName.replace(/\s+/g, '-')}.pdf`);
      
      toast({ title: "PDF Généré", description: "Le fichier a été enregistré dans votre explorateur." });
    } catch (error) {
      console.error('PDF Error:', error);
      toast({ variant: "destructive", title: "Erreur", description: "Impossible de générer le PDF." });
    } finally {
      setIsGeneratingPdf(false);
    }
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
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 bg-background sticky top-0 z-10">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-4 h-6" />
          <h1 className="font-headline font-semibold text-xl">Finance & Facturation</h1>
        </header>

        <main className="p-6 space-y-8">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-none shadow-sm bg-rose-500/5 border border-rose-500/10">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-rose-600 mb-1">Encours Client</p>
                    <h3 className="text-3xl font-bold font-headline">{stats.unpaid.toLocaleString('fr-FR')} $</h3>
                  </div>
                  <AlertCircle className="h-5 w-5 text-rose-600" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-primary/5 border border-primary/10">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-primary mb-1">Chiffre d'Affaires</p>
                    <h3 className="text-3xl font-bold font-headline">{stats.revenue.toLocaleString('fr-FR')} $</h3>
                  </div>
                  <CreditCard className="h-5 w-5 text-primary" />
                </div>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-accent/5 border border-accent/10">
              <CardContent className="pt-6">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-accent mb-1">Total Factures</p>
                    <h3 className="text-3xl font-bold font-headline">{stats.totalCount}</h3>
                  </div>
                  <FileText className="h-5 w-5 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline text-lg">Historique des Factures</CardTitle>
                <CardDescription>Gérez les transactions de vos clients.</CardDescription>
              </div>
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
                      <AlertDialogDescription>Cette action supprimera définitivement toutes les factures archivées.</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Annuler</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearRegistry} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
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
                <div className="space-y-4">
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
                      <div className="flex items-center gap-4 ml-auto md:ml-0">
                        <div className="flex flex-col items-end mr-2">
                          <span className="font-bold text-lg">{Number(inv.amountDue).toFixed(2)} $</span>
                          <Badge variant={inv.status === 'Paid' ? 'default' : 'secondary'} className="text-[10px] py-0 px-2 h-4">
                            {inv.status === 'Paid' ? 'Payée' : 'Impayée'}
                          </Badge>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="icon" className="h-9 w-9 text-[#25D366]" onClick={() => handleSendWhatsApp(inv)}>
                            <MessageCircle className="h-4 w-4" />
                          </Button>
                          <Button variant="outline" size="icon" className="h-9 w-9" onClick={() => handleDownloadPDF(inv)}>
                            <Download className="h-4 w-4" />
                          </Button>
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
                <div className="text-center py-20 border-2 border-dashed rounded-2xl">
                  <Receipt className="h-16 w-16 text-muted-foreground mx-auto mb-4 opacity-10" />
                  <p className="text-muted-foreground font-medium">Aucune facture enregistrée.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>

      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-4xl p-0 bg-white border-none shadow-2xl overflow-hidden rounded-2xl">
          {selectedInvoice && (
            <div className="flex flex-col h-full max-h-[90vh]">
              <div className="flex-1 overflow-auto p-12 bg-white text-slate-900" id="invoice-printable">
                <div className="flex justify-between items-start mb-16">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-white">
                      <Hotel className="h-8 w-8" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-headline font-black text-2xl tracking-tighter text-primary">{settings?.hotelName || 'ImaraPMS'}</span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">Luxury Hospitality</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <h1 className="text-xl font-black text-slate-900 tracking-tight">INV-{selectedInvoice.id.slice(0, 8).toUpperCase()}</h1>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Date: {new Date(selectedInvoice.invoiceDate).toLocaleDateString('fr-FR')}</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-12 mb-16 px-4">
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-primary uppercase tracking-[0.2em] border-b-2 border-primary/10 pb-2">Destinataire</p>
                    <div>
                      <h3 className="text-2xl font-black text-slate-900 mb-1">{selectedInvoice.guestName}</h3>
                      <p className="text-sm text-slate-500 font-medium">{selectedInvoice.guestPhone}</p>
                    </div>
                  </div>
                  <div className="space-y-4 text-right">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] border-b-2 border-slate-100 pb-2">Émetteur</p>
                    <div className="text-sm font-medium text-slate-600">
                      {settings?.hotelName || 'ImaraPMS'} Group<br />
                      {settings?.address || 'Département de Facturation Centrale'}<br />
                      Contact: {settings?.phone || '+1 234 567 890'}
                    </div>
                  </div>
                </div>

                <div className="mb-20">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-y border-slate-100">
                        <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400">Prestation</th>
                        <th className="py-4 px-6 text-[10px] font-bold uppercase tracking-widest text-slate-400 text-right">Montant ($)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-8 px-6">
                          <p className="font-bold text-slate-900 text-lg">Séjour Hôtelier & Services Premium</p>
                          <p className="text-xs text-slate-400 mt-1 italic">Hébergement et services inclus</p>
                        </td>
                        <td className="py-8 px-6 text-right">
                          <span className="text-xl font-black text-slate-900">{Number(selectedInvoice.amountDue).toFixed(2)} $</span>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end px-4">
                  <div className="w-full max-w-[350px] space-y-4">
                    <div className="flex justify-between items-center py-6 border-t-4 border-slate-900">
                      <span className="text-sm font-black uppercase tracking-widest text-slate-900">Total à Régler</span>
                      <span className="text-4xl font-black font-headline text-primary tracking-tighter">
                        {Number(selectedInvoice.amountDue).toFixed(2)} $
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-6 flex justify-end gap-4 border-t border-slate-200">
                <Button 
                  className="h-12 px-6 gap-2 bg-[#25D366] hover:bg-[#128C7E] text-white rounded-xl shadow-lg border-none" 
                  onClick={() => handleSendWhatsApp(selectedInvoice)}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="font-bold text-[10px] uppercase tracking-widest">WhatsApp</span>
                </Button>
                <Button 
                  disabled={isGeneratingPdf}
                  className="h-12 px-6 gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-lg border-none" 
                  onClick={() => handleDownloadPDF()}
                >
                  {isGeneratingPdf ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  <span className="font-bold text-[10px] uppercase tracking-widest">Télécharger PDF</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
