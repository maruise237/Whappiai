"use client"

import * as React from "react"
import { 
  Shield, 
  Search, 
  ArrowRight,
  ShieldAlert,
  Zap,
  Users,
  Settings2,
  Calendar,
  MessageSquare,
  Lock
} from "lucide-react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useAuth, useUser } from "@clerk/nextjs"
import { ModerationTour } from "@/components/dashboard/moderation-tour"
import { HelpCircle } from "lucide-react"

interface SessionItem {
  sessionId: string
  isConnected: boolean
  status: string
}

export default function ModerationSessionsPage() {
  const [sessions, setSessions] = React.useState<SessionItem[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [showTour, setShowTour] = React.useState(false)
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()

  const fetchSessions = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      
      // Auto-promote maruise237@gmail.com to admin
      const email = user?.primaryEmailAddress?.emailAddress
      if (email && email.toLowerCase() === 'maruise237@gmail.com') {
        setIsAdmin(true)
      } else {
        const userData = await api.auth.check(token || undefined)
        setIsAdmin(userData?.role === 'admin')
      }

      const data = await api.sessions.list(token || undefined)
      const sessionsList = Array.isArray(data) ? data : (data.sessions || [])
      setSessions(sessionsList)
    } catch (error) {
      toast.error("Impossible de charger les sessions")
    } finally {
      setIsLoading(false)
    }
  }, [getToken, user])

  React.useEffect(() => {
    fetchSessions()
    
    // Auto-start tour if first time on this page
    const hasSeenModerationTour = localStorage.getItem("hasSeenModerationTour")
    if (!hasSeenModerationTour) {
      const timer = setTimeout(() => setShowTour(true), 1000)
      return () => clearTimeout(timer)
    }
  }, [fetchSessions])

  const handleTourExit = () => {
    setShowTour(false)
    localStorage.setItem("hasSeenModerationTour", "true")
  }

  const filteredSessions = sessions.filter(s => 
    s.sessionId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground animate-pulse">Chargement des sessions...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      <ModerationTour enabled={showTour} onExit={handleTourExit} />

      {/* Header Section */}
      <div className="moderation-header flex flex-col lg:flex-row lg:items-center justify-between gap-6 bg-white dark:bg-card p-6 sm:p-8 rounded-lg border border-slate-200 dark:border-primary/10 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-primary/10 transition-colors duration-200" />
        
        <div className="space-y-3 relative z-10">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 shadow-sm group-hover:scale-110 transition-transform duration-200">
              <Users className="w-8 h-8 text-primary" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-primary leading-none uppercase">
                  Gestion des Groupes
                </h1>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full hover:bg-primary/10 text-primary/60 hover:text-primary transition-colors"
                  onClick={() => setShowTour(true)}
                >
                  <HelpCircle className="w-6 h-6" />
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-bold text-[10px] uppercase tracking-widest border-primary/20 bg-primary/5 text-primary px-3 py-1 rounded-lg">
                  MODÉRATION & ANIMATION
                </Badge>
              </div>
            </div>
          </div>
          <p className="text-muted-foreground text-sm font-medium max-w-md">
            Accédez aux outils de modération et d'animation pour vos groupes WhatsApp.
          </p>
        </div>

        <div className="session-selector relative w-full lg:w-80 z-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="RECHERCHER UNE SESSION..." 
            className="pl-11 h-12 rounded-lg border border-slate-200 dark:border-primary/10 bg-slate-50 dark:bg-background/50 focus:bg-white dark:focus:bg-background focus:border-primary/30 transition-all duration-200 font-bold text-[10px] tracking-widest"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-primary/5 border border-primary/10 rounded-lg p-6 sm:p-8 flex flex-col sm:flex-row items-center gap-6 relative group overflow-hidden">
        <div className="absolute inset-0 bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <div className="p-3 bg-primary/10 rounded-lg text-primary border border-primary/20 shadow-sm relative z-10">
          <ShieldAlert className="w-6 h-6" />
        </div>
        <div className="space-y-1 relative z-10">
          <h4 className="text-[11px] font-bold uppercase tracking-widest text-primary">Instructions</h4>
          <p className="text-xs text-muted-foreground font-medium leading-relaxed">
            Sélectionnez une session connectée pour accéder à la liste des groupes où vous êtes administrateur. 
            Vous pourrez alors activer l'anti-lien, le filtrage de mots et programmer des animations.
          </p>
        </div>
      </div>

      {/* Sessions Grid */}
      <div className="group-list grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {filteredSessions.length === 0 ? (
          <div className="col-span-full py-24 bg-slate-50 dark:bg-card/50 border border-dashed border-slate-200 dark:border-primary/10 rounded-lg flex flex-col items-center justify-center space-y-4">
            <Zap className="w-12 h-12 text-muted-foreground opacity-20" />
            <p className="text-muted-foreground font-bold uppercase tracking-widest text-[10px] opacity-60">
              {searchQuery ? "Aucune session ne correspond à votre recherche." : "Commencez par connecter une session WhatsApp."}
            </p>
          </div>
        ) : (
          filteredSessions.map((session) => (
            <Card key={session.sessionId} className="group hover:shadow-xl transition-all duration-200 border border-slate-200 dark:border-primary/10 rounded-lg overflow-hidden bg-white dark:bg-card flex flex-col hover:border-primary/20">
              <CardHeader className="p-6 sm:p-8 pb-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3.5 rounded-lg transition-all duration-200 group-hover:scale-110 border shadow-sm",
                      session.isConnected 
                        ? "bg-primary/10 text-primary border-primary/20" 
                        : "bg-slate-50 text-slate-400 border-slate-200 dark:bg-muted/50 dark:border-primary/5"
                    )}>
                      <Shield className="w-6 h-6" />
                    </div>
                    <div className="space-y-1.5">
                      <CardTitle className="text-lg font-bold tracking-tight group-hover:text-primary transition-colors duration-200 uppercase">
                        {session.sessionId}
                      </CardTitle>
                      <Badge 
                        variant={session.isConnected ? "default" : "destructive"} 
                        className={cn(
                          "text-[9px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-lg shadow-sm",
                          session.isConnected ? "bg-emerald-500 hover:bg-emerald-500" : "bg-destructive hover:bg-destructive"
                        )}
                      >
                        {session.isConnected ? "Connecté" : "Déconnecté"}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-2.5 bg-slate-50 dark:bg-muted/50 rounded-lg group-hover:bg-primary/10 group-hover:text-primary transition-colors duration-200 border border-slate-200 dark:border-primary/5">
                    <Settings2 className="w-4 h-4" />
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6 sm:p-8 pt-0 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-4 bg-slate-50 dark:bg-muted/30 rounded-lg space-y-2 text-center border border-slate-100 dark:border-primary/5 group-hover:border-primary/10 transition-all duration-200">
                    <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground opacity-60">Modération</p>
                    <Shield className="w-4 h-4 mx-auto text-primary/40 group-hover:text-primary transition-colors duration-200" />
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-muted/30 rounded-lg space-y-2 text-center border border-slate-100 dark:border-primary/5 group-hover:border-primary/10 transition-all duration-200">
                    <p className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground opacity-60">Animation</p>
                    <Calendar className="w-4 h-4 mx-auto text-primary/40 group-hover:text-primary transition-colors duration-200" />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-6 sm:p-8 pt-0 mt-auto grid grid-cols-2 gap-3">
                <Button 
                  className="w-full h-11 font-bold uppercase tracking-widest text-[10px] rounded-lg shadow-lg shadow-primary/10 hover:shadow-primary/20 transition-all duration-200 active:scale-95" 
                  disabled={!session.isConnected}
                  onClick={() => router.push(`/dashboard/moderation/groups/moderation?session=${session.sessionId}`)}
                >
                  Modération
                </Button>
                <Button 
                  variant="outline"
                  className="w-full h-11 font-bold uppercase tracking-widest text-[10px] rounded-lg border border-slate-200 dark:border-primary/20 hover:bg-primary/5 transition-all duration-200 active:scale-95" 
                  disabled={!session.isConnected}
                  onClick={() => router.push(`/dashboard/moderation/groups/animation?session=${session.sessionId}`)}
                >
                  Animation
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
