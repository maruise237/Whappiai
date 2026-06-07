"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, useClerk, useUser } from "@clerk/clerk-react"
import {
  ChevronRight,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Menu,
  Bot,
  Moon,
  ShieldCheck,
  Sun,
  UserCircle,
  Users,
  Wrench,
} from "lucide-react"
import { useTheme } from "next-themes"

import { ErrorBoundary } from "@/components/error-boundary"
import { NotificationDropdown } from "@/components/dashboard/notification-dropdown"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Logo } from "@/components/ui/logo"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { api } from "@/lib/api"
import { cn } from "@/lib/utils"
import { WebSocketProvider, useWebSocket } from "@/providers/websocket-provider"
import { MaintenanceProvider } from "@/providers/maintenance-provider"
import { WappyProvider, useWappy } from "@/providers/wappy-provider"
import WappyMascot from "@/components/dashboard/WappyMascot"
import { WappyConnector } from "@/components/dashboard/WappyConnector"
import { LanguageSwitcher } from "@/components/LanguageSwitcher"

type NavItemConfig = {
  label: string
  detail: string
  href: string
  icon: React.ComponentType<{ className?: string }>
  adminOnly?: boolean
}

const userNavigation: NavItemConfig[] = [
  {
    label: "Centre",
    detail: "Prise en main et sessions",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Groupes",
    detail: "Anti-liens, accueil, avertissements",
    href: "/dashboard/moderation",
    icon: ShieldCheck,
  },
  {
    label: "Forfaits",
    detail: "Sessions, groupes et paiement",
    href: "/dashboard/billing",
    icon: CreditCard,
  },
]

const adminNavigation: NavItemConfig[] = [
  {
    label: "Modèles IA",
    detail: "Providers, modèles, clés API",
    href: "/dashboard/ai-models",
    icon: Bot,
    adminOnly: true,
  },
  {
    label: "Utilisateurs",
    detail: "Comptes et forfaits",
    href: "/dashboard/users",
    icon: Users,
    adminOnly: true,
  },
  {
    label: "Maintenance",
    detail: "Page de maintenance du dashboard",
    href: "/dashboard/maintenance",
    icon: Wrench,
    adminOnly: true,
  },
]

function LiveIndicator() {
  const { isConnected } = useWebSocket()

  if (!isConnected) {
    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="inline-flex cursor-help items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-medium text-amber-700">
              <span className="h-2 w-2 animate-pulse rounded-full bg-amber-400" />
              Connexion en attente
            </div>
          </TooltipTrigger>
          <TooltipContent className="max-w-[240px] text-center">
            <p>Si votre forfait a expire, renouvelez pour retablir la connexion WhatsApp.</p>
            <Link href="/dashboard/billing" className="mt-1 block text-xs font-medium text-primary underline underline-offset-2">
              Voir les forfaits
            </Link>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1 text-[11px] font-medium text-muted-foreground">
      <span className="h-2 w-2 rounded-full bg-primary" />
      Temps reel
    </div>
  )
}

function NavigationItem({
  item,
  active,
  onClick,
}: {
  item: NavItemConfig
  active: boolean
  onClick?: () => void
}) {
  const Icon = item.icon
  const id = item.href ? `nav-${item.href.replace(/\//g, "-")}` : undefined

  return (
    <Link
      href={item.href}
      id={id}
      onClick={onClick}
      className={cn(
        "group flex items-center gap-3 rounded-xl px-3 py-3 text-left transition-all duration-200 active:scale-[0.99]",
        active
          ? "bg-primary text-primary-foreground shadow-[0_18px_40px_-24px_hsl(var(--primary))]"
          : "text-muted-foreground hover:bg-muted hover:text-foreground"
      )}
    >
      <span
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border transition-colors",
          active ? "border-primary-foreground/20 bg-primary-foreground/15" : "border-border bg-background"
        )}
      >
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold leading-4">{item.label}</span>
        <span className={cn("mt-1 block truncate text-[11px]", active ? "text-primary-foreground/75" : "text-muted-foreground")}>
          {item.detail}
        </span>
      </span>
      {active && <ChevronRight className="h-4 w-4 text-primary-foreground/70" />}
    </Link>
  )
}

