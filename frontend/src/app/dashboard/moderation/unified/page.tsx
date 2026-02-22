"use client"

import * as React from "react"
import { useUser, useAuth } from "@clerk/nextjs"
import { 
  Shield, 
  Bot, 
  Settings2, 
  MessageSquare, 
  Users, 
  Zap, 
  Calendar, 
  Clock, 
  MoreHorizontal, 
  Plus, 
  Trash2, 
  ExternalLink, 
  BarChart3, 
  CheckCircle2, 
  AlertTriangle, 
  Ban, 
  UserPlus, 
  Sparkles,
  LayoutDashboard,
  Search,
  Settings,
  ArrowRight,
  ChevronRight,
  Trophy,
  History,
  FileText,
  Bell
} from "lucide-react"
import { format } from "date-fns"
import { fr } from "date-fns/locale"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts"
import { api } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { cn } from "@/lib/utils"

// --- Interfaces ---

interface Group {
  id: string
  name: string
  participantsCount: number
  sessionId: string
  isActive?: boolean
}

interface ModerationSettings {
  is_active: boolean
  anti_link: boolean
  bad_words: string
  warning_template: string
  max_warnings: number
  welcome_enabled: boolean
  welcome_template: string
  ai_assistant_enabled: boolean
}

interface AnimatorTask {
  id: number
  message_content: string
  media_url?: string
  media_type: string
  scheduled_at: string
  recurrence: string
  status: 'pending' | 'processing' | 'completed' | 'failed'
}

interface GroupProfile {
  mission: string
  objectives: string
  rules: string
  theme: string
}

// --- Mock / Sample Data ---

const activityData = [
  { name: 'Lun', messages: 45, moderations: 2 },
  { name: 'Mar', messages: 52, moderations: 5 },
  { name: 'Mer', messages: 48, moderations: 1 },
  { name: 'Jeu', messages: 61, moderations: 3 },
  { name: 'Ven', messages: 55, moderations: 4 },
  { name: 'Sam', messages: 67, moderations: 6 },
  { name: 'Dim', messages: 42, moderations: 2 },
]

