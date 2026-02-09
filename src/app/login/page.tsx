'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Lock, Mail, Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Logo } from '@/components/ui/logo';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();

  const PRIMARY_ADMIN = 'aubinmaga@gmail.com';

  useEffect(() => {
    if (!isUserLoading && user) {
      router.push('/');
    }
  }, [user, isUserLoading, router]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsLoading(true);
    try {
      let userCredential;
      
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password);
      } catch (authError: any) {
        if (email === PRIMARY_ADMIN && (authError.code === 'auth/invalid-credential' || authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-email')) {
          userCredential = await createUserWithEmailAndPassword(auth, email, password);
          toast({
            title: "Système Initialisé",
            description: "Le compte administrateur principal a été créé et vérifié.",
          });
        } else {
          throw authError;
        }
      }

      const uid = userCredential.user.uid;
      
      const adminRoleRef = doc(firestore, 'roles_admin', uid);
      const adminSnap = await getDoc(adminRoleRef);
      
      if (!adminSnap.exists()) {
        if (email === PRIMARY_ADMIN) {
          await setDoc(adminRoleRef, {
            id: uid,
            email: email,
            role: 'Administrateur',
            createdAt: new Date().toISOString()
          });

          const staffRef = doc(firestore, 'staff', uid);
          await setDoc(staffRef, {
            id: uid,
            firstName: "Principal",
            lastName: "Administrateur",
            email: email,
            role: "Manager",
            status: "En Service",
            createdAt: new Date().toISOString()
          });
        } else {
          await signOut(auth);
          throw new Error("Violation de Sécurité : Ce compte n'est pas enregistré dans le répertoire de gestion.");
        }
      }
      
      router.push('/');
    } catch (error: any) {
      console.error(error);
      const message = error.code === 'auth/invalid-credential' 
        ? "Échec d'Authentification : Mot de passe incorrect."
        : error.message || 'Une erreur de sécurité est survenue.';
        
      toast({
        variant: 'destructive',
        title: 'Alerte de Sécurité',
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
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-2xl bg-white border border-primary/20 shadow-lg shadow-primary/5 text-primary">
            <Logo size={80} />
          </div>
          <div className="space-y-1">
            <CardTitle className="font-headline text-3xl font-bold tracking-tight">ImaraPMS</CardTitle>
            <CardDescription className="text-sm uppercase tracking-widest font-bold text-primary/70">Console de Gestion</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert variant="leafy" className="border-leafy/30">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle className="text-xs font-bold uppercase tracking-wider">Accès Restreint</AlertTitle>
            <AlertDescription className="text-xs">
              Personnel de gestion autorisé uniquement. Toutes les connexions sont auditées.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Adresse E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  className="pl-9"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Mot de passe</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
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
            <Button type="submit" className="w-full font-semibold gap-2 py-6 text-lg shadow-lg shadow-primary/20" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              S'authentifier
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center pt-0">
          <p className="text-[10px] text-muted-foreground uppercase tracking-widest w-full text-center">
            ImaraPMS Group • Console de Sécurité
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
