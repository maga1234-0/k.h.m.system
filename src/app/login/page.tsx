
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, signOut, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
        // Logique de bootstrap pour Admin Principal ou Inscription Personnel par Code d'Accès
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
          
          // Cas 1: Admin Principal
          if (email === PRIMARY_ADMIN) {
             userCredential = await createUserWithEmailAndPassword(auth, email, password);
          } 
          // Cas 2: Personnel avec Code d'Accès
          else {
            const staffCol = collection(firestore, 'staff');
            const q = query(staffCol, where("email", "==", email), where("accessCode", "==", password));
            const staffSnap = await getDocs(q);

            if (!staffSnap.empty) {
              const staffData = staffSnap.docs[0].data();
              // Création du compte Firebase Auth avec le code d'accès comme mot de passe initial
              userCredential = await createUserWithEmailAndPassword(auth, email, password);
              
              const uid = userCredential.user.uid;
              // Si Manager, ajout direct aux rôles admin
              if (staffData.role === 'Manager') {
                await setDoc(doc(firestore, 'roles_admin', uid), {
                  id: uid,
                  email: email,
                  role: 'Administrateur',
                  createdAt: new Date().toISOString()
                });
              }

              // Mise à jour du doc staff avec le UID pour lien futur
              await setDoc(doc(firestore, 'staff', uid), {
                ...staffData,
                id: uid,
                status: "En Service"
              });
              
              toast({ title: "Bienvenue", description: "Votre compte a été initialisé." });
            } else {
              throw new Error("Identifiants incorrects ou compte non pré-autorisé.");
            }
          }
        } else {
          throw authError;
        }
      }

      const uid = userCredential.user.uid;
      const adminRoleRef = doc(firestore, 'roles_admin', uid);
      const adminSnap = await getDoc(adminRoleRef);
      
      // Si l'utilisateur n'est pas admin, on vérifie s'il doit le devenir (cas du bootstrap admin principal)
      if (!adminSnap.exists() && email === PRIMARY_ADMIN) {
        await setDoc(adminRoleRef, {
          id: uid,
          email: email,
          role: 'Administrateur',
          createdAt: new Date().toISOString()
        });

        await setDoc(doc(firestore, 'staff', uid), {
          id: uid,
          firstName: "Principal",
          lastName: "Administrateur",
          email: email,
          role: "Manager",
          status: "En Service",
          createdAt: new Date().toISOString()
        });
      }
      
      router.push('/');
    } catch (error: any) {
      toast({
        title: 'Accès refusé',
        description: error.message || 'Une erreur est survenue lors de la connexion.',
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
    <div className="flex h-screen w-full items-center justify-center bg-[#f8fafc] dark:bg-muted/30 px-4">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white dark:bg-card">
        <div className="h-2 w-full bg-primary" />
        <CardHeader className="space-y-6 text-center pt-10">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2rem] bg-primary/5 border border-primary/10 shadow-xl shadow-primary/5 text-primary">
            <Logo size={80} />
          </div>
          <div className="space-y-2">
            <CardTitle className="font-headline text-4xl font-black tracking-tighter">ImaraPMS</CardTitle>
            <CardDescription className="text-[10px] uppercase tracking-[0.3em] font-black text-primary/70">Console de Gestion Hôtelière</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 p-10 pt-0">
          <Alert variant="leafy" className="border-primary/20 bg-primary/5 rounded-[1.5rem] border-none">
            <ShieldAlert className="h-4 w-4" />
            <AlertTitle className="text-[10px] font-black uppercase tracking-widest">Sécurité Active</AlertTitle>
            <AlertDescription className="text-[11px] font-bold">
              Utilisez votre email et votre code d'accès assigné.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail Professionnel</Label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type="email"
                  placeholder="nom@hotel.com"
                  className="pl-11 h-14 rounded-2xl border-none bg-slate-50 focus:bg-white transition-all font-bold"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mot de Passe / Code</Label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-11 pr-12 h-14 rounded-2xl border-none bg-slate-50 focus:bg-white transition-all font-bold"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full font-black uppercase tracking-widest h-16 rounded-[1.5rem] text-xs shadow-xl shadow-primary/20 gap-3 mt-4 bg-primary" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              S'authentifier
            </Button>
          </form>
        </CardContent>
        <CardFooter className="pb-10 pt-0 flex flex-col items-center gap-2">
           <div className="h-px w-20 bg-slate-100" />
           <p className="text-[8px] text-muted-foreground uppercase tracking-[0.4em] font-black">
            ImaraPMS • Powered by Google Gemini
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
