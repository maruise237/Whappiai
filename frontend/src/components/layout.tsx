"use client"

import * as React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useUser, UserButton, useClerk, useAuth } from "@clerk/nextjs"
import { useTheme } from "next-themes"
import {
  CreditCard,
  Menu,
  UserCircle,
  LogOut,
  ChevronDown,
  Sun,
  Moon,
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
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
import { WebSocketProvider } from "@/providers/websocket-provider"
import { Logo } from "@/components/ui/logo"
import { ErrorBoundary } from "@/components/error-boundary"
import { NotificationDropdown } from "@/components/dashboard/notification-dropdown"
import { OnboardingTour } from "@/components/dashboard/onboarding-tour"
import { useI18n } from "@/i18n/i18n-provider"
import { SidebarContent, LiveIndicator, getNavGroups } from "@/components/dashboard/Sidebar"

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { t } = useI18n()
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useAuth()
  const { setTheme, resolvedTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false)

  const userEmail = user?.primaryEmailAddress?.emailAddress
  const userName = user?.firstName || userEmail?.split("@")[0] || "User"
  const isAdmin = userEmail === "maruise237@gmail.com" || user?.publicMetadata?.role === "admin"

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
          <SidebarContent isAdmin={isAdmin} pathname={pathname} t={t} />
          <div className="p-4 border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-muted transition-colors
                  text-left outline-none">
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
                <DropdownMenuItem onClick={() => router.push("/dashboard/profile")}>
                  <UserCircle className="h-4 w-4 mr-2" /> Profil
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push("/dashboard/billing")}>
                  <CreditCard className="h-4 w-4 mr-2" /> Facturation
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut({ redirectUrl: "/login" })} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" /> {t("nav.logout")}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center justify-between px-4 sm:px-6 border-b border-border
            bg-background/50 backdrop-blur-md sticky top-0 z-20">
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
                      isAdmin={isAdmin}
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
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            <div className="max-w-7xl mx-auto p-3 sm:p-6 lg:p-8 animate-in fade-in duration-500">
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
