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
import { Hotel, Loader2, Lock, Mail, Eye, EyeOff, UserPlus, LogIn, ShieldAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
      toast({
        variant: 'destructive',
        title: isSignUp ? 'Registration Failed' : 'Login Failed',
        description: error.message || 'Check your credentials.',
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
          <Alert className="bg-amber-50 border-amber-200">
            <ShieldAlert className="h-4 w-4 text-amber-600" />
            <AlertTitle className="text-xs font-bold uppercase tracking-wider text-amber-800">Restricted Access</AlertTitle>
            <AlertDescription className="text-xs text-amber-700">
              This system is restricted to the administrator.
              <div className="mt-1 font-bold">Required: {ADMIN_EMAIL}</div>
            </AlertDescription>
          </Alert>

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
            <Button type="submit" className="w-full font-semibold gap-2" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (isSignUp ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />)}
              {isSignUp ? 'Create Admin Account' : 'Secure Sign In'}
            </Button>
          </form>

          <div className="flex items-center justify-center text-sm">
            <button 
              type="button" 
              className="text-primary hover:underline font-medium"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Back to Sign In' : "First time? Setup Administrator Account"}
            </button>
          </div>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest">
            Proprietary system of K.K.S Group
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
