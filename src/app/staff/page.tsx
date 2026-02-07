"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Search, 
  UserPlus, 
  Mail, 
  Phone, 
  Shield, 
  Calendar,
  MessageSquare,
  MoreVertical,
  Loader2
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";

export default function StaffPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");

  const firestore = useFirestore();
  const staffCollection = useMemoFirebase(() => user ? collection(firestore, 'staff') : null, [firestore, user]);
  const { data: staff, isLoading } = useCollection(staffCollection);

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  if (isAuthLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filteredStaff = staff?.filter(member => 
    member.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) || 
    member.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.role?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Staff Management</h1>
          </div>
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
            <UserPlus className="h-4 w-4" /> Add Member
          </Button>
        </header>

        <main className="p-6 space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search staff members..." 
                className="pl-9 bg-background" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2">
              <Badge variant="outline" className="px-3 py-1 bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                {staff?.filter(s => s.status === 'On Duty').length || 0} On Duty
              </Badge>
              <Badge variant="outline" className="px-3 py-1 bg-amber-500/10 text-amber-600 border-amber-500/20">
                {staff?.filter(s => s.status === 'On Break').length || 0} On Break
              </Badge>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {filteredStaff?.map((member) => (
                <Card key={member.id} className="border-none shadow-sm hover:shadow-md transition-shadow group relative">
                  <Button variant="ghost" size="icon" className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                  <CardHeader className="flex flex-row items-center gap-4">
                    <Avatar className="h-16 w-16 border-2 border-primary/10">
                      <AvatarImage src={`https://picsum.photos/seed/${member.avatar || member.id}/200`} />
                      <AvatarFallback>{member.firstName?.charAt(0)}{member.lastName?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <CardTitle className="text-lg font-headline">{member.firstName} {member.lastName}</CardTitle>
                      <CardDescription className="flex items-center gap-1 font-medium text-primary">
                        <Shield className="h-3 w-3" /> {member.role || 'Staff'}
                      </CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex justify-between items-center">
                      <Badge variant={member.status === 'On Duty' ? 'default' : member.status === 'On Break' ? 'secondary' : 'outline'} className="text-[10px]">
                        {member.status || 'Offline'}
                      </Badge>
                      <div className="flex items-center text-xs text-muted-foreground gap-1">
                        <Calendar className="h-3 w-3" /> Shift: 08:00 - 16:00
                      </div>
                    </div>
                    
                    <div className="space-y-2 pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Mail className="h-3 w-3" /> {member.email}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Phone className="h-3 w-3" /> {member.phoneNumber || 'N/A'}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button variant="outline" size="sm" className="flex-1 gap-2">
                        <MessageSquare className="h-3 w-3" /> Message
                      </Button>
                      <Button variant="secondary" size="sm" className="flex-1">Schedule</Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </SidebarInset>
    </div>
  );
}
