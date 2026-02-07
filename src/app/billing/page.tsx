"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Receipt, Printer, Loader2, CreditCard, MessageCircle, Hotel, Trash2, AlertCircle } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, deleteDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
    if (!invoices) return { unpaid: 0, revenue: 0, pendingRefunds: 0 };
    
    const unpaid = invoices.reduce((acc, inv) => inv.status !== 'Paid' ? acc + (Number(inv.amountDue) - Number(inv.amountPaid)) : acc, 0);
    const revenue = invoices.reduce((acc, inv) => acc + (Number(inv.amountPaid) || 0), 0);
    
    return { unpaid, revenue, pendingRefunds: 0 };
  }, [invoices]);

  const handleMarkAsPaid = (invoice: any) => {
    const invRef = doc(firestore, 'invoices', invoice.id);
    updateDocumentNonBlocking(invRef, {
      status: "Paid",
      amountPaid: invoice.amountDue,
      paymentDate: new Date().toISOString()
    });
    
    toast({
      title: "Invoice Updated",
      description: `Invoice for ${invoice.guestName} marked as Paid.`,
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
      title: "Registry Cleared",
      description: "All invoice records have been permanently removed.",
    });
  };

  const handleSendWhatsApp = (invoice: any) => {
    if (!invoice.guestPhone) {
      toast({
        variant: "destructive",
        title: "Phone Missing",
        description: "No phone number associated with this invoice record.",
      });
      return;
    }
    
    const phone = invoice.guestPhone.replace(/\D/g, '');
    const invoiceId = invoice.id.slice(0, 8).toUpperCase();
    
    const message = `*INVOICE SUMMARY - K.H.M.SYSTEM*\n-----------------------------\n*Guest:* ${invoice.guestName}\n*Invoice:* #INV-${invoiceId}\n*Amount Due:* $${Number(invoice.amountDue).toFixed(2)}\n*Due Date:* ${new Date(invoice.dueDate).toLocaleDateString()}\n*Status:* ${invoice.status}\n-----------------------------\nThank you for choosing K.H.M.System. Please let us know if you have any questions!`;
    
    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');

    toast({
      title: "WhatsApp Opened",
      description: `Sending invoice summary to ${invoice.guestName}...`,
    });
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
      <SidebarInset className="flex flex-col overflow-auto print:hidden">
        <header className="flex h-16 items-center border-b px-6 bg-background">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-4 h-6" />
          <h1 className="font-headline font-semibold text-xl">Financials & Billing</h1>
        </header>

        <main className="p-6 space-y-6">
          <div className="grid gap-6 md:grid-cols-3">
            <Card className="border-none shadow-sm bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Unpaid Balance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-headline">${stats.unpaid.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Outstanding receivables</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Total Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-headline">${stats.revenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}</div>
                <p className="text-xs text-muted-foreground mt-1">Total payments collected</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending Refunds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-headline">${stats.pendingRefunds.toFixed(2)}</div>
                <p className="text-xs text-muted-foreground mt-1">0 requests awaiting approval</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline">Invoices Registry</CardTitle>
                <CardDescription>Manage guest payments and generated bills.</CardDescription>
              </div>
              {invoices && invoices.length > 0 && (
                <AlertDialog open={isClearDialogOpen} onOpenChange={setIsClearDialogOpen}>
                  <AlertDialogTrigger asChild>
                    <Button variant="outline" size="sm" className="text-destructive hover:bg-destructive hover:text-destructive-foreground gap-2">
                      <Trash2 className="h-4 w-4" /> Clear All
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-destructive" />
                        Wipe Invoices Registry?
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete all {invoices.length} invoice records from the system. 
                        This action is irreversible and will reset your revenue tracking metrics.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Keep Registry</AlertDialogCancel>
                      <AlertDialogAction onClick={handleClearRegistry} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Yes, Clear All
                      </AlertDialogAction>
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
                    <div key={inv.id} className="flex flex-col md:flex-row md:items-center justify-between p-4 rounded-lg border hover:bg-muted/10 transition-colors gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary shrink-0">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">INV-{inv.id.slice(0, 8).toUpperCase()}</span>
                          <span className="text-xs text-muted-foreground">{inv.guestName || 'Guest'} • Issued {new Date(inv.invoiceDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 ml-auto md:ml-0">
                        <div className="flex items-center flex-col items-end">
                          <span className="font-bold text-lg">${Number(inv.amountDue).toFixed(2)}</span>
                          <span className="text-[10px] text-muted-foreground">Due: {new Date(inv.dueDate).toLocaleDateString()}</span>
                        </div>
                        <Badge variant={inv.status === 'Paid' ? 'default' : inv.status === 'Unpaid' ? 'secondary' : 'destructive'}>
                          {inv.status}
                        </Badge>
                        <div className="flex gap-2">
                          {inv.status !== 'Paid' && (
                            <Button variant="outline" size="sm" className="gap-2 h-8" onClick={() => handleMarkAsPaid(inv)}>
                              <CreditCard className="h-3 w-3" /> Mark Paid
                            </Button>
                          )}
                          <Button variant="secondary" size="sm" className="gap-2 h-8" onClick={() => handleSendWhatsApp(inv)}>
                            <MessageCircle className="h-3 w-3" /> WhatsApp
                          </Button>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8" 
                            title="View/Print Invoice"
                            onClick={() => {
                              setSelectedInvoice(inv);
                              setIsInvoiceDialogOpen(true);
                            }}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-xl">
                  <Receipt className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-20" />
                  <p className="text-muted-foreground">No invoices found. Check in a guest to generate one.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </SidebarInset>

      <Dialog open={isInvoiceDialogOpen} onOpenChange={setIsInvoiceDialogOpen}>
        <DialogContent className="max-w-4xl p-0 bg-white overflow-hidden">
          {selectedInvoice && (
            <div className="flex flex-col">
              <div className="p-8 print:p-0">
                {/* Invoice Header */}
                <div className="flex justify-between items-start mb-12">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                      <Hotel className="h-7 w-7" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold font-headline leading-none">K.H.M.System</h2>
                      <p className="text-[10px] uppercase tracking-widest font-bold text-primary mt-1">Luxury Hospitality</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <h1 className="text-4xl font-bold font-headline text-slate-900 mb-1">INVOICE</h1>
                    <p className="text-muted-foreground font-mono text-sm uppercase tracking-tighter">
                      #INV-{selectedInvoice.id.slice(0, 8).toUpperCase()}
                    </p>
                  </div>
                </div>

                {/* Client & Invoice Info */}
                <div className="grid grid-cols-2 gap-12 mb-12">
                  <div className="space-y-4">
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">Bill To</p>
                      <h3 className="text-lg font-bold">{selectedInvoice.guestName}</h3>
                      <p className="text-sm text-slate-600">{selectedInvoice.guestPhone || "No contact number"}</p>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-1">From</p>
                      <p className="text-sm font-medium">K.H.M.System Hotelier</p>
                      <p className="text-xs text-slate-500">123 Hospitality Way, Suite 100<br />Grand Central, GC 10023</p>
                    </div>
                  </div>
                  <div className="bg-slate-50 p-6 rounded-2xl flex flex-col justify-between">
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <span className="text-muted-foreground">Issued Date:</span>
                      <span className="text-right font-medium">{new Date(selectedInvoice.invoiceDate).toLocaleDateString()}</span>
                      <span className="text-muted-foreground">Due Date:</span>
                      <span className="text-right font-medium">{new Date(selectedInvoice.dueDate).toLocaleDateString()}</span>
                      <span className="text-muted-foreground">Status:</span>
                      <span className="text-right">
                        <Badge variant={selectedInvoice.status === 'Paid' ? 'default' : 'secondary'} className="text-[10px] h-5 px-2">
                          {selectedInvoice.status}
                        </Badge>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Invoice Table */}
                <div className="border rounded-2xl overflow-hidden mb-8">
                  <table className="w-full text-left">
                    <thead className="bg-slate-900 text-white text-xs uppercase tracking-widest">
                      <tr>
                        <th className="px-6 py-4 font-bold">Description</th>
                        <th className="px-6 py-4 font-bold text-center">Qty</th>
                        <th className="px-6 py-4 font-bold text-right">Price</th>
                        <th className="px-6 py-4 font-bold text-right">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-sm">
                      <tr>
                        <td className="px-6 py-6">
                          <p className="font-bold">Accommodation Charges</p>
                          <p className="text-xs text-muted-foreground">Full duration stay as per reservation details.</p>
                        </td>
                        <td className="px-6 py-6 text-center">1</td>
                        <td className="px-6 py-6 text-right">${Number(selectedInvoice.amountDue).toFixed(2)}</td>
                        <td className="px-6 py-6 text-right font-bold">${Number(selectedInvoice.amountDue).toFixed(2)}</td>
                      </tr>
                      {/* Placeholder for other services */}
                      <tr className="bg-slate-50/50">
                        <td className="px-6 py-4 text-xs italic text-muted-foreground" colSpan={4}>
                          No additional services (Laundry, Spa, Dining) recorded for this period.
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Totals */}
                <div className="flex justify-end mb-12">
                  <div className="w-full max-w-xs space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-medium">${Number(selectedInvoice.amountDue).toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Tax (0%)</span>
                      <span className="font-medium">$0.00</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between items-center pt-2">
                      <span className="text-lg font-bold">Total Amount</span>
                      <span className="text-3xl font-bold font-headline text-primary">${Number(selectedInvoice.amountDue).toFixed(2)}</span>
                    </div>
                    {selectedInvoice.status === 'Paid' && (
                      <div className="flex justify-between text-sm text-emerald-600 font-bold bg-emerald-50 p-2 rounded-lg mt-2">
                        <span>Paid Amount</span>
                        <span>-${Number(selectedInvoice.amountPaid).toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Invoice Footer */}
                <div className="border-t pt-8">
                  <h4 className="font-bold text-sm mb-2 uppercase tracking-widest text-slate-900">Payment Terms</h4>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Please make payments within {new Date(selectedInvoice.dueDate).toLocaleDateString()}. 
                    Checks should be made payable to K.H.M.System Hotelier. 
                    Late payments may be subject to a 2% monthly interest charge.
                  </p>
                  <div className="mt-8 text-center border-2 border-dashed border-slate-100 p-4 rounded-xl">
                    <p className="text-xs font-medium text-slate-400">Thank you for choosing K.H.M.System. We look forward to your next visit!</p>
                  </div>
                </div>
              </div>

              {/* Dialog Actions (Hidden during print) */}
              <div className="p-4 border-t bg-slate-50 flex justify-end gap-3 print:hidden">
                <DialogClose asChild>
                  <Button variant="ghost">Close Preview</Button>
                </DialogClose>
                <Button variant="outline" onClick={() => handleSendWhatsApp(selectedInvoice)} className="gap-2">
                  <MessageCircle className="h-4 w-4" /> Send via WhatsApp
                </Button>
                <Button onClick={handlePrint} className="gap-2 bg-slate-900 hover:bg-slate-800 text-white">
                  <Printer className="h-4 w-4" /> Print Invoice
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
