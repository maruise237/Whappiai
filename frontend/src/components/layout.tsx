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
  Sparkles,
  CreditCard
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
import { InstallPrompt } from "@/components/InstallPrompt"

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

const mainNavigation = [
  { name: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { name: "Assistant IA", href: "/dashboard/ai", icon: Bot },
  { name: "Moderation", href: "/dashboard/moderation", icon: Shield },
  { name: "Activités", href: "/dashboard/activities", icon: History, adminOnly: true },
  { name: "Utilisateurs", href: "/dashboard/users", icon: Users, adminOnly: true },
  { name: "Configuration IA", href: "/dashboard/ai-models", icon: Settings2, adminOnly: true },
]

const secondaryNavigation = [
  { name: "Abonnement", href: "/dashboard/billing", icon: CreditCard },
  { name: "Paramètres", href: "/dashboard/profile", icon: Settings },
  { name: "API Docs", href: "/docs", icon: FileText },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { signOut } = useClerk()
  const { getToken } = useAuth()
  const [isDarkMode, setIsDarkMode] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  const userEmail = user?.primaryEmailAddress?.emailAddress
  let userRole = (user?.publicMetadata?.role as string) || "user"
  
  // Auto-promote maruise237@gmail.com to admin
  if (userEmail && userEmail.toLowerCase() === 'maruise237@gmail.com') {
    userRole = 'admin'
  }

  React.useEffect(() => {
    const checkUserSync = async () => {
      if (!isLoaded || !user) return;
      
      try {
        const token = await getToken();
        console.log("Checking user sync...", { hasToken: !!token });
        // Check if user exists in local DB
        // We catch the error if it returns 404 (User not found)
        await api.auth.check(token || undefined);
        console.log("User sync check passed (User exists in DB)");
      } catch (error: any) {
        console.error("User sync check failed:", error);
        // If 404 or specific error code, redirect to conversion
        if (error.message && (error.message.includes('404') || error.message.includes('User not found') || error.message.includes('USER_NOT_FOUND_LOCAL'))) {
           console.log("User not found in local DB, redirecting to conversion...");
           router.push('/register?conversion=true');
        }
      }
    };
    
    checkUserSync();
  }, [isLoaded, user, getToken, router]);

  React.useEffect(() => {
    setMounted(true)
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("theme")
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    
    setIsDarkMode(isDark)
    document.documentElement.classList.toggle("dark", isDark)
  }, [])

  const toggleTheme = () => {
    const newMode = !isDarkMode
    setIsDarkMode(newMode)
    localStorage.setItem("theme", newMode ? "dark" : "light")
    document.documentElement.classList.toggle("dark", newMode)
  }

  const handleLogout = async () => {
    try {
      await signOut(() => {
        sessionStorage.clear()
        router.push("/login")
      })
    } catch (error) {
      console.error("Logout error:", error)
      router.push("/login")
    }
  }

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

  // Filter navigation based on role
  const filteredMainNavigation = mainNavigation.filter(item => {
    if (item.adminOnly && userRole !== 'admin') return false;
    // Special case for activities which is also restricted to admin
    if (item.href === "/dashboard/activities" && userRole !== 'admin') return false;
    return true;
  });

  const filteredSecondaryNavigation = secondaryNavigation.filter(item => {
    // Documentation is now accessible to all users
    return true;
  });

  if (!mounted) {
    return null
  }

  return (
    <WebSocketProvider>
      <div className="flex h-screen bg-background selection:bg-primary/20 selection:text-primary overflow-hidden font-sans" suppressHydrationWarning>
        {/* Sidebar Desktop - Clean & Professional */}
        <aside className="hidden md:flex w-20 lg:w-64 flex-col bg-card border-r border-border relative z-30 transition-all duration-200" suppressHydrationWarning>
          <div className="flex h-16 items-center justify-center lg:justify-start lg:px-6 shrink-0 border-b border-border">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <Logo size={32} orientation="horizontal" showText={false} className="lg:hidden" />
              <Logo size={32} orientation="horizontal" className="hidden lg:flex" />
            </Link>
          </div>

          <ScrollArea className="flex-1 px-3 lg:px-4">
            <div className="space-y-6 py-4">
              {/* Menu Section */}
              <div className="space-y-1">
                <h3 className="hidden lg:block px-4 text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">Main</h3>
                <nav className="space-y-1">
                  <TooltipProvider delayDuration={300}>
                    {filteredMainNavigation.map((item) => {
                      const Icon = item.icon
                      const isActive = pathname === item.href
                      return (
                        <Link key={item.name} href={item.href} prefetch={false} className="block relative">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                className={cn(
                                  "w-full lg:justify-start gap-3 h-10 px-3 rounded-md text-sm font-medium transition-all duration-200 group/nav",
                                  isActive 
                                    ? "bg-secondary text-foreground shadow-sm" 
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                <Icon className={cn(
                                  "w-4 h-4 shrink-0 transition-transform duration-200 group-hover/nav:scale-110",
                                  isActive ? "text-primary" : "text-muted-foreground group-hover/nav:text-foreground"
                                )} />
                                <span className="hidden lg:inline">{item.name}</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="lg:hidden">
                              <p className="text-xs font-medium">{item.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </Link>
                      )
                    })}
                  </TooltipProvider>
                </nav>
              </div>

              {/* System Section */}
              <div className="space-y-1 pt-4 border-t border-border">
                <h3 className="hidden lg:block px-4 text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-2">System</h3>
                <nav className="space-y-1">
                  {filteredSecondaryNavigation.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link key={item.name} href={item.href} prefetch={false}>
                        <TooltipProvider delayDuration={300}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                className={cn(
                                  "w-full lg:justify-start gap-3 h-10 px-3 rounded-md text-sm font-medium transition-all duration-200 group/nav",
                                  isActive 
                                    ? "bg-secondary text-foreground border border-border" 
                                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                                )}
                              >
                                <Icon className={cn(
                                  "w-4 h-4 shrink-0 transition-transform duration-200 group-hover/nav:scale-110",
                                  isActive ? "text-primary" : "text-muted-foreground group-hover/nav:text-foreground"
                                )} />
                                <span className="hidden lg:inline">{item.name}</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="lg:hidden">
                              <p className="text-xs font-medium">{item.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Link>
                    )
                  })}
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full lg:justify-start gap-3 h-10 px-3 rounded-md text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-all duration-200 group/logout"
                  >
                    <LogOut className="w-4 h-4 shrink-0 transition-transform duration-200 group-hover/logout:scale-110" />
                    <span className="hidden lg:inline">Sign Out</span>
                  </Button>
                </nav>
              </div>
            </div>
          </ScrollArea>

          {/* Bottom Profile */}
          <div className="p-3 lg:p-4 mt-auto border-t border-border">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="w-full group/profile flex items-center justify-center lg:justify-start gap-3 p-2 rounded-md hover:bg-muted transition-all duration-200"
                >
                  <Avatar className="h-8 w-8 border border-border shadow-sm transition-transform duration-200 group-hover/profile:scale-105">
                    <AvatarImage src={`https://avatar.vercel.sh/${userEmail}`} />
                    <AvatarFallback className="bg-primary text-white font-bold text-xs uppercase">
                      {userEmail?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:flex flex-col items-start overflow-hidden">
                    <span className="text-xs font-semibold text-foreground truncate w-full">
                      {userEmail?.split('@')[0]}
                    </span>
                    <span className="text-[10px] font-medium text-muted-foreground truncate">
                      Free Plan
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-56 p-1 rounded-md bg-popover border border-border shadow-md z-[100]">
                <DropdownMenuLabel className="px-2 py-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Account
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-border mx-1" />
                <DropdownMenuItem 
                  onClick={() => router.push('/dashboard/profile')}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm font-medium transition-all duration-200 cursor-pointer"
                >
                  <UserCircle className="w-4 h-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => router.push('/docs')}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm font-medium transition-all duration-200 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  Documentation
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-border mx-1" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-2 py-1.5 rounded-sm text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200 cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen bg-background">
          {/* Top Bar - Clean & Professional */}
          <header className="hidden md:flex h-16 shrink-0 items-center justify-between px-8 border-b border-border z-20">
            <div className="flex items-center gap-8 flex-1">
              <div className="flex flex-col">
                <h2 className="text-lg font-semibold text-foreground tracking-tight leading-none">
                  {mainNavigation.find(n => n.href === pathname)?.name || 
                   secondaryNavigation.find(n => n.href === pathname)?.name || 
                   "Whappi"}
                </h2>
              </div>

              <div className="relative max-w-sm w-full">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input 
                  placeholder="Quick search..." 
                  className="h-9 pl-9 pr-3 rounded-md bg-muted/50 border-input focus-visible:ring-1 focus-visible:ring-ring transition-all duration-200 text-sm font-normal"
                />
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-1">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleTheme}
                  className="h-8 w-8 rounded-md text-muted-foreground hover:text-foreground"
                >
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                </Button>
                <Button variant="ghost" size="icon" className="relative h-8 w-8 rounded-md text-muted-foreground hover:text-foreground">
                  <Bell className="w-4 h-4" />
                  <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-primary rounded-full ring-2 ring-background" />
                </Button>
              </div>
              
              <Button size="sm" className="h-8 px-4 rounded-md font-medium text-xs bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                Upgrade Pro
              </Button>
            </div>
          </header>

          {/* Mobile Navigation */}
          <header className="flex md:hidden h-16 shrink-0 items-center justify-between px-6 bg-card z-50 sticky top-0 border-b border-border">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <Logo size={28} orientation="horizontal" />
            </Link>
            
            <div className="flex items-center gap-2">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTheme}
                className="h-9 w-9 text-muted-foreground"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-9 w-9">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full sm:w-[300px] p-0 border-none bg-card flex flex-col">
                  <SheetHeader className="h-16 flex-row items-center px-6 border-b border-border shrink-0 space-y-0">
                    <div className="flex items-center gap-2">
                      <Logo size={28} orientation="horizontal" />
                    </div>
                  </SheetHeader>
                  <ScrollArea className="flex-1 px-4">
                    <nav className="space-y-1 py-6">
                      {filteredMainNavigation.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                          <Link key={item.name} href={item.href} prefetch={false}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start gap-4 h-12 px-4 rounded-md text-sm font-medium transition-all duration-200",
                                isActive 
                                  ? "bg-secondary text-foreground" 
                                  : "text-muted-foreground hover:bg-muted"
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              <span>{item.name}</span>
                            </Button>
                          </Link>
                        )
                      })}
                      <div className="h-4" />
                      {filteredSecondaryNavigation.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                          <Link key={item.name} href={item.href} prefetch={false}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start gap-4 h-12 px-4 rounded-md text-sm font-medium transition-all duration-200",
                                isActive 
                                  ? "bg-secondary text-foreground" 
                                  : "text-muted-foreground hover:bg-muted"
                              )}
                            >
                              <Icon className="w-4 h-4" />
                              <span>{item.name}</span>
                            </Button>
                          </Link>
                        )
                      })}
                    </nav>
                  </ScrollArea>
                  <div className="p-6 border-t border-border">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-4 h-12 px-4 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-all duration-200"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto custom-scrollbar relative">
            <div className="p-6 sm:p-10 max-w-7xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-300">
              {children}
            </div>
          </main>
        </div>
      </div>
    </WebSocketProvider>
  )
}
