
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
  Hotel
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
      <SidebarHeader className="p-4 flex flex-row items-center gap-2">
        <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
          <Hotel className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-headline font-bold text-lg leading-none">Karatasi</span>
          <span className="text-xs text-muted-foreground">Hotelier</span>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Management</SidebarGroupLabel>
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
      <SidebarFooter className="p-4 border-t">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton tooltip="Settings">
              <Settings className="h-4 w-4" />
              <span>Settings</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  )
}
