"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Save,
  Users,
  Search,
  ChevronRight,
  Loader2,
  Sparkles,
  Link as LinkIcon,
  Plus,
  Trash2,
  MessageSquare,
  Calendar,
  FileText,
  Target,
  Shield,
  Zap
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger
} from "@/components/ui/accordion"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn, copyToClipboard } from "@/lib/utils"
import confetti from "canvas-confetti"

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
      setGroups(Array.isArray(data) ? data : [])
      if (data && data.length > 0 && !selectedGroupId) {
        setSelectedGroupId(data[0].id)
      }
    } catch (e: any) {
      toast.error(e.message || "Erreur de chargement des groupes")
    } finally {
      setLoading(false)
    }
  }, [sessionId, getToken, selectedGroupId])

  React.useEffect(() => {
    fetchGroups()
  }, [fetchGroups])

  const selectedGroup = groups.find(g => g.id === selectedGroupId)

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
    } catch (e) {}
  }, [sessionId, selectedGroupId, getToken])

  React.useEffect(() => {
    if (selectedGroupId) {
      fetchGroupDetails()
    }
  }, [selectedGroupId, fetchGroupDetails])

  const handleSaveProfile = async () => {
    if (!sessionId || !selectedGroupId) return
    setIsSaving(true)
    try {
      const token = await getToken()
      await api.sessions.updateGroupProfile(sessionId, selectedGroupId, profile, token || undefined)
      toast.success("Profil du groupe mis à jour")
    } catch (e) {
      toast.error("Erreur lors de la sauvegarde du profil")
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
      toast.error("Erreur lors de la sauvegarde des liens")
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
       // FIX: Use 'objective' instead of 'goal' to match backend
       const response = await api.sessions.generateGroupMessage(sessionId, selectedGroupId, { objective: generationGoal, includeLinks: true }, token || undefined)

       toast.success("Message généré avec succès", { id: toastId })

       // Add the generated message to tasks (simulated, usually you'd review it)
       // But for now let's just clear the input and show success
       setGenerationGoal("")

       // Reload tasks to show the new one if the backend auto-scheduled it
       // Or the backend just returns the text and we should show it in a dialog
       if (response && response.message) {
          // Open a "Result" dialog or just copy to clipboard
          const success = await copyToClipboard(response.message);
          if (success) {
            toast.success("Message copié dans le presse-papier !");
          }
       }

       fetchGroupDetails()
    } catch (e: any) {
       toast.error("Échec de la génération", { id: toastId, description: e.message })
    } finally {
       setIsGenerating(false)
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    try {
      const token = await getToken()
      await api.sessions.deleteEngagementTask(taskId, token || undefined)
      setTasks(prev => prev.filter(t => t.id !== taskId))
      toast.success("Tâche supprimée")
    } catch (e) {
      toast.error("Erreur lors de la suppression")
    }
  }

  const filteredGroups = groups.filter(g =>
    (g.subject || g.name || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) return <div className="p-12 text-center text-muted-foreground">Chargement...</div>
  if (!sessionId) return <div className="p-12 text-center text-muted-foreground">Session non trouvée</div>

  return (
    <div className="space-y-6 pb-20">
      {/* Page Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-0.5">
            <h1 className="text-xl font-semibold">Engagement & Stratégie</h1>
            <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-widest px-2 h-5">
              {sessionId}
            </Badge>
          </div>
        </div>
        <Button size="sm" onClick={() => toast.success("Enregistré")} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-8 items-start">
        {/* Sidebar: Group List */}
        <Card className="border-none shadow-none bg-muted/10 h-[calc(100vh-12rem)] flex flex-col">
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
          <ScrollArea className="flex-1 p-2">
            <div className="space-y-1">
              {filteredGroups.map(group => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroupId(group.id)}
                  className={cn(
                    "w-full text-left p-2.5 rounded-md text-xs transition-colors flex items-center justify-between group",
                    selectedGroupId === group.id
                      ? "bg-primary/10 text-primary font-bold shadow-sm"
                      : "hover:bg-muted text-muted-foreground"
                  )}
                >
                  <span className="truncate flex-1 pr-2">{group.subject || group.name || "Groupe sans nom"}</span>
                </button>
              ))}
            </div>
          </ScrollArea>
        </Card>

        {/* Main Content: Tabs */}
        <div className="space-y-6">
           {!selectedGroupId ? (
             <div className="h-64 flex flex-col items-center justify-center text-muted-foreground/20">
                <Users className="h-12 w-12 mb-3" />
                <p className="text-sm font-bold uppercase tracking-widest">Sélectionnez un groupe</p>
             </div>
           ) : (
             <Tabs defaultValue="profil" className="space-y-6">
                <TabsList className="bg-muted/50 p-1 rounded-lg h-10 w-full sm:w-fit gap-1">
                   <TabsTrigger value="profil" className="text-[11px] uppercase font-bold tracking-wider px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">Profil</TabsTrigger>
                   <TabsTrigger value="liens" className="text-[11px] uppercase font-bold tracking-wider px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">Liens</TabsTrigger>
                   <TabsTrigger value="engagement" className="text-[11px] uppercase font-bold tracking-wider px-6 data-[state=active]:bg-background data-[state=active]:shadow-sm">Engagement</TabsTrigger>
                </TabsList>

                <TabsContent value="profil" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <Card className="border-none shadow-none bg-muted/20">
                      <CardHeader className="pb-4">
                         <CardTitle className="text-sm">Identité du Groupe</CardTitle>
                         <CardDescription className="text-xs">Définissez l&apos;ADN du groupe pour orienter l&apos;IA.</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 pt-0">
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                               <Label className="text-[10px] uppercase font-bold text-muted-foreground">Thématique</Label>
                               <Input
                                  placeholder="ex: Business & Networking"
                                  className="h-9 bg-card"
                                  value={profile.theme || ""}
                                  onChange={e => setProfile({...profile, theme: e.target.value})}
                               />
                            </div>
                            <div className="space-y-1.5">
                               <Label className="text-[10px] uppercase font-bold text-muted-foreground">Objectif principal</Label>
                               <Input
                                  placeholder="ex: Générer des leads"
                                  className="h-9 bg-card"
                                  value={profile.objectives || ""}
                                  onChange={e => setProfile({...profile, objectives: e.target.value})}
                               />
                            </div>
                         </div>
                         <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mission du groupe</Label>
                            <Textarea
                               placeholder="Décrivez la raison d'être du groupe..."
                               className="min-h-[80px] text-xs bg-card"
                               value={profile.mission || ""}
                               onChange={e => setProfile({...profile, mission: e.target.value})}
                            />
                         </div>
                         <div className="space-y-1.5">
                            <Label className="text-[10px] uppercase font-bold text-muted-foreground">Règles internes</Label>
                            <Textarea
                               placeholder="Liste des comportements autorisés..."
                               className="min-h-[100px] text-xs bg-card"
                               value={profile.rules || ""}
                               onChange={e => setProfile({...profile, rules: e.target.value})}
                            />
                         </div>
                         <Button size="sm" className="w-full sm:w-auto mt-2" onClick={handleSaveProfile} disabled={isSaving}>
                            {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                            Mettre à jour le profil
                         </Button>
                      </CardContent>
                   </Card>
                </TabsContent>

                <TabsContent value="liens" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <div className="flex items-center justify-between">
                      <div className="space-y-1">
                         <h3 className="text-sm font-bold">Produits & Services</h3>
                         <p className="text-xs text-muted-foreground">Liste des liens que l&apos;IA peut recommander.</p>
                      </div>
                      <Button size="sm" variant="outline" className="h-8 rounded-full">
                         <Plus className="h-3 w-3 mr-2" /> Ajouter un lien
                      </Button>
                   </div>

                   <div className="space-y-4">
                      {links.length === 0 ? (
                        <div className="p-8 text-center border-2 border-dashed rounded-lg text-muted-foreground/40">
                           Aucun lien configuré
                        </div>
                      ) : (
                        <Accordion type="single" collapsible className="w-full space-y-2">
                           {links.map((link, idx) => (
                             <AccordionItem key={link.id || idx} value={`item-${idx}`} className="border rounded-lg bg-card px-4">
                               <AccordionTrigger className="text-sm hover:no-underline font-medium">{link.title || "Lien sans titre"}</AccordionTrigger>
                               <AccordionContent className="text-xs space-y-4 pb-4">
                                 <div className="grid grid-cols-1 gap-4">
                                   <div className="space-y-1">
                                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Titre</Label>
                                      <Input
                                         value={link.title}
                                         onChange={e => {
                                            const newLinks = [...links];
                                            newLinks[idx].title = e.target.value;
                                            setLinks(newLinks);
                                         }}
                                         className="h-8"
                                      />
                                   </div>
                                   <div className="space-y-1">
                                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">URL</Label>
                                      <Input
                                         value={link.url}
                                         onChange={e => {
                                            const newLinks = [...links];
                                            newLinks[idx].url = e.target.value;
                                            setLinks(newLinks);
                                         }}
                                         className="h-8 font-mono"
                                      />
                                   </div>
                                   <div className="space-y-1">
                                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">Description</Label>
                                      <Textarea
                                         value={link.description}
                                         onChange={e => {
                                            const newLinks = [...links];
                                            newLinks[idx].description = e.target.value;
                                            setLinks(newLinks);
                                         }}
                                         className="min-h-[60px] text-xs"
                                      />
                                   </div>
                                   <div className="space-y-1">
                                      <Label className="text-[10px] font-bold uppercase text-muted-foreground">CTA (Appel à l&apos;action)</Label>
                                      <Input
                                         value={link.cta}
                                         onChange={e => {
                                            const newLinks = [...links];
                                            newLinks[idx].cta = e.target.value;
                                            setLinks(newLinks);
                                         }}
                                         className="h-8"
                                      />
                                   </div>
                                 </div>
                                 <div className="flex justify-end gap-2">
                                   <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 text-xs text-destructive"
                                      onClick={() => setLinks(prev => prev.filter((_, i) => i !== idx))}
                                   >
                                      <Trash2 className="h-3 w-3 mr-2" /> Retirer
                                   </Button>
                                 </div>
                               </AccordionContent>
                             </AccordionItem>
                           ))}
                        </Accordion>
                      )}

                      <div className="flex justify-between items-center mt-6">
                        <Button
                           size="sm"
                           variant="outline"
                           className="h-9"
                           onClick={() => setLinks([...links, { title: "Nouveau lien", description: "", url: "", cta: "Commander" }])}
                        >
                           <Plus className="h-4 w-4 mr-2" /> Ajouter un lien
                        </Button>
                        <Button size="sm" className="h-9" onClick={handleSaveLinks} disabled={isSaving}>
                           {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                           Enregistrer tous les liens
                        </Button>
                      </div>
                   </div>
                </TabsContent>

                <TabsContent value="engagement" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
                   <Card className="border-primary/20 bg-primary/5 shadow-none overflow-hidden">
                      <CardContent className="p-6">
                         <div className="flex items-start gap-4">
                            <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                               <Sparkles className="h-5 w-5 text-primary" />
                            </div>
                            <div className="space-y-3 flex-1">
                               <div className="space-y-1">
                                  <h4 className="text-sm font-bold">Générateur de Campagne IA</h4>
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                     Décrivez votre objectif (ex: relancer les inactifs) et l&apos;IA générera un planning de messages pour la semaine.
                                  </p>
                               </div>
                               <Textarea
                                 placeholder="Objectif de la campagne..."
                                 className="min-h-[80px] bg-background border-primary/20 text-xs"
                                 value={generationGoal}
                                 onChange={(e) => setGenerationGoal(e.target.value)}
                               />
                               <Button
                                 size="sm"
                                 className="w-full sm:w-auto shadow-md"
                                 onClick={handleGenerate}
                                 disabled={isGenerating || !generationGoal.trim()}
                               >
                                  {isGenerating ? <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" /> : <Zap className="h-3.5 w-3.5 mr-2" />}
                                  Lancer la génération
                               </Button>
                            </div>
                         </div>
                      </CardContent>
                   </Card>

                   <div className="space-y-4">
                      <div className="flex items-center justify-between">
                         <h3 className="text-sm font-bold flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-primary" /> File d&apos;attente
                         </h3>
                         <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-widest text-muted-foreground">{tasks.length} message(s) planifié(s)</Badge>
                      </div>
                      {tasks.length === 0 ? (
                        <div className="p-12 text-center border-2 border-dashed rounded-lg text-muted-foreground/30 italic text-xs uppercase">
                           Aucune tâche programmée
                        </div>
                      ) : (
                        <div className="border rounded-lg bg-card divide-y overflow-hidden shadow-sm">
                           {tasks.map(task => (
                              <div key={task.id} className="p-4 flex items-center justify-between group hover:bg-muted/30 transition-colors">
                                 <div className="flex items-center gap-3 min-w-0">
                                    <div className="h-8 w-8 rounded bg-muted flex items-center justify-center shrink-0">
                                       <MessageSquare className="h-4 w-4 text-muted-foreground/40" />
                                    </div>
                                    <div className="min-w-0">
                                       <p className="text-xs font-medium truncate">{task.message_content?.substring(0, 40) || "Message média"}</p>
                                       <p className="text-[10px] text-muted-foreground">
                                          {new Date(task.scheduled_at).toLocaleString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} •
                                          <span className={cn(
                                             "ml-2 font-bold uppercase",
                                             task.status === 'pending' ? "text-amber-500" : task.status === 'completed' ? "text-green-500" : "text-destructive"
                                          )}> {task.status}</span>
                                       </p>
                                    </div>
                                 </div>
                                 <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleDeleteTask(task.id)}
                                 >
                                    <Trash2 className="h-3.5 w-3.5" />
                                 </Button>
                              </div>
                           ))}
                        </div>
                      )}
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
