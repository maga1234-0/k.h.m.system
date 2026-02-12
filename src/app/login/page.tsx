
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, useUser, useFirestore } from '@/firebase';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
      let userCredential;
      
      try {
        // Tentative de connexion standard avec Firebase Auth
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password.trim());
      } catch (authError: any) {
        // Si l'utilisateur n'existe pas encore dans Auth, on vérifie s'il est dans notre collection staff (invité)
        if (authError.code === 'auth/user-not-found' || authError.code === 'auth/invalid-credential') {
          
          // Cas spécial : Admin principal bootstrap
          if (email.trim() === PRIMARY_ADMIN) {
             userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
          } 
          else {
            // Vérification dans le registre du personnel (Invitation/Enregistrement manuel par admin)
            const staffCol = collection(firestore, 'staff');
            const q = query(staffCol, where("email", "==", email.trim()), where("accessCode", "==", password.trim()));
            const staffSnap = await getDocs(q);

            if (!staffSnap.empty) {
              const staffData = staffSnap.docs[0].data();
              const staffDocId = staffSnap.docs[0].id;
              
              // Création du compte Firebase Auth réel pour cet utilisateur
              userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password.trim());
              const uid = userCredential.user.uid;
              
              // Si le rôle est Manager, octroyer l'accès total automatique
              if (staffData.role === 'Manager') {
                await setDoc(doc(firestore, 'roles_admin', uid), {
                  id: uid,
                  email: email.trim(),
                  role: 'Administrateur',
                  createdAt: new Date().toISOString()
                });
              }

              // Mettre à jour le document staff avec l'UID réel de Firebase Auth
              await setDoc(doc(firestore, 'staff', uid), {
                ...staffData,
                id: uid,
                status: "En Service"
              });

              // On pourrait supprimer l'ancien document si l'ID était différent, mais ici on synchronise
              toast({ title: "Bienvenue", description: "Votre accès collaborateur a été configuré." });
            } else {
              throw new Error("Identifiants incorrects ou accès non encore autorisé par la direction.");
            }
          }
        } else {
          throw authError;
        }
      }

      // Vérification et enregistrement final pour l'administrateur principal
      const uid = userCredential.user.uid;
      if (email.trim() === PRIMARY_ADMIN) {
        const adminRoleRef = doc(firestore, 'roles_admin', uid);
        const adminSnap = await getDoc(adminRoleRef);
        
        if (!adminSnap.exists()) {
          await setDoc(adminRoleRef, {
            id: uid,
            email: email.trim(),
            role: 'Administrateur',
            createdAt: new Date().toISOString()
          });

          await setDoc(doc(firestore, 'staff', uid), {
            id: uid,
            firstName: "Principal",
            lastName: "Administrateur",
            email: email.trim(),
            role: "Manager",
            status: "En Service",
            createdAt: new Date().toISOString()
          });
        }
      }
      
      router.push('/');
    } catch (error: any) {
      toast({
        title: 'Accès refusé',
        description: error.message || 'Identifiants invalides.',
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
    <div className="flex h-screen w-full items-center justify-center bg-[#f1f5f9] dark:bg-[#020617] px-4">
      <Card className="w-full max-w-md border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white dark:bg-[#0f172a]">
        <div className="h-3 w-full bg-primary" />
        <CardHeader className="space-y-6 text-center pt-12">
          <div className="mx-auto flex h-24 w-24 items-center justify-center rounded-[2.5rem] bg-primary/5 border border-primary/10 text-primary shadow-inner">
            <Logo size={70} />
          </div>
          <div className="space-y-2">
            <CardTitle className="font-headline text-4xl font-black tracking-tighter">ImaraPMS</CardTitle>
            <CardDescription className="text-[10px] uppercase tracking-[0.4em] font-black text-primary/80">Accès Collaborateurs</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-8 p-10 pt-0">
          <Alert variant="leafy" className="border-primary/20 bg-primary/5 rounded-[1.5rem] py-4">
            <ShieldAlert className="h-5 w-5" />
            <AlertTitle className="text-[10px] font-black uppercase tracking-widest mb-1">Authentification Sécurisée</AlertTitle>
            <AlertDescription className="text-[11px] font-bold">
              Identifiez-vous pour accéder à la console de gestion.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleAuth} className="space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">E-mail Professionnel</Label>
              <Input
                type="email"
                placeholder="nom@hotel.com"
                className="h-14 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-base px-6"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Mot de Passe</Label>
              <div className="relative">
                <Input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pr-14 h-14 rounded-2xl border-2 border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all font-bold text-base px-6"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="absolute right-5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>
            </div>
            <Button type="submit" className="w-full font-black uppercase tracking-widest h-16 rounded-[1.8rem] text-xs shadow-xl shadow-primary/25 gap-3 mt-4 bg-primary text-white hover:bg-primary/90 transition-transform active:scale-95" disabled={isLoading}>
              {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              Se Connecter
            </Button>
          </form>
        </CardContent>
        <CardFooter className="pb-12 pt-0 flex flex-col items-center gap-2">
           <div className="h-px w-24 bg-slate-100 dark:bg-slate-800 mb-4" />
           <p className="text-[9px] text-muted-foreground uppercase tracking-[0.5em] font-black opacity-60">
            Prestige & Excellence
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
