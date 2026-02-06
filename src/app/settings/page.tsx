"use client"

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { 
  Save, 
  Loader2, 
  Hotel, 
  Clock, 
  Bell, 
  Shield, 
  Globe,
  Mail,
  Phone
} from "lucide-react";
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, useUser } from "@/firebase";
import { doc } from "firebase/firestore";
import { toast } from "@/hooks/use-toast";

export default function SettingsPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const router = useRouter();
  const firestore = useFirestore();
  
  // Guard references with user check to prevent permission errors before redirect
  const settingsRef = useMemoFirebase(() => user ? doc(firestore, 'settings', 'general') : null, [firestore, user]);
  const { data: settings, isLoading } = useDoc(settingsRef);

  const [formData, setFormData] = useState({
    hotelName: "K.K.S",
    email: "contact@kks.com",
    phone: "+1 234 567 890",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    autoInvoicing: true,
    notificationsEnabled: true,
    currency: "USD",
  });

  useEffect(() => {
    if (!isAuthLoading && !user) {
      router.push('/login');
    }
  }, [user, isAuthLoading, router]);

  useEffect(() => {
    if (settings) {
      setFormData(prev => ({ ...prev, ...settings }));
    }
  }, [settings]);

  const handleSave = () => {
    if (!settingsRef) return;
    
    setDocumentNonBlocking(settingsRef, formData, { merge: true });
    
    toast({
      title: "Settings Saved",
      description: "Your hotel configuration has been updated successfully.",
    });
  };

  if (isAuthLoading || !user) {
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
        <header className="flex h-16 items-center border-b px-6 bg-background">
          <SidebarTrigger />
          <Separator orientation="vertical" className="mx-4 h-6" />
          <h1 className="font-headline font-semibold text-xl">System Settings</h1>
        </header>

        <main className="p-6 max-w-4xl mx-auto w-full space-y-6">
          <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-8">
              <TabsTrigger value="general" className="gap-2">
                <Hotel className="h-4 w-4" /> General
              </TabsTrigger>
              <TabsTrigger value="reservations" className="gap-2">
                <Clock className="h-4 w-4" /> Policies
              </TabsTrigger>
              <TabsTrigger value="system" className="gap-2">
                <Shield className="h-4 w-4" /> System
              </TabsTrigger>
            </TabsList>

            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Hotel Information</CardTitle>
                  <CardDescription>Manage the public identity of your establishment.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-2">
                    <Label htmlFor="hotelName">Hotel Name</Label>
                    <div className="relative">
                      <Hotel className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="hotelName" 
                        className="pl-9"
                        value={formData.hotelName}
                        onChange={(e) => setFormData({...formData, hotelName: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="email">Official Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="email" 
                          type="email"
                          className="pl-9"
                          value={formData.email}
                          onChange={(e) => setFormData({...formData, email: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="phone">Contact Number</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="phone" 
                          className="pl-9"
                          value={formData.phone}
                          onChange={(e) => setFormData({...formData, phone: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 flex justify-end p-4">
                  <Button onClick={handleSave} className="gap-2">
                    <Save className="h-4 w-4" /> Save Changes
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="reservations">
              <Card>
                <CardHeader>
                  <CardTitle>Reservation Policies</CardTitle>
                  <CardDescription>Define check-in/out times and booking behavior.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-8">
                    <div className="space-y-2">
                      <Label>Standard Check-In Time</Label>
                      <Input 
                        type="time" 
                        value={formData.checkInTime}
                        onChange={(e) => setFormData({...formData, checkInTime: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Standard Check-Out Time</Label>
                      <Input 
                        type="time" 
                        value={formData.checkOutTime}
                        onChange={(e) => setFormData({...formData, checkOutTime: e.target.value})}
                      />
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>Automatic Invoicing</Label>
                      <p className="text-xs text-muted-foreground">Generate bills instantly when a guest checks in.</p>
                    </div>
                    <Switch 
                      checked={formData.autoInvoicing}
                      onCheckedChange={(val) => setFormData({...formData, autoInvoicing: val})}
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 flex justify-end p-4">
                  <Button onClick={handleSave} className="gap-2">
                    <Save className="h-4 w-4" /> Save Changes
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="system">
              <Card>
                <CardHeader>
                  <CardTitle>System & Preferences</CardTitle>
                  <CardDescription>Global application behavior and preferences.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label className="flex items-center gap-2">
                        <Bell className="h-4 w-4 text-accent" /> Push Notifications
                      </Label>
                      <p className="text-xs text-muted-foreground">Receive alerts for new bookings and cancellations.</p>
                    </div>
                    <Switch 
                      checked={formData.notificationsEnabled}
                      onCheckedChange={(val) => setFormData({...formData, notificationsEnabled: val})}
                    />
                  </div>
                  <Separator />
                  <div className="grid gap-2">
                    <Label className="flex items-center gap-2">
                      <Globe className="h-4 w-4 text-accent" /> Base Currency
                    </Label>
                    <Input 
                      value={formData.currency}
                      onChange={(e) => setFormData({...formData, currency: e.target.value.toUpperCase()})}
                      placeholder="e.g., USD, EUR, KES"
                    />
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/20 flex justify-end p-4">
                  <Button onClick={handleSave} className="gap-2">
                    <Save className="h-4 w-4" /> Save Changes
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>

          {isLoading && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground animate-pulse text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Syncing with cloud configuration...
            </div>
          )}
        </main>
      </SidebarInset>
    </div>
  );
}
