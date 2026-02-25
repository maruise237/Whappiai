"use client"

import * as React from "react"
import { 
  Shield, 
  Search, 
  ShieldAlert,
  Zap,
  Users,
  ChevronRight,
  Save,
  Loader2,
  Lock,
  Megaphone,
  BellRing,
  Info
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useAuth } from "@clerk/nextjs"

export default function GroupHub() {
  const { getToken } = useAuth()
  const [sessions, setSessions] = React.useState<any[]>([])
  const [selectedSessionId, setSelectedSessionId] = React.useState<string>("")
  const [groups, setGroups] = React.useState<any[]>([])
  const [filteredGroups, setFilteredGroups] = React.useState<any[]>([])
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)

  // Combined State for Group Control
  const [groupSettings, setGroupSettings] = React.useState<any>(null)

  const fetchSessions = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const data = await api.sessions.list(token || undefined)
      setSessions(data || [])
      if (data?.length > 0 && !selectedSessionId) setSelectedSessionId(data[0].sessionId)
    } catch (e) {
      toast.error("Erreur de chargement")
    } finally {
      setIsLoading(false)
    }
  }, [getToken, selectedSessionId])

  const fetchGroups = async (sid: string) => {
    if (!sid) return
    try {
      const token = await getToken()
      const data = await api.sessions.getGroups(sid, token || undefined)
      const groupsArray = Array.isArray(data) ? data : []
      setGroups(groupsArray)
      setFilteredGroups(groupsArray)
      if (groupsArray.length > 0 && !selectedGroupId) {
         setSelectedGroupId(groupsArray[0].id)
      }
    } catch (e) {
      console.error("Fetch groups error", e)
    }
  }

  React.useEffect(() => { fetchSessions() }, [fetchSessions])
  React.useEffect(() => { if (selectedSessionId) fetchGroups(selectedSessionId) }, [selectedSessionId])

  React.useEffect(() => {
    const lower = searchQuery.toLowerCase()
    setFilteredGroups(groups.filter(g => (g?.subject || g?.name || '').toLowerCase().includes(lower)))
  }, [searchQuery, groups])

  const handleSelectGroup = (gid: string) => {
    setSelectedGroupId(gid)
    const group = groups.find(g => g.id === gid)
    if (group) {
      setGroupSettings({
        ...(group.settings || {}),
        subject: group.subject || group.name
      })
    }
  }

  React.useEffect(() => {
    if (selectedGroupId && groups.length > 0) {
      const group = groups.find(g => g.id === selectedGroupId)
      if (group && !groupSettings) {
        handleSelectGroup(selectedGroupId)
      }
    }
  }, [selectedGroupId, groups])

  const handleSave = async () => {
    if (!selectedGroupId || !selectedSessionId || !groupSettings) return
    setIsSaving(true)
    try {
      const token = await getToken()
      await api.sessions.updateGroupSettings(selectedSessionId, selectedGroupId, groupSettings, token || undefined)
      toast.success("Réglages du groupe enregistrés")
      fetchGroups(selectedSessionId)
    } catch (e) {
      toast.error("Erreur d'enregistrement")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="p-12 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" /> Contrôle des Groupes
          </h1>
          <p className="text-sm text-muted-foreground">Gérez la sécurité et l&apos;engagement de vos communautés.</p>
        </div>
        <Select value={selectedSessionId} onValueChange={v => { setSelectedSessionId(v); setSelectedGroupId(null); setGroupSettings(null); }}>
          <SelectTrigger className="w-full sm:w-48 h-9 text-xs">
            <SelectValue placeholder="Session" />
          </SelectTrigger>
          <SelectContent>
            {sessions.map(s => (
              <SelectItem key={s.sessionId} value={s.sessionId}>{s.sessionId}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
        {/* Sidebar Groupes */}
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Chercher un groupe..."
              className="pl-8 h-8 text-[11px]"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Card className="overflow-hidden border-border/50">
             <ScrollArea className="h-[calc(100vh-20rem)] min-h-[300px]">
                <div className="p-1 space-y-0.5">
                   {filteredGroups.length === 0 ? (
                     <p className="p-4 text-[10px] text-center text-muted-foreground uppercase tracking-widest">Aucun groupe</p>
                   ) : (
                     filteredGroups.map(g => (
                       <button
                         key={g.id}
                         onClick={() => handleSelectGroup(g.id)}
                         className={cn(
                           "w-full flex items-center justify-between p-2.5 text-[12px] rounded-md transition-all text-left",
                           selectedGroupId === g.id ? "bg-primary text-primary-foreground font-medium shadow-md shadow-primary/20" : "hover:bg-muted text-muted-foreground hover:text-foreground"
                         )}
                       >
                         <span className="truncate flex-1 pr-2">{g.subject || g.name || 'Inconnu'}</span>
                         <ChevronRight className={cn("h-3 w-3 opacity-50", selectedGroupId === g.id && "opacity-100")} />
                       </button>
                     ))
                   )}
                </div>
             </ScrollArea>
          </Card>
        </div>

        {/* Zone de configuration */}
        <div className="space-y-4 min-w-0">
          {!selectedGroupId ? (
            <div className="h-full flex flex-col items-center justify-center p-12 text-center border-2 border-dashed rounded-xl bg-muted/5">
               <ShieldAlert className="h-10 w-10 text-muted-foreground/30 mb-4" />
               <p className="text-sm text-muted-foreground">Sélectionnez un groupe à gauche pour configurer ses paramètres.</p>
            </div>
          ) : (
            <Card className="border-primary/10">
              <CardHeader className="pb-4 flex flex-row items-center justify-between space-y-0">
                <div className="space-y-1">
                   <div className="flex items-center gap-2">
                      <CardTitle className="text-base truncate max-w-[300px]">{groupSettings?.subject}</CardTitle>
                      <Badge variant="secondary" className="text-[9px] uppercase h-4">ID: {selectedGroupId.split('@')[0]}</Badge>
                   </div>
                   <CardDescription className="text-xs">Paramètres de sécurité et de bienvenue.</CardDescription>
                </div>
                <Button size="sm" onClick={handleSave} disabled={isSaving}>
                   {isSaving ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : <Save className="h-3 w-3 mr-2" />}
                   Enregistrer
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                <Tabs defaultValue="safety" className="w-full">
                   <TabsList className="w-full rounded-none border-y bg-muted/30 h-10 px-4 gap-4 justify-start">
                      <TabsTrigger value="safety" className="text-xs gap-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 border-primary rounded-none h-10"><Lock className="h-3 w-3" /> Protection</TabsTrigger>
                      <TabsTrigger value="welcome" className="text-xs gap-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 border-primary rounded-none h-10"><BellRing className="h-3 w-3" /> Accueil</TabsTrigger>
                      <TabsTrigger value="engagement" className="text-xs gap-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 border-primary rounded-none h-10"><Megaphone className="h-3 w-3" /> Engagement</TabsTrigger>
                      <TabsTrigger value="info" className="text-xs gap-2 data-[state=active]:bg-transparent data-[state=active]:border-b-2 border-primary rounded-none h-10"><Info className="h-3 w-3" /> Infos</TabsTrigger>
                   </TabsList>

                   <TabsContent value="safety" className="p-6 space-y-6 animate-in fade-in duration-200">
                      <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                               <p className="text-sm font-semibold">Modération Active</p>
                               <p className="text-[11px] text-muted-foreground">Activer le bot en tant que gendarme du groupe.</p>
                            </div>
                            <Switch checked={!!groupSettings?.is_active} onCheckedChange={v => setGroupSettings({...groupSettings, is_active: v})} />
                         </div>
                         <Separator />
                         <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                               <p className="text-sm font-semibold">Anti-Lien</p>
                               <p className="text-[11px] text-muted-foreground">Supprime automatiquement les liens (sauf admins).</p>
                            </div>
                            <Switch checked={!!groupSettings?.anti_link} onCheckedChange={v => setGroupSettings({...groupSettings, anti_link: v})} />
                         </div>
                         <Separator />
                         <div className="space-y-2">
                            <Label className="text-[11px] font-bold uppercase text-muted-foreground">Mots Interdits</Label>
                            <Textarea
                              placeholder="mot1, mot2, mot3..."
                              className="min-h-[80px] text-sm resize-none"
                              value={groupSettings?.bad_words || ""}
                              onChange={e => setGroupSettings({...groupSettings, bad_words: e.target.value})}
                            />
                            <p className="text-[10px] text-muted-foreground italic">Séparez les mots par des virgules.</p>
                         </div>
                      </div>
                   </TabsContent>

                   <TabsContent value="engagement" className="p-6 space-y-6 animate-in fade-in duration-200">
                      <div className="space-y-4">
                         <div className="p-4 rounded-lg border border-primary/10 bg-primary/5">
                            <h4 className="text-sm font-bold mb-1">Engagement Automatisé</h4>
                            <p className="text-[11px] text-muted-foreground">Prochainement : Planifiez des messages d&apos;engagement pour vos membres.</p>
                         </div>
                         <Button variant="outline" size="sm" className="w-full text-[10px]" disabled>Ouvrir le programmateur</Button>
                      </div>
                   </TabsContent>

                   <TabsContent value="welcome" className="p-6 space-y-6 animate-in fade-in duration-200">
                      <div className="space-y-4">
                         <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                               <p className="text-sm font-semibold">Message de Bienvenue</p>
                               <p className="text-[11px] text-muted-foreground">Saluer automatiquement les nouveaux arrivants.</p>
                            </div>
                            <Switch checked={!!groupSettings?.welcome_enabled} onCheckedChange={v => setGroupSettings({...groupSettings, welcome_enabled: v})} />
                         </div>
                         {groupSettings?.welcome_enabled && (
                           <div className="space-y-3 pt-2 animate-in slide-in-from-top-2">
                              <Label className="text-[11px] font-bold uppercase text-muted-foreground">Template du message</Label>
                              <Textarea
                                placeholder="Bienvenue @{{name}} dans le groupe !"
                                className="min-h-[120px] text-sm"
                                value={groupSettings?.welcome_template || ""}
                                onChange={e => setGroupSettings({...groupSettings, welcome_template: e.target.value})}
                              />
                              <div className="flex flex-wrap gap-1">
                                 {['@{{name}}', '{{group_name}}', '{{date}}'].map(tag => (
                                   <Badge key={tag} variant="outline" className="text-[9px] cursor-pointer hover:bg-primary/5 transition-colors" onClick={() => setGroupSettings({...groupSettings, welcome_template: (groupSettings.welcome_template || "") + tag})}>
                                      {tag}
                                   </Badge>
                                 ))}
                              </div>
                           </div>
                         )}
                      </div>
                   </TabsContent>

                   <TabsContent value="info" className="p-6 space-y-6">
                      <div className="grid grid-cols-2 gap-4">
                         <div className="p-4 rounded-lg bg-muted/50 border text-center">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Membres</p>
                            <p className="text-2xl font-bold">--</p>
                         </div>
                         <div className="p-4 rounded-lg bg-muted/50 border text-center">
                            <p className="text-[10px] uppercase font-bold text-muted-foreground mb-1">Activité</p>
                            <Badge className="bg-green-500/10 text-green-600 border-green-500/20">Stable</Badge>
                         </div>
                      </div>
                      <div className="p-4 rounded-lg border border-amber-500/20 bg-amber-500/5 flex gap-3">
                         <Megaphone className="h-5 w-5 text-amber-600 shrink-0" />
                         <p className="text-xs text-amber-800 leading-relaxed">Pour que la modération fonctionne, le bot doit être **administrateur** de ce groupe.</p>
                      </div>
                   </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