export default function UnifiedModerationHub() {
  const { user } = useUser()
  const { getToken } = useAuth()
  const { toast } = useToast()

  const [sessions, setSessions] = React.useState<any[]>([])
  const [groups, setGroups] = React.useState<Group[]>([])
  const [selectedSessionId, setSelectedSessionId] = React.useState<string>("")
  const [selectedGroupId, setSelectedGroupId] = React.useState<string>("")
  const [settings, setSettings] = React.useState<ModerationSettings | null>(null)
  const [tasks, setTasks] = React.useState<AnimatorTask[]>([])
  const [profile, setProfile] = React.useState<GroupProfile | null>(null)
  const [isLoading, setIsLoading] = React.useState(true)
  const [activeTab, setActiveTab] = React.useState("overview")

  const fetchData = React.useCallback(async () => {
    try {
      const token = await getToken()
      if (!token) return

      const sessionsRes = await api.get("/api/v1/sessions", token)
      setSessions(sessionsRes || [])
      
      if (sessionsRes.length > 0 && !selectedSessionId) {
        setSelectedSessionId(sessionsRes[0].sessionId)
      }
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setIsLoading(false)
    }
  }, [getToken, selectedSessionId])

  const fetchGroups = React.useCallback(async (sessionId: string) => {
    try {
      const token = await getToken()
      if (!token) return
      setIsLoading(true)
      const groupsRes = await api.get(`/api/v1/whatsapp/${sessionId}/groups`, token)
      setGroups(groupsRes.groups || [])
    } catch (error) {
      console.error("Error fetching groups:", error)
      toast({ title: "Erreur", description: "Impossible de charger les groupes.", variant: "destructive" })
    } finally {
      setIsLoading(false)
    }
  }, [getToken, toast])

  const fetchGroupDetails = React.useCallback(async (sessionId: string, groupId: string) => {
    try {
      const token = await getToken()
      if (!token) return
      
      const [settingsRes, tasksRes, profileRes] = await Promise.all([
        api.get(`/api/v1/moderation/groups/settings/${sessionId}/${groupId}`, token),
        api.get(`/api/v1/moderation/groups/animator/tasks/${sessionId}/${groupId}`, token),
        api.get(`/api/v1/moderation/groups/profile/${sessionId}/${groupId}`, token)
      ])

      setSettings(settingsRes.settings)
      setTasks(tasksRes.tasks || [])
      setProfile(profileRes.profile)
    } catch (error) {
      console.error("Error fetching group details:", error)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchData()
  }, [fetchData])

  React.useEffect(() => {
    if (selectedSessionId) {
      fetchGroups(selectedSessionId)
    }
  }, [selectedSessionId, fetchGroups])

  React.useEffect(() => {
    if (selectedSessionId && selectedGroupId) {
      fetchGroupDetails(selectedSessionId, selectedGroupId)
    }
  }, [selectedSessionId, selectedGroupId, fetchGroupDetails])

  const handleSaveSettings = async () => {
    if (!settings || !selectedSessionId || !selectedGroupId) return
    try {
      const token = await getToken()
      await api.post(`/api/v1/moderation/groups/settings/${selectedSessionId}/${selectedGroupId}`, settings, token)
      toast({ title: "Succès", description: "Paramètres de modération enregistrés." })
    } catch (error) {
      toast({ title: "Erreur", description: "Échec de l'enregistrement.", variant: "destructive" })
    }
  }

  const handleSaveProfile = async () => {
    if (!profile || !selectedSessionId || !selectedGroupId) return
    try {
      const token = await getToken()
      await api.post(`/api/v1/moderation/groups/profile/${selectedSessionId}/${selectedGroupId}`, profile, token)
      toast({ title: "Succès", description: "Profil du groupe mis à jour." })
    } catch (error) {
      toast({ title: "Erreur", description: "Échec de la mise à jour.", variant: "destructive" })
    }
  }

  if (isLoading && !sessions.length) {
    return (
      <div className="flex flex-col gap-6 animate-pulse">
        <div className="h-8 w-64 bg-muted rounded" />
        <div className="grid gap-6 md:grid-cols-3">
          <div className="md:col-span-1 h-[600px] bg-muted rounded-xl" />
          <div className="md:col-span-2 h-[600px] bg-muted rounded-xl" />
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-8 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-muted-foreground mb-1">
            <LayoutDashboard className="w-4 h-4" />
            <span className="text-sm font-medium">Dashboard</span>
            <span className="text-muted-foreground/40">/</span>
            <span className="text-sm font-medium text-foreground">Command Center</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Group Command Center</h1>
          <p className="text-muted-foreground text-sm">Gérez, animez et modérez vos groupes WhatsApp en un seul endroit.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex flex-col gap-1.5 min-w-[200px]">
            <Label htmlFor="session-select" className="text-[10px] uppercase font-bold text-muted-foreground px-1">Compte WhatsApp</Label>
            <select
              id="session-select"
              className="w-full bg-card border border-border rounded-lg h-10 px-3 text-sm focus:ring-1 focus:ring-primary outline-none shadow-sm"
              value={selectedSessionId}
              onChange={(e) => setSelectedSessionId(e.target.value)}
            >
              {sessions.map(s => (
                <option key={s.sessionId} value={s.sessionId}>
                  {s.sessionId} ({s.status})
                </option>
              ))}
            </select>
          </div>
          <Button variant="outline" size="icon" className="h-10 w-10 mt-5 border-border shadow-sm" onClick={fetchData}>
            <Zap className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-8">
        <div className="md:col-span-4 lg:col-span-3 flex flex-col gap-4">
          <Card className="border-border/50 shadow-sm h-[calc(100vh-280px)] overflow-hidden flex flex-col">
            <CardHeader className="p-4 border-b border-border/50 bg-muted/20 shrink-0">
              <div className="flex items-center justify-between mb-3">
                <CardTitle className="text-sm font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Vos Groupes
                </CardTitle>
                <Badge variant="outline" className="text-[10px] px-1.5 h-5">{groups.length}</Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
                <Input placeholder="Rechercher..." className="h-8 pl-8 text-xs bg-background/50 border-border/50" />
              </div>
            </CardHeader>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {groups.length === 0 ? (
                <div className="p-8 text-center flex flex-col items-center gap-3">
                  <div className="p-3 bg-muted rounded-full">
                    <Users className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <p className="text-xs text-muted-foreground">Aucun groupe trouvé.</p>
                </div>
              ) : (
                groups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-lg transition-all duration-200 group relative",
                      selectedGroupId === group.id 
                        ? "bg-primary text-primary-foreground shadow-md ring-1 ring-primary/20" 
                        : "hover:bg-muted/50 text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <div className={cn(
                      "w-10 h-10 rounded-lg flex items-center justify-center font-bold text-xs shrink-0 transition-transform group-hover:scale-105",
                      selectedGroupId === group.id ? "bg-white/20" : "bg-muted"
                    )}>
                      {group.name.charAt(0)}
                    </div>
                    <div className="flex-1 text-left overflow-hidden">
                      <p className="text-xs font-semibold truncate">{group.name}</p>
                      <p className={cn(
                        "text-[10px] flex items-center gap-1",
                        selectedGroupId === group.id ? "text-primary-foreground/70" : "text-muted-foreground/60"
                      )}>
                        <Users className="w-2.5 h-2.5" />
                        {group.participantsCount} participants
                      </p>
                    </div>
                    {selectedGroupId === group.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-white rounded-r-full" />
                    )}
                  </button>
                ))
              )}
            </div>
            <CardFooter className="p-3 border-t border-border/50 bg-muted/5">
              <Button variant="ghost" className="w-full h-8 text-xs gap-2 font-medium" onClick={() => fetchGroups(selectedSessionId)}>
                <History className="w-3.5 h-3.5" />
                Actualiser la liste
              </Button>
            </CardFooter>
          </Card>
        </div>

        <div className="md:col-span-8 lg:col-span-9">
          {!selectedGroupId ? (
            <Card className="h-full min-h-[500px] border-dashed border-2 border-border/50 bg-muted/5 flex flex-col items-center justify-center p-12 text-center">
              <div className="relative mb-6">
                <div className="absolute -inset-4 bg-primary/10 rounded-full animate-pulse" />
                <Users className="w-16 h-16 text-primary relative" />
              </div>
              <h3 className="text-xl font-bold mb-2">Sélectionnez un groupe</h3>
              <p className="text-muted-foreground text-sm max-w-sm">
                Choisissez un groupe dans la liste de gauche pour configurer la modération, planifier des messages et gérer la croissance.
              </p>
              <div className="grid grid-cols-2 gap-4 mt-8 w-full max-w-md">
                <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col items-center gap-2">
                  <Shield className="w-5 h-5 text-blue-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Anti-Link</span>
                </div>
                <div className="p-4 rounded-xl border border-border bg-card shadow-sm flex flex-col items-center gap-2">
                  <Bot className="w-5 h-5 text-purple-500" />
                  <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">AI Support</span>
                </div>
              </div>
            </Card>
          ) : (
            <Tabs defaultValue="overview" className="h-full flex flex-col" onValueChange={setActiveTab}>
              <div className="flex items-center justify-between bg-card border border-border rounded-xl p-1 mb-6 shadow-sm">
                <TabsList className="bg-transparent border-none p-0 flex-1 justify-start h-auto gap-1">
                  <TabsTrigger value="overview" className="h-9 px-4 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all">
                    Overview
                  </TabsTrigger>
                  <TabsTrigger value="moderation" className="h-9 px-4 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all">
                    Modération
                  </TabsTrigger>
                  <TabsTrigger value="animator" className="h-9 px-4 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all">
                    Animation
                  </TabsTrigger>
                  <TabsTrigger value="profile" className="h-9 px-4 text-xs font-semibold data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-lg transition-all">
                    Growth Hub
                  </TabsTrigger>
                </TabsList>
                <div className="px-3 border-l border-border flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase text-muted-foreground">Connected</span>
                </div>
              </div>

              <TabsContent value="overview" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card className="shadow-sm border-border/50 bg-gradient-to-br from-blue-500/10 to-transparent">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Membres Actifs</CardDescription>
                        <CardTitle className="text-3xl font-bold flex items-center justify-between">
                          {groups.find(g => g.id === selectedGroupId)?.participantsCount || 0}
                          <Users className="w-5 h-5 text-blue-500" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-1 text-[10px] text-green-600 font-bold">
                          +12% cette semaine
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm border-border/50 bg-gradient-to-br from-orange-500/10 to-transparent">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Modérations</CardDescription>
                        <CardTitle className="text-3xl font-bold flex items-center justify-between">
                          24
                          <Shield className="w-5 h-5 text-orange-500" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center gap-1 text-[10px] text-muted-foreground font-bold">
                          Anti-link actif
                        </div>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm border-border/50 bg-gradient-to-br from-purple-500/10 to-transparent">
                      <CardHeader className="pb-2">
                        <CardDescription className="text-[10px] font-bold uppercase tracking-wider">Health Score</CardDescription>
                        <CardTitle className="text-3xl font-bold flex items-center justify-between">
                          98%
                          <Sparkles className="w-5 h-5 text-purple-500" />
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <Progress value={98} className="h-1.5" />
                      </CardContent>
                    </Card>
                  </div>

                  <Card className="shadow-sm border-border/50 overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between bg-muted/20 border-b border-border/50 pb-4">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <BarChart3 className="w-5 h-5 text-primary" />
                          Activité du Groupe
                        </CardTitle>
                        <CardDescription>Visualisation des messages et actions automatiques</CardDescription>
                      </div>
                      <Badge className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20">Live Sync</Badge>
                    </CardHeader>
                    <CardContent className="pt-8">
                      <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={activityData}>
                            <defs>
                              <linearGradient id="colorMsg" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                            <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                            <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--background))', borderColor: 'hsl(var(--border))', borderRadius: '8px' }} />
                            <Area type="monotone" dataKey="messages" stroke="hsl(var(--primary))" strokeWidth={2} fillOpacity={1} fill="url(#colorMsg)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>

              <TabsContent value="moderation" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-7 flex flex-col gap-6">
                    <Card className="shadow-sm border-border/50">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Shield className="w-5 h-5 text-blue-500" />
                          Règles de Modération
                        </CardTitle>
                        <CardDescription>Configurez la surveillance automatique du groupe.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/10">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Activer la Modération</Label>
                            <p className="text-xs text-muted-foreground">Active ou désactive toutes les règles automatiques.</p>
                          </div>
                          <Switch 
                            checked={settings?.is_active || false} 
                            onCheckedChange={(v) => setSettings(s => s ? {...s, is_active: v} : null)} 
                          />
                        </div>

                        <div className="flex items-center justify-between p-4 rounded-xl border border-border bg-muted/10">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Anti-Link WhatsApp</Label>
                            <p className="text-xs text-muted-foreground">Supprime automatiquement les liens externes.</p>
                          </div>
                          <Switch 
                            checked={settings?.anti_link || false} 
                            onCheckedChange={(v) => setSettings(s => s ? {...s, anti_link: v} : null)} 
                          />
                        </div>

                        <div className="space-y-3">
                          <Label className="text-sm font-bold">Mots Interdits</Label>
                          <Textarea 
                            placeholder="Entrez les mots séparés par des virgules (ex: scam, crypto, insulte...)"
                            className="min-h-[100px] resize-none bg-muted/5"
                            value={settings?.bad_words || ""}
                            onChange={(e) => setSettings(s => s ? {...s, bad_words: e.target.value} : null)}
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-border/50">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Bell className="w-5 h-5 text-purple-500" />
                          Système d'Avertissements
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Max Avertissements</Label>
                            <Input 
                              type="number" 
                              value={settings?.max_warnings || 5} 
                              onChange={(e) => setSettings(s => s ? {...s, max_warnings: parseInt(e.target.value)} : null)}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Action Finale</Label>
                            <Badge className="w-full h-10 bg-destructive/10 text-destructive border-destructive/20 justify-center">
                              <Ban className="w-3.5 h-3.5 mr-2" /> Expulsion Auto
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-3">
                          <Label className="text-sm font-bold">Modèle d'Avertissement</Label>
                          <Textarea 
                            className="font-mono text-xs bg-muted/5"
                            value={settings?.warning_template || ""}
                            onChange={(e) => setSettings(s => s ? {...s, warning_template: e.target.value} : null)}
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="border-t border-border/50 bg-muted/5 pt-4">
                        <Button className="w-full shadow-lg" onClick={handleSaveSettings}>
                          <CheckCircle2 className="w-4 h-4 mr-2" /> Enregistrer la Configuration
                        </Button>
                      </CardFooter>
                    </Card>
                  </div>

                  <div className="lg:col-span-5 flex flex-col gap-6">
                    <Card className="shadow-sm border-border/50 bg-primary/5 border-primary/20">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <Bot className="w-5 h-5 text-primary" />
                          Assistant IA
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between p-4 rounded-xl border border-primary/20 bg-background/50">
                          <div className="space-y-0.5">
                            <Label className="text-sm font-bold">Réponses IA Actives</Label>
                          </div>
                          <Switch 
                            checked={settings?.ai_assistant_enabled || false} 
                            onCheckedChange={(v) => setSettings(s => s ? {...s, ai_assistant_enabled: v} : null)} 
                          />
                        </div>
                      </CardContent>
                    </Card>

                    <Card className="shadow-sm border-border/50">
                      <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                          <UserPlus className="w-5 h-5 text-green-500" />
                          Bienvenue
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div className="flex items-center justify-between">
                          <Label className="text-sm font-bold">Activer</Label>
                          <Switch 
                            checked={settings?.welcome_enabled || false} 
                            onCheckedChange={(v) => setSettings(s => s ? {...s, welcome_enabled: v} : null)} 
                          />
                        </div>
                        <Textarea 
                          placeholder="Bonjour @{{name}}! Bienvenue..."
                          className="min-h-[150px] text-xs bg-muted/5"
                          value={settings?.welcome_template || ""}
                          onChange={(e) => setSettings(s => s ? {...s, welcome_template: e.target.value} : null)}
                        />
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="animator" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="shadow-sm border-border/50">
                  <CardHeader className="flex flex-row items-center justify-between border-b border-border/50 bg-muted/10 pb-4">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-primary" />
                      Messages Programmés
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-0">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/30">
                          <TableHead>Contenu</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Statut</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {tasks.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="h-48 text-center text-muted-foreground">
                              Aucun message programmé.
                            </TableCell>
                          </TableRow>
                        ) : (
                          tasks.map(task => (
                            <TableRow key={task.id}>
                              <TableCell className="text-xs">{task.message_content}</TableCell>
                              <TableCell className="text-[10px]">{format(new Date(task.scheduled_at), "dd MMM, HH:mm", { locale: fr })}</TableCell>
                              <TableCell>
                                <Badge variant="outline" className="text-[9px]">{task.status}</Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="profile" className="mt-0 animate-in fade-in slide-in-from-bottom-2 duration-300">
                <Card className="shadow-sm border-border/50">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                      <Trophy className="w-5 h-5 text-yellow-500" />
                      Growth Profile
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-3">
                      <Label className="text-sm font-bold">Mission du Groupe</Label>
                      <Textarea 
                        placeholder="Quelle est la raison d'être de ce groupe ?"
                        className="min-h-[100px] bg-muted/5"
                        value={profile?.mission || ""}
                        onChange={(e) => setProfile(p => p ? {...p, mission: e.target.value} : {mission: e.target.value, objectives: '', rules: '', theme: ''})}
                      />
                    </div>
                    <div className="space-y-3">
                      <Label className="text-sm font-bold">Règles (IA)</Label>
                      <Textarea 
                        placeholder="Détaillez les règles..."
                        className="min-h-[120px] bg-muted/5"
                        value={profile?.rules || ""}
                        onChange={(e) => setProfile(p => p ? {...p, rules: e.target.value} : {mission: '', objectives: '', rules: e.target.value, theme: ''})}
                      />
                    </div>
                  </CardContent>
                  <CardFooter className="border-t border-border/50 bg-muted/5 pt-4">
                    <Button className="w-full bg-yellow-600 hover:bg-yellow-700 text-white" onClick={handleSaveProfile}>
                      <Sparkles className="w-4 h-4 mr-2" /> Optimiser l'Intelligence
                    </Button>
                  </CardFooter>
                </Card>
              </TabsContent>
            </Tabs>
          )}
        </div>
      </div>
    </div>
  )
}
