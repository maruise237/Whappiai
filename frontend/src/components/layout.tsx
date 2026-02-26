"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useUser, UserButton, useClerk, useAuth } from "@clerk/nextjs"
import { useTheme } from "next-themes"
import {
  LayoutDashboard,
  MessageCircle,
  History,
  Bot,
  Shield,
  Zap,
  Users,
  Settings2,
  CreditCard,
  Settings,
  Menu,
  Bell,
  UserCircle,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { WebSocketProvider, useWebSocket } from "@/providers/websocket-provider"
import { Logo } from "@/components/ui/logo"
import { ErrorBoundary } from "@/components/error-boundary"
import { NotificationDropdown } from "@/components/dashboard/notification-dropdown"
import { OnboardingTour } from "@/components/dashboard/onboarding-tour"
import { useI18n } from "@/i18n/i18n-provider"

const getNavGroups = (t: any) => [
  {
    title: "PILOTAGE HUB",
    items: [
      { name: "Tableau de Bord", href: "/dashboard", icon: LayoutDashboard },
      { name: "Messagerie Live", href: "/dashboard/inbox", icon: MessageCircle },
    ]
  },
  {
    title: "CONFIGURATION BOT",
    items: [
      { name: "Intelligence IA", href: "/dashboard/ai", icon: Bot },
      { name: "Gestion Groupes", href: "/dashboard/moderation", icon: Shield },
      { name: "Listes de Diffusion", href: "/dashboard/recipient-lists", icon: Users },
    ]
  },
  {
    title: "ESPACE CLIENT",
    items: [
      { name: "Consommation", href: "/dashboard/credits", icon: Zap },
      { name: "Abonnement", href: "/dashboard/billing", icon: CreditCard },
      { name: "Réglages Profil", href: "/dashboard/profile", icon: Settings },
    ]
  },
  {
    title: "ADMINISTRATION",
    adminOnly: true,
    items: [
      { name: "Journal Activités", href: "/dashboard/activities", icon: History },
      { name: "Utilisateurs", href: "/dashboard/users", icon: Users },
      { name: "Moteurs IA", href: "/dashboard/ai-models", icon: Settings2 },
    ]
  }
]

function NavItem({ item, isActive, onClick }: { item: any, isActive: boolean, onClick?: () => void }) {
  const Icon = item?.icon
  if (!item || !Icon) return null

  const id = item.href ? `nav-${item.href.replace(/\//g, '-')}` : undefined

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

function LiveIndicator() {
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

function SidebarContent({ userRole, pathname, onItemClick, t }: { userRole: string, pathname: string, onItemClick?: () => void, t: any }) {
  const groups = getNavGroups(t)
  const filteredGroups = groups.filter(group => !group.adminOnly || userRole === 'admin')

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
                    isActive={pathname === item.href || pathname.startsWith(item.href + '/')}
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

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t, locale, setLocale } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useAuth()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  const userEmail = user?.primaryEmailAddress?.emailAddress
  const userName = user?.firstName || userEmail?.split("@")[0] || "User"
  let userRole = (user?.publicMetadata?.role as string) || "user"
  if (userEmail?.toLowerCase() === "maruise237@gmail.com") userRole = "admin"

  React.useEffect(() => {
    setMounted(true)
    const checkUserSync = async () => {
      if (!isLoaded || !user) return
      try {
        const token = await getToken()
        await api.auth.check(token || undefined)
      } catch (error: any) {
        if (error.message?.includes("404") || error.message?.includes("not found")) {
          router.push("/register?conversion=true")
        }
      }
    }
    checkUserSync()
  }, [isLoaded, user, getToken, router])

  if (!isLoaded || !mounted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Logo size={40} showText={false} className="animate-pulse" />
      </div>
    )
  }

  return (
    <WebSocketProvider>
      <OnboardingTour />
      <div className="flex h-screen bg-background overflow-hidden">
        <aside className="hidden md:flex w-64 flex-col border-r border-border">
          <SidebarContent userRole={userRole} pathname={pathname} t={t} />
          <div className="p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors text-left outline-none">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.imageUrl} />
                    <AvatarFallback>{userName.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{userName}</p>
                    <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
                  </div>
                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Mon Compte</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}><UserCircle className="h-4 w-4 mr-2" /> Profil</DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard/billing")}><CreditCard className="h-4 w-4 mr-2" /> Facturation</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/login" })} className="text-destructive"><LogOut className="h-4 w-4 mr-2" /> {t("nav.logout")}</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <div className="md:hidden">
                <Sheet open={isMobileMenuOpen} onOpenChange={setIsMobileMenuOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Menu className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="left" className="p-0 w-64">
                    <SidebarContent
                      userRole={userRole}
                      pathname={pathname}
                      onItemClick={() => setIsMobileMenuOpen(false)}
                      t={t}
                    />
                  </SheetContent>
                </Sheet>
              </div>
              <h2 className="text-sm font-semibold text-foreground truncate max-w-[120px] sm:max-w-none">
                {getNavGroups(t).flatMap(g => g.items).find(n => n.href === pathname)?.name || "Tableau de bord"}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <div className="hidden md:flex items-center gap-2 mr-2 border-r pr-2">
                 <LiveIndicator />
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-muted-foreground"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                >
                  {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <NotificationDropdown />
                <div className="pl-1 border-l ml-1">
                   <UserButton afterSignOutUrl="/login" />
                </div>
              </div>
            </div>
          </header>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8 animate-in fade-in duration-500">
              <ErrorBoundary>
                {children}
              </ErrorBoundary>
            </div>
          </main>
        </div>
      </div>
    </WebSocketProvider>
  )
}
