"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useUser, UserButton, useClerk, useAuth } from "@clerk/nextjs"
import { useTheme } from "next-themes"
import {
  LayoutDashboard,
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

const navigation = [
  { name: "Vue d'ensemble", href: "/dashboard", icon: LayoutDashboard },
  { name: "Activités", href: "/dashboard/activities", icon: History, adminOnly: true },
  { name: "Assistant IA", href: "/dashboard/ai", icon: Bot },
  { name: "Gestion des Groupes", href: "/dashboard/moderation", icon: Shield },
  { name: "Crédits", href: "/dashboard/credits", icon: Zap },
  { name: "Utilisateurs", href: "/dashboard/users", icon: Users, adminOnly: true },
  { name: "Modèles IA", href: "/dashboard/ai-models", icon: Settings2, adminOnly: true },
]

const footerNav = [
  { name: "Facturation", href: "/dashboard/billing", icon: CreditCard },
  { name: "Paramètres", href: "/dashboard/profile", icon: Settings },
]

function NavItem({ item, isActive, onClick }: { item: any, isActive: boolean, onClick?: () => void }) {
  const Icon = item?.icon
  if (!item || !Icon) return null

  return (
    <Link
      href={item.href || "#"}
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

function SidebarContent({ userRole, pathname, onItemClick }: { userRole: string, pathname: string, onItemClick?: () => void }) {
  const filteredNav = navigation.filter(item => !item.adminOnly || userRole === 'admin')
  return (
    <div className="flex flex-col h-full bg-card">
      <div className="p-6"><Logo orientation="horizontal" size={24} showText /></div>
      <ScrollArea className="flex-1 px-3">
        <nav className="space-y-1">
          {filteredNav.map((item) => (
            <NavItem key={item.href || Math.random()} item={item} isActive={pathname === item.href} onClick={onItemClick} />
          ))}
        </nav>
      </ScrollArea>
      <div className="p-3 border-t border-border">
        <nav className="space-y-1">
          {footerNav.map((item) => (
            <NavItem key={item.href || Math.random()} item={item} isActive={pathname === item.href} onClick={onItemClick} />
          ))}
        </nav>
      </div>
    </div>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useAuth()
  const { theme, setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

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
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Sidebar */}
        <aside className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r border-border flex flex-col",
          "transform transition-transform duration-200 ease-in-out",
          "lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}>
          <SidebarContent userRole={userRole} pathname={pathname} onItemClick={() => setSidebarOpen(false)} />

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
                <DropdownMenuItem onClick={() => signOut(() => router.push("/login"))} className="text-destructive"><LogOut className="h-4 w-4 mr-2" /> Déconnexion</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Overlay mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Topbar */}
          <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-background/50 backdrop-blur-md sticky top-0 z-20">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
                <Menu className="h-5 w-5" />
              </Button>
              <h2 className="text-sm font-semibold text-foreground truncate max-w-[120px] sm:max-w-none">
                {[...navigation, ...footerNav].find(n => n.href === pathname)?.name || "Tableau de bord"}
              </h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <LiveIndicator />
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-muted-foreground"
                onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              >
                <Sun className="h-4 w-4 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-4 w-4 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Changer de thème</span>
              </Button>
              <NotificationDropdown />
              <UserButton afterSignOutUrl="/login" />
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
