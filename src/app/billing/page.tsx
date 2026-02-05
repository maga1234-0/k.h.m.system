
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Receipt, Download, ExternalLink, Printer, Filter } from "lucide-react";

export default function BillingPage() {
  const invoices = [
    { id: "INV-2024-001", client: "John Doe", amount: 480.00, status: "Paid", date: "2024-05-22" },
    { id: "INV-2024-002", client: "Sarah Smith", amount: 240.00, status: "Pending", date: "2024-05-23" },
    { id: "INV-2024-003", client: "Executive Suite (Michael C.)", amount: 1850.50, status: "Paid", date: "2024-05-18" },
    { id: "INV-2024-004", client: "David Miller", amount: 620.00, status: "Overdue", date: "2024-05-10" },
  ];

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
                <div className="text-3xl font-bold font-headline">$1,240.00</div>
                <p className="text-xs text-muted-foreground mt-1">From 8 active reservations</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-accent/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Revenue (May)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-headline">$42,912.45</div>
                <p className="text-xs text-muted-foreground mt-1">+14% compared to April</p>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-amber-500/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Pending Refunds</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold font-headline">$150.00</div>
                <p className="text-xs text-muted-foreground mt-1">2 requests awaiting approval</p>
              </CardContent>
            </Card>
          </div>

          <Card className="border-none shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="font-headline">Recent Invoices</CardTitle>
                <CardDescription>View and download generated billing documents.</CardDescription>
              </div>
              <Button variant="outline" size="sm" className="gap-2">
                <Filter className="h-4 w-4" /> All Transactions
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {invoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-muted/10 transition-colors">
                    <div className="flex items-center gap-4">
                      <div className="h-10 w-10 rounded-full bg-secondary flex items-center justify-center text-primary">
                        <Receipt className="h-5 w-5" />
                      </div>
                      <div className="flex flex-col">
                        <span className="font-semibold text-sm">{inv.id}</span>
                        <span className="text-xs text-muted-foreground">{inv.client} • {inv.date}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-6">
                      <span className="font-bold text-lg">${inv.amount.toFixed(2)}</span>
                      <Badge variant={inv.status === 'Paid' ? 'default' : inv.status === 'Pending' ? 'secondary' : 'destructive'}>
                        {inv.status}
                      </Badge>
                      <div className="flex gap-2">
                        <Button variant="ghost" size="icon" title="Print">
                          <Printer className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="Download PDF">
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" title="View details">
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </SidebarInset>
    </div>
  );
}
