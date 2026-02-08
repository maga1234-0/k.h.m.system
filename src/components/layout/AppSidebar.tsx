
'use client';

import * as React from "react"
import { 
  LayoutDashboard, 
  Bed, 
  CalendarCheck, 
  Users, 
  Receipt, 
  ShieldCheck,
  Settings,
  Hotel,
  LogOut,
  User,
  Sun,
  Moon,
  Monitor
} from "lucide-react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase"
import { signOut } from "firebase/auth"
import { useTheme } from "next-themes"
import { doc } from "firebase/firestore"

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar"
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger 
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

const menuItems = [
  { title: "Tableau de bord", icon: LayoutDashboard, url: "/" },
  { title: "Chambres", icon: Bed, url: "/rooms" },
  { title: "Réservations", icon: CalendarCheck, url: "/reservations" },
  { title: "Registre Clients", icon: Users, url: "/clients" },
  { title: "Facturation", icon: Receipt, url: "/billing" },
  { title: "Personnel", icon: ShieldCheck, url: "/staff" },
]

export function AppSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const auth = useAuth()
  const { user } = useUser()
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  const firestore = useFirestore()
  const staffProfileRef = useMemoFirebase(() => user ? doc(firestore, 'staff', user.uid) : null, [firestore, user]);
  const { data: staffProfile } = useDoc(staffProfileRef);

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut(auth)
      router.push('/login')
    } catch (error) {
      console.error("Sign out failed", error)
    }
  }

  const getInitials = () => {
    if (staffProfile?.firstName && staffProfile?.lastName) {
      return `${staffProfile.firstName[0]}${staffProfile.lastName[0]}`.toUpperCase();
    }
    if (user?.email) return user.email[0].toUpperCase();
    return "AD";
  };

  const displayName = staffProfile 
    ? `${staffProfile.firstName} ${staffProfile.lastName}`
    : (user?.displayName || 'Administrateur');

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4 flex flex-row items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/20">
          <Hotel className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-headline font-bold text-xl tracking-tight leading-none text-foreground">K.H.M.System</span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary/80 mt-1">Gestion Hôtelière</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Opérations</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url} tooltip={item.title}>
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="p-4 border-t bg-muted/5">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild isActive={pathname === "/settings"} tooltip="Paramètres">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Paramètres</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>

          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton tooltip="Changer l'apparence">
                  <div className="flex items-center gap-2">
                    <div className="flex h-5 w-5 items-center justify-center rounded-md border bg-background">
                      {mounted && (
                        <>
                          {theme === 'dark' ? <Moon className="h-3 w-3" /> : theme === 'light' ? <Sun className="h-3 w-3" /> : <Monitor className="h-3 w-3" />}
                        </>
                      )}
                      {!mounted && <Monitor className="h-3 w-3" />}
                    </div>
                    <span>Apparence</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-32">
                <DropdownMenuItem onClick={() => setTheme("light")} className="gap-2">
                  <Sun className="h-4 w-4 text-amber-500" /> Clair
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("dark")} className="gap-2">
                  <Moon className="h-4 w-4 text-blue-400" /> Sombre
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTheme("system")} className="gap-2">
                  <Monitor className="h-4 w-4 text-muted-foreground" /> Système
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
          
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton size="lg" className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground">
                  <Avatar className="h-8 w-8 rounded-lg">
                    <AvatarFallback className="rounded-lg">{getInitials()}</AvatarFallback>
                  </Avatar>
                  <div className="grid flex-1 text-left text-sm leading-tight">
                    <span className="truncate font-semibold">{displayName}</span>
                    <span className="truncate text-xs">{user?.email}</span>
                  </div>
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-[--radix-dropdown-menu-trigger-width] min-w-56 rounded-lg" side="bottom" align="end" sideOffset={4}>
                <DropdownMenuItem asChild className="gap-2">
                  <Link href="/settings?tab=account">
                    <User className="h-4 w-4" /> Profil & Compte
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} className="gap-2 text-destructive focus:text-destructive">
                  <LogOut className="h-4 w-4" /> Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
