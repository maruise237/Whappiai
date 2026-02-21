"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useUser, SignOutButton, UserButton, useClerk, useAuth } from "@clerk/nextjs"
import {
  MessageSquare,
  LayoutDashboard,
  Users,
  History,
  FileText,
  LogOut,
  Menu,
  Moon,
  Sun,
  Zap,
  Megaphone,
  Shield,
  Bot,
  UserCircle,
  Search,
  Bell,
  Settings,
  Settings2,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Sparkles,
  CreditCard,
  BarChart3,
  Globe,
  Inbox,
  CircleDot,
  BookOpen,
  ExternalLink,
  SlidersHorizontal,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Input } from "@/components/ui/input"
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
import { WebSocketProvider } from "@/providers/websocket-provider"
import { Logo } from "@/components/ui/logo"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// Navigation structure inspired by the reference screenshots
const conversationsNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Activités", href: "/dashboard/activities", icon: History, adminOnly: true },
]

const menuNavigation = [
  { name: "Assistant IA", href: "/dashboard/ai", icon: Bot },
  { name: "Modération", href: "/dashboard/moderation", icon: Shield },
  { name: "Utilisateurs", href: "/dashboard/users", icon: Users, adminOnly: true },
  { name: "Config IA", href: "/dashboard/ai-models", icon: Settings2, adminOnly: true },
]

const bottomNavigation = [
  { name: "Abonnement", href: "/dashboard/billing", icon: CreditCard },
  { name: "Paramètres", href: "/dashboard/profile", icon: Settings },
  { name: "API Docs", href: "/docs", icon: FileText },
]

