
"use client"

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
  Phone,
  User,
  Key,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff
} from "lucide-react";
import { useFirestore, useDoc, useMemoFirebase, setDocumentNonBlocking, updateDocumentNonBlocking, useUser, useAuth } from "@/firebase";
import { doc } from "firebase/firestore";
import { updatePassword, updateEmail } from "firebase/auth";
import { toast } from "@/hooks/use-toast";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function SettingsPage() {
  const { user, isUserLoading: isAuthLoading } = useUser();
  const auth = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const defaultTab = searchParams.get('tab') || 'general';
  
  const firestore = useFirestore();
  
  const settingsRef = useMemoFirebase(() => user ? doc(firestore, 'settings', 'general') : null, [firestore, user]);
  const staffProfileRef = useMemoFirebase(() => user ? doc(firestore, 'staff', user.uid) : null, [firestore, user]);
  
  const { data: settings, isLoading: isSettingsLoading } = useDoc(settingsRef);
  const { data: staffProfile, isLoading: isProfileLoading } = useDoc(staffProfileRef);

  const [formData, setFormData] = useState({
    hotelName: "K.H.M.System",
    email: "contact@khmsystem.com",
    phone: "+1 234 567 890",
    checkInTime: "14:00",
    checkOutTime: "11:00",
    autoInvoicing: true,
    notificationsEnabled: true,
    currency: "USD",
  });

  const [accountData, setAccountData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    newPassword: "",
    confirmPassword: ""
  });

  const [isUpdatingAccount, setIsUpdatingAccount] = useState(false);
  const [showPasswords, setShowPasswords] = useState(false);

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

  useEffect(() => {
    if (staffProfile) {
      setAccountData(prev => ({
        ...prev,
        firstName: staffProfile.firstName || "",
        lastName: staffProfile.lastName || "",
        email: user?.email || ""
      }));
    }
  }, [staffProfile, user]);

  const handleSaveGeneral = () => {
    if (!settingsRef) return;
    setDocumentNonBlocking(settingsRef, formData, { merge: true });
    toast({
      title: "Settings Saved",
      description: "Hotel configuration updated successfully.",
    });
  };

  const handleUpdateAccount = async () => {
    if (!user || !staffProfileRef) return;
    
    if (accountData.newPassword && accountData.newPassword !== accountData.confirmPassword) {
      toast({
        variant: "destructive",
        title: "Validation Error",
        description: "Passwords do not match.",
      });
      return;
    }

    setIsUpdatingAccount(true);
    try {
      // 1. Update Firestore Staff Record
      updateDocumentNonBlocking(staffProfileRef, {
        firstName: accountData.firstName,
        lastName: accountData.lastName,
        email: accountData.email // Sync email to staff doc
      });

      // 2. Update Firebase Auth Email if changed
      if (accountData.email !== user.email) {
        await updateEmail(user, accountData.email);
      }

      // 3. Update Password if provided
      if (accountData.newPassword) {
        await updatePassword(user, accountData.newPassword);
      }

      toast({
        title: "Account Updated",
        description: "Administrator credentials have been synchronized.",
      });
      
      setAccountData(prev => ({ ...prev, newPassword: "", confirmPassword: "" }));
    } catch (error: any) {
      const message = error.code === 'auth/requires-recent-login'
        ? "Security protocol requires a recent login to change credentials. Please sign out and sign back in to continue."
        : error.message || "Failed to update security credentials.";
      
      toast({
        variant: "destructive",
        title: "Security Error",
        description: message,
      });
    } finally {
      setIsUpdatingAccount(false);
    }
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
          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-8">
              <TabsTrigger value="general" className="gap-2">
                <Hotel className="h-4 w-4" /> General
              </TabsTrigger>
              <TabsTrigger value="reservations" className="gap-2">
                <Clock className="h-4 w-4" /> Policies
              </TabsTrigger>
              <TabsTrigger value="account" className="gap-2">
                <ShieldCheck className="h-4 w-4" /> Account
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
                  <Button onClick={handleSaveGeneral} className="gap-2">
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
                  <Button onClick={handleSaveGeneral} className="gap-2">
                    <Save className="h-4 w-4" /> Save Changes
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>

            <TabsContent value="account">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5 text-primary" /> Administrator Profile
                    </CardTitle>
                    <CardDescription>Update your personal information used throughout the system.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName">First Name</Label>
                        <Input 
                          id="firstName" 
                          value={accountData.firstName} 
                          onChange={(e) => setAccountData({...accountData, firstName: e.target.value})}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName">Last Name</Label>
                        <Input 
                          id="lastName" 
                          value={accountData.lastName} 
                          onChange={(e) => setAccountData({...accountData, lastName: e.target.value})}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="loginEmail">Login Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input 
                          id="loginEmail" 
                          type="email"
                          className="pl-9"
                          value={accountData.email} 
                          onChange={(e) => setAccountData({...accountData, email: e.target.value})}
                        />
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-1">Changing this will update your management login credentials.</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Key className="h-5 w-5 text-primary" /> Security Credentials
                    </CardTitle>
                    <CardDescription>Securely update your system access password.</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="newPass">New Password</Label>
                        <div className="relative">
                          <Input 
                            id="newPass" 
                            type={showPasswords ? 'text' : 'password'} 
                            value={accountData.newPassword}
                            onChange={(e) => setAccountData({...accountData, newPassword: e.target.value})}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                            onClick={() => setShowPasswords(!showPasswords)}
                          >
                            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirmPass">Confirm Password</Label>
                        <div className="relative">
                          <Input 
                            id="confirmPass" 
                            type={showPasswords ? 'text' : 'password'}
                            value={accountData.confirmPassword}
                            onChange={(e) => setAccountData({...accountData, confirmPassword: e.target.value})}
                            className="pr-10"
                          />
                          <button
                            type="button"
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                            onClick={() => setShowPasswords(!showPasswords)}
                          >
                            {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <Alert className="bg-primary/5 border-primary/20">
                      <AlertCircle className="h-4 w-4 text-primary" />
                      <AlertTitle className="text-xs font-bold uppercase tracking-wider">Note</AlertTitle>
                      <AlertDescription className="text-xs">
                        Leave password fields blank if you do not wish to change your current security key.
                      </AlertDescription>
                    </Alert>
                  </CardContent>
                  <CardFooter className="border-t bg-muted/20 flex justify-end p-4">
                    <Button onClick={handleUpdateAccount} disabled={isUpdatingAccount} className="gap-2">
                      {isUpdatingAccount ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Sync Credentials
                    </Button>
                  </CardFooter>
                </Card>
              </div>
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
                  <Button onClick={handleSaveGeneral} className="gap-2">
                    <Save className="h-4 w-4" /> Save Changes
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
          </Tabs>

          {(isSettingsLoading || isProfileLoading) && (
            <div className="flex items-center justify-center gap-2 text-muted-foreground animate-pulse text-sm">
              <Loader2 className="h-4 w-4 animate-spin" /> Syncing with cloud configuration...
            </div>
          )}
        </main>
      </SidebarInset>
    </div>
  );
}
