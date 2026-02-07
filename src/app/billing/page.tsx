
"use client"

import { useState, useMemo, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AppSidebar } from "@/components/layout/AppSidebar"
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Receipt, Printer, Loader2, CreditCard } from "lucide-react"
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useUser } from "@/firebase"
import { collection, doc } from "firebase/firestore"
import { toast } from "@/hooks/use-toast"

export default function BillingPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  
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
      <SidebarInset className="flex flex-col overflow-auto">
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
            </CardHeader>
            <CardContent>
              {isInvoicesLoading ? (
                <div className="flex justify-center p-12">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : invoices && invoices.length > 0 ? (
                <div className="space-y-4">
                  {invoices.map((inv) => (
                    <div key={inv.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/10 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary">
                          <Receipt className="h-5 w-5" />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-sm">INV-{inv.id.slice(0, 8).toUpperCase()}</span>
                          <span className="text-xs text-muted-foreground">{inv.guestName || 'Guest'} • Issued {new Date(inv.invoiceDate).toLocaleDateString()}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="flex flex-col items-end">
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
                          <Button variant="ghost" size="icon" className="h-8 w-8" title="Print Invoice">
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
    </div>
  );
}