// ——————————————————————————————
// NavItem Component
// ——————————————————————————————
function NavItem({
  item,
  isActive,
  collapsed = false,
}: {
  item: { name: string; href: string; icon: React.ElementType }
  isActive: boolean
  collapsed?: boolean
}) {
  const Icon = item.icon
  return (
    <Link href={item.href} prefetch={false} className="block">
      <TooltipProvider delayDuration={300}>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={cn(
                "flex items-center gap-3 px-3 h-9 rounded-lg text-sm font-medium transition-all duration-150 cursor-pointer group/nav select-none",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <Icon
                className={cn(
                  "w-4 h-4 shrink-0 transition-transform duration-150 group-hover/nav:scale-105",
                  isActive ? "text-primary-foreground" : "text-muted-foreground group-hover/nav:text-foreground"
                )}
              />
              {!collapsed && <span className="truncate">{item.name}</span>}
            </div>
          </TooltipTrigger>
          {collapsed && (
            <TooltipContent side="right">
              <p className="text-xs font-medium">{item.name}</p>
            </TooltipContent>
          )}
        </Tooltip>
      </TooltipProvider>
    </Link>
  )
}

// ——————————————————————————————
// Sidebar Nav Section
// ——————————————————————————————
function SidebarSection({
  label,
  items,
  pathname,
  collapsed = false,
}: {
  label: string
  items: { name: string; href: string; icon: React.ElementType; adminOnly?: boolean }[]
  pathname: string
  collapsed?: boolean
}) {
  return (
    <div className="space-y-0.5">
      {!collapsed && (
        <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-[0.08em] text-muted-foreground/60">
          {label}
        </p>
      )}
      {items.map((item) => (
        <NavItem key={item.href} item={item} isActive={pathname === item.href} collapsed={collapsed} />
      ))}
    </div>
  )
}

// ——————————————————————————————
// Upgrade Card
// ——————————————————————————————
function UpgradeCard() {
  return (
    <div className="mx-2 mb-3 rounded-xl border border-border bg-card p-4 space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold text-foreground">Upgrade</p>
        <p className="text-[11px] leading-relaxed text-muted-foreground">
          Unlock all features and get unlimited access to our app.
        </p>
      </div>
      <Button
        size="sm"
        className="w-full h-8 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90 text-primary-foreground transition-colors duration-150"
        asChild
      >
        <Link href="/dashboard/billing">Upgrade</Link>
      </Button>
    </div>
  )
}

// ——————————————————————————————
// Theme Toggle Button
// ——————————————————————————————
function ThemeToggle({ isDark, onToggle }: { isDark: boolean; onToggle: () => void }) {
  return (
    <button
      onClick={onToggle}
      className="h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150"
      aria-label="Toggle theme"
    >
      {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  )
}

// ——————————————————————————————
// Main Dashboard Layout
// ——————————————————————————————
export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useAuth()
  const [isDarkMode, setIsDarkMode] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  const userEmail = user?.primaryEmailAddress?.emailAddress
  const userName = user?.firstName || userEmail?.split("@")[0] || "Utilisateur"
  let userRole = (user?.publicMetadata?.role as string) || "user"
  if (userEmail?.toLowerCase() === "maruise237@gmail.com") userRole = "admin"

  // — User sync check
  React.useEffect(() => {
    const checkUserSync = async () => {
      if (!isLoaded || !user) return
      try {
        const token = await getToken()
        await api.auth.check(token || undefined)
      } catch (error: any) {
        if (
          error.message &&
          (error.message.includes("404") ||
            error.message.includes("User not found") ||
            error.message.includes("USER_NOT_FOUND_LOCAL"))
        ) {
          router.push("/register?conversion=true")
        }
      }
    }
    checkUserSync()
  }, [isLoaded, user, getToken, router])

  // — Theme init
  React.useEffect(() => {
    setMounted(true)
    const saved = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDark = saved === "dark" || (!saved && prefersDark)
    setIsDarkMode(isDark)
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  const toggleTheme = () => {
    const next = !isDarkMode
    setIsDarkMode(next)
    localStorage.setItem("theme", next ? "dark" : "light")
    document.documentElement.classList.toggle("dark", next)
  }

  const handleLogout = async () => {
    try {
      await signOut(() => {
        sessionStorage.clear()
        router.push("/login")
      })
    } catch {
      router.push("/login")
    }
  }

  // — Filter nav by role
  const filteredConversations = conversationsNavigation.filter(
    (i) => !i.adminOnly || userRole === "admin"
  )
  const filteredMenu = menuNavigation.filter(
    (i) => !i.adminOnly || userRole === "admin"
  )

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background" suppressHydrationWarning>
        <div className="flex flex-col items-center gap-4" suppressHydrationWarning>
          <Logo size={60} showText={false} className="animate-pulse" />
          <div className="h-1 w-32 bg-muted overflow-hidden rounded-full">
            <div className="h-full bg-primary animate-[loading_1.5s_ease-in-out_infinite]" />
          </div>
        </div>
      </div>
    )
  }

  if (!mounted) return null

  // ——————————————————————————————
  // Sidebar Inner Content (shared between desktop & mobile)
  // ——————————————————————————————
  const SidebarContent = ({ mobile = false }: { mobile?: boolean }) => (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className="flex h-14 shrink-0 items-center px-4 border-b border-border gap-3">
        <Avatar className="h-7 w-7 rounded-lg border border-border shrink-0">
          <AvatarFallback className="rounded-lg bg-primary text-primary-foreground text-xs font-bold uppercase">
            {userName.charAt(0)}
          </AvatarFallback>
        </Avatar>
        <span className="text-sm font-semibold text-foreground truncate">{userName}</span>
      </div>

      {/* Search */}
      <div className="px-3 pt-3 pb-2 shrink-0">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
          <Input
            placeholder="Search..."
            className="h-8 pl-8 text-xs rounded-lg bg-muted/60 border-border placeholder:text-muted-foreground/60 focus-visible:ring-1"
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 pointer-events-none">
            <kbd className="flex h-4 w-4 items-center justify-center rounded border border-border bg-muted text-[9px] font-mono text-muted-foreground">
              ⌘
            </kbd>
            <kbd className="flex h-4 w-4 items-center justify-center rounded border border-border bg-muted text-[9px] font-mono text-muted-foreground">
              K
            </kbd>
          </div>
        </div>
      </div>

      {/* Scrollable nav */}
      <ScrollArea className="flex-1 px-2">
        <div className="space-y-4 py-2">
          <SidebarSection label="Conversations" items={filteredConversations} pathname={pathname} />
          <SidebarSection label="Menu" items={filteredMenu} pathname={pathname} />
        </div>
      </ScrollArea>

      {/* Upgrade card */}
      {userRole !== "admin" && <UpgradeCard />}

      {/* Footer links */}
      <div className="px-3 py-2 shrink-0 border-t border-border">
        <div className="flex items-center gap-1 text-[10px] text-muted-foreground/60 flex-wrap">
          <Link href="/docs" className="hover:text-foreground transition-colors">Docs</Link>
          <span>·</span>
          <span className="hover:text-foreground transition-colors cursor-pointer">Changelog</span>
          <span>·</span>
          <span className="hover:text-foreground transition-colors cursor-pointer">Terms</span>
          <span>·</span>
          <span className="hover:text-foreground transition-colors cursor-pointer">Shortcuts</span>
        </div>
      </div>

      {/* Settings + User */}
      <div className="shrink-0 border-t border-border">
        <button
          onClick={() => router.push("/dashboard/profile")}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-accent transition-colors duration-150"
        >
          <Settings className="w-4 h-4 shrink-0" />
          <span>Settings</span>
        </button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="w-full flex items-center gap-3 px-3 py-3 border-t border-border hover:bg-accent transition-colors duration-150 group/user">
              <Avatar className="h-7 w-7 rounded-full border border-border shrink-0">
                <AvatarImage src={`https://avatar.vercel.sh/${userEmail}`} />
                <AvatarFallback className="bg-primary text-primary-foreground text-xs font-bold uppercase rounded-full">
                  {userName.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left overflow-hidden">
                <p className="text-xs font-semibold text-foreground truncate">{userName}</p>
                <p className="text-[10px] text-muted-foreground truncate">{userEmail}</p>
              </div>
              <ChevronUp className="w-3.5 h-3.5 text-muted-foreground shrink-0 group-hover/user:text-foreground transition-colors" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="top" align="start" className="w-56 mb-1">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Mon compte</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
              <UserCircle className="w-4 h-4 mr-2" /> Profil
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/dashboard/billing")}>
              <CreditCard className="w-4 h-4 mr-2" /> Abonnement
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive focus:bg-destructive/10">
              <LogOut className="w-4 h-4 mr-2" /> Déconnexion
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )

  return (
    <WebSocketProvider>
      <div
        className="flex h-screen bg-background overflow-hidden"
        suppressHydrationWarning
        style={{ fontFamily: "'Geist Sans', 'Inter', system-ui, sans-serif" }}
      >
        {/* ——— Desktop Sidebar ——— */}
        <aside className="hidden md:flex w-[240px] flex-col bg-card border-r border-border z-30 shrink-0">
          <SidebarContent />
        </aside>

        {/* ——— Main Content Area ——— */}
        <div className="flex-1 flex flex-col min-w-0 h-screen">
          {/* Desktop Topbar */}
          <header className="hidden md:flex h-14 shrink-0 items-center justify-between px-6 border-b border-border bg-card/50 backdrop-blur-sm z-20">
            <h2 className="text-base font-semibold text-foreground tracking-tight">
              {[...conversationsNavigation, ...menuNavigation, ...bottomNavigation].find((n) => n.href === pathname)?.name ||
                "Whappi"}
            </h2>

            <div className="flex items-center gap-2">
              <ThemeToggle isDark={isDarkMode} onToggle={toggleTheme} />
              <button className="relative h-8 w-8 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent transition-all duration-150">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-card" />
              </button>
              <Button size="sm" className="h-7 px-3 text-xs font-semibold rounded-lg bg-primary hover:bg-primary/90" asChild>
                <Link href="/dashboard/billing">
                  <Zap className="w-3 h-3 mr-1" />
                  Upgrade
                </Link>
              </Button>
            </div>
          </header>

          {/* Mobile Topbar */}
          <header className="flex md:hidden h-14 shrink-0 items-center justify-between px-4 bg-card border-b border-border z-50 sticky top-0">
            <Link href="/dashboard">
              <Logo size={26} orientation="horizontal" />
            </Link>
            <div className="flex items-center gap-1">
              <ThemeToggle isDark={isDarkMode} onToggle={toggleTheme} />
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-[240px] p-0 border-none bg-card flex flex-col">
                  <SheetHeader className="sr-only">
                    <SheetTitle>Navigation</SheetTitle>
                  </SheetHeader>
                  <SidebarContent mobile />
                </SheetContent>
              </Sheet>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-6 sm:p-8 lg:p-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-2 duration-200">
              {children}
            </div>
          </main>
        </div>
      </div>
    </WebSocketProvider>
  )
}
