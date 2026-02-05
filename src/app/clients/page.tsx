
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Mail, Phone, MoreHorizontal, UserPlus } from "lucide-react";

export default function ClientsPage() {
  const clients = [
    { name: "John Doe", email: "john@example.com", phone: "+1 234 567 890", stays: 4, loyalty: "Gold", lastVisit: "2024-03-12" },
    { name: "Sarah Smith", email: "sarah.s@gmail.com", phone: "+1 445 221 009", stays: 1, loyalty: "New", lastVisit: "2024-05-20" },
    { name: "Michael Chang", email: "m.chang@techcorp.com", phone: "+86 10 9988 7766", stays: 12, loyalty: "Diamond", lastVisit: "2024-05-01" },
    { name: "Emily Watson", email: "emily.w@outlook.com", phone: "+44 20 7711 2233", stays: 3, loyalty: "Silver", lastVisit: "2023-11-30" },
    { name: "David Miller", email: "dmiller@yahoo.com", phone: "+1 888 221 3344", stays: 6, loyalty: "Gold", lastVisit: "2024-04-15" },
  ];

  const getLoyaltyColor = (status: string) => {
    switch (status) {
      case "Diamond": return "bg-indigo-500/10 text-indigo-600";
      case "Gold": return "bg-amber-500/10 text-amber-600";
      case "Silver": return "bg-slate-500/10 text-slate-600";
      default: return "bg-emerald-500/10 text-emerald-600";
    }
  };

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Guest Registry</h1>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <UserPlus className="h-4 w-4" /> Register Guest
          </Button>
        </header>

        <main className="p-6">
          <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
            <div className="p-4 border-b bg-muted/20 flex flex-col md:flex-row gap-4 items-center">
              <div className="relative w-full md:w-96">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input placeholder="Search by name, email, or loyalty ID..." className="pl-9 bg-background" />
              </div>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Guest</TableHead>
                  <TableHead>Contact Info</TableHead>
                  <TableHead>Loyalty Status</TableHead>
                  <TableHead>Stays</TableHead>
                  <TableHead>Last Visit</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.map((client, i) => (
                  <TableRow key={i} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage src={`https://picsum.photos/seed/guest${i}/100`} />
                          <AvatarFallback>{client.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-col text-xs space-y-1">
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Mail className="h-3 w-3" /> {client.email}
                        </div>
                        <div className="flex items-center gap-1 text-muted-foreground">
                          <Phone className="h-3 w-3" /> {client.phone}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getLoyaltyColor(client.loyalty)}>
                        {client.loyalty}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-medium">{client.stays}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{client.lastVisit}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
