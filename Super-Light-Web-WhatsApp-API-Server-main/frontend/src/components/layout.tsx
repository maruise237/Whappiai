"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
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
  Zap
} from "lucide-react"

import { Button } from "@/components/ui/button"
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "@/lib/api"

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Campaigns", href: "/campaigns", icon: Zap },
  { name: "Users", href: "/users", icon: Users },
  { name: "Activities", href: "/activities", icon: History },
  { name: "API Docs", href: "/docs", icon: FileText },
]

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const router = useRouter()
  const [isDarkMode, setIsDarkMode] = React.useState(false)
  const [checkingAuth, setCheckingAuth] = React.useState(true)

  React.useEffect(() => {
    // Load theme from localStorage
    const savedTheme = localStorage.getItem("theme")
    const isDark = savedTheme === "dark" || (!savedTheme && window.matchMedia("(prefers-color-scheme: dark)").matches)
    
    setIsDarkMode(isDark)
    document.documentElement.classList.toggle("dark", isDark)

    const checkAuth = async () => {
      try {
        await api.auth.check()
        setCheckingAuth(false)
      } catch (error) {
        console.error("Auth check failed:", error)
        router.push("/login")
      }
    }

    checkAuth()
  }, [router])

  const toggleTheme = () => {
    const newTheme = !isDarkMode
    setIsDarkMode(newTheme)
    document.documentElement.classList.toggle("dark", newTheme)
    localStorage.setItem("theme", newTheme ? "dark" : "light")
  }

  const handleLogout = async () => {
    try {
      await api.auth.logout()
      sessionStorage.clear()
      router.push("/login")
    } catch (error) {
      console.error("Logout failed:", error)
      // Fallback: clear storage and redirect anyway
      sessionStorage.clear()
      router.push("/login")
    }
  }

  if (checkingAuth) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <MessageSquare className="w-12 h-12 text-primary animate-pulse" />
          <p className="text-muted-foreground animate-pulse">Vérification de l'accès...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-background text-foreground font-inter">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 flex-col border-r bg-card">
        <div className="flex h-16 items-center px-6 border-b">
          <Link href="/" className="flex items-center gap-2 font-bold text-xl text-primary">
            <MessageSquare className="w-6 h-6" />
            <span>Whappi</span>
          </Link>
        </div>
        <ScrollArea className="flex-1 px-4 py-6">
          <nav className="space-y-2">
            {navigation.map((item) => {
              const Icon = item.icon
              const isActive = pathname === item.href
              return (
                <Link key={item.name} href={item.href}>
                  <Button
                    variant={isActive ? "secondary" : "ghost"}
                    className="w-full justify-start gap-3"
                  >
                    <Icon className="w-4 h-4" />
                    {item.name}
                  </Button>
                </Link>
              )
            })}
          </nav>
        </ScrollArea>
        <div className="p-4 border-t space-y-2">
          <Button variant="outline" className="w-full justify-start gap-3" onClick={toggleTheme}>
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            {isDarkMode ? "Light Mode" : "Dark Mode"}
          </Button>
          <Button 
            variant="ghost" 
            className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={handleLogout}
          >
            <LogOut className="w-4 h-4" />
            Logout
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Header */}
        <header className="flex md:hidden h-16 items-center justify-between px-4 border-b bg-card">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg text-primary">
            <MessageSquare className="w-5 h-5" />
            <span>Whappi</span>
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon">
                <Menu className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 p-0">
              <SheetHeader className="h-16 flex-row items-center px-6 border-b space-y-0">
                <SheetTitle className="text-xl font-bold text-primary">Whappi</SheetTitle>
              </SheetHeader>
              <div className="px-4 py-6">
                <nav className="space-y-2">
                  {navigation.map((item) => {
                    const Icon = item.icon
                    const isActive = pathname === item.href
                    return (
                      <Link key={item.name} href={item.href}>
                        <Button
                          variant={isActive ? "secondary" : "ghost"}
                          className="w-full justify-start gap-3"
                        >
                          <Icon className="w-4 h-4" />
                          {item.name}
                        </Button>
                      </Link>
                    )
                  })}
                </nav>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-4 border-t bg-card space-y-2">
                <Button variant="outline" className="w-full justify-start gap-3" onClick={toggleTheme}>
                  {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  {isDarkMode ? "Light Mode" : "Dark Mode"}
                </Button>
                <Button 
                  variant="ghost" 
                  className="w-full justify-start gap-3 text-destructive"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </Button>
              </div>
            </SheetContent>
          </Sheet>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          <div className="max-w-7xl mx-auto space-y-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
