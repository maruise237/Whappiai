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
  Zap,
  MessageSquare,
  ShieldCheck,
  ChevronRight,
  Info
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useAuth } from "@clerk/nextjs"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { usePristine } from "@/hooks/use-pristine"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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
  const [isSaving, setIsSaving] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const [selectedGroup, setSelectedGroup] = React.useState<Group | null>(null)
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

      // Auto-select first group if none selected
      if (data && data.length > 0 && !selectedGroup) {
        handleSelectGroup(data[0])
      }
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
    const filtered = groups.filter(g => (g.subject || "").toLowerCase().includes(lower))
    setFilteredGroups(filtered)
  }, [searchQuery, groups])

  const handleSelectGroup = (group: Group) => {
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
  }

  const handleSaveModeration = async () => {
    if (!selectedGroup || !sessionId) return
    if (modFormData.is_active && !validateMod()) return

    setIsSaving(true)
    try {
      const token = await getToken()
      await api.sessions.updateGroupSettings(sessionId, selectedGroup.id, modFormData, token || undefined)
      toast.success(`Paramètres mis à jour pour "${selectedGroup.subject}"`)

      setGroups(prev => prev.map(g =>
        g.id === selectedGroup.id
          ? { ...g, settings: { ...modFormData, is_active: modFormData.is_active ? 1 : 0, anti_link: modFormData.anti_link ? 1 : 0 } }
          : g
      ))
    } catch (error) {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 animate-spin rounded-full border-4 border-primary border-t-transparent shadow-lg shadow-primary/20" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground animate-pulse">Chargement des groupes...</p>
      </div>
    )
  }

  if (!sessionId) {
    return (
      <div className="text-center py-24 space-y-6">
        <h2 className="text-2xl font-black uppercase tracking-tighter">Session non spécifiée</h2>
        <Button
          onClick={() => router.push('/dashboard/moderation')}
          className="rounded-lg font-black uppercase tracking-widest text-[10px] h-12 px-8 shadow-lg shadow-primary/20"
        >
          Retour à la sélection
        </Button>
      </div>
    )
  }

  return (
    <div className="max-w-[1400px] mx-auto pb-20 px-4 sm:px-6 lg:px-8 animate-in fade-in duration-500">
      {/* Header - SaaS Vibe */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 py-8 border-b border-border mb-8">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="h-10 w-10 rounded-lg hover:bg-secondary text-muted-foreground"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight uppercase">Modération <span className="text-primary">Groupes</span></h1>
              <Badge variant="outline" className="text-[9px] font-bold uppercase tracking-widest bg-primary/5 text-primary border-primary/10 h-5">
                {sessionId}
              </Badge>
            </div>
            <p className="text-xs font-medium text-muted-foreground opacity-60">Gérez la sécurité et l'automatisation de vos groupes WhatsApp</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Button
            onClick={handleSaveModeration}
            disabled={isSaving || !selectedGroup}
            className="flex-1 sm:flex-none shadow-lg shadow-primary/20 h-11 px-8 font-black uppercase tracking-widest text-[10px] rounded-md gap-2 bg-primary hover:bg-primary/90 text-white"
          >
            {isSaving ? (
              <div className="w-4 h-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>Enregistrer</span>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-12 items-start">
        {/* Sidebar - Liste des Groupes */}
        <div className="space-y-6 lg:sticky lg:top-24">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground/50" />
            <Input
              placeholder="RECHERCHER UN GROUPE..."
              className="pl-11 h-12 rounded-xl border-border bg-card/50 font-bold text-[10px] tracking-widest focus:ring-primary/20"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          <Card className="border-border/50 bg-card/50 overflow-hidden">
            <ScrollArea className="h-[calc(100vh-350px)] lg:h-[600px]">
              <div className="p-2 space-y-1">
                {filteredGroups.length === 0 ? (
                  <div className="py-20 text-center space-y-3">
                    <Users className="w-10 h-10 mx-auto opacity-10" />
                    <p className="text-[9px] font-bold uppercase tracking-widest text-muted-foreground opacity-40">Aucun groupe trouvé</p>
                  </div>
                ) : (
                  filteredGroups.map((group) => (
                    <button
                      key={group.id}
                      onClick={() => handleSelectGroup(group)}
                      className={cn(
                        "w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 group text-left",
                        selectedGroup?.id === group.id
                          ? "bg-primary text-white shadow-lg shadow-primary/20"
                          : "hover:bg-secondary/80 text-muted-foreground hover:text-foreground"
                      )}
                    >
                      <div className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center transition-all",
                        selectedGroup?.id === group.id ? "bg-white/20" : "bg-primary/10 text-primary group-hover:bg-primary/20"
                      )}>
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-[11px] font-black uppercase tracking-tight truncate">
                          {group.subject || "Sans nom"}
                        </div>
                        <div className={cn(
                          "text-[9px] font-bold uppercase tracking-tighter opacity-60",
                          selectedGroup?.id === group.id ? "text-white/70" : "text-muted-foreground"
                        )}>
                          {group.participantsCount} membres • {group.settings.is_active ? 'Actif' : 'Inactif'}
                        </div>
                      </div>
                      <ChevronRight className={cn(
                        "w-4 h-4 opacity-20",
                        selectedGroup?.id === group.id && "opacity-100"
                      )} />
                    </button>
                  ))
                )}
              </div>
            </ScrollArea>
          </Card>
        </div>

        {/* Content - Configuration du Groupe */}
        <div className="space-y-12">
          {!selectedGroup ? (
            <div className="flex flex-col items-center justify-center py-40 bg-card/30 border border-dashed border-border rounded-3xl space-y-6">
              <div className="w-20 h-20 rounded-full bg-primary/5 flex items-center justify-center">
                <ShieldAlert className="w-10 h-10 text-primary opacity-20" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-black uppercase tracking-tighter">Sélectionnez un groupe</h3>
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-40">Choisissez un groupe à gauche pour configurer sa modération</p>
              </div>
            </div>
          ) : (
            <div className="animate-in slide-in-from-right-4 duration-500 space-y-12">
              {/* Info Cartouche */}
              <div className="p-8 rounded-3xl bg-primary/5 border border-primary/10 flex flex-col md:flex-row items-center gap-8 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -mr-32 -mt-32 group-hover:bg-primary/10 transition-colors duration-500" />
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center text-white shadow-xl shadow-primary/20 shrink-0">
                  <ShieldCheck className="w-8 h-8" />
                </div>
                <div className="space-y-1 flex-1 text-center md:text-left z-10">
                  <h2 className="text-xl font-black uppercase tracking-tighter">{selectedGroup.subject || "Groupe"}</h2>
                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                    <Badge className="bg-primary/10 text-primary border-none text-[8px] font-black tracking-widest uppercase h-5">
                      {selectedGroup.id}
                    </Badge>
                    <Badge variant="outline" className="text-[8px] font-black tracking-widest uppercase h-5">
                      {selectedGroup.participantsCount} PARTICIPANTS
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Formulaire Sections */}
              <form ref={modFormRef} className="space-y-16">
                {/* Section: Protection Globale */}
                <section className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-600 shadow-inner">
                      <Zap className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Protection Active</h3>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/20 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-[11px] font-black uppercase tracking-widest">Statut Modérateur</Label>
                        <Switch
                          checked={modFormData.is_active}
                          onCheckedChange={(c) => setModFormData({ ...modFormData, is_active: c })}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight opacity-40 leading-relaxed">
                        Activez pour que le robot commence à surveiller les messages de ce groupe.
                      </p>
                    </div>

                    <div className="p-6 rounded-2xl border border-border/50 bg-card hover:border-primary/20 transition-all group">
                      <div className="flex items-center justify-between mb-4">
                        <Label className="text-[11px] font-black uppercase tracking-widest">Anti-Liens</Label>
                        <Switch
                          checked={modFormData.anti_link}
                          onCheckedChange={(c) => setModFormData({ ...modFormData, anti_link: c })}
                          className="data-[state=checked]:bg-primary"
                        />
                      </div>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-tight opacity-40 leading-relaxed">
                        Supprime automatiquement les liens externes envoyés par les membres.
                      </p>
                    </div>
                  </div>

                  <Card className="border-border/50 bg-card/30 overflow-hidden">
                    <CardHeader className="p-6 border-b border-border/50 flex flex-row items-center justify-between space-y-0">
                      <div className="space-y-1">
                        <CardTitle className="text-xs font-black uppercase tracking-widest">Seuil d'Avertissements</CardTitle>
                        <CardDescription className="text-[9px] font-bold uppercase tracking-tight">Nombre d'erreurs avant expulsion</CardDescription>
                      </div>
                      <AlertTriangle className="w-5 h-5 text-amber-500/50" />
                    </CardHeader>
                    <CardContent className="p-8">
                      <div className="flex flex-col md:flex-row items-center gap-8">
                        <div className="w-full md:w-32">
                          <Input
                            type="number"
                            min={1}
                            max={10}
                            value={modFormData.max_warnings}
                            onChange={(e) => setModFormData({ ...modFormData, max_warnings: parseInt(e.target.value) || 5 })}
                            className="h-14 text-2xl font-black text-center border-2 border-border focus:border-primary rounded-2xl bg-card"
                          />
                        </div>
                        <div className="flex-1 space-y-2">
                          <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-primary">
                            <span>Sévérité</span>
                            <span>{modFormData.max_warnings <= 3 ? 'ÉLEVÉE' : modFormData.max_warnings <= 6 ? 'MODÉRÉE' : 'SOUPLE'}</span>
                          </div>
                          <div className="h-2 w-full bg-secondary rounded-full overflow-hidden">
                            <div
                              className={cn(
                                "h-full transition-all duration-500",
                                modFormData.max_warnings <= 3 ? 'bg-red-500' : modFormData.max_warnings <= 6 ? 'bg-amber-500' : 'bg-emerald-500'
                              )}
                              style={{ width: `${(modFormData.max_warnings / 10) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </section>

                {/* Section: Filtres de Contenu */}
                <section className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-600 shadow-inner">
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Filtres de Contenu</h3>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Mots Proscrits (Séparez par des virgules)</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Info className="w-3.5 h-3.5 text-muted-foreground opacity-30 cursor-help" />
                            </TooltipTrigger>
                            <TooltipContent className="bg-card border-border text-[9px] font-bold uppercase tracking-widest px-3 py-2">
                              L'IA filtrera ces mots même s'ils sont partiellement écrits.
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Textarea
                        placeholder="Ex: insulte, arnaque, spam..."
                        value={modFormData.bad_words}
                        onChange={(e) => setModFormData({ ...modFormData, bad_words: e.target.value })}
                        className="min-h-[100px] p-6 text-xs font-mono bg-card/50 border-border focus:ring-primary/20 rounded-2xl shadow-inner resize-none"
                      />
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <Label className="text-[10px] font-black uppercase tracking-widest opacity-40">Message d'Avertissement</Label>
                        <Badge variant="ghost" className="text-[8px] font-bold opacity-30 uppercase">Custom Template</Badge>
                      </div>
                      <Textarea
                        value={modFormData.warning_template}
                        onChange={(e) => setModFormData({ ...modFormData, warning_template: e.target.value })}
                        className="min-h-[120px] p-6 text-xs font-mono bg-card/50 border-border focus:ring-primary/20 rounded-2xl shadow-inner resize-none"
                        required={modFormData.is_active}
                      />
                      <div className="flex flex-wrap gap-2 pt-2">
                        {['@{{name}}', '{{count}}', '{{max}}', '{{reason}}'].map(tag => (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => {
                              const textarea = document.activeElement as HTMLTextAreaElement;
                              if (textarea && textarea.value !== undefined) {
                                setModFormData({ ...modFormData, warning_template: modFormData.warning_template + tag });
                              } else {
                                setModFormData({ ...modFormData, warning_template: modFormData.warning_template + tag });
                              }
                            }}
                            className="px-2.5 py-1.5 rounded-lg bg-secondary/80 hover:bg-primary/10 hover:text-primary border border-border text-[8px] font-mono font-bold transition-all uppercase"
                          >
                            {tag}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </section>

                {/* Section: Accueil */}
                <section className="space-y-8">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-600 shadow-inner">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <h3 className="text-sm font-black uppercase tracking-widest">Accueil Automatique</h3>
                  </div>

                  <div className="p-8 rounded-3xl bg-blue-500/[0.02] border border-blue-500/10 space-y-8">
                    <div className="flex items-center justify-between p-6 rounded-2xl bg-card border border-border shadow-sm">
                      <div className="space-y-1">
                        <Label className="text-[11px] font-black uppercase tracking-widest">Message de Bienvenue</Label>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase opacity-40">Souhaitez la bienvenue aux nouveaux arrivants</p>
                      </div>
                      <Switch
                        checked={modFormData.welcome_enabled}
                        onCheckedChange={(c) => setModFormData({ ...modFormData, welcome_enabled: c })}
                        className="data-[state=checked]:bg-blue-600"
                      />
                    </div>

                    {modFormData.welcome_enabled && (
                      <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                        <Textarea
                          value={modFormData.welcome_template}
                          onChange={(e) => setModFormData({ ...modFormData, welcome_template: e.target.value })}
                          className="min-h-[150px] p-6 text-xs font-mono bg-card border-border focus:ring-blue-500/20 rounded-2xl shadow-inner resize-none"
                          placeholder="Bienvenue @{{name}}..."
                        />
                        <div className="flex flex-wrap gap-2">
                          {['@{{name}}', '{{group_name}}', '{{rules}}', '{{date}}'].map(tag => (
                            <button
                              key={tag}
                              type="button"
                              onClick={() => setModFormData({ ...modFormData, welcome_template: modFormData.welcome_template + tag })}
                              className="px-2.5 py-1.5 rounded-lg bg-card border border-border text-[8px] font-mono font-bold hover:bg-blue-500/10 hover:text-blue-600 transition-all uppercase"
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </section>
              </form>
            </div>
          )}
        </div>
      </div>
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