function DashboardSidebar({
  isAdmin,
  pathname,
  onItemClick,
}: {
  isAdmin: boolean
  pathname: string
  onItemClick?: () => void
}) {
  return (
    <div className="flex h-full flex-col bg-card text-card-foreground">
      <div className="border-b border-border p-5">
        <Logo orientation="horizontal" size={25} showText />
        <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">Mode co-admin</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">
            Whappi suit une logique simple : session, groupe, regle, verification.
          </p>
        </div>
      </div>

      <ScrollArea className="flex-1 px-3 py-4">
        <div className="space-y-6">
          <section className="space-y-2">
            <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Principal</p>
            {userNavigation.map(item => (
              <NavigationItem
                key={item.href}
                item={item}
                active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                onClick={onItemClick}
              />
            ))}
          </section>

          {isAdmin && (
            <section className="space-y-2 border-t border-border pt-5">
              <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin</p>
              {adminNavigation.map(item => (
                <NavigationItem
                  key={item.href}
                  item={item}
                  active={pathname === item.href || pathname.startsWith(`${item.href}/`)}
                  onClick={onItemClick}
                />
              ))}
            </section>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useAuth()
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)

  const userEmail = user?.primaryEmailAddress?.emailAddress || ""
  const userName = user?.firstName || userEmail.split("@")[0] || "Utilisateur"
  const isAdmin = userEmail === "maruise237@gmail.com" || user?.publicMetadata?.role === "admin"
  const navigation = isAdmin ? [...userNavigation, ...adminNavigation] : userNavigation
  const currentItem = navigation
    .slice()
    .sort((a, b) => b.href.length - a.href.length)
    .find(item => pathname === item.href || pathname.startsWith(`${item.href}/`))

  React.useEffect(() => {
    setMounted(true)
    const checkUserSync = async () => {
      if (!isLoaded || !user) return
      try {
        const token = await getToken()
        await api.auth.check(token || undefined)
      } catch (error) {
        const message = error instanceof Error ? error.message : ""
        if (message.includes("404") || message.includes("not found")) {
          router.push("/register?conversion=true")
        }
      }
    }
    checkUserSync()
  }, [getToken, isLoaded, router, user])

  // Auth guard: redirect to login if not authenticated
  if (!isLoaded || !mounted) {
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0d0d0c]">
        <Logo size={40} showText={false} className="animate-pulse" />
      </div>
    )
  }

  if (!user) {
    router.push("/login")
    return (
      <div className="flex min-h-[100dvh] items-center justify-center bg-[#0d0d0c]">
        <Logo size={40} showText={false} className="animate-pulse" />
      </div>
    )
  }

  return (
    <WebSocketProvider>
        <WappyProvider>
          <WappyConnector />
          <div className="flex h-[100dvh] overflow-hidden bg-background text-foreground">
          <aside className="hidden w-[280px] shrink-0 border-r border-border lg:flex">
            <DashboardSidebar isAdmin={isAdmin} pathname={pathname} />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-16 items-center justify-between border-b border-border bg-background/90 px-4 backdrop-blur-xl sm:px-6">
              <div className="flex min-w-0 items-center gap-3">
                <div className="lg:hidden">
                  <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[290px] border-border bg-card p-0">
                      <DashboardSidebar
                        isAdmin={isAdmin}
                        pathname={pathname}
                        onItemClick={() => setMobileOpen(false)}
                      />
                    </SheetContent>
                  </Sheet>
                </div>

                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{currentItem?.label || "Centre"}</p>
                  <p className="hidden text-[11px] text-muted-foreground sm:block">{currentItem?.detail || "Dashboard Whappi"}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <div className="hidden sm:block">
                  <LiveIndicator />
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-muted-foreground hover:bg-muted hover:text-foreground"
                  onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
                >
                  {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                </Button>
                <LanguageSwitcher />
                <NotificationDropdown />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="ml-1 flex items-center gap-2 rounded-full border border-border bg-card p-1 pr-2 text-left transition hover:bg-muted">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={user?.imageUrl} />
                        <AvatarFallback className="bg-primary/15 text-xs text-primary">
                          {userName.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="hidden max-w-[110px] truncate text-xs font-medium text-foreground sm:block">{userName}</span>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest">Compte</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
                      <UserCircle className="mr-2 h-4 w-4" /> Profil
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => router.push("/dashboard/billing")}>
                      <CreditCard className="mr-2 h-4 w-4" /> Forfaits
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/login" })} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" /> Deconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            <main className="min-h-0 flex-1 overflow-y-auto overflow-x-hidden bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_32%),hsl(var(--background))]">
              <div className="mx-auto max-w-[1480px] p-4 sm:p-6 lg:p-8">
                <ErrorBoundary><MaintenanceProvider>{children}</MaintenanceProvider></ErrorBoundary>
              </div>
            </main>
          </div>
        </div>
          {/* Wappy mascot */}
          <WappyMascotWrapper />
        </WappyProvider>
    </WebSocketProvider>
  )
}

function WappyMascotWrapper() {
  const { state } = useWappy()
  const [mounted, setMounted] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)
  const [scrollY, setScrollY] = React.useState(0)

  React.useEffect(() => {
    setMounted(true)
    const onResize = () => setIsMobile(window.innerWidth < 768)
    const onScroll = () => setScrollY(window.scrollY)
    onResize()
    onScroll()
    window.addEventListener("resize", onResize)
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", onScroll)
    }
  }, [])

  if (!mounted) return null

  const baseSize = isMobile ? 100 : 140
  const scrollOpacity = Math.max(0.3, 1 - scrollY / 600)

  return (
    <WappyMascot
      state={state}
      size={baseSize}
      style={{ opacity: scrollOpacity }}
      className="fixed bottom-5 right-5 z-50 pointer-events-auto transition-opacity duration-300"
    />
  )
}
