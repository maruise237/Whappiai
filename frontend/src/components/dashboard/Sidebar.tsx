"use client"

import * as React from "react"
import Link from "next/link"
import {
  LayoutDashboard,
  Bot,
  Shield,
  Zap,
  CreditCard,
  Settings,
  History,
  Users,
  Settings2
} from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Logo } from "@/components/ui/logo"
import { useWebSocket } from "@/providers/websocket-provider"
import { cn } from "@/lib/utils"

export const getNavGroups = (t: any) => [
  {
    title: t("nav.hubs.pilotage") || "PILOTAGE HUB",
    items: [
      { name: t("nav.overview"), href: "/dashboard", icon: LayoutDashboard },
    ]
  },
  {
    title: t("nav.hubs.config") || "CONFIGURATION BOT",
    items: [
      { name: t("nav.ai_assistant"), href: "/dashboard/ai", icon: Bot },
      { name: t("nav.group_management"), href: "/dashboard/moderation", icon: Shield },
    ]
  },
  {
    title: t("nav.hubs.client") || "ESPACE CLIENT",
    items: [
      { name: t("nav.credits"), href: "/dashboard/credits", icon: Zap },
      { name: t("nav.billing"), href: "/dashboard/billing", icon: CreditCard },
      { name: t("nav.settings"), href: "/dashboard/profile", icon: Settings },
    ]
  },
  {
    title: t("nav.hubs.admin") || "ADMINISTRATION",
    adminOnly: true,
    items: [
      { name: t("nav.activities"), href: "/dashboard/activities", icon: History },
      { name: t("nav.users"), href: "/dashboard/users", icon: Users },
      { name: t("nav.ai_models"), href: "/dashboard/ai-models", icon: Settings2 },
    ]
  }
]

export function NavItem({ item, isActive, onClick }: { item: any, isActive: boolean, onClick?: () => void }) {
  const Icon = item?.icon
  if (!item || !Icon) return null

  const id = item.href ? `nav-${item.href.replace(/\//g, "-")}` : undefined

  return (
    <Link
      href={item.href || "#"}
      id={id}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors",
        isActive
          ? "bg-muted text-foreground"
          : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
      )}
    >
      <Icon className={cn("h-4 w-4", isActive ? "text-primary" : "text-muted-foreground")} />
      {item.name}
    </Link>
  )
}

export function LiveIndicator() {
  const { isConnected } = useWebSocket()
  if (!isConnected) return null
  return (
    <div className="flex items-center gap-2 px-2 py-1 rounded-full bg-primary/5 border border-primary/10">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-primary" />
      </span>
      <span className="text-[10px] font-medium text-primary uppercase tracking-wider">Live</span>
    </div>
  )
}

export function SidebarContent({ isAdmin, pathname, onItemClick, t }: { isAdmin: boolean, pathname: string, onItemClick?: () => void, t: any }) {
  const groups = getNavGroups(t)
  const filteredGroups = groups.filter(group => !group.adminOnly || isAdmin)

  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-6"><Logo orientation="horizontal" size={24} showText /></div>
      <ScrollArea className="flex-1 px-3">
        <div className="space-y-6 pb-6">
          {filteredGroups.map((group, i) => (
            <div key={i} className="space-y-2">
              <h3 className="px-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground/60">
                {group.title}
              </h3>
              <nav className="space-y-1">
                {group.items.map((item) => (
                  <NavItem
                    key={item.href || Math.random()}
                    item={item}
                    isActive={pathname === item.href || pathname.startsWith(item.href + "/")}
                    onClick={onItemClick}
                  />
                ))}
              </nav>
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  )
}
