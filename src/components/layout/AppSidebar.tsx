
"use client"

import * as React from "react"
import { 
  LayoutDashboard, 
  Bed, 
  CalendarCheck, 
  Users, 
  Receipt, 
  TrendingUp, 
  ShieldCheck,
  Settings,
  Building2
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"

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

const menuItems = [
  { title: "Dashboard", icon: LayoutDashboard, url: "/" },
  { title: "Rooms", icon: Bed, url: "/rooms" },
  { title: "Reservations", icon: CalendarCheck, url: "/reservations" },
  { title: "Clients", icon: Users, url: "/clients" },
  { title: "Billing", icon: Receipt, url: "/billing" },
  { title: "Forecasting", icon: TrendingUp, url: "/forecasting" },
  { title: "Staff", icon: ShieldCheck, url: "/staff" },
]

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="border-r">
      <SidebarHeader className="p-4 flex flex-row items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center text-primary-foreground shadow-sm shadow-primary/20">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="flex flex-col">
          <span className="font-headline font-bold text-xl tracking-tight leading-none text-foreground">Karatasi</span>
          <span className="text-[10px] uppercase font-bold tracking-widest text-primary/80 mt-1">Management</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Operations</SidebarGroupLabel>
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
            <SidebarMenuButton asChild isActive={pathname === "/settings"} tooltip="Settings">
              <Link href="/settings">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
