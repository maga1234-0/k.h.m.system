
'use client';

import { useState, useMemo, useEffect } from "react";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
        <header className="flex h-16 items-center border-b px-6 justify-between bg-background sticky top-0 z-10">
          <div className="flex items-center">
            <SidebarTrigger />
            <Separator orientation="vertical" className="mx-4 h-6" />
            <h1 className="font-headline font-semibold text-xl">Planning</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, -7))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 font-bold bg-muted px-4 py-1.5 rounded-lg text-xs uppercase tracking-widest">
              <CalendarIcon className="h-4 w-4 text-primary" />
              {weekDays.length > 0 ? (
                <>{format(weekDays[0], 'd MMM', { locale: fr })} - {format(weekDays[6], 'd MMM yyyy', { locale: fr })}</>
              ) : 'Chargement...'}
            </div>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCurrentDate(addDays(currentDate, 7))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <main className="p-6">
          <TooltipProvider>
            <Card className="border shadow-sm overflow-hidden rounded-xl">
              <div className="overflow-x-auto">
                <div className="min-w-[900px]">
                  <div className="grid grid-cols-[120px_repeat(7,1fr)] bg-muted/50 border-b">
                    <div className="p-4 font-black text-[10px] uppercase text-muted-foreground border-r text-center">Chambre</div>
                    {weekDays.map((day) => (
                      <div key={day.toString()} className="p-2 text-center border-r last:border-r-0">
                        <div className="text-[9px] font-black uppercase text-muted-foreground">{format(day, 'EEE', { locale: fr })}</div>
                        <div className={`text-lg font-headline font-black mx-auto w-10 h-10 flex items-center justify-center rounded-full transition-colors ${todayDate && isSameDay(day, todayDate) ? 'bg-primary text-white shadow-lg' : ''}`}>
                          {format(day, 'd')}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="divide-y">
                    {sortedRooms.map((room) => (
                      <div key={room.id} className="grid grid-cols-[120px_repeat(7,1fr)] hover:bg-muted/5">
                        <div className="p-3 border-r flex flex-col justify-center bg-muted/10 text-center">
                          <span className="font-black text-sm">Ch. {room.roomNumber}</span>
                          <span className="text-[9px] text-muted-foreground uppercase font-bold truncate">{room.roomType}</span>
                        </div>
                        {weekDays.map((day) => {
                          const res = getReservationForDay(room.id, day);
                          return (
                            <div key={day.toString()} className="h-20 border-r last:border-r-0 relative p-1.5">
                              {res && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <div className={`absolute inset-1.5 rounded-xl p-2 text-[10px] font-black overflow-hidden shadow-sm flex flex-col justify-center cursor-pointer transition-all hover:scale-[1.02] ${res.status === 'Checked In' ? 'bg-primary text-white' : 'bg-secondary text-secondary-foreground border border-primary/20'}`}>
                                      <span className="truncate">{res.guestName}</span>
                                    </div>
                                  </TooltipTrigger>
                                  <TooltipContent className="p-0 border-none shadow-2xl rounded-2xl overflow-hidden">
                                    <div className="p-4 bg-white min-w-[200px] text-slate-900">
                                      <div className="flex items-center justify-between mb-3">
                                        <p className="font-black text-sm">{res.guestName}</p>
                                        <Badge className="h-5 text-[8px] uppercase tracking-widest">{res.status}</Badge>
                                      </div>
                                      <div className="space-y-1">
                                        <p className="text-[10px] font-bold text-muted-foreground uppercase">Dates du séjour</p>
                                        <p className="text-xs font-bold">{res.checkInDate} au {res.checkOutDate}</p>
                                      </div>
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
