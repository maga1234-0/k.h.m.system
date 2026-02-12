
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs, deleteDoc } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, Eye, EyeOff, LogIn, ShieldAlert } from 'lucide-react';
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
      const normalizedEmail = email.trim().toLowerCase();
      const rawPassword = password.trim();
      let userCredential;

      try {
        // Tentative de connexion normale
        userCredential = await signInWithEmailAndPassword(auth, normalizedEmail, rawPassword);
      } catch (authError: any) {
        // Si l'utilisateur n'existe pas, on cherche s'il a une invitation
        const staffCol = collection(firestore, 'staff');
        const q = query(staffCol, where("email", "==", normalizedEmail));
        const staffSnap = await getDocs(q);

        if (!staffSnap.empty) {
          const staffDoc = staffSnap.docs[0];
          const staffData = staffDoc.data();
          
          // Vérification du code d'accès temporaire (utilisé comme mot de passe initial)
          if (staffData.accessCode && staffData.accessCode !== rawPassword) {
            throw new Error("Code d'accès incorrect.");
          }

          // Création du compte Firebase Auth
          userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, rawPassword);
          const uid = userCredential.user.uid;
          
          // Si c'est un manager, on lui donne les droits admin
          if (staffData.role === 'Manager') {
            await setDoc(doc(firestore, 'roles_admin', uid), {
              id: uid,
              email: normalizedEmail,
              role: 'Administrateur',
              createdAt: new Date().toISOString()
            });
          }

          // On met à jour son profil staff avec son UID réel
          await setDoc(doc(firestore, 'staff', uid), {
            ...staffData,
            id: uid,
            status: "En Service",
            accessCode: "" // On vide le code temporaire
          });

          // Nettoyage de l'invitation temporaire si l'ID était différent
          if (staffDoc.id !== uid) {
            try {
              await deleteDoc(doc(firestore, 'staff', staffDoc.id));
            } catch (err) {
              console.warn("Nettoyage invitation ignoré ou impossible:", err);
            }
          }

          toast({ title: "Bienvenue", description: "Votre compte collaborateur est activé." });
        } else if (normalizedEmail === PRIMARY_ADMIN) {
          // Création du compte admin principal s'il n'existe pas
          userCredential = await createUserWithEmailAndPassword(auth, normalizedEmail, rawPassword);
        } else {
          throw new Error("Identifiants incorrects ou accès non autorisé.");
        }
      }

      const uid = userCredential.user.uid;
      
      // Initialisation forcée des droits si admin principal
      if (normalizedEmail === PRIMARY_ADMIN) {
        const adminRoleRef = doc(firestore, 'roles_admin', uid);
        const adminSnap = await getDoc(adminRoleRef);
        
        if (!adminSnap.exists()) {
          await setDoc(adminRoleRef, {
            id: uid,
            email: normalizedEmail,
            role: 'Administrateur',
            createdAt: new Date().toISOString()
          });

          await setDoc(doc(firestore, 'staff', uid), {
            id: uid,
            firstName: "Principal",
            lastName: "Administrateur",
            email: normalizedEmail,
            role: "Manager",
            status: "En Service",
            createdAt: new Date().toISOString()
          });
        }
      }
      
      router.push('/');
    } catch (error: any) {
      console.error("Login error:", error);
      toast({
        variant: "destructive",
        title: 'Accès Refusé',
        description: error.message || 'Vérifiez vos identifiants ou contactez votre administrateur.',
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
    <div className="flex h-screen w-full items-center justify-center bg-slate-100 dark:bg-slate-950 px-4">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white dark:bg-slate-900">
        <div className="h-2 w-full bg-primary" />
        <CardHeader className="space-y-6 text-center pt-10">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-[2rem] bg-primary/5 border border-primary/10 text-primary">
            <Logo size={60} />
          </div>
          <div className="space-y-1">
            <CardTitle className="font-headline text-3xl font-black tracking-tighter">ImaraPMS</CardTitle>
            <CardDescription className="text-[10px] uppercase tracking-[0.4em] font-black text-primary">Portail Authentifié</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 p-8 pt-0">
          <Alert variant="leafy" className="rounded-2xl border-primary/20 bg-primary/5">
            <ShieldAlert className="h-4 w-4 text-primary" />
            <AlertTitle className="text-[10px] font-black uppercase tracking-widest text-primary">Accès Sécurisé</AlertTitle>
            <AlertDescription className="text-xs font-bold text-primary/80">Identifiez-vous pour accéder à la console de gestion.</AlertDescription>
          </Alert>

          <form onSubmit={handleAuth} className="space-y-5">
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">E-mail Professionnel</Label>
              <Input
                type="email"
                placeholder="nom@hotel.com"
                className="h-14 rounded-xl border-2 border-slate-400 dark:border-slate-600 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 bg-white dark:bg-slate-800 text-base"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[11px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-300 ml-1">Mot de Passe</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-12 h-14 rounded-xl border-2 border-slate-400 dark:border-slate-600 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-slate-900 dark:text-white placeholder:text-slate-400 bg-white dark:bg-slate-800 text-base"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-primary transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full font-black uppercase tracking-widest h-14 rounded-2xl text-[11px] shadow-xl shadow-primary/20 bg-primary text-white hover:bg-primary/90 mt-2 transform active:scale-[0.98] transition-all" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5 mr-2" />}
              Accéder au système
            </Button>
          </form>
        </CardContent>
        <CardFooter className="pb-10 pt-0 flex flex-col items-center gap-2">
           <div className="h-px w-16 bg-slate-200 dark:bg-slate-800 mb-2" />
           <p className="text-[8px] text-muted-foreground uppercase tracking-[0.5em] font-black opacity-60">ImaraPMS • Prestige & Excellence</p>
        </CardFooter>
      </Card>
    </div>
  );
}
