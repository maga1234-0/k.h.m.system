
'use client';

import { useState, useMemo, useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Loader2, Calendar as CalendarIcon } from "lucide-react";
import { useFirestore, useCollection, useMemoFirebase, useUser } from "@/firebase";
import { collection } from "firebase/firestore";
import { format, addDays, startOfWeek, endOfWeek, isSameDay, eachDayOfInterval } from "date-fns";
import { fr } from "date-fns/locale";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export default function PlanningPage() {
  const { user } = useUser();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [mounted, setMounted] = useState(false);
  
  const firestore = useFirestore();
  const roomsRef = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  const resRef = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  
  const { data: rooms, isLoading: isRoomsLoading } = useCollection(roomsRef);
  const { data: reservations } = useCollection(resRef);

  useEffect(() => {
    setMounted(true);
  }, []);

  const weekDays = useMemo(() => {
    if (!mounted) return [];
    const start = startOfWeek(currentDate, { weekStartsOn: 1 });
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentDate, mounted]);

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

  if (!mounted) {
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
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Planning</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 font-medium bg-muted px-4 py-2 rounded-lg text-sm">
              <CalendarIcon className="h-4 w-4 text-primary" />
              {weekDays.length > 0 ? (
                <>
                  {format(weekDays[0], 'd MMM', { locale: fr })} - {format(weekDays[6], 'd MMM yyyy', { locale: fr })}
                </>
              ) : 'Chargement...'}
            </div>
            <Button variant="outline" size="icon" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="p-6">
          <TooltipProvider>
            <Card className="border-none shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <div className="min-w-[1000px]">
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

                  <div className="divide-y">
                    {isRoomsLoading ? (
                      <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
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
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`
                                      absolute inset-1 rounded-md p-2 text-[10px] font-bold overflow-hidden shadow-sm flex flex-col justify-center cursor-help
                                      ${res.status === 'Checked In' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}
                                    `}>
                                      <span className="truncate">{res.guestName}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="space-y-1 p-1">
                                      <p className="font-bold text-sm">{res.guestName}</p>
                                      <p className="text-xs">{res.checkInDate} → {res.checkOutDate}</p>
                                      <p className="text-[10px] uppercase font-bold text-primary">{res.status}</p>
                                    </div>
                                  </TooltipContent>
                                </Tooltip>
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
          </TooltipProvider>
        </main>
      </SidebarInset>
    </div>
  );
}
