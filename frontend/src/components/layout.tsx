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

const getNavigation = (t: any) => [
  { name: t("nav.overview"), href: "/dashboard", icon: LayoutDashboard },
  { name: t("nav.inbox"), href: "/dashboard/inbox", icon: MessageCircle },
  { name: t("nav.activities"), href: "/dashboard/activities", icon: History, adminOnly: true },
  { name: t("nav.ai_assistant"), href: "/dashboard/ai", icon: Bot },
  { name: t("nav.auto_responses"), href: "/dashboard/ai/keywords", icon: Zap },
  { name: t("nav.group_management"), href: "/dashboard/moderation", icon: Shield },
  { name: t("nav.credits"), href: "/dashboard/credits", icon: Zap },
  { name: t("nav.users"), href: "/dashboard/users", icon: Users, adminOnly: true },
  { name: t("nav.ai_models"), href: "/dashboard/ai-models", icon: Settings2, adminOnly: true },
]

const getFooterNav = (t: any) => [
  { name: t("nav.billing"), href: "/dashboard/billing", icon: CreditCard },
  { name: t("nav.settings"), href: "/dashboard/profile", icon: Settings },
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
  const navigation = getNavigation(t)
  const footerNav = getFooterNav(t)
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
          <SidebarContent userRole={userRole} pathname={pathname} />
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
                {[...getNavigation(t), ...getFooterNav(t)].find(n => n.href === pathname)?.name || "Tableau de bord"}
              </h2>
            </div>
            <div className="flex items-center gap-2 sm:gap-4">
              <div className="flex items-center bg-muted rounded-md p-0.5 mr-2">
                <button
                  onClick={() => setLocale('fr')}
                  className={cn("px-2 py-0.5 text-[10px] rounded transition-all", locale === 'fr' ? "bg-background shadow-sm font-bold" : "text-muted-foreground")}
                >
                  FR
                </button>
                <button
                  onClick={() => setLocale('en')}
                  className={cn("px-2 py-0.5 text-[10px] rounded transition-all", locale === 'en' ? "bg-background shadow-sm font-bold" : "text-muted-foreground")}
                >
                  EN
                </button>
              </div>
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
