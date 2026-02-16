"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { 
  ArrowLeft, 
  Shield, 
  Users, 
  AlertTriangle,
  Search,
  CheckCircle2,
  Save,
  ShieldAlert,
  Calendar,
  Plus,
  Trash2,
  Clock,
  MessageSquare,
  Zap
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
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { usePristine } from "@/hooks/use-pristine"
import { useAuth } from "@clerk/nextjs"

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
  settings: {
    is_active: number
    anti_link: number
    bad_words: string
    warning_template: string
    max_warnings: number
    welcome_enabled: number
    welcome_template: string
    ai_assistant_enabled: number
  }
}

function GroupManagementContent() {
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session')

  const [groups, setGroups] = React.useState<Group[]>([])
  const [filteredGroups, setFilteredGroups] = React.useState<Group[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  
  // Dialog State
  const [selectedGroup, setSelectedGroup] = React.useState<Group | null>(null)
  const [isDialogOpen, setIsDialogOpen] = React.useState(false)
  const [activeTab, setActiveTab] = React.useState("moderation")
  
  // Moderation Form State
  const [modFormData, setModFormData] = React.useState({
    is_active: false,
    anti_link: false,
    bad_words: "",
    warning_template: "",
    max_warnings: 5,
    welcome_enabled: false,
    welcome_template: "",
    ai_assistant_enabled: false
  })

  // Group Profile State
  const [profileFormData, setProfileFormData] = React.useState<GroupProfile>({
    mission: "",
    objectives: "",
    rules: "",
    theme: ""
  })

  // Product Links State
  const [productLinks, setProductLinks] = React.useState<ProductLink[]>([])

  // AI Animation State
  const [aiObjective, setAiObjective] = React.useState("annonce")
  const [aiAdditionalInfo, setAiAdditionalInfo] = React.useState("")
  const [aiIncludeLinks, setAiIncludeLinks] = React.useState(true)
  const [isGeneratingAi, setIsGeneratingAi] = React.useState(false)

  // Animator State
  const [animatorTasks, setAnimatorTasks] = React.useState<AnimatorTask[]>([])
  const [isAddingTask, setIsAddingTask] = React.useState(false)
  const [taskFormData, setTaskFormData] = React.useState({
    message_content: "",
    media_url: "",
    media_type: "text" as 'text' | 'image' | 'video' | 'audio',
    scheduled_at: "",
    recurrence: "none" as 'none' | 'daily' | 'weekly'
  })

  const { formRef: modFormRef, validate: validateMod } = usePristine()

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
    setModFormData({
      is_active: !!group.settings.is_active,
      anti_link: !!group.settings.anti_link,
      bad_words: group.settings.bad_words || "",
      warning_template: group.settings.warning_template || "Attention @{{name}}, avertissement {{count}}/{{max}} pour : {{reason}}.",
      max_warnings: group.settings.max_warnings || 5,
      welcome_enabled: !!group.settings.welcome_enabled,
      welcome_template: group.settings.welcome_template || "Bienvenue @{{name}} dans le groupe {{group_name}} !\n\n📜 *Règles :*\n{{rules}}\n\n📅 Arrivée le : {{date}}",
      ai_assistant_enabled: !!group.settings.ai_assistant_enabled
    })
    
    // Fetch animator tasks, profile and links
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
      
      setTaskFormData(prev => ({
        ...prev,
        message_content: res.data.message
      }))
      
      toast.success("Message généré par l'IA")
      setActiveTab("animator") // Switch back to animator to see the message
    } catch (error) {
      toast.error("Erreur lors de la génération IA")
    } finally {
      setIsGeneratingAi(false)
    }
  }

  const handleSaveModeration = async () => {
    if (!selectedGroup || !sessionId) return
    if (modFormData.is_active && !validateMod()) return

    try {
      const token = await getToken()
      await api.sessions.updateGroupSettings(sessionId, selectedGroup.id, modFormData, token || undefined)
      toast.success(`Paramètres de modération mis à jour`)
      
      // Update local groups state
      setGroups(prev => prev.map(g => 
        g.id === selectedGroup.id 
          ? { ...g, settings: { ...modFormData, is_active: modFormData.is_active ? 1 : 0, anti_link: modFormData.anti_link ? 1 : 0, ai_assistant_enabled: modFormData.ai_assistant_enabled ? 1 : 0 } }
          : g
      ))
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement")
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
      await api.sessions.addAnimatorTask(sessionId, selectedGroup.id, taskFormData, token || undefined)
      toast.success("Tâche d'animation ajoutée")
      setIsAddingTask(false)
      setTaskFormData({
        message_content: "",
        media_url: "",
        media_type: "text",
        scheduled_at: "",
        recurrence: "none"
      })
      
      // Refresh tasks
      const response = await api.sessions.getAnimatorTasks(sessionId, selectedGroup.id, token || undefined)
      setAnimatorTasks(response.data || [])
    } catch (error) {
      toast.error("Erreur lors de l'ajout de la tâche")
    }
  }

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
          className="rounded-lg font-black uppercase tracking-widest text-[10px] h-12 px-8 transition-all duration-200"
        >
          Retour à la sélection
        </Button>
      </div>
    )
  }

  return (
      <div className="max-w-7xl mx-auto space-y-8 sm:space-y-12 animate-in fade-in duration-200 pb-20 px-4 sm:px-8">
      {/* Header Modernisé */}
      <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-8 glass-card p-8 sm:p-10 rounded-lg relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/5 rounded-full blur-3xl -mr-40 -mt-40 group-hover:bg-primary/10 transition-colors duration-200" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -ml-32 -mb-32 group-hover:bg-primary/10 transition-colors duration-200" />
        
        <div className="flex items-center gap-6 sm:gap-8 w-full lg:w-auto relative z-10">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={() => router.back()}
            className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg border-2 bg-background/40 backdrop-blur-md hover:bg-primary hover:text-white transition-all duration-200 shadow-xl group/back"
          >
            <ArrowLeft className="w-7 h-7 sm:w-8 sm:h-8 group-hover:-translate-x-1 transition-transform" />
          </Button>
          <div className="space-y-2 min-w-0">
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight flex items-center gap-4 sm:gap-6 text-foreground">
              <div className="p-3 sm:p-4 whappi-gradient rounded-lg text-white shadow-2xl shadow-primary/20 group-hover:scale-110 group-hover:rotate-3 transition-all duration-200">
                <Shield className="w-8 h-8 sm:w-10 sm:h-10" />
              </div>
              <span className="bg-gradient-to-r from-primary via-primary/80 to-primary/60 bg-clip-text text-transparent truncate">
                Gestion des Groupes
              </span>
            </h1>
            <div className="flex items-center gap-3 bg-background/40 backdrop-blur-md px-4 py-1.5 rounded-full border border-primary/10 w-fit">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.5)] flex-shrink-0" />
              <p className="text-muted-foreground text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] opacity-70 truncate">
                Session Active: <span className="text-primary">{sessionId}</span>
              </p>
            </div>
          </div>
        </div>
        
        <div className="relative w-full lg:w-[400px] group/search relative z-10">
          <div className="absolute left-6 top-1/2 -translate-y-1/2 p-2.5 bg-primary/10 rounded-lg group-focus-within/search:scale-110 transition-transform duration-200">
            <Search className="w-5 h-5 text-primary" />
          </div>
          <Input 
            placeholder="RECHERCHER UN GROUPE..." 
            className="pl-20 h-16 sm:h-20 border-none rounded-lg bg-background/60 backdrop-blur-xl focus-visible:ring-2 focus-visible:ring-primary/20 font-black text-[11px] tracking-[0.2em] shadow-2xl transition-all duration-200 w-full placeholder:opacity-30"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      {/* Warning Card Modernisé */}
      <div className="glass-card border-none rounded-lg overflow-hidden relative group hover:bg-primary/5 transition-all duration-200 shadow-2xl shadow-primary/5">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-200" />
        <div className="flex flex-col sm:flex-row items-center gap-6 sm:gap-10 py-8 px-8 sm:px-12 relative z-10 text-center sm:text-left">
          <div className="p-5 sm:p-6 bg-primary/10 rounded-lg text-primary shadow-inner border border-primary/20 group-hover:scale-110 group-hover:-rotate-3 transition-all duration-200">
            <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10" />
          </div>
          <div className="space-y-2">
            <h4 className="text-xs sm:text-sm font-black uppercase tracking-[0.3em] text-primary bg-primary/5 w-fit px-4 py-1 rounded-full mx-auto sm:mx-0">Privilèges Administrateur</h4>
            <p className="text-[10px] sm:text-[11px] text-muted-foreground font-black leading-relaxed uppercase tracking-widest opacity-80 max-w-2xl">
              Les fonctions de modération et d'animation sont exclusivement réservées aux groupes dont vous êtes administrateur. L'IA utilisera le profil du groupe pour répondre.
            </p>
          </div>
        </div>
      </div>

      {/* Groups Grid Modernisé */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 sm:gap-10">
        {filteredGroups.length === 0 ? (
          <div className="col-span-full py-32 text-center glass-card border-dashed border-2 border-primary/20 rounded-lg space-y-6 bg-primary/5">
            <div className="p-8 bg-background/40 backdrop-blur-xl rounded-full w-fit mx-auto shadow-2xl border border-primary/10">
              <Users className="w-16 h-16 text-primary opacity-20" />
            </div>
            <div className="space-y-2">
              <p className="font-black uppercase tracking-[0.3em] text-[12px] text-muted-foreground">
                {searchQuery ? "Aucun groupe ne correspond à votre recherche" : "Aucun groupe administrateur disponible"}
              </p>
              <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">Essayez de rafraîchir la session ou vérifiez vos permissions</p>
            </div>
          </div>
        ) : (
          filteredGroups.map((group) => (
            <div key={group.id} className="group relative glass-card border-none hover:shadow-[0_30px_60px_-15px_rgba(var(--primary-rgb),0.15)] transition-all duration-200 rounded-lg overflow-hidden flex flex-col h-full hover:-translate-y-2">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-2xl -mr-16 -mt-16 group-hover:bg-primary/10 transition-colors duration-200" />
              
              <div className="p-10 pb-6 relative z-10">
                <div className="flex items-start justify-between gap-6">
                  <div className="flex items-center gap-5">
                    <div className="w-16 h-16 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 group-hover:rotate-6 transition-all duration-200 shadow-inner border border-primary/20">
                      <Users className="w-8 h-8" />
                    </div>
                    <div className="space-y-1.5 min-w-0">
                      <h3 className="text-lg font-black tracking-tight line-clamp-1 group-hover:text-primary transition-colors text-foreground uppercase">{group.subject}</h3>
                      <div className="flex items-center gap-2 opacity-60">
                        <Users className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase tracking-widest">{group.participantsCount} participants</span>
                      </div>
                    </div>
                  </div>
                  <div className={cn(
                    "px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg border-2",
                    group.settings.is_active 
                      ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-emerald-500/10" 
                      : "bg-muted/30 text-muted-foreground/50 border-transparent"
                  )}>
                    {group.settings.is_active ? "Actif" : "Inactif"}
                  </div>
                </div>
              </div>

              <div className="px-10 pb-8 space-y-6 flex-1 relative z-10">
                <div className="grid grid-cols-2 gap-4">
                  <div className={cn(
                    "flex flex-col items-center justify-center gap-3 text-[9px] font-black p-6 rounded-lg border-2 transition-all duration-200",
                    group.settings.anti_link 
                      ? "bg-primary/5 text-primary border-primary/20 shadow-xl shadow-primary/5" 
                      : "bg-background/20 text-muted-foreground/30 border-transparent grayscale opacity-50"
                  )}>
                    <div className={cn(
                      "p-2.5 rounded-lg",
                      group.settings.anti_link ? "bg-primary/10" : "bg-muted/10"
                    )}>
                      <Shield className="w-5 h-5" />
                    </div>
                    <span className="uppercase tracking-[0.2em]">Anti-Lien</span>
                  </div>
                  <div className={cn(
                    "flex flex-col items-center justify-center gap-3 text-[9px] font-black p-6 rounded-lg border-2 transition-all duration-200",
                    group.settings.bad_words 
                      ? "bg-primary/5 text-primary border-primary/20 shadow-xl shadow-primary/5" 
                      : "bg-background/20 text-muted-foreground/30 border-transparent grayscale opacity-50"
                  )}>
                    <div className={cn(
                      "p-2.5 rounded-lg",
                      group.settings.bad_words ? "bg-primary/10" : "bg-muted/10"
                    )}>
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <span className="uppercase tracking-[0.2em]">Filtre</span>
                  </div>
                </div>
                
                <div className={cn(
                  "p-5 rounded-lg border-2 transition-all duration-200 flex items-center justify-between group/ai",
                  group.settings.ai_assistant_enabled
                    ? "bg-primary/5 text-primary border-primary/20 shadow-xl shadow-primary/5"
                    : "bg-background/20 text-muted-foreground/30 border-transparent grayscale opacity-50"
                )}>
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "p-3 rounded-lg",
                      group.settings.ai_assistant_enabled ? "bg-primary/10" : "bg-muted/10"
                    )}>
                      <Zap className={cn("w-5 h-5", group.settings.ai_assistant_enabled && "animate-pulse")} />
                    </div>
                    <div className="space-y-0.5 text-left">
                      <span className="text-[10px] font-black uppercase tracking-[0.2em]">Assistant IA</span>
                      <p className="text-[8px] font-bold uppercase tracking-widest opacity-60">{group.settings.ai_assistant_enabled ? "Activé" : "Désactivé"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-10 pt-0 relative z-10">
                <Button 
                  className="w-full h-16 font-black uppercase tracking-[0.3em] text-[10px] rounded-lg whappi-gradient text-white shadow-2xl shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-1 active:scale-95 transition-all duration-200 gap-4" 
                  onClick={() => handleOpenSettings(group)}
                >
                  <Zap className="w-5 h-5" />
                  Configurer
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal de Configuration Modernisé */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] w-[95vw] max-h-[90vh] overflow-hidden border-none rounded-lg p-0 gap-0 bg-background/80 backdrop-blur-3xl shadow-2xl flex flex-col animate-in zoom-in-95 duration-200">
          <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-3xl -mr-48 -mt-48 pointer-events-none" />
          
          {/* Header du Modal */}
          <div className="p-8 sm:p-12 pb-6 space-y-8 flex-shrink-0 border-b border-primary/5 relative z-10">
            <DialogHeader>
              <div className="flex items-center gap-6 mb-2">
                <div className="p-4 whappi-gradient rounded-lg shadow-2xl shadow-primary/20 text-white flex-shrink-0">
                  <ShieldAlert className="w-8 h-8 sm:w-10 sm:h-10" />
                </div>
                <div className="space-y-1.5 text-left min-w-0 flex-1">
                  <DialogTitle className="text-2xl sm:text-3xl font-black tracking-tight uppercase text-foreground truncate">Configuration</DialogTitle>
                  <div className="flex items-center gap-3">
                    <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                    <DialogDescription className="font-black text-[10px] sm:text-[11px] uppercase tracking-[0.2em] text-primary/60 truncate">
                      {selectedGroup?.subject}
                    </DialogDescription>
                  </div>
                </div>
              </div>
            </DialogHeader>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-4 h-16 sm:h-20 rounded-lg bg-primary/5 p-2 sm:p-2.5 border-2 border-primary/5 shadow-inner">
                <TabsTrigger value="moderation" className="rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] gap-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all duration-200">
                  <Shield className="w-4 h-4" />
                  <span className="hidden md:inline">Sécurité</span>
                </TabsTrigger>
                <TabsTrigger value="profile" className="rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] gap-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all duration-200">
                  <Users className="w-4 h-4" />
                  <span className="hidden md:inline">Profil IA</span>
                </TabsTrigger>
                <TabsTrigger value="links" className="rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] gap-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all duration-200">
                  <Plus className="w-4 h-4" />
                  <span className="hidden md:inline">Services</span>
                </TabsTrigger>
                <TabsTrigger value="animator" className="rounded-lg text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] gap-3 data-[state=active]:bg-background data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all duration-200">
                  <Zap className="w-4 h-4" />
                  <span className="hidden md:inline">Animation</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Corps du Modal */}
          <div className="flex-1 overflow-y-auto p-8 sm:p-12 pt-6 custom-scrollbar relative z-10">
            <Tabs value={activeTab} className="w-full">
              <TabsContent value="moderation" className="animate-in fade-in slide-in-from-bottom-4 duration-200 m-0">
                <div className="flex flex-col space-y-10">
                  <form ref={modFormRef} className="space-y-8" onSubmit={(e) => { e.preventDefault(); handleSaveModeration(); }}>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="p-8 rounded-lg bg-primary/5 border-2 border-primary/10 space-y-4 shadow-xl group/card hover:bg-primary/10 transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg text-primary group-hover/card:scale-110 transition-transform">
                              <Shield className="w-6 h-6" />
                            </div>
                            <Label className="font-black uppercase tracking-[0.2em] text-[11px] text-primary">Protection</Label>
                          </div>
                          <Switch 
                            checked={modFormData.is_active}
                            onCheckedChange={(c) => setModFormData({...modFormData, is_active: c})}
                            className="data-[state=checked]:bg-primary shadow-lg"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-black leading-relaxed uppercase tracking-widest opacity-60">
                          Activez pour protéger le groupe contre le spam et les liens malveillants.
                        </p>
                      </div>

                      <div className="p-8 rounded-lg bg-primary/5 border-2 border-primary/10 space-y-4 shadow-xl group/card hover:bg-primary/10 transition-all duration-200">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-primary/10 rounded-lg text-primary group-hover/card:scale-110 transition-transform">
                              <Zap className="w-6 h-6" />
                            </div>
                            <Label className="font-black uppercase tracking-[0.2em] text-[11px] text-primary">Assistant IA</Label>
                          </div>
                          <Switch 
                            checked={modFormData.ai_assistant_enabled}
                            onCheckedChange={(c) => setModFormData({...modFormData, ai_assistant_enabled: c})}
                            className="data-[state=checked]:bg-primary shadow-lg"
                          />
                        </div>
                        <p className="text-[10px] text-muted-foreground font-black leading-relaxed uppercase tracking-widest opacity-60">
                          Répond automatiquement aux questions en utilisant le profil (Section 2.6).
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between p-8 rounded-lg border-2 border-primary/5 bg-background/40 backdrop-blur-xl hover:border-primary/20 transition-all duration-200 group/card shadow-xl">
                      <div className="flex items-center gap-6">
                        <div className="p-4 bg-primary/10 rounded-lg text-primary group-hover/card:scale-110 group-hover:rotate-6 transition-all duration-200">
                          <ShieldAlert className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[11px] font-black uppercase tracking-[0.2em] flex items-center gap-2">
                            Filtrage de Liens
                          </Label>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-50">Interdire les liens externes</p>
                        </div>
                      </div>
                      <Switch 
                        checked={modFormData.anti_link}
                        onCheckedChange={(c) => setModFormData({...modFormData, anti_link: c})}
                        className="data-[state=checked]:bg-primary shadow-lg"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4 p-8 rounded-lg border-2 border-primary/5 bg-background/40 backdrop-blur-xl shadow-xl group/card">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3 ml-2">
                          <div className="p-2 bg-amber-500/10 rounded-lg">
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                          </div>
                          Seuil d'Avertissements
                        </Label>
                        <div className="relative">
                          <Input 
                            type="number" 
                            min={1} 
                            max={10}
                            value={modFormData.max_warnings}
                            onChange={(e) => setModFormData({...modFormData, max_warnings: parseInt(e.target.value) || 5})}
                            className="h-20 border-none rounded-lg font-black focus-visible:ring-2 focus-visible:ring-primary/20 text-center text-3xl bg-primary/5 shadow-inner transition-all duration-200"
                          />
                          <div className="absolute right-6 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase tracking-widest opacity-30">Max</div>
                        </div>
                      </div>

                      <div className="space-y-4 p-8 rounded-lg border-2 border-primary/5 bg-background/40 backdrop-blur-xl shadow-xl">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3 ml-2">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <MessageSquare className="w-4 h-4 text-primary" />
                          </div>
                          Mots Proscrits
                        </Label>
                        <Textarea 
                          placeholder="Ex: insulte, arnaque, spam..."
                          value={modFormData.bad_words}
                          onChange={(e) => setModFormData({...modFormData, bad_words: e.target.value})}
                          className="min-h-[140px] resize-none font-black text-[11px] p-6 border-none rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 bg-primary/5 shadow-inner transition-all duration-200 placeholder:opacity-20"
                        />
                      </div>
                    </div>

                    <div className="space-y-6 p-8 rounded-lg border-2 border-primary/5 bg-background/40 backdrop-blur-xl shadow-xl">
                      <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3 ml-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Shield className="w-4 h-4 text-primary" />
                        </div>
                        Message d'Avertissement
                      </Label>
                      <Textarea 
                        value={modFormData.warning_template}
                        onChange={(e) => setModFormData({...modFormData, warning_template: e.target.value})}
                        className="min-h-[160px] resize-none font-black text-[11px] p-8 border-none rounded-lg focus-visible:ring-2 focus-visible:ring-primary/20 bg-primary/5 shadow-inner transition-all duration-200 leading-relaxed"
                        required={modFormData.is_active}
                      />
                      <div className="flex flex-wrap gap-3 pt-2">
                        {['@{{name}}', '{{count}}', '{{max}}', '{{reason}}'].map(tag => (
                          <Badge key={tag} variant="secondary" className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg shadow-md bg-background/80 border-primary/10 text-primary">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-8 p-8 rounded-lg bg-emerald-500/5 border-2 border-emerald-500/10 shadow-2xl shadow-emerald-500/5 group/welcome">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-5">
                          <div className="p-4 bg-emerald-500/10 rounded-lg text-emerald-500 group-hover/welcome:scale-110 transition-transform">
                            <Users className="w-7 h-7" />
                          </div>
                          <div className="space-y-1">
                            <Label className="font-black uppercase tracking-[0.2em] text-[12px] text-emerald-600">Accueil Automatique</Label>
                            <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Nouveaux membres</p>
                          </div>
                        </div>
                        <Switch 
                          checked={modFormData.welcome_enabled}
                          onCheckedChange={(c) => setModFormData({...modFormData, welcome_enabled: c})}
                          className="data-[state=checked]:bg-emerald-500 shadow-lg shadow-emerald-500/20"
                        />
                      </div>
                      
                      <div className="space-y-4">
                        <Textarea 
                          value={modFormData.welcome_template}
                          onChange={(e) => setModFormData({...modFormData, welcome_template: e.target.value})}
                          className="min-h-[160px] resize-none font-black text-[11px] p-8 border-none rounded-lg focus-visible:ring-2 focus-visible:ring-emerald-500/20 bg-background/40 shadow-inner transition-all duration-200 leading-relaxed"
                          placeholder="Bienvenue @{{name}}..."
                        />
                        <div className="flex flex-wrap gap-3">
                          {['@{{name}}', '{{group_name}}', '{{rules}}', '{{date}}'].map(tag => (
                            <Badge key={tag} variant="secondary" className="text-[9px] font-black uppercase tracking-widest px-4 py-2 rounded-lg shadow-md bg-background/80 border-emerald-500/10 text-emerald-600">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    </div>
                  </form>

                  <div className="sticky bottom-0 pt-8 pb-4 bg-gradient-to-t from-background via-background/95 to-transparent px-4 sm:px-0 z-20">
                    <Button 
                      onClick={handleSaveModeration} 
                      className="w-full h-20 font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 rounded-lg text-[11px] gap-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whappi-gradient text-white border-none group/save"
                    >
                      <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      Enregistrer les règles
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="profile" className="animate-in fade-in slide-in-from-bottom-4 duration-200 m-0">
                <div className="flex flex-col space-y-10">
                  <div className="space-y-8">
                    <div className="p-8 rounded-lg border-2 border-primary/5 bg-background/40 backdrop-blur-xl shadow-xl group/card">
                      <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3 ml-2 mb-4">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Zap className="w-4 h-4 text-primary" />
                        </div>
                        Thématique du Groupe
                      </Label>
                      <Input 
                        placeholder="Ex: Marketing Digital, Coaching Sportif..."
                        value={profileFormData.theme}
                        onChange={(e) => setProfileFormData({...profileFormData, theme: e.target.value})}
                        className="h-16 border-none rounded-lg font-black bg-primary/5 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 px-8 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div className="space-y-4 p-8 rounded-lg border-2 border-primary/5 bg-background/40 backdrop-blur-xl shadow-xl">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3 ml-2">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Shield className="w-4 h-4 text-primary" />
                          </div>
                          Mission
                        </Label>
                        <Textarea 
                          placeholder="Quelle est la mission principale du groupe ?"
                          value={profileFormData.mission}
                          onChange={(e) => setProfileFormData({...profileFormData, mission: e.target.value})}
                          className="min-h-[140px] resize-none font-black text-[11px] p-8 border-none rounded-lg bg-primary/5 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 leading-relaxed"
                        />
                      </div>

                      <div className="space-y-4 p-8 rounded-lg border-2 border-primary/5 bg-background/40 backdrop-blur-xl shadow-xl">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3 ml-2">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Zap className="w-4 h-4 text-primary" />
                          </div>
                          Objectifs
                        </Label>
                        <Textarea 
                          placeholder="Quels sont les objectifs à atteindre ?"
                          value={profileFormData.objectives}
                          onChange={(e) => setProfileFormData({...profileFormData, objectives: e.target.value})}
                          className="min-h-[140px] resize-none font-black text-[11px] p-8 border-none rounded-lg bg-primary/5 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 leading-relaxed"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 p-8 rounded-lg border-2 border-primary/5 bg-background/40 backdrop-blur-xl shadow-xl">
                      <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-3 ml-2">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          <Users className="w-4 h-4 text-primary" />
                        </div>
                        Règles du Groupe
                      </Label>
                      <Textarea 
                        placeholder="Listez les règles de vie du groupe..."
                        value={profileFormData.rules}
                        onChange={(e) => setProfileFormData({...profileFormData, rules: e.target.value})}
                        className="min-h-[180px] resize-none font-black text-[11px] p-8 border-none rounded-lg bg-primary/5 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 leading-relaxed"
                      />
                    </div>
                  </div>

                  <div className="sticky bottom-0 pt-8 pb-4 bg-gradient-to-t from-background via-background/95 to-transparent px-4 sm:px-0 z-20">
                    <Button 
                      onClick={handleSaveProfile} 
                      className="w-full h-20 font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 rounded-lg text-[11px] gap-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whappi-gradient text-white border-none group/save"
                    >
                      <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      Enregistrer le profil
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="links" className="animate-in fade-in slide-in-from-bottom-4 duration-200 m-0">
                <div className="flex flex-col space-y-10">
                  <div className="space-y-8">
                    <div className="flex items-center justify-between px-2">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary flex items-center gap-3">
                          <div className="p-2 bg-primary/10 rounded-lg">
                            <Plus className="w-4 h-4" />
                          </div>
                          Catalogue Services
                        </Label>
                        <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-50 ml-11">Gérez vos liens produits et offres</p>
                      </div>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        onClick={handleAddLink}
                        className="h-12 rounded-lg border-2 border-primary/10 font-black text-[10px] uppercase tracking-widest gap-3 px-6 hover:bg-primary hover:text-white transition-all duration-200 shadow-xl"
                      >
                        <Plus className="w-4 h-4" />
                        Ajouter un service
                      </Button>
                    </div>

                    <div className="space-y-6 max-h-[500px] overflow-y-auto pr-4 custom-scrollbar">
                      {productLinks.length === 0 ? (
                        <div className="py-24 text-center glass-card border-dashed border-2 border-primary/10 rounded-lg space-y-6 bg-primary/5">
                          <div className="p-8 bg-background/40 backdrop-blur-xl rounded-full w-fit mx-auto shadow-2xl border border-primary/5">
                            <Plus className="w-12 h-12 text-primary opacity-20" />
                          </div>
                          <div className="space-y-2">
                            <p className="font-black uppercase tracking-[0.3em] text-[11px] text-muted-foreground">Aucun service configuré</p>
                            <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Cliquez sur ajouter pour commencer</p>
                          </div>
                        </div>
                      ) : (
                        <Accordion type="single" collapsible className="space-y-6">
                          {productLinks.map((link, index) => (
                            <AccordionItem key={index} value={`item-${index}`} className="border-2 border-primary/5 rounded-lg px-8 bg-background/40 backdrop-blur-xl shadow-xl overflow-hidden transition-all duration-200 hover:border-primary/20 group/link">
                              <AccordionTrigger className="hover:no-underline py-8">
                                <div className="flex items-center gap-6 text-left w-full mr-4">
                                  <div className="w-14 h-14 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-black text-lg shadow-inner group-hover/link:scale-110 transition-transform">
                                    {index + 1}
                                  </div>
                                  <div className="space-y-1 flex-1">
                                    <span className="font-black text-sm uppercase tracking-tight text-foreground block">
                                      {link.title || "Nouveau Service"}
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block">
                                      {link.url || "Aucune URL configurée"}
                                    </span>
                                  </div>
                                </div>
                              </AccordionTrigger>
                              <AccordionContent className="pb-10 space-y-8 animate-in fade-in duration-200">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                  <div className="space-y-4">
                                    <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Nom du Service</Label>
                                    <Input 
                                      value={link.title}
                                      onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
                                      className="h-16 border-none rounded-lg font-black text-sm bg-primary/5 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 px-8"
                                      placeholder="Ex: Consultation Stratégique"
                                    />
                                  </div>
                                  <div className="space-y-4">
                                    <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Lien de Destination</Label>
                                    <Input 
                                      value={link.url}
                                      onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                                      className="h-16 border-none rounded-lg font-black text-sm bg-primary/5 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 px-8"
                                      placeholder="https://..."
                                    />
                                  </div>
                                </div>

                                <div className="space-y-4">
                                  <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Description Commerciale</Label>
                                  <Textarea 
                                    value={link.description}
                                    onChange={(e) => handleLinkChange(index, 'description', e.target.value)}
                                    className="min-h-[120px] resize-none font-black text-[11px] p-8 border-none rounded-lg bg-primary/5 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 leading-relaxed"
                                    placeholder="Décrivez les bénéfices de ce service..."
                                  />
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-4">
                                  <div className="space-y-4">
                                    <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Texte du Bouton (CTA)</Label>
                                    <Input 
                                      value={link.cta}
                                      onChange={(e) => handleLinkChange(index, 'cta', e.target.value)}
                                      className="h-16 border-none rounded-lg font-black text-sm bg-primary/5 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 px-8"
                                      placeholder="Ex: En savoir plus"
                                    />
                                  </div>
                                  <div className="flex items-end">
                                    <Button 
                                      variant="destructive" 
                                      className="w-full h-16 rounded-lg font-black text-[10px] uppercase tracking-widest gap-4 shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-200"
                                      onClick={() => handleRemoveLink(index)}
                                    >
                                      <Trash2 className="w-5 h-5" />
                                      Supprimer le service
                                    </Button>
                                  </div>
                                </div>
                              </AccordionContent>
                            </AccordionItem>
                          ))}
                        </Accordion>
                      )}
                    </div>
                  </div>

                  <div className="sticky bottom-0 pt-8 pb-4 bg-gradient-to-t from-background via-background/95 to-transparent px-4 sm:px-0 z-20">
                    <Button 
                      onClick={handleSaveLinks} 
                      className="w-full h-20 font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 rounded-lg text-[11px] gap-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whappi-gradient text-white border-none group/save"
                    >
                      <Save className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      Enregistrer les services
                    </Button>
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="animator" className="animate-in fade-in slide-in-from-bottom-4 duration-200 m-0">
                <div className="flex flex-col space-y-12">
                  <div className="space-y-8">
                    {/* IA Animation Box Modernisée */}
                    <div className="p-10 rounded-lg border-2 border-primary/10 bg-primary/5 space-y-8 shadow-2xl shadow-primary/5 relative overflow-hidden group/ia-box">
                      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover/ia-box:bg-primary/10 transition-colors duration-200" />
                      
                      <div className="flex items-center gap-6 relative z-10">
                        <div className="p-5 whappi-gradient rounded-lg text-white shadow-2xl shadow-primary/20 group-hover/ia-box:scale-110 group-hover/ia-box:rotate-6 transition-all duration-200">
                          <Zap className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="text-[12px] font-black uppercase tracking-[0.3em] text-primary">Assistant d'Animation IA</h4>
                          <p className="text-[10px] text-muted-foreground font-black uppercase tracking-widest opacity-60">Générez du contenu engageant instantanément</p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
                        <div className="space-y-4">
                          <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Objectif du Message</Label>
                          <Select value={aiObjective} onValueChange={setAiObjective}>
                            <SelectTrigger className="h-16 border-none rounded-lg font-black text-sm bg-background shadow-inner px-8 focus:ring-2 focus:ring-primary/20 transition-all duration-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg border-2 border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95 p-2">
                              <SelectItem value="annonce" className="rounded-lg font-black text-[11px] uppercase tracking-widest p-4">📣 Annonce Officielle</SelectItem>
                              <SelectItem value="promotion" className="rounded-lg font-black text-[11px] uppercase tracking-widest p-4">💰 Promotion / Offre</SelectItem>
                              <SelectItem value="information" className="rounded-lg font-black text-[11px] uppercase tracking-widest p-4">ℹ️ Information Utile</SelectItem>
                              <SelectItem value="engagement" className="rounded-lg font-black text-[11px] uppercase tracking-widest p-4">🤝 Engagement / Question</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex items-center justify-between p-8 border-none rounded-lg bg-background shadow-inner h-16 mt-auto">
                          <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground">Inclure les Liens Catalogue</Label>
                          <Switch 
                            checked={aiIncludeLinks} 
                            onCheckedChange={setAiIncludeLinks}
                            className="data-[state=checked]:bg-primary"
                          />
                        </div>
                      </div>

                      <div className="space-y-4 relative z-10">
                        <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Contexte Spécifique</Label>
                        <Input 
                          placeholder="Ex: Nouveau webinaire jeudi à 18h, promo -50% flash..."
                          value={aiAdditionalInfo}
                          onChange={(e) => setAiAdditionalInfo(e.target.value)}
                          className="h-16 border-none rounded-lg font-black text-sm bg-background shadow-inner px-8 focus:ring-2 focus:ring-primary/20 transition-all duration-200"
                        />
                      </div>

                      <Button 
                        onClick={handleGenerateAiMessage} 
                        disabled={isGeneratingAi}
                        className="w-full h-16 font-black uppercase tracking-[0.3em] text-[11px] rounded-lg gap-4 shadow-2xl shadow-primary/20 whappi-gradient text-white transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-50 relative z-10"
                      >
                        {isGeneratingAi ? (
                          <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                        ) : (
                          <Zap className="w-6 h-6" />
                        )}
                        Générer le message IA
                      </Button>
                    </div>

                    <div className="space-y-10">
                      <div className="space-y-6 p-10 rounded-lg border-2 border-primary/5 bg-background/40 backdrop-blur-xl shadow-xl group/new-task">
                        <div className="flex items-center gap-6">
                          <div className="p-4 bg-primary/10 rounded-lg text-primary group-hover/new-task:scale-110 transition-transform">
                            <MessageSquare className="w-6 h-6" />
                          </div>
                          <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary">Programmation Manuelle</Label>
                        </div>
                        
                        <div className="space-y-4">
                          <Textarea 
                            placeholder="Écrivez votre message ici ou utilisez l'IA ci-dessus..."
                            value={taskFormData.message_content}
                            onChange={(e) => setTaskFormData({...taskFormData, message_content: e.target.value})}
                            className="min-h-[160px] resize-none font-black text-[11px] p-8 border-none rounded-lg bg-primary/5 shadow-inner focus-visible:ring-2 focus-visible:ring-primary/20 transition-all duration-200 leading-relaxed"
                          />
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                          <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Planifier le</Label>
                            <Input 
                            type="datetime-local"
                            value={taskFormData.scheduled_at}
                            onChange={(e) => setTaskFormData({...taskFormData, scheduled_at: e.target.value})}
                            className="h-16 border-none rounded-lg font-black bg-primary/5 shadow-inner px-8 transition-all duration-200"
                          />
                          </div>
                          <div className="space-y-4">
                            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-2">Récurrence</Label>
                            <Select 
                              value={taskFormData.recurrence} 
                              onValueChange={(v: any) => setTaskFormData({...taskFormData, recurrence: v})}
                            >
                              <SelectTrigger className="h-16 border-none rounded-lg font-black bg-primary/5 shadow-inner px-8 transition-all duration-200">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-lg border-2 border-primary/10 shadow-2xl backdrop-blur-xl bg-background/95 p-2">
                                <SelectItem value="none" className="rounded-lg font-black text-[11px] uppercase tracking-widest p-4">Une seule fois</SelectItem>
                                <SelectItem value="daily" className="rounded-lg font-black text-[11px] uppercase tracking-widest p-4">Chaque jour</SelectItem>
                                <SelectItem value="weekly" className="rounded-lg font-black text-[11px] uppercase tracking-widest p-4">Chaque semaine</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-8">
                        <div className="flex items-center justify-between px-2">
                          <h3 className="font-black uppercase tracking-[0.3em] text-[11px] text-primary flex items-center gap-4">
                            <div className="p-2 bg-primary/10 rounded-lg">
                              <Clock className="w-5 h-5" />
                            </div>
                            File d'attente ({animatorTasks.length})
                          </h3>
                        </div>

                        <div className="space-y-6 max-h-[400px] overflow-y-auto pr-4 custom-scrollbar">
                          {animatorTasks.length === 0 ? (
                            <div className="py-24 text-center glass-card border-dashed border-2 border-primary/10 rounded-lg space-y-6 bg-primary/5">
                              <div className="p-8 bg-background/40 backdrop-blur-xl rounded-full w-fit mx-auto shadow-2xl border border-primary/5">
                                <Calendar className="w-12 h-12 text-primary opacity-20" />
                              </div>
                              <div className="space-y-2">
                                <p className="font-black uppercase tracking-[0.3em] text-[11px] text-muted-foreground">Aucune tâche programmée</p>
                                <p className="text-[9px] font-bold uppercase tracking-widest opacity-40">Vos messages programmés apparaîtront ici</p>
                              </div>
                            </div>
                          ) : (
                            animatorTasks.map((task) => (
                              <div key={task.id} className="p-8 rounded-lg border-2 border-primary/5 bg-background/40 backdrop-blur-xl flex items-center justify-between group/task hover:border-primary/20 transition-all duration-200 shadow-xl">
                                <div className="space-y-3 flex-1 min-w-0 pr-6">
                                  <p className="text-[12px] font-black line-clamp-2 uppercase tracking-tight text-foreground leading-relaxed">
                                    {task.message_content}
                                  </p>
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary/10 border border-primary/10">
                                      <Calendar className="w-3 h-3 text-primary" />
                                      <span className="text-[9px] font-black text-primary uppercase tracking-widest">
                                        {new Date(task.scheduled_at).toLocaleString()}
                                      </span>
                                    </div>
                                    <div className="flex items-center gap-2 px-4 py-1.5 rounded-full bg-muted/30">
                                      <Clock className="w-3 h-3 text-muted-foreground" />
                                      <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">
                                        {task.recurrence === 'daily' ? 'Quotidien' : task.recurrence === 'weekly' ? 'Hebdomadaire' : 'Unique'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  onClick={() => handleDeleteTask(task.id)}
                                  className="h-16 w-16 rounded-lg text-destructive hover:bg-destructive/10 transition-all duration-200 border-2 border-transparent hover:border-destructive/20 shadow-inner"
                                >
                                  <Trash2 className="w-6 h-6" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="sticky bottom-0 pt-8 pb-4 bg-gradient-to-t from-background via-background/95 to-transparent px-4 sm:px-0 z-20">
                    <Button 
                      onClick={handleAddTask} 
                      className="w-full h-20 font-black uppercase tracking-[0.3em] shadow-2xl shadow-primary/30 rounded-lg text-[11px] gap-4 transition-all duration-200 hover:scale-[1.02] active:scale-[0.98] whappi-gradient text-white border-none group/save"
                    >
                      <Plus className="w-6 h-6 group-hover:scale-110 transition-transform" />
                      Programmer le message
                    </Button>
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

export default function GroupManagementPage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center p-12">
        <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <GroupManagementContent />
    </React.Suspense>
  )
}
