
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
  Trash2, 
  AlertCircle, 
  FileText, 
  Phone,
  Download
} from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
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
    toast({ title: "Paiement Confirmé", description: `La facture de ${invoice.guestName} a été marquée comme payée.` });
  };

  const handleClearRegistry = () => {
    if (!invoices) return;
    invoices.forEach((inv) => deleteDocumentNonBlocking(doc(firestore, 'invoices', inv.id)));
    setIsClearDialogOpen(false);
    toast({ variant: "destructive", title: "Registre Effacé", description: "Toutes les archives de factures ont été supprimées." });
  };

  const handleSendWhatsApp = (invoice: any) => {
    if (!invoice || !invoice.guestPhone) {
      toast({ variant: "destructive", title: "Numéro Manquant", description: "Impossible d'envoyer le message sans numéro de téléphone." });
      return;
    }
    const phone = invoice.guestPhone.replace(/\D/g, '');
    const message = `Bonjour,\n\nVeuillez trouver ci-joint votre *facture officielle #INV-${invoice.id.slice(0, 8).toUpperCase()}* au format PDF.\n\nCordialement,\nL'équipe ImaraPMS`;
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`, '_blank');
  };

  const handlePrintAction = () => {
    if (typeof window !== 'undefined') {
      window.print();
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
      <SidebarInset className="flex flex-col overflow-auto bg-background print:bg-white">
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
                  <AlertCircle className="h-5 w-5 text-rose-600" />
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
                  <CreditCard className="h-5 w-5 text-primary" />
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
                  <FileText className="h-5 w-5 text-accent" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm print:shadow-none print:border-none">
            <CardHeader className="flex flex-row items-center justify-between print:hidden">
              <div>
                <CardTitle className="font-headline text-lg">Historique des Factures</CardTitle>
                <CardDescription>Consultez et gérez les transactions de vos clients.</CardDescription>
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
                  <p className="text-muted-foreground font-medium">Aucune facture enregistrée.</p>
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
          </DialogHeader>
          
          {selectedInvoice && (
            <div className="flex flex-col h-full max-h-[90vh] select-text">
              <div className="flex-1 overflow-auto p-12 bg-white text-slate-900" id="invoice-printable">
                {/* Header Section - BUSINESS STYLE */}
                <div className="text-center mb-8">
                  <h2 className="text-blue-600 font-bold text-2xl tracking-widest uppercase mb-1">BUSINESS</h2>
                  <p className="text-xs text-slate-500 font-medium">Tél: +1 234 567 890</p>
                  <Separator className="mt-6 mb-8 bg-slate-200" />
                </div>

                {/* Info Bar */}
                <div className="flex justify-between items-start mb-16 px-4">
                  <div className="space-y-4">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">FACTURÉ À</p>
                    <h3 className="text-2xl font-black text-slate-900">{selectedInvoice.guestName}</h3>
                  </div>
                  
                  <div className="text-right space-y-4">
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">FACTURE</h1>
                    <div className="text-[11px] text-slate-500 font-bold leading-tight">
                      #INV-{selectedInvoice.id.slice(0, 16).toUpperCase()}<br />
                      {new Date(selectedInvoice.invoiceDate).toLocaleDateString('fr-FR')}
                    </div>
                  </div>
                </div>

                {/* Items Table */}
                <div className="mb-20 px-4">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-slate-900">
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-900">DESCRIPTION</th>
                        <th className="py-4 text-[10px] font-bold uppercase tracking-widest text-slate-900 text-right">TOTAL</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      <tr>
                        <td className="py-8">
                          <p className="font-bold text-slate-900 text-base">Services d'Hébergement & Frais</p>
                        </td>
                        <td className="py-8 text-right text-lg font-black text-slate-900">{Number(selectedInvoice.amountDue).toFixed(2)} $</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals Section */}
                <div className="flex justify-end px-4">
                  <div className="w-full max-w-[280px] space-y-3">
                    <div className="flex justify-between items-center py-2 border-t-2 border-slate-900">
                      <span className="text-xs font-black uppercase tracking-widest">TOTAL À PAYER</span>
                      <span className="text-3xl font-black font-headline text-slate-900 tracking-tighter">
                        {Number(selectedInvoice.amountDue).toFixed(2)} $
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Bar */}
              <div className="bg-slate-50 p-6 flex justify-end gap-4 border-t print:hidden">
                <Button 
                  className="h-12 px-6 gap-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-lg" 
                  onClick={() => handleSendWhatsApp(selectedInvoice)}
                >
                  <MessageCircle className="h-4 w-4" />
                  <span className="font-bold text-xs">WHATSAPP</span>
                </Button>
                <Button 
                  className="h-12 px-6 gap-2 bg-slate-900 hover:bg-black text-white rounded-xl shadow-lg" 
                  onClick={handlePrintAction}
                >
                  <Download className="h-4 w-4" />
                  <span className="font-bold text-xs uppercase">Télécharger</span>
                </Button>
                <Button 
                  className="h-12 px-6 gap-2 bg-slate-900 hover:bg-black text-white rounded-xl shadow-lg" 
                  onClick={handlePrintAction}
                >
                  <Printer className="h-4 w-4" />
                  <span className="font-bold text-xs uppercase">Imprimer la facture</span>
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
