
'use client';

import { useState, useMemo, useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";

export default function PlanningPage() {
  const { user } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const firestore = useFirestore();
  
  const roomsRef = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  const resRef = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  
  const { data: rooms, isLoading: isRoomsLoading } = useCollection(roomsRef);
  const { data: reservations } = useCollection(resRef);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const sortedRooms = useMemo(() => {
    if (!rooms) return [];
    return [...rooms].sort((a, b) => a.roomNumber.localeCompare(b.roomNumber));
  }, [rooms]);

  const getReservationForDay = (roomId: string, date: Date) => {
    if (!reservations) return null;
    const dateStr = format(date, 'yyyy-MM-dd');
    return reservations.find(r => 
      r.roomId === roomId && 
      r.status !== 'Cancelled' &&
      r.checkInDate <= dateStr && 
      r.checkOutDate >= dateStr
    );
  };

  return (
    <div className="flex h-screen w-full">
      <AppSidebar />
      <SidebarInset className="flex flex-col overflow-auto bg-background">
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Planning des Séjours</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 font-medium bg-muted px-4 py-2 rounded-lg text-sm">
              <CalendarIcon className="h-4 w-4 text-primary" />
              {format(weekDays[0], 'd MMM', { locale: fr })} - {format(weekDays[6], 'd MMM yyyy', { locale: fr })}
            </div>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="p-6">
          <Card className="border-none shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <div className="min-w-[1000px]">
                {/* Header Grid */}
                <div className="grid grid-cols-[150px_repeat(7,1fr)] bg-muted/50 border-b">
                  <div className="p-4 font-bold text-xs uppercase tracking-widest text-muted-foreground border-r">Chambre</div>
                  {weekDays.map((day) => (
                    <div key={day.toString()} className="p-4 text-center border-r last:border-r-0">
                      <div className="text-xs font-bold uppercase text-muted-foreground">{format(day, 'EEE', { locale: fr })}</div>
                      <div className={`text-lg font-headline font-bold ${isSameDay(day, new Date()) ? 'text-primary' : ''}`}>
                        {format(day, 'd')}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Body Grid */}
                <div className="divide-y">
                  {isRoomsLoading ? (
                    <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Chargement du plan...
                    </div>
                  ) : sortedRooms.map((room) => (
                    <div key={room.id} className="grid grid-cols-[150px_repeat(7,1fr)] hover:bg-muted/5 transition-colors">
                      <div className="p-4 border-r flex flex-col justify-center bg-muted/10">
                        <span className="font-bold text-sm">Ch. {room.roomNumber}</span>
                        <span className="text-[10px] text-muted-foreground uppercase font-medium">{room.roomType}</span>
                      </div>
                      {weekDays.map((day) => {
                        const res = getReservationForDay(room.id, day);
                        return (
                          <div key={day.toString()} className="h-20 border-r last:border-r-0 relative p-1">
                            {res && (
                              <div className={`
                                absolute inset-1 rounded-md p-2 text-[10px] font-bold overflow-hidden shadow-sm flex flex-col justify-center
                                ${res.status === 'Checked In' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}
                              `}>
                                <span className="truncate">{res.guestName}</span>
                                <span className="opacity-70 truncate">
                                  {res.status === 'Checked In' ? 'Occupé' : 'Confirmé'}
                                </span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Card>
          <div className="mt-4 flex gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-primary" /> <span>En séjour</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm bg-secondary" /> <span>Réservation confirmée</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-3 w-3 rounded-sm border border-muted-foreground/20" /> <span>Disponible</span>
            </div>
          </div>
        </main>
      </SidebarInset>
    </div>
  );
}
