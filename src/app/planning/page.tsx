
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
  const [todayDate, setTodayDate] = useState<Date | null>(null);
  
  const firestore = useFirestore();
  const roomsRef = useMemoFirebase(() => user ? collection(firestore, 'rooms') : null, [firestore, user]);
  const resRef = useMemoFirebase(() => user ? collection(firestore, 'reservations') : null, [firestore, user]);
  
  const { data: rooms, isLoading: isRoomsLoading } = useCollection(roomsRef);
  const { data: reservations } = useCollection(resRef);

  useEffect(() => {
    setMounted(true);
    setTodayDate(new Date());
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
        <header className="flex h-16 items-center border-b px-4 md:px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-2 md:mx-4 h-6" />
            <h1 className="font-headline font-semibold text-sm md:text-xl">Planning des Réservations</h1>
          </div>
          <div className="flex items-center gap-1 md:gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 font-medium bg-muted px-2 md:px-4 py-1.5 rounded-lg text-[10px] md:text-sm">
              <CalendarIcon className="h-3 w-3 md:h-4 md:w-4 text-primary" />
              {weekDays.length > 0 ? (
                <>
                  {format(weekDays[0], 'd MMM', { locale: fr })} - {format(weekDays[6], 'd MMM yyyy', { locale: fr })}
                </>
              ) : '...'}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="p-2 md:p-6">
          <TooltipProvider>
            <Card className="border-none shadow-sm overflow-hidden rounded-xl">
              <div className="overflow-x-auto scrollbar-hide">
                <div className="min-w-[800px] md:min-w-[1000px]">
                  <div className="grid grid-cols-[100px_repeat(7,1fr)] md:grid-cols-[150px_repeat(7,1fr)] bg-muted/50 border-b">
                    <div className="p-3 md:p-4 font-bold text-[10px] uppercase tracking-widest text-muted-foreground border-r flex items-center justify-center">Chambre</div>
                    {weekDays.map((day) => (
                      <div key={day.toString()} className="p-2 md:p-4 text-center border-r last:border-r-0">
                        <div className="text-[9px] md:text-xs font-bold uppercase text-muted-foreground">{format(day, 'EEE', { locale: fr })}</div>
                        <div className={`text-sm md:text-lg font-headline font-bold ${todayDate && isSameDay(day, todayDate) ? 'bg-primary text-primary-foreground rounded-full w-8 h-8 md:w-10 md:h-10 flex items-center justify-center mx-auto shadow-lg shadow-primary/20' : ''}`}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="divide-y">
                    {isRoomsLoading ? (
                      <div className="p-12 text-center text-muted-foreground flex items-center justify-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" /> Chargement...
                      </div>
                    ) : sortedRooms.map((room) => (
                      <div key={room.id} className="grid grid-cols-[100px_repeat(7,1fr)] md:grid-cols-[150px_repeat(7,1fr)] hover:bg-muted/5 transition-colors">
                        <div className="p-2 md:p-4 border-r flex flex-col justify-center bg-muted/10 text-center">
                          <span className="font-bold text-xs md:text-sm">Ch. {room.roomNumber}</span>
                          <span className="text-[8px] md:text-[10px] text-muted-foreground uppercase font-medium truncate">{room.roomType}</span>
                        </div>
                        {weekDays.map((day) => {
                          const res = getReservationForDay(room.id, day);
                          return (
                            <div key={day.toString()} className="h-16 md:h-20 border-r last:border-r-0 relative p-1">
                              {res && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`
                                      absolute inset-1 rounded-lg p-1.5 text-[9px] md:text-[10px] font-bold overflow-hidden shadow-sm flex flex-col justify-center cursor-pointer transition-transform hover:scale-[1.02] active:scale-95
                                      ${res.status === 'Checked In' ? 'bg-primary text-primary-foreground' : 'bg-secondary text-secondary-foreground'}
                                    `}>
                                      <span className="truncate">{res.guestName}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <div className="space-y-1 p-1">
                                      <p className="font-bold text-xs">{res.guestName}</p>
                                      <p className="text-[10px]">{res.checkInDate} → {res.checkOutDate}</p>
                                      <p className="text-[10px] uppercase font-black text-primary">{res.status}</p>
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
