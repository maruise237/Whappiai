"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useAuth, useClerk, useUser } from "@clerk/clerk-react"
import {
  ChevronLeft,
  ChevronRight,
  CreditCard,
  History,
  Inbox,
  LayoutDashboard,
  LifeBuoy,
  LogOut,
  Menu,
  Bot,
  Moon,
  PanelLeftClose,
  PanelLeftOpen,
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
  {
    label: "Support",
    detail: "Aide, retours et suivi",
    href: "/dashboard/support",
    icon: LifeBuoy,
  },
]

const adminNavigation: NavItemConfig[] = [
  {
    label: "Centre admin",
    detail: "Vue d'ensemble, supervision et priorites",
    href: "/dashboard",
    icon: LayoutDashboard,
    adminOnly: true,
  },
  {
    label: "Support",
    detail: "Messages clients et transactions",
    href: "/dashboard/support-inbox",
    icon: Inbox,
    adminOnly: true,
  },
  {
    label: "Activite",
    detail: "Journal systeme et signaux recents",
    href: "/dashboard/activities",
    icon: History,
    adminOnly: true,
  },
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

function isNavItemActive(item: NavItemConfig, pathname: string) {
  if (item.href === "/dashboard") {
    return pathname === "/dashboard"
  }
  return pathname === item.href || pathname.startsWith(`${item.href}/`)
}

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
  collapsed,
  onClick,
}: {
  item: NavItemConfig
  active: boolean
  collapsed?: boolean
  onClick?: () => void
}) {
  const Icon = item.icon
  const id = item.href ? `nav-${item.href.replace(/\//g, "-")}` : undefined

  const content = (
    <Link
      href={item.href}
      id={id}
      onClick={onClick}
      className={cn(
        "group flex items-center rounded-xl text-left transition-all duration-200 active:scale-[0.99]",
        collapsed ? "justify-center px-2 py-3" : "gap-3 px-3 py-3",
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
      {!collapsed ? (
        <>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold leading-4">{item.label}</span>
            <span className={cn("mt-1 block truncate text-[11px]", active ? "text-primary-foreground/75" : "text-muted-foreground")}>
              {item.detail}
            </span>
          </span>
          {active && <ChevronRight className="h-4 w-4 text-primary-foreground/70" />}
        </>
      ) : null}
    </Link>
  )

  if (!collapsed) return content

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{content}</TooltipTrigger>
        <TooltipContent side="right">
          <p className="text-xs font-semibold">{item.label}</p>
          <p className="mt-1 max-w-[180px] text-[11px] text-muted-foreground">{item.detail}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

function DashboardSidebar({
  isAdmin,
  pathname,
  collapsed,
  onToggleCollapse,
  onItemClick,
}: {
  isAdmin: boolean
  pathname: string
  collapsed?: boolean
  onToggleCollapse?: () => void
  onItemClick?: () => void
}) {
  return (
    <div className="flex h-full flex-col bg-card text-card-foreground">
      <div className={cn("border-b border-border", collapsed ? "p-3" : "p-5")}>
        <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between gap-3")}>
          <Logo orientation="horizontal" size={25} showText={!collapsed} />
          {onToggleCollapse ? (
            <Button
              variant="ghost"
              size="icon"
              className="hidden lg:inline-flex"
              onClick={onToggleCollapse}
            >
              {collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
            </Button>
          ) : null}
        </div>
        {!collapsed ? (
          <div className="mt-5 rounded-2xl border border-primary/15 bg-primary/5 p-4">
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">{isAdmin ? "Mode admin" : "Mode co-admin"}</p>
            <p className="mt-2 text-xs leading-5 text-muted-foreground">
              {isAdmin
                ? "Support, paiements, comptes et controle interne sans melange avec l'espace client."
                : "Whappi suit une logique simple : session, groupe, regle, verification."}
            </p>
          </div>
        ) : (
          <div className="mt-4 flex justify-center">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-primary/15 bg-primary/5 text-primary">
                    <ShieldCheck className="h-4 w-4" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right">
                  <p className="text-xs font-semibold">{isAdmin ? "Mode admin" : "Mode co-admin"}</p>
                  <p className="mt-1 max-w-[180px] text-[11px] text-muted-foreground">
                    {isAdmin
                      ? "Pilotage interne reserve a l'administration."
                      : "Session, groupe, regle, verification."}
                  </p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        )}
      </div>

      <ScrollArea className={cn("flex-1 py-4", collapsed ? "px-2" : "px-3")}>
        <div className="space-y-6">
          {!isAdmin && (
            <section className="space-y-2">
              {!collapsed ? <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Principal</p> : null}
              {userNavigation.map(item => (
                <NavigationItem
                  key={item.href}
                  item={item}
                  active={isNavItemActive(item, pathname)}
                  collapsed={collapsed}
                  onClick={onItemClick}
                />
              ))}
            </section>
          )}

          {isAdmin && (
            <section className="space-y-2">
              {!collapsed ? <p className="px-3 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">Admin</p> : null}
              {adminNavigation.map(item => (
                <NavigationItem
                  key={item.href}
                  item={item}
                  active={isNavItemActive(item, pathname)}
                  collapsed={collapsed}
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
  const [desktopCollapsed, setDesktopCollapsed] = React.useState(false)

  const userEmail = user?.primaryEmailAddress?.emailAddress || ""
  const userName = user?.firstName || userEmail.split("@")[0] || "Utilisateur"
  const isAdmin = userEmail === "maruise237@gmail.com" || user?.publicMetadata?.role === "admin"
  const navigation = isAdmin ? adminNavigation : userNavigation
  const forbiddenUserRoutes = ["/dashboard/moderation", "/dashboard/billing", "/dashboard/profile", "/dashboard/support", "/dashboard/credits", "/dashboard/ai"]
  const isAdminHeavyRoute = pathname
    ? adminNavigation.some(item => pathname === item.href || pathname.startsWith(`${item.href}/`))
    : false
  const currentItem = navigation
    .slice()
    .sort((a, b) => b.href.length - a.href.length)
    .find(item => isNavItemActive(item, pathname))

  React.useEffect(() => {
    setMounted(true)
    const savedSidebarState = typeof window !== "undefined" ? window.localStorage.getItem("whappi-dashboard-sidebar-collapsed") : null
    if (savedSidebarState !== null) {
      setDesktopCollapsed(savedSidebarState === "true")
    } else if (isAdminHeavyRoute) {
      setDesktopCollapsed(true)
    }
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
  }, [getToken, isAdminHeavyRoute, isLoaded, router, user])

  React.useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem("whappi-dashboard-sidebar-collapsed", String(desktopCollapsed))
  }, [desktopCollapsed])

  React.useEffect(() => {
    if (!isAdmin || !pathname) return
    if (forbiddenUserRoutes.some(route => pathname === route || pathname.startsWith(`${route}/`))) {
      router.replace("/dashboard")
    }
  }, [isAdmin, pathname, router])

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
          <aside className={cn("hidden shrink-0 border-r border-border transition-[width] duration-200 lg:flex", desktopCollapsed ? "w-[88px]" : "w-[280px]")}>
            <DashboardSidebar
              isAdmin={isAdmin}
              pathname={pathname}
              collapsed={desktopCollapsed}
              onToggleCollapse={() => setDesktopCollapsed(current => !current)}
            />
          </aside>

          <div className="flex min-w-0 flex-1 flex-col">
            <header className="flex h-14 items-center justify-between border-b border-border bg-background/90 px-2.5 backdrop-blur-xl sm:h-16 sm:px-6">
              <div className="flex min-w-0 items-center gap-2 sm:gap-3">
                <div className="lg:hidden">
                  <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
                    <SheetTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Menu className="h-5 w-5" />
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="left" className="w-[min(290px,calc(100vw-24px))] border-border bg-card p-0">
                      <DashboardSidebar
                        isAdmin={isAdmin}
                        pathname={pathname}
                        collapsed={false}
                        onItemClick={() => setMobileOpen(false)}
                      />
                    </SheetContent>
                  </Sheet>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="hidden lg:inline-flex"
                      onClick={() => setDesktopCollapsed(current => !current)}
                    >
                      {desktopCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                    </Button>
                    <p className="truncate text-sm font-semibold text-foreground">{currentItem?.label || "Centre"}</p>
                  </div>
                  <p className="hidden text-[11px] text-muted-foreground sm:block">{currentItem?.detail || "Dashboard Whappi"}</p>
                </div>
              </div>

              <div className="flex items-center gap-1 sm:gap-2">
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
                    <button className="ml-0.5 flex items-center gap-2 rounded-full border border-border bg-card p-1 pr-1.5 text-left transition hover:bg-muted sm:ml-1 sm:pr-2">
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
                    <DropdownMenuLabel className="text-[10px] uppercase tracking-widest">{isAdmin ? "Administration" : "Compte"}</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    {isAdmin ? (
                      <>
                        <DropdownMenuItem onClick={() => router.push("/dashboard")}>
                          <LayoutDashboard className="mr-2 h-4 w-4" /> Centre admin
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push("/dashboard/support-inbox")}>
                          <Inbox className="mr-2 h-4 w-4" /> Support
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push("/dashboard/users")}>
                          <Users className="mr-2 h-4 w-4" /> Utilisateurs
                        </DropdownMenuItem>
                      </>
                    ) : (
                      <>
                        <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
                          <UserCircle className="mr-2 h-4 w-4" /> Profil
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push("/dashboard/billing")}>
                          <CreditCard className="mr-2 h-4 w-4" /> Forfaits
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => router.push("/dashboard/support")}>
                          <LifeBuoy className="mr-2 h-4 w-4" /> Support
                        </DropdownMenuItem>
                      </>
                    )}
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/login" })} className="text-destructive">
                      <LogOut className="mr-2 h-4 w-4" /> Deconnexion
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </header>

            <main className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto bg-[radial-gradient(circle_at_top_right,hsl(var(--primary)/0.12),transparent_32%),hsl(var(--background))]">
              <div className="mx-auto w-full min-w-0 max-w-[1480px] p-4 sm:p-6 lg:p-8">
                <ErrorBoundary><MaintenanceProvider>{children}</MaintenanceProvider></ErrorBoundary>
              </div>
            </main>
          </div>
        </div>
          {/* Wappy mascot */}
          <WappyMascotWrapper isAdmin={isAdmin} />
        </WappyProvider>
    </WebSocketProvider>
  )
}

function WappyMascotWrapper({ isAdmin }: { isAdmin: boolean }) {
  const { state, setState } = useWappy()
  const [mounted, setMounted] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)
  const [scrollY, setScrollY] = React.useState(0)
  const [reducedMotion, setReducedMotion] = React.useState(false)
  const lastClick = React.useRef(0)

  React.useEffect(() => {
    setMounted(true)

    const onResize = () => setIsMobile(window.innerWidth < 768)
    const onScroll = () => setScrollY(window.scrollY)
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onMotionChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)

    setReducedMotion(motionQuery.matches)
    onResize()
    onScroll()

    window.addEventListener("resize", onResize)
    window.addEventListener("scroll", onScroll, { passive: true })
    motionQuery.addEventListener("change", onMotionChange)
    return () => {
      window.removeEventListener("resize", onResize)
      window.removeEventListener("scroll", onScroll)
      motionQuery.removeEventListener("change", onMotionChange)
    }
  }, [])

  // Wave on click/double-tap
  const handleClick = React.useCallback(() => {
    const now = Date.now()
    if (now - lastClick.current < 400) {
      // Double-click -> surprised
      setState("surprised", 2500)
    } else {
      // Single click -> wave
      setState("waving", 3000)
    }
    lastClick.current = now
  }, [setState])

  if (!mounted || isAdmin) return null

  // Taille responsive optimisée SaaS (recherche web juin 2026)
  const baseSize = isMobile ? 56 : 150
  const scrollOpacity = Math.max(0.3, 1 - scrollY / 600)

  return (
    <WappyMascot
      state={state}
      size={baseSize}
      onClick={handleClick}
      reducedMotion={reducedMotion}
      style={{ opacity: scrollOpacity }}
      className={cn(
        "fixed z-50 pointer-events-auto transition-opacity duration-300",
        "bottom-3 right-3",
        "md:bottom-6 md:right-6",
        reducedMotion && "motion-reduce"
      )}
    />
  )
}
