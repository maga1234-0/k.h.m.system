'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Hotel, Loader2, Lock, Mail, Eye, EyeOff, UserPlus, LogIn, ShieldAlert, Info } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const [email, setEmail] = useState('admin@kks.com');
  const [password, setPassword] = useState('kkk1234@#');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const ADMIN_EMAIL = 'admin@kks.com';

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Strict admin-only check
    if (email.toLowerCase() !== ADMIN_EMAIL) {
      toast({
        variant: 'destructive',
        title: 'Access Denied',
        description: 'Only the system administrator is authorized to log in.',
      });
      return;
    }

    setIsLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Register as Staff
        const staffRef = doc(firestore, 'staff', userCredential.user.uid);
        setDocumentNonBlocking(staffRef, {
          id: userCredential.user.uid,
          firstName: "System",
          lastName: "Administrator",
          email: email,
          role: "Administrator",
          status: "On Duty",
          avatar: "admin"
        }, { merge: true });

        // Register as Admin Role
        const adminRoleRef = doc(firestore, 'roles_admin', userCredential.user.uid);
        setDocumentNonBlocking(adminRoleRef, {
          uid: userCredential.user.uid,
          assignedAt: new Date().toISOString()
        }, { merge: true });

        toast({
          title: 'Admin Registered',
          description: 'Welcome, Administrator.',
        });
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      router.push('/');
    } catch (error: any) {
      const message = error.code === 'auth/invalid-credential' 
        ? "Incorrect credentials. If this is your first time, please use 'Setup Administrator Account' below."
        : error.message || 'Check your credentials.';
        
      toast({
        variant: 'destructive',
        title: isSignUp ? 'Registration Failed' : 'Login Failed',
        description: message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (isUserLoading || user) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full items-center justify-center bg-muted/30 px-4">
      <Card className="w-full max-w-md border-none shadow-xl">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-primary-foreground shadow-lg shadow-primary/20">
            <Hotel className="h-8 w-8" />
          </div>
          <div className="space-y-1">
            <CardTitle className="font-headline text-3xl font-bold tracking-tight">K.K.S</CardTitle>
            <CardDescription className="text-sm uppercase tracking-widest font-bold text-primary/70">Secure Admin Login</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {isSignUp ? (
             <Alert className="bg-blue-50 border-blue-200">
             <Info className="h-4 w-4 text-blue-600" />
             <AlertTitle className="text-xs font-bold uppercase tracking-wider text-blue-800">First-Time Setup</AlertTitle>
             <AlertDescription className="text-xs text-blue-700">
               Enter the admin credentials below to create your permanent system account.
             </AlertDescription>
           </Alert>
          ) : (
            <Alert className="bg-amber-50 border-amber-200">
              <ShieldAlert className="h-4 w-4 text-amber-600" />
              <AlertTitle className="text-xs font-bold uppercase tracking-wider text-amber-800">Restricted Access</AlertTitle>
              <AlertDescription className="text-xs text-amber-700">
                Authorized access only for: <span className="font-bold">{ADMIN_EMAIL}</span>
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Administrator Email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@kks.com"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-9 pr-10"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground focus:outline-none"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full font-semibold gap-2 py-6 text-lg" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : (isSignUp ? <UserPlus className="h-5 w-5" /> : <LogIn className="h-5 w-5" />)}
              {isSignUp ? 'Initialize Admin Account' : 'Secure Sign In'}
            </Button>
          </form>

          <div className="flex flex-col items-center gap-3 pt-2">
            <div className="h-px w-full bg-border relative">
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-[10px] text-muted-foreground uppercase tracking-widest">or</span>
            </div>
            <button 
              type="button" 
              className="text-sm text-primary hover:underline font-bold"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Already have an account? Sign In' : "First time? Setup Administrator Account"}
            </button>
          </div>
        </CardContent>
        <CardFooter className="text-center pt-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest w-full">
            Proprietary system of K.K.S Group
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
