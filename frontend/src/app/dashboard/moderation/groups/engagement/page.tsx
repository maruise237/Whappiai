"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Users,
  Search,
  ArrowLeft,
  Sparkles,
  Save,
  Loader2,
  Calendar,
  Send,
  Link as LinkIcon,
  Plus,
  Trash2,
  Settings2,
  MessageSquareText,
  Target,
  LayoutGrid
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn, ensureString, safeRender } from "@/lib/utils"

function GroupEngagementContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get("sessionId")
  const { getToken } = useAuth()

  const [groups, setGroups] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [profile, setProfile] = React.useState<any>({})
  const [links, setLinks] = React.useState<any[]>([])
  const [isSaving, setIsSaving] = React.useState(false)
  const [isGenerating, setIsGenerating] = React.useState(false)
  const [generationGoal, setGenerationGoal] = React.useState("")
  const [directMessage, setDirectMessage] = React.useState("")
  const [scheduledAt, setScheduledAt] = React.useState("")

  const fetchGroups = React.useCallback(async () => {
    if (!sessionId) return
    setLoading(true)
    try {
      const token = await getToken()
      const data = await api.sessions.groups(sessionId, token || undefined)
      setGroups(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error("Erreur lors du chargement des groupes")
    } finally {
      setLoading(false)
    }
  }, [sessionId, getToken])

  const fetchGroupDetails = React.useCallback(async () => {
    if (!sessionId || !selectedGroupId) return
    try {
      const token = await getToken()
      const data = await api.sessions.getGroupProfile(sessionId, selectedGroupId, token || undefined)
      setProfile(data?.profile || {})
      setLinks(data?.links || [])
    } catch (e) {
      console.error(e)
    }
  }, [sessionId, selectedGroupId, getToken])

  React.useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  React.useEffect(() => {
    fetchGroupDetails()
  }, [fetchGroupDetails])

  const handleSaveProfile = async () => {
    if (!sessionId || !selectedGroupId) return
    setIsSaving(true)
    try {
      const token = await getToken()
      await api.sessions.updateGroupProfile(sessionId, selectedGroupId, profile, token || undefined)
      toast.success("Profil mis à jour")
    } catch (e) {
      toast.error("Erreur de mise à jour")
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
      toast.success("Liens mis à jour")
    } catch (e) {
      toast.error("Erreur de mise à jour")
    } finally {
      setIsSaving(false)
    }
  }

  const handleScheduleMessage = async () => {
    if (!sessionId || !selectedGroupId || !directMessage) return
    setIsSaving(true)
    try {
      const token = await getToken()
      await api.sessions.scheduleMessage(sessionId, selectedGroupId, {
        message: directMessage,
        scheduledAt: scheduledAt || null
      }, token || undefined)
      toast.success(scheduledAt ? "Message programmé" : "Message envoyé")
      setDirectMessage("")
      setScheduledAt("")
      fetchGroupDetails()
    } catch (e: any) {
      toast.error("Erreur de programmation")
    } finally {
      setIsSaving(false)
    }
  }

  const handleGenerate = async () => {
    if (!sessionId || !selectedGroupId || !generationGoal.trim()) {
       return toast.error("Veuillez décrire un objectif de campagne")
    }

    setIsGenerating(true)
    const toastId = toast.loading("L'IA génère votre campagne...")

    try {
       const token = await getToken()
       const response = await api.sessions.generateGroupMessage(sessionId, selectedGroupId, { objective: generationGoal, includeLinks: true }, token || undefined)

       toast.success("Message généré avec succès", { id: toastId })

       if (response && response.message) {
          setDirectMessage(response.message)
       }
       setGenerationGoal("")
    } catch (e: any) {
       toast.error("Échec de la génération", { id: toastId })
    } finally {
       setIsGenerating(false)
    }
  }

  const filteredGroups = groups.filter(g =>
    ensureString(g.subject || g.name).toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
      <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">Chargement des données...</p>
    </div>
  )

  if (!sessionId) return (
    <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
      <Badge variant="destructive">Erreur</Badge>
      <p className="text-sm font-medium">Session non trouvée</p>
      <Button variant="outline" size="sm" onClick={() => router.push('/dashboard/moderation')}>Retour</Button>
    </div>
  )

  return (
    <div className="space-y-8 pb-20 max-w-7xl mx-auto">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full bg-muted/50 hover:bg-muted h-10 w-10">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight">Engagement & Stratégie</h1>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase font-black tracking-widest px-2 h-5">
                {safeRender(sessionId)}
              </Badge>
              <span className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest opacity-50">• {groups.length} Groupes détectés</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-8 items-start">
        {/* Sidebar Group List */}
        <Card className="border-border/40 shadow-none bg-muted/20 h-auto lg:h-[calc(100vh-14rem)] flex flex-col overflow-hidden rounded-2xl">
          <div className="p-4 border-b border-border/40 bg-card/50 backdrop-blur-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
              <Input
                placeholder="Filtrer les groupes..."
                className="pl-9 h-9 text-[11px] bg-background border-none shadow-none focus-visible:ring-1 focus-visible:ring-primary/20"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar">
              {filteredGroups.length === 0 ? (
                <div className="p-8 text-center space-y-2 opacity-30">
                  <Users className="h-8 w-8 mx-auto" />
                  <p className="text-[10px] font-bold uppercase tracking-widest">Aucun groupe</p>
                </div>
              ) : (
                filteredGroups.map(group => (
                  <button
                    key={group.id}
                    onClick={() => setSelectedGroupId(group.id)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl text-xs transition-all flex items-center gap-3 group relative overflow-hidden",
                      selectedGroupId === group.id
                        ? "bg-card text-foreground font-bold shadow-sm border border-border/40"
                        : "hover:bg-card/50 text-muted-foreground"
                    )}
                  >
                    {selectedGroupId === group.id && (
                      <div className="absolute left-0 top-0 w-1 h-full bg-primary" />
                    )}
                    <div className={cn(
                      "h-8 w-8 rounded-full flex items-center justify-center shrink-0",
                      selectedGroupId === group.id ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    )}>
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="truncate flex-1 font-medium">{safeRender(group.subject || group.name, 'Groupe sans nom')}</span>
                  </button>
                ))
              )}
          </div>
        </Card>

        {/* Content Area */}
        <div className="space-y-6">
           {!selectedGroupId ? (
             <Card className="h-[400px] flex flex-col items-center justify-center border-dashed border-2 bg-muted/5 rounded-3xl opacity-50">
                <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                  <LayoutGrid className="h-8 w-8" />
                </div>
                <h3 className="text-sm font-black uppercase tracking-[0.2em]">Sélectionnez un groupe</h3>
                <p className="text-xs text-muted-foreground mt-2">Choisissez une communauté pour commencer l&apos;optimisation.</p>
             </Card>
           ) : (
             <Tabs defaultValue="profil" className="space-y-6">
                <TabsList className="bg-muted/30 p-1 rounded-xl h-11 w-full sm:w-fit gap-1 border border-border/40">
                   <TabsTrigger value="profil" className="text-[10px] uppercase font-bold tracking-widest px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg">
                     <Target className="h-3.5 w-3.5 mr-2" /> Profil
                   </TabsTrigger>
                   <TabsTrigger value="liens" className="text-[10px] uppercase font-bold tracking-widest px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg">
                     <LinkIcon className="h-3.5 w-3.5 mr-2" /> Liens
                   </TabsTrigger>
                   <TabsTrigger value="engagement" className="text-[10px] uppercase font-bold tracking-widest px-6 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-lg">
                     <Sparkles className="h-3.5 w-3.5 mr-2" /> Stratégie
                   </TabsTrigger>
                </TabsList>

                <TabsContent value="profil" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <Card className="border-border/40 shadow-none bg-card/50 rounded-2xl overflow-hidden">
                      <CardHeader className="pb-6 border-b border-border/40 bg-muted/5">
                         <div className="flex items-center gap-3 mb-1">
                           <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                             <Target className="h-4 w-4 text-primary" />
                           </div>
                           <CardTitle className="text-sm font-bold">Identité du Groupe</CardTitle>
                         </div>
                         <CardDescription className="text-xs">Définissez la mission et les objectifs pour guider l&apos;intelligence artificielle.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6 pt-6">
                         <div className="space-y-3">
                            <Label className="text-[10px] uppercase font-black tracking-widest text-muted-foreground/60">Description & Mission</Label>
                            <Textarea
                               placeholder="Ex: Groupe d'entraide pour les entrepreneurs locaux, partage de conseils et réseautage..."
                               className="min-h-[120px] text-xs bg-muted/20 border-none focus-visible:ring-1 focus-visible:ring-primary/20 rounded-xl leading-relaxed"
                               value={profile.mission || ""}
                               onChange={e => setProfile({...profile, mission: e.target.value})}
                            />
                         </div>
                         <div className="flex justify-end border-t border-border/40 pt-4">
                           <Button size="sm" className="rounded-full px-6 font-bold text-[11px] uppercase tracking-widest h-9" onClick={handleSaveProfile} disabled={isSaving}>
                             {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                             Enregistrer les modifications
                           </Button>
                         </div>
                      </CardContent>
                   </Card>
                </TabsContent>

                <TabsContent value="liens" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {links.map((link, idx) => (
                        <Card key={idx} className="p-4 bg-card/50 border-border/40 shadow-none rounded-xl group relative">
                           <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <Label className="text-[9px] uppercase font-black tracking-widest text-muted-foreground/50">Lien #{idx + 1}</Label>
                                <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" onClick={() => {
                                  const n = [...links]; n.splice(idx, 1); setLinks(n);
                                }}>
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <Input
                                placeholder="Titre du lien"
                                value={link.title}
                                onChange={e => {
                                 const n = [...links]; n[idx].title = e.target.value; setLinks(n);
                                }}
                                className="h-8 text-[11px] font-bold bg-muted/20 border-none"
                              />
                              <Input
                                placeholder="https://..."
                                value={link.url}
                                onChange={e => {
                                 const n = [...links]; n[idx].url = e.target.value; setLinks(n);
                                }}
                                className="h-8 text-[11px] font-mono bg-muted/20 border-none text-primary"
                              />
                           </div>
                        </Card>
                      ))}
                      <button
                        onClick={() => setLinks([...links, { title: "", url: "" }])}
                        className="flex flex-col items-center justify-center p-8 border-2 border-dashed border-border/40 rounded-xl hover:bg-muted/10 hover:border-primary/20 transition-all group"
                      >
                        <Plus className="h-6 w-6 mb-2 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground/40 group-hover:text-primary transition-colors">Ajouter un lien</span>
                      </button>
                   </div>
                   {links.length > 0 && (
                     <div className="flex justify-end">
                       <Button size="sm" className="rounded-full px-6 font-bold text-[11px] uppercase tracking-widest" onClick={handleSaveLinks} disabled={isSaving}>Sauvegarder les liens</Button>
                     </div>
                   )}
                </TabsContent>

                <TabsContent value="engagement" className="space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {/* AI Generator */}
                      <Card className="border-primary/20 bg-primary/5 shadow-none overflow-hidden rounded-2xl">
                         <CardHeader className="pb-4">
                            <div className="flex items-center gap-2 mb-1">
                              <Sparkles className="h-4 w-4 text-primary" />
                              <CardTitle className="text-sm font-bold">Générateur de Campagne IA</CardTitle>
                            </div>
                            <CardDescription className="text-xs opacity-70">Décrivez votre objectif, l&apos;IA s&apos;occupe du reste.</CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-4">
                            <Textarea
                              placeholder="Ex: Crée une invitation engageante pour le webinaire de mardi prochain sur le marketing..."
                              className="min-h-[120px] bg-background border-none text-xs rounded-xl focus-visible:ring-1 focus-visible:ring-primary/30 leading-relaxed shadow-sm"
                              value={generationGoal}
                              onChange={(e) => setGenerationGoal(e.target.value)}
                            />
                            <Button size="sm" className="w-full rounded-full font-bold text-[11px] uppercase tracking-widest h-10 shadow-lg shadow-primary/20" onClick={handleGenerate} disabled={isGenerating}>
                              {isGenerating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Sparkles className="h-4 w-4 mr-2" />}
                              Générer le contenu
                            </Button>
                         </CardContent>
                      </Card>

                      {/* Manual Send/Schedule */}
                      <Card className="border-border/40 shadow-none bg-muted/20 rounded-2xl flex flex-col">
                         <CardHeader className="pb-4">
                            <div className="flex items-center gap-2 mb-1">
                              <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                              <CardTitle className="text-sm font-bold">Envoi & Programmation</CardTitle>
                            </div>
                            <CardDescription className="text-xs">Ajustez le message et planifiez son expédition.</CardDescription>
                         </CardHeader>
                         <CardContent className="space-y-4 flex-1 flex flex-col">
                            <Textarea
                              placeholder="Message à envoyer..."
                              className="flex-1 min-h-[120px] text-xs bg-card border-none rounded-xl focus-visible:ring-1 focus-visible:ring-primary/10 shadow-sm leading-relaxed"
                              value={directMessage}
                              onChange={(e) => setDirectMessage(e.target.value)}
                            />
                            <div className="space-y-3">
                              <div className="relative">
                                <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                                <Input
                                  type="datetime-local"
                                  className="pl-10 h-10 text-[11px] font-medium bg-card border-none rounded-xl shadow-sm"
                                  value={scheduledAt}
                                  onChange={e => setScheduledAt(e.target.value)}
                                />
                              </div>
                              <Button size="sm" className="w-full h-10 rounded-full font-bold text-[11px] uppercase tracking-widest transition-all" variant={scheduledAt ? "secondary" : "default"} onClick={handleScheduleMessage} disabled={isSaving || !directMessage}>
                                {scheduledAt ? <><Calendar className="h-4 w-4 mr-2" /> Programmer</> : <><Send className="h-4 w-4 mr-2" /> Envoyer maintenant</>}
                              </Button>
                            </div>
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
    <React.Suspense fallback={
      <div className="flex flex-col items-center justify-center min-h-[400px] space-y-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary/20" />
        <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/50">Initialisation...</p>
      </div>
    }>
      <GroupEngagementContent />
    </React.Suspense>
  )
}
