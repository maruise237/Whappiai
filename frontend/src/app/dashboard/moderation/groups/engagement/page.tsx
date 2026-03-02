"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Users,
  MessageSquare,
  Calendar,
  Sparkles,
  Zap,
  Plus,
  Trash2,
  Loader2,
  Save,
  ArrowLeft,
  Search,
  Clock,
  History
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn, copyToClipboard, ensureString, safeRender } from "@/lib/utils"

function GroupEngagementContent() {
  const router = useRouter()
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [groups, setGroups] = React.useState<any[]>([])
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [generationGoal, setGenerationGoal] = React.useState("")
  const [scheduledAt, setScheduledAt] = React.useState("")
  const [recurrence, setRecurrence] = React.useState<"none" | "daily" | "weekly">("none")
  const [directMessage, setDirectMessage] = React.useState("")

  const [profile, setProfile] = React.useState<any>({
    mission: "",
    objectives: "",
    rules: "",
    theme: ""
  })
  const [links, setLinks] = React.useState<any[]>([])
  const [tasks, setTasks] = React.useState<any[]>([])

  const fetchGroups = React.useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const token = await getToken()
      const data = await api.sessions.getGroups(sessionId, token || undefined)
      const gData = Array.isArray(data) ? data : []
      setGroups(gData)
      if (gData.length > 0 && !selectedGroupId) {
        setSelectedGroupId(gData[0].id)
      }
    } catch (e: any) {
      toast.error("Erreur de chargement des groupes")
    } finally {
      setLoading(false)
    }
  }, [sessionId, getToken, selectedGroupId])

  React.useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const fetchGroupDetails = React.useCallback(async () => {
    if (!sessionId || !selectedGroupId) return
    try {
      const token = await getToken()
      const [profileData, linksData, tasksData] = await Promise.all([
        api.sessions.getGroupProfile(sessionId, selectedGroupId, token || undefined),
        api.sessions.getGroupLinks(sessionId, selectedGroupId, token || undefined),
        api.sessions.getEngagementTasks(sessionId, selectedGroupId, token || undefined)
      ])
      setProfile(profileData || { mission: "", objectives: "", rules: "", theme: "" })
      setLinks(Array.isArray(linksData) ? linksData : [])
      setTasks(Array.isArray(tasksData) ? tasksData : [])
    } catch (e) { console.error(e) }
  }, [sessionId, selectedGroupId, getToken])

  React.useEffect(() => {
    fetchGroupDetails()
  }, [fetchGroupDetails])

  const handleSaveProfile = async () => {
    if (!sessionId || !selectedGroupId) return
    setIsSaving(true)
    try {
      const token = await getToken()
      await api.sessions.updateGroupProfile(sessionId, selectedGroupId, profile, token || undefined)
      toast.success("Profil du groupe mis &agrave; jour")
    } catch (e: any) {
      toast.error("Erreur de sauvegarde")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSaveLinks = async () => {
    if (!sessionId || !selectedGroupId) return
    setIsSaving(true)
    try {
      const token = await getToken()
      await api.sessions.updateGroupLinks(sessionId, selectedGroupId, links, token || undefined)
      toast.success("Liens enregistr&eacute;s")
    } catch (e: any) {
      toast.error("Erreur de sauvegarde des liens")
    } finally {
      setIsSaving(false)
    }
  }

  const handleScheduleMessage = async () => {
    if (!sessionId || !selectedGroupId || !directMessage.trim() || !scheduledAt) {
      return toast.error("Veuillez remplir le message et la date")
    }

    setIsSaving(true)
    try {
      const token = await getToken()
      await api.sessions.addEngagementTask(sessionId, selectedGroupId, {
        message_content: directMessage,
        recurrence: recurrence,
        scheduled_at: new Date(scheduledAt).toISOString(),
        type: 'text'
      }, token || undefined)

      toast.success("Message programm&eacute;")
      setDirectMessage("")
      setScheduledAt("")
      setRecurrence("none")
      fetchGroupDetails()
    } catch (e: any) {
      toast.error("Erreur de programmation")
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerate = async () => {
    if (!sessionId || !selectedGroupId || !generationGoal.trim()) {
       return toast.error("Veuillez d&eacute;crire un objectif de campagne")
    }

    setIsGenerating(true)
    const toastId = toast.loading("L&apos;IA g&eacute;n&egrave;re votre campagne...")

    try {
       const token = await getToken()
       const response = await api.sessions.generateGroupMessage(sessionId, selectedGroupId, { objective: generationGoal, includeLinks: true }, token || undefined)

       toast.success("Message g&eacute;n&eacute;r&eacute; avec succ&egrave;s", { id: toastId })

       if (response && response.message) {
          setDirectMessage(response.message)
          await copyToClipboard(response.message);
       }
       setGenerationGoal("")
    } catch (e: any) {
       toast.error("&Eacute;chec de la g&eacute;n&eacute;ration", { id: toastId })
    } finally {
       setIsGenerating(false)
    }
  }

  const filteredGroups = groups.filter(g =>
    ensureString(g.subject || g.name).toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) return <div className="p-12 text-center text-muted-foreground">Chargement...</div>
  if (!sessionId) return <div className="p-12 text-center text-muted-foreground">Session non trouv&eacute;e</div>

  return (
    <div className="space-y-6 pb-20">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-xl font-semibold">Engagement &amp; Strat&eacute;gie</h1>
            <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-widest px-2 h-5">
              {safeRender(sessionId)}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
        <Card className="border-none shadow-none bg-muted/10 h-auto lg:h-[calc(100vh-12rem)] flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-8 h-8 text-[11px] bg-background border-none shadow-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex flex-row lg:flex-col overflow-x-auto lg:overflow-y-auto p-2 gap-1 no-scrollbar">
              {filteredGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={cn(
                    "flex-none lg:w-full text-left p-2.5 rounded-md text-xs transition-colors flex items-center justify-between group whitespace-nowrap lg:whitespace-normal",
                    selectedGroupId === group.id
                      ? "bg-primary/10 text-primary font-bold shadow-sm"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <span className="truncate flex-1 pr-2">{safeRender(group.subject || group.name, 'Groupe sans nom')}</span>
                </button>
              ))}
          </div>
        </Card>

        <div className="space-y-6">
           {!selectedGroupId ? (
             <div className="h-64 flex flex-col items-center justify-center text-muted-foreground/20">
                <Users className="h-12 w-12 mb-3" />
                <p className="text-sm font-bold uppercase tracking-widest">S&eacute;lectionnez un groupe</p>
             </div>
           ) : (
             <Tabs defaultValue="profil" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-lg h-10 w-full sm:w-fit gap-1">
                   <TabsTrigger value="profil" className="text-[11px] uppercase font-bold tracking-wider px-6">Profil</TabsTrigger>
                   <TabsTrigger value="liens" className="text-[11px] uppercase font-bold tracking-wider px-6">Liens</TabsTrigger>
                   <TabsTrigger value="engagement" className="text-[11px] uppercase font-bold tracking-wider px-6">Engagement</TabsTrigger>
                </TabsList>

                <TabsContent value="profil" className="space-y-6">
                   <Card className="border-none shadow-none bg-muted/20">
                      <CardHeader className="pb-4">
                         <CardTitle className="text-sm">Identit&eacute; du Groupe</CardTitle>
                         <CardDescription className="text-xs">D&eacute;finissez l&apos;ADN du groupe pour orienter l&apos;IA.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-0">
                         <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mission du groupe</Label>
                            <Textarea
                               placeholder="D&eacute;crivez la raison d&apos;&ecirc;tre du groupe..."
                               className="min-h-[80px] text-xs bg-card"
                               value={profile.mission || ""}
                               onChange={e => setProfile({...profile, mission: e.target.value})}
                            />
                         </div>
                         <div className="flex justify-end pt-2">
                           <Button size="sm" onClick={handleSaveProfile} disabled={isSaving}>
                             {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                             Enregistrer
                           </Button>
                         </div>
                      </CardContent>
                   </Card>
                </TabsContent>

                <TabsContent value="liens" className="space-y-6">
                   <div className="space-y-4">
                      {links.map((link, idx) => (
                        <Card key={idx} className="p-4 bg-card border">
                           <div className="space-y-3">
                              <Input value={link.title} onChange={e => {
                                 const n = [...links]; n[idx].title = e.target.value; setLinks(n);
                              }} className="h-8 text-xs font-bold" />
                              <Input value={link.url} onChange={e => {
                                 const n = [...links]; n[idx].url = e.target.value; setLinks(n);
                              }} className="h-8 text-xs font-mono" />
                           </div>
                        </Card>
                      ))}
                      <Button size="sm" onClick={handleSaveLinks} disabled={isSaving}>Sauvegarder les liens</Button>
                   </div>
                </TabsContent>

                <TabsContent value="engagement" className="space-y-6">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <Card className="border-primary/20 bg-primary/5 shadow-none overflow-hidden h-fit">
                         <CardContent className="p-6">
                            <div className="flex items-start gap-4">
                               <Sparkles className="h-5 w-5 text-primary" />
                               <div className="space-y-3 flex-1">
                                  <h4 className="text-sm font-bold">G&eacute;n&eacute;rateur de Campagne IA</h4>
                                  <Textarea
                                    placeholder="Objectif de la campagne..."
                                    className="min-h-[80px] bg-background text-xs"
                                    value={generationGoal}
                                    onChange={(e) => setGenerationGoal(e.target.value)}
                                  />
                                  <Button size="sm" className="w-full" onClick={handleGenerate} disabled={isGenerating}>G&eacute;n&eacute;rer</Button>
                               </div>
                            </div>
                         </CardContent>
                      </Card>

                      <Card className="border-none shadow-none bg-muted/20 h-fit">
                         <CardContent className="p-6 space-y-4">
                            <Textarea
                              placeholder="Message &agrave; envoyer..."
                              className="min-h-[120px] text-xs bg-card"
                              value={directMessage}
                              onChange={(e) => setDirectMessage(e.target.value)}
                            />
                            <div className="grid grid-cols-2 gap-2">
                              <div className="space-y-1">
                                 <Label className="text-[10px] uppercase font-bold text-muted-foreground">Date et Heure</Label>
                                 <Input type="datetime-local" className="h-9 text-xs" value={scheduledAt} onChange={e => setScheduledAt(e.target.value)} />
                              </div>
                              <div className="space-y-1">
                                 <Label className="text-[10px] uppercase font-bold text-muted-foreground">R&eacute;p&eacute;tition</Label>
                                 <Select value={recurrence} onValueChange={(v: any) => setRecurrence(v)}>
                                    <SelectTrigger className="h-9 text-xs">
                                       <SelectValue placeholder="R&eacute;p&eacute;tition" />
                                    </SelectTrigger>
                                    <SelectContent>
                                       <SelectItem value="none" className="text-xs">Pas de r&eacute;p&eacute;tition</SelectItem>
                                       <SelectItem value="daily" className="text-xs">Quotidien</SelectItem>
                                       <SelectItem value="weekly" className="text-xs">Hebdomadaire</SelectItem>
                                    </SelectContent>
                                 </Select>
                              </div>
                            </div>
                            <Button size="sm" className="w-full" onClick={handleScheduleMessage} disabled={isSaving}>Programmer</Button>
                         </CardContent>
                      </Card>
                   </div>
                </TabsContent>
             </Tabs>
           )}
        </div>
      </div>
    </div>
  )
}

export default function GroupEngagementPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
      <GroupEngagementContent />
    </React.Suspense>
  )
}
