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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { useAuth } from "@clerk/nextjs"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { usePristine } from "@/hooks/use-pristine"

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
  }
}

function ModerationPageContent() {
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
  
  const [modFormData, setModFormData] = React.useState({
    is_active: false,
    anti_link: false,
    bad_words: "",
    warning_template: "",
    max_warnings: 5,
    welcome_enabled: false,
    welcome_template: ""
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

  const handleOpenSettings = (group: Group) => {
    setSelectedGroup(group)
    setModFormData({
      is_active: !!group.settings.is_active,
      anti_link: !!group.settings.anti_link,
      bad_words: group.settings.bad_words || "",
      warning_template: group.settings.warning_template || "Attention @{{name}}, avertissement {{count}}/{{max}} pour : {{reason}}.",
      max_warnings: group.settings.max_warnings || 5,
      welcome_enabled: !!group.settings.welcome_enabled,
      welcome_template: group.settings.welcome_template || "Bienvenue @{{name}} dans le groupe {{group_name}} !\n\n📜 *Règles :*\n{{rules}}\n\n📅 Arrivée le : {{date}}"
    })
    setIsDialogOpen(true)
  }

  const handleSaveModeration = async () => {
    if (!selectedGroup || !sessionId) return
    if (modFormData.is_active && !validateMod()) return

    try {
      const token = await getToken()
      await api.sessions.updateGroupSettings(sessionId, selectedGroup.id, modFormData, token || undefined)
      toast.success(`Paramètres de modération mis à jour`)
      
      setGroups(prev => prev.map(g => 
        g.id === selectedGroup.id 
          ? { ...g, settings: { ...modFormData, is_active: modFormData.is_active ? 1 : 0, anti_link: modFormData.anti_link ? 1 : 0 } }
          : g
      ))
      setIsDialogOpen(false)
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement")
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
          className="rounded-lg font-bold uppercase tracking-widest text-[10px] h-12 px-8 transition-all duration-200"
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
            className="h-12 w-12 rounded-lg border border-slate-200 dark:border-primary/10 hover:bg-primary hover:text-white transition-all duration-200 shadow-sm flex-shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1.5 min-w-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary/10 rounded-lg border border-primary/20 shadow-sm">
                <Shield className="w-6 h-6 text-primary" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-primary leading-none uppercase">
                Modération
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
            className="pl-11 h-12 rounded-lg border border-slate-200 dark:border-primary/10 bg-slate-50 dark:bg-background/50 focus:bg-white dark:focus:bg-background focus:border-primary/30 transition-all duration-200 font-bold text-[10px] tracking-widest"
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
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary group-hover:scale-110 transition-transform duration-200 shadow-sm">
                      <Users className="w-6 h-6" />
                    </div>
                    <div className="space-y-1">
                      <CardTitle className="text-sm font-bold tracking-tight line-clamp-1 group-hover:text-primary transition-colors text-foreground uppercase">{group.subject}</CardTitle>
                      <CardDescription className="text-[10px] font-bold uppercase tracking-widest opacity-60">{group.participantsCount} participants</CardDescription>
                    </div>
                  </div>
                  <Badge variant={group.settings.is_active ? "default" : "secondary"} className={cn(
                    "text-[8px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-lg",
                    group.settings.is_active ? "bg-primary text-white" : "bg-slate-100 dark:bg-muted/50 text-muted-foreground"
                  )}>
                    {group.settings.is_active ? "ACTIF" : "INACTIF"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="p-6 pt-0 flex-1">
                <div className="grid grid-cols-2 gap-3">
                  <div className={cn(
                    "flex flex-col items-center justify-center gap-2 text-[9px] font-bold p-4 rounded-lg border transition-all duration-200",
                    group.settings.anti_link 
                      ? "bg-primary/5 text-primary border-primary/20 shadow-sm" 
                      : "bg-slate-50 dark:bg-muted/30 text-muted-foreground/40 border-slate-100 dark:border-transparent grayscale"
                  )}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="uppercase tracking-widest">ANTI-LIEN</span>
                  </div>
                  <div className={cn(
                    "flex flex-col items-center justify-center gap-2 text-[9px] font-bold p-4 rounded-lg border transition-all duration-200",
                    group.settings.bad_words 
                      ? "bg-primary/5 text-primary border-primary/20 shadow-sm" 
                      : "bg-slate-50 dark:bg-muted/30 text-muted-foreground/40 border-slate-100 dark:border-transparent grayscale"
                  )}>
                    <CheckCircle2 className="w-4 h-4" />
                    <span className="uppercase tracking-widest">FILTRE</span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="p-6 pt-0 mt-auto">
                <Button 
                  className="w-full h-12 font-bold uppercase tracking-widest text-[10px] rounded-lg shadow-sm transition-all duration-200" 
                  onClick={() => handleOpenSettings(group)}
                >
                  Configurer
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[600px] w-[95vw] max-h-[90vh] overflow-hidden border border-slate-200 dark:border-primary/10 rounded-lg p-0 gap-0 bg-white dark:bg-card shadow-2xl flex flex-col">
          <div className="p-6 sm:p-8 pb-4 space-y-4 flex-shrink-0 border-b border-slate-100 dark:border-primary/5">
            <DialogHeader>
              <div className="flex items-center gap-4 mb-2">
                <div className="p-3 bg-primary/10 rounded-lg border border-primary/20 shadow-sm flex-shrink-0">
                  <ShieldAlert className="w-7 h-7 text-primary" />
                </div>
                <div className="space-y-1 text-left min-w-0 flex-1">
                  <DialogTitle className="text-xl font-bold tracking-tight uppercase text-primary truncate">Sécurité & Modération</DialogTitle>
                  <DialogDescription className="font-bold text-[10px] uppercase tracking-widest text-muted-foreground opacity-60 truncate">
                    Groupe: {selectedGroup?.subject}
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
          </div>

          <div className="flex-1 overflow-y-auto p-6 sm:p-8 pt-4">
            <div className="space-y-6">
              <form ref={modFormRef} className="space-y-6" onSubmit={(e) => { e.preventDefault(); handleSaveModeration(); }}>
                <div className="p-5 sm:p-6 rounded-lg bg-primary/5 border border-primary/10 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold uppercase tracking-widest text-[10px] text-primary">Protection Active</Label>
                    <Switch 
                      checked={modFormData.is_active}
                      onCheckedChange={(c) => setModFormData({...modFormData, is_active: c})}
                      className="data-[state=checked]:bg-primary"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium leading-relaxed uppercase tracking-wider opacity-70">
                    Activez pour protéger le groupe contre le spam et les liens malveillants.
                  </p>
                </div>

                <div className="flex items-center justify-between p-5 sm:p-6 rounded-lg border border-slate-200 dark:border-primary/10 bg-slate-50/50 dark:bg-muted/5 hover:border-primary/20 transition-all duration-200 group shadow-sm">
                  <div className="space-y-1">
                    <Label className="text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
                      Anti-Liens
                    </Label>
                    <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-wider opacity-60">Interdire les liens externes</p>
                  </div>
                  <Switch 
                    checked={modFormData.anti_link}
                    onCheckedChange={(c) => setModFormData({...modFormData, anti_link: c})}
                    className="data-[state=checked]:bg-primary shadow-sm"
                  />
                </div>

                <div className="space-y-4 p-5 sm:p-6 rounded-lg border border-slate-200 dark:border-primary/10 bg-slate-50/50 dark:bg-muted/5 shadow-sm">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Seuil d'Avertissements
                  </Label>
                  <Input 
                    type="number" 
                    min={1} 
                    max={10}
                    value={modFormData.max_warnings}
                    onChange={(e) => setModFormData({...modFormData, max_warnings: parseInt(e.target.value) || 5})}
                    className="h-12 border border-slate-200 dark:border-primary/10 rounded-lg font-bold focus:border-primary/30 text-center text-lg bg-white dark:bg-background shadow-sm transition-all duration-200"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Mots Proscrits</Label>
                  <Textarea 
                    placeholder="Ex: insulte, arnaque, spam..."
                    value={modFormData.bad_words}
                    onChange={(e) => setModFormData({...modFormData, bad_words: e.target.value})}
                    className="min-h-[100px] resize-none font-mono text-[11px] p-5 border border-slate-200 dark:border-primary/10 rounded-lg focus:border-primary/30 bg-slate-50/50 dark:bg-muted/20 shadow-sm transition-all duration-200"
                  />
                </div>

                <div className="space-y-4">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Message d'Avertissement</Label>
                  <Textarea 
                      value={modFormData.warning_template}
                      onChange={(e) => setModFormData({...modFormData, warning_template: e.target.value})}
                      className="min-h-[100px] resize-none font-mono text-[11px] p-5 border border-slate-200 dark:border-primary/10 rounded-lg focus:border-primary/30 bg-slate-50/50 dark:bg-muted/20 shadow-sm transition-all duration-200"
                      required={modFormData.is_active}
                    />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['@{{name}}', '{{count}}', '{{max}}', '{{reason}}'].map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[8px] font-mono font-bold px-2.5 py-1.5 rounded-lg shadow-sm bg-slate-100 dark:bg-background/50 border border-slate-200 dark:border-muted/50">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="p-5 sm:p-6 rounded-lg bg-emerald-500/5 border border-emerald-500/10 space-y-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <Label className="font-bold uppercase tracking-widest text-[10px] text-emerald-600">Accueil Automatique</Label>
                    <Switch 
                      checked={modFormData.welcome_enabled}
                      onCheckedChange={(c) => setModFormData({...modFormData, welcome_enabled: c})}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground font-medium leading-relaxed uppercase tracking-wider opacity-70">
                    Envoyez automatiquement un message de bienvenue aux nouveaux membres.
                  </p>
                </div>

                <div className="space-y-4 pb-4">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground ml-2">Message de Bienvenue</Label>
                  <Textarea 
                      value={modFormData.welcome_template}
                      onChange={(e) => setModFormData({...modFormData, welcome_template: e.target.value})}
                      className="min-h-[100px] resize-none font-mono text-[11px] p-5 border border-slate-200 dark:border-primary/10 rounded-lg focus:border-primary/30 bg-slate-50/50 dark:bg-muted/20 shadow-sm transition-all duration-200"
                      placeholder="Bienvenue @{{name}}..."
                    />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {['@{{name}}', '{{group_name}}', '{{rules}}', '{{date}}'].map(tag => (
                      <Badge key={tag} variant="secondary" className="text-[8px] font-mono font-bold px-2.5 py-1.5 rounded-lg shadow-sm bg-slate-100 dark:bg-background/50 border border-slate-200 dark:border-muted/50">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              </form>
            </div>
          </div>
          
          <div className="p-6 sm:p-8 bg-white dark:bg-card border-t border-slate-100 dark:border-primary/5">
            <Button 
              onClick={handleSaveModeration} 
              className="w-full h-14 font-bold uppercase tracking-widest shadow-lg shadow-primary/10 rounded-lg text-[10px] gap-3 transition-all duration-200 active:scale-[0.98]"
            >
              <Save className="w-5 h-5" />
              Enregistrer les règles
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default function ModerationPage() {
  return (
    <React.Suspense fallback={
      <div className="flex items-center justify-center h-[60vh]">
        <div className="w-8 h-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    }>
      <ModerationPageContent />
    </React.Suspense>
  )
}
