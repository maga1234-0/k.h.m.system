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
  Download,
  Hotel,
  CheckCircle2,
  DollarSign,
  Share2
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking, useUser, useDoc } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import html2canvas from 'html2canvas'
import { jsPDF } from 'jspdf'
import { Badge } from "@/components/ui/badge"
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
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
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

  const generatePDFBlob = async (invoice: any): Promise<Blob | null> => {
    setSelectedInvoice(invoice);
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const page = document.getElementById('invoice-single-page');
    if (!page) return null;

    try {
      const canvas = await html2canvas(page, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const imgHeight = (canvas.height * pdfWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, imgHeight);
      return pdf.output('blob');
    } catch (error) {
      console.error('PDF Generation Error:', error);
      return null;
    }
  };

  const handleShareInvoice = async (invoice: any) => {
    setIsSharing(true);
    const blob = await generatePDFBlob(invoice);
    if (!blob) {
      setIsSharing(false);
      toast({ variant: "destructive", title: "Erreur", description: "Échec de génération du PDF." });
      return;
    }

    const fileName = `FACTURE-${invoice.guestName.replace(/\s+/g, '-')}.pdf`;
    const file = new File([blob], fileName, { type: 'application/pdf' });

    if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
      try {
        await navigator.share({
          files: [file],
          title: `Facture ImaraPMS - ${invoice.guestName}`,
          text: `Bonjour ${invoice.guestName}, voici votre facture pour votre séjour au ${settings?.hotelName || 'Fiesta Hotel'}.`,
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error("Share error", error);
        }
      } finally {
        setIsSharing(false);
      }
    } else {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
      
      const phone = invoice.guestPhone.replace(/\D/g, '');
      const message = `Bonjour ${invoice.guestName}, votre facture est prête. Montant: ${invoice.amountDue} $. Le fichier PDF a été téléchargé, veuillez le joindre au message.`;
      
      try {
        const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.error("WhatsApp error", e);
      }
      
      setIsSharing(false);
      toast({ title: "Prêt pour WhatsApp", description: "Veuillez joindre le fichier téléchargé manuellement." });
    }
  };

  const handleDownloadPDF = async () => {
    if (!selectedInvoice) return;
    setIsGeneratingPdf(true);
    const blob = await generatePDFBlob(selectedInvoice);
    if (blob) {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `FACTURE-${selectedInvoice.guestName.replace(/\s+/g, '-')}.pdf`;
      link.click();
      URL.revokeObjectURL(url);
      toast({ title: "Succès", description: "Facture téléchargée." });
    }
    setIsGeneratingPdf(false);
  };

  const invoiceExtras = useMemo(() => getExtrasForInvoice(selectedInvoice), [selectedInvoice, reservations]);
  const totalExtrasValue = invoiceExtras.reduce((acc, e) => acc + parseFloat(e.amount), 0);
  const basePriceValue = useMemo(() => {
    if (!selectedInvoice) return 0;
    return Math.max(0, Number(selectedInvoice.amountDue) - totalExtrasValue);
  }, [selectedInvoice, totalExtrasValue]);

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
              { label: "Dettes Clients", value: stats.unpaid, icon: AlertCircle, color: "rose" },
              { label: "Total Encaissé", value: stats.revenue, icon: CreditCard, color: "primary" },
              { label: "Nombre Factures", value: stats.totalCount, icon: FileText, color: "accent", isCount: true }
            ].map((stat, i) => (
              <Card key={i} className={`border-none shadow-sm bg-muted/50 animate-in slide-in-from-bottom-4 duration-500`} style={{ animationDelay: `${i * 100}ms` }}>
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

          <Card className="border-none shadow-sm rounded-3xl overflow-hidden animate-in fade-in duration-700">
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
                  <AlertDialogContent className="rounded-2xl">
                    <AlertDialogHeader>
                      <AlertDialogTitle>Action Irréversible</AlertDialogTitle>
                      <AlertDialogDescription>Voulez-vous vraiment vider le registre complet de facturation ?</AlertDialogDescription>
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
                  {invoices.map((inv, idx) => (
                    <div key={inv.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-2xl border bg-card hover:border-primary/30 transition-all gap-4 animate-in slide-in-from-right-4 duration-500" style={{ animationDelay: `${idx * 50}ms` }}>
                      <div className="flex items-center gap-4">
                        <div className={`h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 ${inv.status === 'Paid' ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                          {inv.status === 'Paid' ? <CheckCircle2 className="h-6 w-6" /> : <Receipt className="h-6 w-6" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-black text-xs text-primary uppercase tracking-widest">#INV-{inv.id.slice(0, 6).toUpperCase()}</span>
                          <span className="text-sm font-bold text-foreground">{inv.guestName}</span>
                          <span className="text-[10px] text-muted-foreground">{new Date(inv.invoiceDate).toLocaleDateString('fr-FR')}</span>
                        </div>
                      </div>
                      <div className="flex items-center justify-between md:justify-end gap-3">
                        <div className="text-right mr-3">
                          <span className="text-[10px] font-black uppercase text-muted-foreground block mb-1">Montant</span>
                          <span className="font-black text-lg tracking-tight text-foreground">{Number(inv.amountDue).toFixed(2)} $</span>
                        </div>
                        <div className="flex gap-2">
                          {inv.status !== 'Paid' && (
                            <Button className="h-10 px-4 gap-2 text-[10px] font-black uppercase tracking-widest rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white" onClick={() => { setInvoiceForPayment(inv); setIsPaymentDialogOpen(true); }}>
                              <DollarSign className="h-4 w-4" /> Encaisser
                            </Button>
                          )}
                          <Button 
                            variant="outline" 
                            size="icon" 
                            className="h-10 w-10 text-[#25D366] rounded-xl border-[#25D366]/20" 
                            onClick={() => handleShareInvoice(inv)}
                            disabled={isSharing}
                          >
                            {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-5 w-5" />}
                          </Button>
                          <Button variant="secondary" size="sm" className="h-10 px-4 text-[10px] font-black uppercase tracking-widest rounded-xl" onClick={() => { setSelectedInvoice(inv); setIsInvoiceDialogOpen(true); }}>Aperçu</Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-10 w-10 text-destructive hover:bg-destructive/10 rounded-xl" 
                            onClick={() => { setInvoiceToDelete(inv); setIsDeleteIndividualDialogOpen(true); }}
                          >
                            <Trash2 className="h-5 w-5" />
                          </Button>
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

        <AlertDialog open={isDeleteIndividualDialogOpen} onOpenChange={setIsDeleteIndividualDialogOpen}>
          <AlertDialogContent className="rounded-3xl">
            <AlertDialogHeader>
              <AlertDialogTitle>Supprimer la facture ?</AlertDialogTitle>
              <AlertDialogDescription>
                Cette action supprimera définitivement le document de facturation pour <strong>{invoiceToDelete?.guestName}</strong>.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Annuler</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteIndividual} className="bg-destructive hover:bg-destructive/90">Supprimer</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <DialogContent className="sm:max-w-md rounded-3xl animate-in zoom-in-95">
            <DialogHeader>
              <DialogTitle className="text-2xl font-black font-headline text-foreground">Valider le Paiement</DialogTitle>
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
          <DialogContent className="max-w-4xl w-[98vw] p-0 bg-slate-100 border-none shadow-2xl overflow-hidden rounded-3xl animate-in zoom-in-95">
            <DialogHeader className="sr-only">
              <DialogTitle>Facture Officielle</DialogTitle>
            </DialogHeader>
            {selectedInvoice && (
              <div className="flex flex-col h-full max-h-[92vh]">
                <div className="flex-1 overflow-auto p-4 md:p-8 flex justify-center bg-slate-100">
                  <div className="w-full max-w-[210mm] bg-white p-12 shadow-2xl min-h-[297mm] flex flex-col text-slate-900 font-sans" id="invoice-single-page" style={{ margin: '0 auto' }}>
                    
                    <div className="mb-12 border-b-4 border-primary pb-8">
                       <table style={{ width: '100%' }}>
                          <tbody>
                            <tr>
                              <td style={{ width: '65%', verticalAlign: 'middle' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                                  <div style={{ height: '60px', width: '60px', borderRadius: '15px', backgroundColor: 'hsl(var(--primary))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>
                                    <Hotel size={35} />
                                  </div>
                                  <div>
                                    <h1 style={{ fontFamily: 'Poppins, sans-serif', fontWeight: 900, fontSize: '28px', color: 'hsl(var(--primary))', margin: 0, textTransform: 'uppercase' }}>
                                      {settings?.hotelName || 'Fiesta Hotel'}
                                    </h1>
                                    <p style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', color: '#94a3b8', margin: '2px 0 0 0' }}>Excellence & Prestige</p>
                                  </div>
                                </div>
                              </td>
                              <td style={{ width: '35%', textAlign: 'right', verticalAlign: 'middle' }}>
                                <h2 style={{ fontSize: '24px', fontWeight: 900, margin: 0, color: '#0f172a' }}>FACTURE</h2>
                                <p style={{ fontSize: '14px', fontWeight: 800, color: 'hsl(var(--primary))', margin: '2px 0' }}>#INV-{selectedInvoice.id.slice(0, 8).toUpperCase()}</p>
                                <p style={{ fontSize: '11px', color: '#64748b', fontWeight: 700, margin: 0 }}>{new Date(selectedInvoice.invoiceDate).toLocaleDateString('fr-FR')}</p>
                              </td>
                            </tr>
                          </tbody>
                       </table>
                    </div>

                    <div style={{ marginBottom: '40px' }}>
                       <table style={{ width: '100%' }}>
                          <tbody>
                            <tr>
                              <td style={{ width: '50%', paddingRight: '20px' }}>
                                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '5px', marginBottom: '10px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 900, color: 'hsl(var(--primary))', textTransform: 'uppercase' }}>DESTINATAIRE</span>
                                </div>
                                <p style={{ fontSize: '18px', fontWeight: 900, margin: 0, color: '#0f172a' }}>{selectedInvoice.guestName}</p>
                                <p style={{ fontSize: '12px', color: '#64748b', margin: '5px 0' }}>{selectedInvoice.guestPhone}</p>
                              </td>
                              <td style={{ width: '50%', textAlign: 'right' }}>
                                <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '5px', marginBottom: '10px' }}>
                                  <span style={{ fontSize: '10px', fontWeight: 900, color: '#94a3b8', textTransform: 'uppercase' }}>ÉMETTEUR</span>
                                </div>
                                <p style={{ fontSize: '14px', fontWeight: 900, margin: 0 }}>{settings?.hotelName || 'Fiesta Hotel Resort'}</p>
                                <p style={{ fontSize: '10px', color: '#64748b', margin: '5px 0' }}>{settings?.address || 'République Démocratique du Congo'}</p>
                              </td>
                            </tr>
                          </tbody>
                       </table>
                    </div>

                    <div style={{ flex: 1 }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ backgroundColor: '#0f172a', color: 'white' }}>
                            <th style={{ padding: '12px 15px', textAlign: 'left', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', borderRadius: '8px 0 0 0' }}>Description des Services</th>
                            <th style={{ padding: '12px 15px', textAlign: 'right', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase', width: '120px', borderRadius: '0 8px 0 0' }}>Montant ($)</th>
                          </tr>
                        </thead>
                        <tbody>
                          <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '20px 15px' }}>
                              <p style={{ fontWeight: 900, fontSize: '14px', margin: 0 }}>Hébergement & Services Inclus</p>
                              <p style={{ fontSize: '10px', color: '#94a3b8', margin: '4px 0 0 0' }}>Séjour officiel - Chambre {selectedInvoice.roomNumber || 'N/A'}</p>
                            </td>
                            <td style={{ padding: '20px 15px', textAlign: 'right', fontWeight: 900, fontSize: '14px' }}>{basePriceValue.toFixed(2)}</td>
                          </tr>
                          {invoiceExtras.map((e, i) => (
                            <tr key={i} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#f8fafc' }}>
                              <td style={{ padding: '12px 15px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                  <span style={{ fontSize: '8px', fontWeight: 900, backgroundColor: '#e2e8f0', padding: '2px 6px', borderRadius: '4px', color: '#475569' }}>{e.date}</span>
                                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>{e.type} : {e.description}</span>
                                </div>
                              </td>
                              <td style={{ padding: '12px 15px', textAlign: 'right', fontWeight: 700, color: '#475569', fontSize: '12px' }}>+{parseFloat(e.amount).toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div style={{ marginTop: '50px' }}>
                       <table style={{ width: '100%' }}>
                          <tbody>
                            <tr>
                              <td style={{ width: '60%', verticalAlign: 'bottom' }}>
                                <p style={{ fontSize: '9px', fontWeight: 900, color: 'hsl(var(--primary))', marginBottom: '10px', textTransform: 'uppercase' }}>Cachet & Signature</p>
                                {settings?.signatureUrl ? (
                                  <img src={settings.signatureUrl} alt="Signature" style={{ maxHeight: '70px', display: 'block', marginBottom: '5px' }} />
                                ) : (
                                  <div style={{ height: '50px', width: '150px', borderBottom: '1px dashed #cbd5e1', marginBottom: '10px' }}></div>
                                )}
                                <p style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', margin: 0 }}>{settings?.managerName || 'La Direction'}</p>
                                <p style={{ fontSize: '8px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', margin: 0 }}>Fiesta Hotel Manager</p>
                              </td>
                              <td style={{ width: '40%', textAlign: 'right', verticalAlign: 'bottom' }}>
                                <div style={{ backgroundColor: '#f1f5f9', padding: '25px', borderRadius: '20px', border: '2px solid hsl(var(--primary))' }}>
                                  <p style={{ fontSize: '9px', fontWeight: 900, color: '#64748b', margin: '0 0 5px 0', textTransform: 'uppercase' }}>NET À PAYER</p>
                                  <p style={{ fontSize: '32px', fontWeight: 900, margin: 0, color: '#0f172a' }}>
                                    {Number(selectedInvoice.amountDue).toFixed(2)} <span style={{ fontSize: '16px', color: 'hsl(var(--primary))' }}>$</span>
                                  </p>
                                </div>
                              </td>
                            </tr>
                          </tbody>
                       </table>
                       <div style={{ marginTop: '50px', textAlign: 'center' }}>
                          <p style={{ fontSize: '8px', color: '#cbd5e1', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em' }}>ImaraPMS v2.5 - Document de Gestion Certifié</p>
                       </div>
                    </div>
                  </div>
                </div>
                <div className="bg-white p-6 border-t flex justify-center items-center rounded-b-3xl">
                  <Button disabled={isGeneratingPdf} className="h-12 px-12 font-black uppercase text-xs gap-3 rounded-xl shadow-lg transition-transform hover:scale-105 active:scale-95 mx-auto" onClick={handleDownloadPDF}>
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