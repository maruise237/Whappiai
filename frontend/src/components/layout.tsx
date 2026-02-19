"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useUser, SignOutButton, UserButton, useClerk } from "@clerk/nextjs"
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
  const [isDarkMode, setIsDarkMode] = React.useState(false)
  const [mounted, setMounted] = React.useState(false)

  const userEmail = user?.primaryEmailAddress?.emailAddress
  let userRole = (user?.publicMetadata?.role as string) || "user"
  
  // Auto-promote maruise237@gmail.com to admin
  if (userEmail && userEmail.toLowerCase() === 'maruise237@gmail.com') {
    userRole = 'admin'
  }

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
      <div className="flex h-screen bg-white dark:bg-background selection:bg-primary/20 selection:text-primary overflow-hidden font-sans" suppressHydrationWarning>
        {/* Sidebar Desktop - Minimalist Glassmorphism */}
        <aside className="hidden md:flex w-24 lg:w-72 flex-col bg-white/80 dark:bg-card/80 backdrop-blur-xl border-r border-slate-200 dark:border-primary/10 relative z-30 transition-all duration-200" suppressHydrationWarning>
          <div className="flex h-24 items-center justify-center lg:justify-start lg:px-8 shrink-0">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <Logo size={42} orientation="horizontal" showText={false} className="lg:hidden" />
              <Logo size={42} orientation="horizontal" className="hidden lg:flex" />
            </Link>
          </div>

          <ScrollArea className="flex-1 px-4 lg:px-6">
            <div className="space-y-8 py-4">
              {/* Menu Section */}
              <div className="space-y-4">
                <h3 className="hidden lg:block px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-50 mb-4">Principale</h3>
                <div className="lg:hidden h-px bg-slate-100 dark:bg-primary/5 mx-4 my-2" />
                <nav className="space-y-2">
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
                                  "w-full lg:justify-start gap-4 h-12 px-4 rounded-lg text-sm font-bold transition-all duration-300 group/nav relative overflow-hidden",
                                  isActive 
                                    ? "bg-primary text-white shadow-lg shadow-primary/20 hover:bg-primary/90" 
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-primary/5 dark:hover:text-primary"
                                )}
                              >
                                {isActive && (
                                  <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-white/40 rounded-r-full lg:hidden" />
                                )}
                                <Icon className={cn(
                                  "w-5 h-5 shrink-0 transition-transform duration-300 group-hover/nav:scale-110 group-active/nav:scale-95",
                                  isActive ? "text-white" : "text-slate-400 dark:group-hover/nav:text-primary"
                                )} />
                                <span className="hidden lg:inline">{item.name}</span>
                                {item.badge && (
                                  <span className={cn(
                                    "hidden lg:flex absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 items-center justify-center rounded-full text-[10px] font-black shadow-lg",
                                    isActive ? "bg-white text-primary" : "bg-primary text-white shadow-primary/20"
                                  )}>
                                    {item.badge}
                                  </span>
                                )}
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="lg:hidden">
                              <p className="text-[10px] font-black uppercase tracking-widest">{item.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </Link>
                      )
                    })}
                  </TooltipProvider>
                </nav>
              </div>

              {/* General Section */}
              <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-primary/5">
                <h3 className="hidden lg:block px-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] opacity-50 mb-4">Système</h3>
                <div className="lg:hidden h-px bg-slate-100 dark:bg-primary/5 mx-4 my-2" />
                <nav className="space-y-2">
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
                                  "w-full lg:justify-start gap-4 h-12 px-4 rounded-lg text-sm font-bold transition-all duration-300 group/nav",
                                  isActive 
                                    ? "bg-primary/10 text-primary border border-primary/20" 
                                    : "text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:hover:bg-primary/5 dark:hover:text-primary"
                                )}
                              >
                                <Icon className={cn(
                                  "w-5 h-5 shrink-0 transition-transform duration-300 group-hover/nav:scale-110",
                                  isActive ? "text-primary" : "text-slate-400 dark:group-hover/nav:text-primary"
                                )} />
                                <span className="hidden lg:inline">{item.name}</span>
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent side="right" className="lg:hidden">
                              <p className="text-[10px] font-black uppercase tracking-widest">{item.name}</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </Link>
                    )
                  })}
                  <Button
                    variant="ghost"
                    onClick={handleLogout}
                    className="w-full lg:justify-start gap-4 h-12 px-4 rounded-lg text-sm font-bold text-slate-400 hover:bg-red-500 hover:text-white transition-all duration-200 group/logout"
                  >
                    <LogOut className="w-5 h-5 shrink-0 transition-transform duration-200 group-hover/logout:scale-110" />
                    <span className="hidden lg:inline">Déconnexion</span>
                  </Button>
                </nav>
              </div>
            </div>
          </ScrollArea>

          {/* Bottom Profile Mini-Card */}
          <div className="p-4 lg:p-6 mt-auto">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button 
                  className="w-full group/profile flex items-center justify-center lg:justify-start gap-3 p-3 lg:p-4 rounded-lg bg-slate-50 dark:bg-muted/10 hover:bg-primary/5 transition-all duration-200 border border-slate-100 dark:border-primary/5"
                >
                  <Avatar className="h-10 w-10 border-2 border-white dark:border-background shadow-lg transition-transform duration-200 group-hover/profile:scale-110">
                    <AvatarImage src={`https://avatar.vercel.sh/${userEmail}`} />
                    <AvatarFallback className="bg-primary text-white font-black text-xs">
                      {userEmail?.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden lg:flex flex-col items-start overflow-hidden">
                    <span className="text-[11px] font-black text-slate-900 dark:text-white uppercase truncate w-full">
                      {userEmail?.split('@')[0]}
                    </span>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
                      Settings
                    </span>
                  </div>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="right" align="end" className="w-64 p-2 rounded-xl bg-white/90 dark:bg-card/90 backdrop-blur-xl border border-slate-200 dark:border-primary/10 shadow-2xl z-[100]">
                <DropdownMenuLabel className="px-4 py-3 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 opacity-70">
                  Options du Compte
                </DropdownMenuLabel>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-primary/5 mx-2" />
                <DropdownMenuItem 
                  onClick={() => router.push('/dashboard/profile')}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-primary/5 hover:text-primary transition-all duration-200 cursor-pointer group"
                >
                  <UserCircle className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                  Mon Profil
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onClick={() => router.push('/docs')}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-300 hover:bg-primary/5 hover:text-primary transition-all duration-200 cursor-pointer group"
                >
                  <FileText className="w-4 h-4 text-slate-400 group-hover:text-primary transition-colors" />
                  Documentation API
                </DropdownMenuItem>
                <DropdownMenuSeparator className="bg-slate-100 dark:bg-primary/5 mx-2" />
                <DropdownMenuItem 
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all duration-200 cursor-pointer group"
                >
                  <LogOut className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                  Déconnexion
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 h-screen bg-[#F8FAFC] dark:bg-background/95">
          {/* Desktop Navigation Top Bar - Modern & Clean */}
          <header className="hidden md:flex h-24 shrink-0 items-center justify-between px-12 z-20">
            <div className="flex items-center gap-12 flex-1">
              <div className="flex flex-col">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tighter uppercase leading-none">
                    {mainNavigation.find(n => n.href === pathname)?.name || 
                     secondaryNavigation.find(n => n.href === pathname)?.name || 
                     "Whappi"}
                  </h2>
                  <div className="h-1.5 w-1.5 rounded-full bg-primary/40" />
                </div>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1.5">
                  Platform Control Center
                </p>
              </div>

              <div className="relative max-w-sm w-full group">
                <div className="absolute inset-0 bg-primary/5 rounded-lg blur-xl group-focus-within:bg-primary/10 transition-all duration-200 opacity-0 group-focus-within:opacity-100" />
                <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-primary transition-colors duration-200" />
                <Input 
                  placeholder="Intelligence Search..." 
                  className="h-12 pl-12 pr-6 rounded-lg bg-white dark:bg-card border-none shadow-sm focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 text-sm font-medium relative z-10"
                />
              </div>
            </div>

            <div className="flex items-center gap-6">
              <div className="flex items-center bg-white dark:bg-card p-1.5 rounded-lg shadow-sm border border-slate-100 dark:border-primary/5">
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={toggleTheme}
                  className="h-10 w-10 rounded-lg text-slate-400 hover:text-primary transition-all duration-200"
                >
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </Button>
                <div className="w-[1px] h-6 bg-slate-100 dark:bg-primary/10 mx-1" />
                <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-lg text-slate-400 hover:text-primary transition-all duration-200">
                  <Bell className="w-5 h-5" />
                  <span className="absolute top-2.5 right-2.5 w-2 h-2 bg-primary rounded-full ring-4 ring-white dark:ring-card" />
                </Button>
              </div>
              
              <Button className="h-12 px-6 rounded-lg bg-slate-900 dark:bg-primary text-white text-[10px] font-black uppercase tracking-[0.2em] shadow-xl shadow-slate-900/10 dark:shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-200">
                Pro Upgrade
              </Button>
            </div>
          </header>

          {/* Mobile Navigation - Modern Float */}
          <header className="flex md:hidden h-20 shrink-0 items-center justify-between px-8 bg-white/80 dark:bg-card/80 backdrop-blur-xl z-50 sticky top-0 border-b border-slate-100 dark:border-primary/5">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <Logo size={32} orientation="horizontal" />
            </Link>
            
            <div className="flex items-center gap-3">
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={toggleTheme}
                className="h-10 w-10 rounded-lg text-slate-400"
              >
                {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
              </Button>
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-lg bg-slate-50 dark:bg-muted/10 h-10 w-10">
                    <Menu className="w-5 h-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-full sm:w-[350px] p-0 border-none bg-white dark:bg-card flex flex-col">
                  <SheetHeader className="h-24 flex-row items-center px-10 border-b border-slate-50 dark:border-primary/5 shrink-0 space-y-0">
                    <div className="flex items-center gap-4">
                      <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20">
                        <Sparkles className="w-5 h-5 text-primary" />
                      </div>
                      <SheetTitle className="text-xl font-black tracking-tighter text-slate-900 dark:text-white uppercase leading-none">Whappi</SheetTitle>
                    </div>
                  </SheetHeader>
                  <ScrollArea className="flex-1 px-6">
                    <nav className="space-y-2 py-8">
                      <div className="px-4 pb-6">
                        <InstallPrompt variant="inline" className="w-full justify-center bg-primary/10 text-primary hover:bg-primary/20 h-12 rounded-xl text-sm font-bold uppercase tracking-widest border border-primary/20" />
                      </div>
                      {filteredMainNavigation.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                          <Link key={item.name} href={item.href} prefetch={false}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start gap-5 h-14 px-6 rounded-lg text-sm font-bold transition-all duration-200",
                                isActive 
                                  ? "bg-primary text-white shadow-xl shadow-primary/20" 
                                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-primary/5"
                              )}
                            >
                              <Icon className="w-5 h-5" />
                              <span>{item.name}</span>
                            </Button>
                          </Link>
                        )
                      })}
                      <div className="h-6" />
                      {filteredSecondaryNavigation.map((item) => {
                        const Icon = item.icon
                        const isActive = pathname === item.href
                        return (
                          <Link key={item.name} href={item.href} prefetch={false}>
                            <Button
                              variant="ghost"
                              className={cn(
                                "w-full justify-start gap-5 h-14 px-6 rounded-lg text-sm font-bold transition-all duration-200",
                                isActive 
                                  ? "bg-primary text-white shadow-xl shadow-primary/20" 
                                  : "text-slate-500 hover:bg-slate-50 dark:hover:bg-primary/5"
                              )}
                            >
                              <Icon className="w-5 h-5" />
                              <span>{item.name}</span>
                            </Button>
                          </Link>
                        )
                      })}
                    </nav>
                  </ScrollArea>
                  <div className="p-8 border-t border-slate-50 dark:border-primary/5">
                    <Button 
                      variant="ghost" 
                      className="w-full justify-start gap-5 h-14 px-6 rounded-lg text-sm font-black text-red-500 hover:bg-red-50 transition-all duration-200"
                      onClick={handleLogout}
                    >
                      <LogOut className="w-5 h-5" />
                      DÉCONNEXION
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </header>

          {/* Page Content - Floating Glass Effect */}
          <main className="flex-1 overflow-y-auto custom-scrollbar relative">
            <div className="p-6 sm:p-8 md:p-12 lg:p-16 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-8 duration-200">
              {children}
            </div>
          </main>

          {/* Mobile Bottom Bar - Essential for Modern UX */}
          <div className="md:hidden fixed bottom-6 left-6 right-6 h-16 bg-white/90 dark:bg-card/90 backdrop-blur-2xl border border-slate-200/50 dark:border-primary/10 rounded-lg shadow-2xl flex items-center justify-around px-2 z-40">
            {filteredMainNavigation.slice(0, 4).map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.name} href={item.href} className="flex-1" prefetch={false}>
                  <button className={cn(
                    "w-full flex flex-col items-center justify-center gap-1 transition-all duration-200",
                    isActive ? "text-primary scale-110" : "text-slate-400"
                  )}>
                    <Icon className="w-5 h-5" />
                    <span className="text-[8px] font-black uppercase tracking-tighter">{item.name}</span>
                  </button>
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </WebSocketProvider>
  )
}
