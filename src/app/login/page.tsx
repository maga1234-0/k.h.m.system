'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore, setDocumentNonBlocking } from '@/firebase';
import { signInWithEmailAndPassword, signInAnonymously, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Hotel, Loader2, Lock, Mail, Sparkles, Info, Eye, EyeOff, UserPlus, LogIn } from 'lucide-react';
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

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      if (isSignUp) {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Create staff record automatically for new users in this prototype
        const staffRef = doc(firestore, 'staff', userCredential.user.uid);
        setDocumentNonBlocking(staffRef, {
          id: userCredential.user.uid,
          firstName: email.split('@')[0],
          lastName: "Admin",
          email: email,
          role: "General Manager",
          status: "On Duty",
          avatar: `staff${Math.floor(Math.random() * 6) + 1}`
        }, { merge: true });

        toast({
          title: 'Account Created',
          description: 'Welcome to K.K.S Management Suite.',
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

  const handleAnonymousLogin = async () => {
    setIsLoading(true);
    try {
      await signInAnonymously(auth);
      router.push('/');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Access Failed',
        description: error.message,
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
            <CardDescription className="text-sm uppercase tracking-widest font-bold text-primary/70">Management Suite</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-primary/5 border-primary/20">
            <Info className="h-4 w-4 text-primary" />
            <AlertTitle className="text-xs font-bold uppercase tracking-wider">Instructions</AlertTitle>
            <AlertDescription className="text-xs text-muted-foreground">
              {isSignUp 
                ? "Create your account below. Use any email and a secure password." 
                : "Enter your credentials or toggle to Sign Up to create an account."}
              {!isSignUp && <div className="mt-1 font-bold">Demo: admin@kks.com / kkk1234@#</div>}
            </AlertDescription>
          </Alert>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
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
                  placeholder="kkk1234@#"
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
              {isSignUp ? 'Create Account' : 'Sign In'}
            </Button>
          </form>

          <div className="flex items-center justify-center text-sm">
            <button 
              type="button" 
              className="text-primary hover:underline font-medium"
              onClick={() => setIsSignUp(!isSignUp)}
            >
              {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
            </button>
          </div>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">Or</span>
            </div>
          </div>

          <Button variant="outline" className="w-full gap-2 border-primary/20 hover:bg-primary/5" onClick={handleAnonymousLogin} disabled={isLoading}>
            <Sparkles className="h-4 w-4 text-primary" />
            Continue as Guest Admin
          </Button>
        </CardContent>
        <CardFooter className="flex flex-col gap-4 text-center">
          <p className="text-xs text-muted-foreground">
            Proprietary system of K.K.S Group. Authorized access only.
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
