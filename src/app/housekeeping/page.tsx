
'use client';

import { useState, useMemo } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  Broom, 
  CheckCircle2, 
  Clock, 
  Wrench, 
  AlertCircle,
  Loader2,
  RefreshCw,
  Sparkles
} from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, updateDocumentNonBlocking, useUser } from "@/firebase";
import { collection, doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

export default function HousekeepingPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const roomsRef = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  const { data: rooms, isLoading } = useCollection(roomsRef);

  const stats = useMemo(() => {
    if (!rooms) return { dirty: 0, cleaning: 0, ready: 0, total: 0 };
    return {
      dirty: rooms.filter(r => r.status === 'Occupied' || r.status === 'Cleaning').length,
      cleaning: rooms.filter(r => r.status === 'Cleaning').length,
      ready: rooms.filter(r => r.status === 'Available').length,
      maintenance: rooms.filter(r => r.status === 'Maintenance').length,
      total: rooms.length
    };
  }, [rooms]);

  const handleUpdateStatus = (roomId: string, roomNumber: string, newStatus: string) => {
    const roomRef = doc(firestore, 'rooms', roomId);
    updateDocumentNonBlocking(roomRef, { status: newStatus });
    
    const messages: any = {
      'Cleaning': 'Nettoyage démarré',
      'Available': 'Chambre prête',
      'Maintenance': 'Mise en maintenance'
    };

    toast({
      title: messages[newStatus] || "Statut mis à jour",
      description: `La chambre ${roomNumber} est maintenant ${newStatus.toLowerCase()}.`,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background/50">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Gouvernance & Ménage</h1>
          </div>
        </header>

        <main className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="border-none shadow-sm bg-blue-500/5 border border-blue-500/10">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Broom className="h-8 w-8 text-blue-500 mb-2" />
                <span className="text-2xl font-bold font-headline">{stats.cleaning}</span>
                <span className="text-xs font-bold uppercase text-blue-600">En Nettoyage</span>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-emerald-500/5 border border-emerald-500/10">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Sparkles className="h-8 w-8 text-emerald-500 mb-2" />
                <span className="text-2xl font-bold font-headline">{stats.ready}</span>
                <span className="text-xs font-bold uppercase text-emerald-600">Prêtes (Check-in)</span>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-rose-500/5 border border-rose-500/10">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <Wrench className="h-8 w-8 text-rose-500 mb-2" />
                <span className="text-2xl font-bold font-headline">{stats.maintenance}</span>
                <span className="text-xs font-bold uppercase text-rose-600">Maintenance</span>
              </CardContent>
            </Card>
            <Card className="border-none shadow-sm bg-muted">
              <CardContent className="p-4 flex flex-col items-center text-center">
                <RefreshCw className="h-8 w-8 text-muted-foreground mb-2" />
                <span className="text-2xl font-bold font-headline">{stats.total}</span>
                <span className="text-xs font-bold uppercase text-muted-foreground">Total Chambres</span>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            {['Cleaning', 'Occupied', 'Available', 'Maintenance'].map((status) => (
              <Card key={status} className="border-none shadow-sm">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-bold uppercase tracking-widest text-muted-foreground">
                      {status === 'Cleaning' ? 'En cours' : status === 'Available' ? 'Disponibles' : status === 'Occupied' ? 'À traiter' : 'Maintenance'}
                    </CardTitle>
                    <Badge variant="outline">{rooms?.filter(r => r.status === status).length || 0}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {rooms?.filter(r => r.status === status).map((room) => (
                    <div key={room.id} className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/10 transition-colors group">
                      <div className="flex flex-col">
                        <span className="font-bold text-sm">Chambre {room.roomNumber}</span>
                        <span className="text-[10px] text-muted-foreground uppercase">{room.roomType}</span>
                      </div>
                      <div className="flex gap-2">
                        {status === 'Cleaning' && (
                          <Button size="icon" variant="outline" className="h-8 w-8 text-emerald-600" onClick={() => handleUpdateStatus(room.id, room.roomNumber, 'Available')}>
                            <CheckCircle2 className="h-4 w-4" />
                          </Button>
                        )}
                        {(status === 'Occupied' || status === 'Available') && (
                          <Button size="icon" variant="outline" className="h-8 w-8 text-blue-600" onClick={() => handleUpdateStatus(room.id, room.roomNumber, 'Cleaning')}>
                            <Broom className="h-4 w-4" />
                          </Button>
                        )}
                        {status !== 'Maintenance' && (
                          <Button size="icon" variant="ghost" className="h-8 w-8 text-rose-500" onClick={() => handleUpdateStatus(room.id, room.roomNumber, 'Maintenance')}>
                            <Wrench className="h-4 w-4" />
                          </Button>
                        )}
                        {status === 'Maintenance' && (
                          <Button size="icon" variant="outline" className="h-8 w-8 text-emerald-600" onClick={() => handleUpdateStatus(room.id, room.roomNumber, 'Available')}>
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                  {rooms?.filter(r => r.status === status).length === 0 && (
                    <div className="py-8 text-center text-muted-foreground text-xs italic">
                      Aucune chambre.
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
