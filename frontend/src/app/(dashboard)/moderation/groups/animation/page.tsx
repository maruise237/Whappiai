"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Users, 
  Search,
  Save,
  Calendar,
  Plus,
  Trash2,
  Clock,
  Zap,
  MessageSquare,
  Image as ImageIcon,
  Video,
  Music,
  Type,
  Pencil
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAuth } from "@clerk/nextjs"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface AnimatorTask {
  id: number
  group_id: string
  session_id: string
  message_content: string
  media_url?: string
  media_type: 'text' | 'image' | 'video' | 'audio'
  scheduled_at: string
  recurrence: 'none' | 'daily' | 'weekly'
  status: 'pending' | 'completed' | 'failed'
}

interface ProductLink {
  id?: number
  title: string
  description: string
  url: string
  cta: string
}

interface GroupProfile {
  mission: string
  objectives: string
  rules: string
  theme: string
}

interface Group {
  id: string
  subject: string
  creation: number
  desc?: string
  participantsCount: number
}

function AnimationPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session')
  const { getToken } = useAuth()

  const [groups, setGroups] = React.useState<Group[]>([])
  const [filteredGroups, setFilteredGroups] = React.useState<Group[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  
  const [selectedGroup, setSelectedGroup] = React.useState<Group | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("profile")
  
  const [profileFormData, setProfileFormData] = React.useState<GroupProfile>({
    mission: "",
    objectives: "",
    rules: "",
    theme: ""
  })

  const [productLinks, setProductLinks] = React.useState<ProductLink[]>([])

  const [aiObjective, setAiObjective] = React.useState("annonce")
  const [aiAdditionalInfo, setAiAdditionalInfo] = React.useState("")
  const [aiIncludeLinks, setAiIncludeLinks] = React.useState(true)
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false)

  const [animatorTasks, setAnimatorTasks] = React.useState<AnimatorTask[]>([])
  const [editingTaskId, setEditingTaskId] = React.useState<number | null>(null)
  const [taskFormData, setTaskFormData] = React.useState({
    message_content: "",
    media_url: "",
    media_type: "text" as 'text' | 'image' | 'video' | 'audio',
    scheduled_at: "",
    recurrence: "none" as 'none' | 'daily' | 'weekly'
  })

  const fetchGroups = async () => {
    if (!sessionId) return
    try {
      setIsLoading(true)
      const token = await getToken()
      const data = await api.sessions.getGroups(sessionId, token || undefined)
      setGroups(data || [])
      setFilteredGroups(data || [])
    } catch (error: any) {
      console.error("Fetch groups error:", error)
      toast.error(`Erreur: ${error.message || "Impossible de charger les groupes"}`)
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => {
    fetchGroups()
  }, [sessionId])

  React.useEffect(() => {
    const lower = searchQuery.toLowerCase()
    setFilteredGroups(groups.filter(g => g.subject.toLowerCase().includes(lower)))
  }, [searchQuery, groups])

  const handleOpenSettings = async (group: Group) => {
    setSelectedGroup(group)
    
    try {
      const token = await getToken()
      const [tasksRes, profileRes, linksRes] = await Promise.all([
        api.sessions.getAnimatorTasks(sessionId!, group.id, token || undefined),
        api.sessions.getGroupProfile(sessionId!, group.id, token || undefined),
        api.sessions.getGroupLinks(sessionId!, group.id, token || undefined)
      ])
      
      setAnimatorTasks(tasksRes.data || [])
      setProfileFormData(profileRes.data || {
        mission: "",
        objectives: "",
        rules: group.desc || "",
        theme: ""
      })
      setProductLinks(linksRes.data || [])
    } catch (error) {
      console.error("Fetch group data error:", error)
    }
    
    setIsDialogOpen(true)
  }

  const handleSaveProfile = async () => {
    if (!selectedGroup || !sessionId) return
    try {
      const token = await getToken()
      await api.sessions.updateGroupProfile(sessionId, selectedGroup.id, profileFormData, token || undefined)
      toast.success("Profil du groupe mis à jour")
    } catch (error) {
      toast.error("Erreur lors de la mise à jour du profil")
    }
  }

  const handleSaveLinks = async () => {
    if (!selectedGroup || !sessionId) return
    try {
      const token = await getToken()
      await api.sessions.updateGroupLinks(sessionId, selectedGroup.id, productLinks, token || undefined)
      toast.success("Liens produits mis à jour")
    } catch (error) {
      toast.error("Erreur lors de la mise à jour des liens")
    }
  }

  const handleAddLink = () => {
    setProductLinks(prev => [...prev, { title: "", description: "", url: "", cta: "Acheter maintenant" }])
  }

  const handleRemoveLink = (index: number) => {
    setProductLinks(prev => prev.filter((_, i) => i !== index))
  }

  const handleLinkChange = (index: number, field: keyof ProductLink, value: string) => {
    setProductLinks(prev => prev.map((l, i) => i === index ? { ...l, [field]: value } : l))
  }

  const handleGenerateAiMessage = async () => {
    if (!selectedGroup || !sessionId) return
    try {
      setIsGeneratingAi(true)
      const token = await getToken()
      const res = await api.sessions.generateGroupMessage(sessionId, selectedGroup.id, {
        objective: aiObjective,
        additionalInfo: aiAdditionalInfo, 
        includeLinks: aiIncludeLinks      
      }, token || undefined)
      
      console.log("AI Generation response:", res)
      
      const message = res.data?.message || res.message || (typeof res === 'string' ? res : "");
      
      if (!message) {
        toast.error("L'IA n'a pas retourné de message. Vérifiez votre configuration IA dans les réglages de la session.")
        return
      }
      
      setTaskFormData(prev => ({
        ...prev,
        message_content: message
      }))
      
      toast.success("Message généré par l'IA")
      setActiveTab("animator")
    } catch (error: any) {
      console.error("AI Generation error:", error)
      toast.error(`Erreur lors de la génération IA: ${error.message || "Erreur inconnue"}`)
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const handleAddTask = async () => {
    if (!selectedGroup || !sessionId) return
    if (!taskFormData.message_content && !taskFormData.media_url) {
      toast.error("Veuillez saisir un message ou une URL de média")
      return
    }
    if (!taskFormData.scheduled_at) {
      toast.error("Veuillez choisir une date et heure")
      return
    }

    try {
      const token = await getToken()
      if (editingTaskId) {
        await api.sessions.updateAnimatorTask(editingTaskId, taskFormData, token || undefined)
        toast.success("Tâche d'animation mise à jour")
        setEditingTaskId(null)
      } else {
        await api.sessions.addAnimatorTask(sessionId, selectedGroup.id, taskFormData, token || undefined)
        toast.success("Tâche d'animation ajoutée")
      }
      
      setTaskFormData({
        message_content: "",
        media_url: "",
        media_type: "text",
        scheduled_at: "",
        recurrence: "none"
      })
      
      const response = await api.sessions.getAnimatorTasks(sessionId, selectedGroup.id, token || undefined)
      setAnimatorTasks(response.data || [])
    } catch (error) {
      toast.error(editingTaskId ? "Erreur lors de la mise à jour" : "Erreur lors de l'ajout")
    }
  }

  const handleEditTask = (task: AnimatorTask) => {
    setEditingTaskId(task.id);
    setTaskFormData({
      message_content: task.message_content,
      media_url: task.media_url || "",
      media_type: task.media_type,
      scheduled_at: task.scheduled_at,
      recurrence: task.recurrence
    });
    // Scroll to form or switch tab if needed
    setActiveTab("animator");
  };

  const handleCancelEdit = () => {
    setEditingTaskId(null);
    setTaskFormData({
      message_content: "",
      media_url: "",
      media_type: "text",
      scheduled_at: "",
      recurrence: "none"
    });
  };

  const handleInsertLink = (link: ProductLink) => {
    const linkText = `\n\n👉 ${link.title}\n${link.description}\n🔗 ${link.url}\n${link.cta}`;
    setTaskFormData(prev => ({
      ...prev,
      message_content: prev.message_content + linkText
    }));
    toast.success("Lien inséré dans le message");
  };

  const handleDeleteTask = async (taskId: number) => {
    try {
      const token = await getToken()
      await api.sessions.deleteAnimatorTask(taskId, token || undefined)
      setAnimatorTasks(prev => prev.filter(t => t.id !== taskId))
      toast.success("Tâche supprimée")
    } catch (error) {
      toast.error("Erreur lors de la suppression")
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-muted-foreground animate-pulse">Chargement des groupes...</p>
        </div>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="text-center py-24 space-y-4">
        <h2 className="text-xl font-bold text-foreground">Session non spécifiée</h2>
        <Button 
          onClick={() => router.push('/moderation')}
          className="rounded-lg font-bold uppercase tracking-widest text-[10px] h-12 px-8"
        >
          Retour à la sélection
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-200 pb-20 px-4 sm:px-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 bg-white dark:bg-card p-6 sm:p-8 rounded-lg border border-slate-200 dark:border-primary/10 shadow-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-primary/10 transition-colors duration-200" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full lg:w-auto relative z-10">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.back()}
            className="h-12 w-12 rounded-lg border border-slate-200 dark:border-primary/10 hover:bg-primary hover:text-white transition-all shadow-sm flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20 shadow-sm">
                <Zap className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary leading-none uppercase">
                Animation
              </h1>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="font-bold text-[10px] uppercase tracking-widest border-primary/20 bg-primary/5 text-primary px-3 py-1 rounded-lg">
                SESSION: {sessionId}
              </Badge>
            </div>
          </div>
        </div>
        
        <div className="relative w-full lg:w-80 z-10">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input 
            placeholder="RECHERCHER UN GROUPE..." 
            className="pl-11 h-12 rounded-lg border border-slate-200 dark:border-primary/10 bg-slate-50 dark:bg-background/50 focus:bg-white dark:focus:bg-background focus:border-primary/30 transition-all font-bold text-[10px] tracking-widest"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full py-24 text-center text-muted-foreground border border-dashed border-slate-200 dark:border-primary/10 rounded-lg space-y-4 bg-slate-50/50 dark:bg-muted/5">
            <Users className="w-12 h-12 mx-auto opacity-20" />
            <p className="font-bold uppercase tracking-widest text-[10px]">
              {searchQuery ? "Aucun groupe trouvé." : "Aucun groupe administrateur trouvé."}
            </p>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <Card key={group.id} className="group hover:shadow-xl transition-all duration-200 border border-slate-200 dark:border-primary/10 rounded-lg overflow-hidden bg-white dark:bg-card flex flex-col hover:border-primary/30">
              <CardHeader className="p-6 pb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-200 shadow-sm">
                    <Users className="w-6 h-6" />
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-bold tracking-tight line-clamp-1 group-hover:text-primary transition-colors text-foreground uppercase">{group.subject}</CardTitle>
                    <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">{group.participantsCount} participants</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="p-6 pt-0 mt-auto">
                <Button 
                  className="w-full h-12 font-bold uppercase tracking-widest text-[10px] rounded-lg shadow-sm transition-all duration-200" 
                  onClick={() => handleOpenSettings(group)}
                >
                  Animer le Groupe
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[90vh] overflow-hidden border border-slate-200 dark:border-primary/10 rounded-lg p-0 gap-0 bg-white dark:bg-card shadow-2xl flex flex-col">
          <div className="p-6 sm:p-8 pb-4 space-y-4 sm:space-y-6 flex-shrink-0 border-b border-slate-100 dark:border-primary/5">
            <DialogHeader>
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 shadow-sm flex-shrink-0">
                  <Zap className="w-7 h-7 text-primary" />
                </div>
                <div className="space-y-1 text-left min-w-0 flex-1">
                  <DialogTitle className="text-xl font-bold tracking-tight uppercase text-primary truncate">Animation & IA</DialogTitle>
                  <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground opacity-60 truncate">
                    Groupe: {selectedGroup?.subject}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-12 rounded-lg bg-slate-100 dark:bg-muted/50 p-1 border border-slate-200 dark:border-primary/10">
                <TabsTrigger value="profile" className="rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Users className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Profil</span>
                </TabsTrigger>
                <TabsTrigger value="links" className="rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Liens</span>
                </TabsTrigger>
                <TabsTrigger value="animator" className="rounded-lg text-[9px] sm:text-[10px] font-bold uppercase tracking-widest gap-2 data-[state=active]:bg-white dark:data-[state=active]:bg-background data-[state=active]:shadow-sm">
                  <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                  <span className="hidden sm:inline">Animation</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-4">
            <Tabs value={activeTab} className="w-full">
              <TabsContent value="profile" className="animate-in fade-in slide-in-from-bottom-4 duration-200 m-0">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Thématique du Groupe</Label>
                    <Input 
                      placeholder="Ex: Marketing Digital, Coaching Sportif..."
                      value={profileFormData.theme}
                      onChange={(e) => setProfileFormData({...profileFormData, theme: e.target.value})}
                      className="h-12 border border-slate-200 dark:border-primary/10 rounded-lg font-bold bg-slate-50/50 dark:bg-muted/20 shadow-sm focus:border-primary/30"
                    />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Mission</Label>
                    <Textarea 
                      placeholder="Quelle est la mission principale du groupe ?"
                      value={profileFormData.mission}
                      onChange={(e) => setProfileFormData({...profileFormData, mission: e.target.value})}
                      className="min-h-[80px] resize-none font-mono text-[11px] p-4 border border-slate-200 dark:border-primary/10 rounded-lg bg-slate-50/50 dark:bg-muted/20 shadow-sm focus:border-primary/30"
                    />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Objectifs</Label>
                    <Textarea 
                      placeholder="Quels sont les objectifs à atteindre ?"
                      value={profileFormData.objectives}
                      onChange={(e) => setProfileFormData({...profileFormData, objectives: e.target.value})}
                      className="min-h-[80px] resize-none font-mono text-[11px] p-4 border border-slate-200 dark:border-primary/10 rounded-lg bg-slate-50/50 dark:bg-muted/20 shadow-sm focus:border-primary/30"
                    />
                  </div>
                  <div className="space-y-4">
                    <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Règles du Groupe</Label>
                    <Textarea 
                      placeholder="Listez les règles de vie du groupe..."
                      value={profileFormData.rules}
                      onChange={(e) => setProfileFormData({...profileFormData, rules: e.target.value})}
                      className="min-h-[100px] resize-none font-mono text-[11px] p-4 border border-slate-200 dark:border-primary/10 rounded-lg bg-slate-50/50 dark:bg-muted/20 shadow-sm focus:border-primary/30"
                    />
                  </div>
                  <Button onClick={handleSaveProfile} className="w-full h-14 font-bold uppercase tracking-widest rounded-lg text-[10px] gap-3 active:scale-[0.98] transition-all duration-200">
                    <Save className="w-5 h-5" />
                    Enregistrer le profil
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="links" className="animate-in fade-in slide-in-from-bottom-4 duration-200 m-0">
                <div className="space-y-6">
                  <div className="flex items-center justify-between ml-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Liens Produits & Services</Label>
                    <Button size="sm" variant="outline" onClick={handleAddLink} className="h-8 rounded-lg border-2 font-black text-[9px] uppercase tracking-widest gap-2 transition-all duration-200">
                      <Plus className="w-3.5 h-3.5" />
                      Ajouter
                    </Button>
                  </div>

                  <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                    {productLinks.length === 0 ? (
                      <div className="py-12 text-center bg-muted/20 border-2 border-dashed rounded-lg space-y-3">
                        <Plus className="w-8 h-8 text-muted-foreground/20 mx-auto" />
                        <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Aucun lien produit</p>
                      </div>
                    ) : (
                      <Accordion type="single" collapsible className="space-y-3">
                        {productLinks.map((link, index) => (
                          <AccordionItem key={index} value={`item-${index}`} className="border-2 rounded-lg px-4 bg-card/50 shadow-inner overflow-hidden">
                            <AccordionTrigger className="hover:no-underline py-4">
                              <div className="flex items-center gap-3 text-left w-full mr-4">
                                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-[10px]">
                                  {index + 1}
                                </div>
                                <span className="font-black text-[10px] uppercase tracking-tight truncate flex-1">
                                  {link.title || "Nouveau lien"}
                                </span>
                              </div>
                            </AccordionTrigger>
                            <AccordionContent className="pb-6 space-y-4">
                              <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">Titre</Label>
                                <Input value={link.title} onChange={(e) => handleLinkChange(index, 'title', e.target.value)} className="h-12 border-2 rounded-lg font-black text-[10px] bg-background" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">URL</Label>
                                <Input value={link.url} onChange={(e) => handleLinkChange(index, 'url', e.target.value)} className="h-12 border-2 rounded-lg font-black text-[10px] bg-background" />
                              </div>
                              <div className="space-y-2">
                                <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">Description</Label>
                                <Textarea value={link.description} onChange={(e) => handleLinkChange(index, 'description', e.target.value)} className="min-h-[80px] resize-none font-mono text-[10px] border-2 rounded-lg bg-background" />
                              </div>
                              <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-2">
                                  <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">CTA (Bouton)</Label>
                                  <Input value={link.cta} onChange={(e) => handleLinkChange(index, 'cta', e.target.value)} className="h-12 border-2 rounded-lg font-black text-[10px] bg-background" />
                                </div>
                                <div className="flex items-end">
                                  <Button variant="destructive" className="w-full h-12 rounded-lg font-black text-[9px] uppercase tracking-widest gap-2 transition-all duration-200" onClick={() => handleRemoveLink(index)}>
                                    <Trash2 className="w-4 h-4" />
                                    Supprimer
                                  </Button>
                                </div>
                              </div>
                            </AccordionContent>
                          </AccordionItem>
                        ))}
                      </Accordion>
                    )}
                  </div>
                  <Button onClick={handleSaveLinks} className="w-full h-16 font-black uppercase tracking-[0.2em] rounded-lg text-[10px] gap-3 border-2 border-primary/20 transition-all duration-200">
                    <Save className="w-5 h-5" />
                    Enregistrer les liens
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="animator" className="animate-in fade-in slide-in-from-bottom-4 duration-200 m-0">
                <div className="space-y-6">
                  <div className="p-6 rounded-lg border-2 border-primary/20 bg-primary/5 space-y-4 shadow-inner">
                    <div className="space-y-1">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-primary">Assistant IA d'Animation</h4>
                      <p className="text-[9px] text-muted-foreground font-black uppercase tracking-wider opacity-60">Générez des messages engageants basés sur votre profil</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">Objectif</Label>
                        <Select value={aiObjective} onValueChange={setAiObjective}>
                          <SelectTrigger className="h-12 border-2 rounded-lg font-black text-[10px] bg-background">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-lg border-2">
                            <SelectItem value="annonce" className="font-black text-[10px] uppercase">Annonce</SelectItem>
                            <SelectItem value="promotion" className="font-black text-[10px] uppercase">Promotion</SelectItem>
                            <SelectItem value="information" className="font-black text-[10px] uppercase">Information</SelectItem>
                            <SelectItem value="engagement" className="font-black text-[10px] uppercase">Engagement / Question</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex items-center justify-between p-3 border-2 rounded-lg bg-background mt-auto h-12">
                        <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">Inclure Liens</Label>
                        <Switch checked={aiIncludeLinks} onCheckedChange={setAiIncludeLinks} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">Infos Additionnelles</Label>
                      <Input placeholder="Détails spécifiques pour ce message..." value={aiAdditionalInfo} onChange={(e) => setAiAdditionalInfo(e.target.value)} className="h-12 border-2 rounded-lg font-black text-[10px] bg-background" />
                    </div>

                    <Button onClick={handleGenerateAiMessage} disabled={isGeneratingAi} className="w-full h-12 font-black uppercase tracking-widest text-[9px] rounded-lg gap-2 shadow-lg border-2 border-primary/20 transition-all duration-200">
                      {isGeneratingAi ? <div className="w-4 h-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> : <Zap className="w-4 h-4" />}
                      Générer avec l'IA
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70 ml-2">Programmer un Message</Label>
                    
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">Type de Média</Label>
                          <Select value={taskFormData.media_type} onValueChange={(v: any) => setTaskFormData({...taskFormData, media_type: v})}>
                            <SelectTrigger className="h-12 border-2 rounded-lg font-black text-[10px] bg-background">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg border-2">
                              <SelectItem value="text" className="font-black text-[10px] uppercase">
                                <div className="flex items-center gap-2">
                                  <Type className="w-3.5 h-3.5" />
                                  <span>Texte Uniquement</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="image" className="font-black text-[10px] uppercase">
                                <div className="flex items-center gap-2">
                                  <ImageIcon className="w-3.5 h-3.5" />
                                  <span>Image</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="video" className="font-black text-[10px] uppercase">
                                <div className="flex items-center gap-2">
                                  <Video className="w-3.5 h-3.5" />
                                  <span>Vidéo</span>
                                </div>
                              </SelectItem>
                              <SelectItem value="audio" className="font-black text-[10px] uppercase">
                                <div className="flex items-center gap-2">
                                  <Music className="w-3.5 h-3.5" />
                                  <span>Audio</span>
                                </div>
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        {taskFormData.media_type !== 'text' && (
                          <div className="space-y-2">
                            <Label className="text-[9px] font-black uppercase tracking-widest opacity-60">URL du Média</Label>
                            <Input 
                              placeholder="https://..." 
                              value={taskFormData.media_url} 
                              onChange={(e) => setTaskFormData({...taskFormData, media_url: e.target.value})} 
                              className="h-12 border-2 rounded-lg font-black text-[10px] bg-background" 
                            />
                          </div>
                        )}
                      </div>

                      <Textarea 
                        placeholder={taskFormData.media_type === 'audio' ? "Commentaire audio (optionnel)..." : "Contenu du message..."} 
                        value={taskFormData.message_content} 
                        onChange={(e) => setTaskFormData({...taskFormData, message_content: e.target.value})} 
                        className="min-h-[120px] resize-none font-mono text-[11px] p-6 border-2 rounded-lg bg-background shadow-inner transition-all" 
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                      <Input type="datetime-local" value={taskFormData.scheduled_at} onChange={(e) => setTaskFormData({...taskFormData, scheduled_at: e.target.value})} className="h-16 border-2 rounded-lg font-black bg-background" />
                      <Select value={taskFormData.recurrence} onValueChange={(v: any) => setTaskFormData({...taskFormData, recurrence: v})}>
                        <SelectTrigger className="h-16 border-2 rounded-lg font-black bg-background">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-lg border-2">
                          <SelectItem value="none" className="font-black text-[10px] uppercase">Une seule fois</SelectItem>
                          <SelectItem value="daily" className="font-black text-[10px] uppercase">Quotidien</SelectItem>
                          <SelectItem value="weekly" className="font-black text-[10px] uppercase">Hebdomadaire</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button onClick={handleAddTask} className="w-full h-16 font-black uppercase tracking-[0.2em] rounded-lg text-[10px] gap-3 border-2 border-primary/20 transition-all duration-200">
                      {editingTaskId ? (
                        <>
                          <Save className="w-5 h-5" />
                          Mettre à jour le message
                        </>
                      ) : (
                        <>
                          <Plus className="w-5 h-5" />
                          Programmer le message
                        </>
                      )}
                    </Button>
                    {editingTaskId && (
                      <Button variant="outline" onClick={handleCancelEdit} className="w-full h-12 font-black uppercase tracking-widest text-[9px] rounded-lg border-2 transition-all duration-200">
                        Annuler la modification
                      </Button>
                    )}
                  </div>

                  {productLinks.length > 0 && (
                    <div className="space-y-3">
                      <Label className="text-[10px] font-black uppercase tracking-widest text-primary/70 ml-2">Liens Produits Disponibles</Label>
                      <div className="flex flex-wrap gap-2">
                        {productLinks.map((link, idx) => (
                          <Badge 
                            key={idx} 
                            variant="secondary" 
                            className="cursor-pointer hover:bg-primary hover:text-white transition-all duration-200 py-2 px-3 rounded-lg border-2 font-black text-[9px] uppercase tracking-wider"
                            onClick={() => handleInsertLink(link)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            {link.title}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="space-y-4">
                    <h3 className="font-black uppercase tracking-widest text-[10px] text-muted-foreground ml-2 flex items-center gap-2">
                      <Clock className="w-4 h-4" />
                      File d'attente ({animatorTasks.length})
                    </h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {animatorTasks.length === 0 ? (
                        <div className="py-12 text-center bg-muted/20 border-2 border-dashed rounded-lg space-y-3">
                          <Calendar className="w-8 h-8 text-muted-foreground/20 mx-auto" />
                          <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Aucune tâche</p>
                        </div>
                      ) : (
                        animatorTasks.map((task) => (
                          <div key={task.id} className={cn(
                            "p-6 rounded-lg border-2 bg-card/50 flex items-center justify-between group/task hover:border-primary/30 transition-all duration-200 shadow-inner",
                            editingTaskId === task.id && "border-primary bg-primary/5"
                          )}>
                            <div className="space-y-2">
                              <p className="text-[11px] font-black line-clamp-1 uppercase tracking-tight">{task.message_content}</p>
                              <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border-2 bg-background/50 border-muted/50">
                                  {new Date(task.scheduled_at).toLocaleDateString()} {new Date(task.scheduled_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                </Badge>
                                {task.recurrence !== 'none' && (
                                  <Badge variant="secondary" className="text-[8px] font-black uppercase px-2 py-0.5 rounded-lg border-2">
                                    {task.recurrence}
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="icon" onClick={() => handleEditTask(task)} className="h-12 w-12 rounded-lg text-primary hover:bg-primary/10 border-2 border-transparent hover:border-primary/20 transition-all duration-200">
                                <Pencil className="w-5 h-5" />
                              </Button>
                              <Button variant="ghost" size="icon" onClick={() => handleDeleteTask(task.id)} className="h-12 w-12 rounded-lg text-destructive hover:bg-destructive/10 border-2 border-transparent hover:border-destructive/20 transition-all duration-200">
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function AnimationPage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <AnimationPageContent />
    </React.Suspense>
  )
}
