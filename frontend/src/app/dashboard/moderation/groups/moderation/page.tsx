"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Save,
  Shield,
  Search,
  Users,
  Smartphone,
  ChevronRight,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  MessageSquare,
  Sparkles,
  Info,
  BrainCircuit
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Progress } from "@/components/ui/progress"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function GroupModerationContent() {
  const router = useRouter()
  const { getToken } = useAuth()
  const searchParams = useSearchParams()
  const sessionId = searchParams.get('sessionId')

  const [groups, setGroups] = React.useState<any[]>([])
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

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
  const [form, setForm] = React.useState<any>({
    is_active: false,
    anti_link: false,
    max_warnings: 5,
    warning_reset_days: 0,
    bad_words: "",
    warning_template: "Attention @{{name}}, avertissement {{count}}/{{max}} pour : {{reason}}.",
    welcome_enabled: false,
    welcome_template: "Bienvenue @{{name}} dans le groupe !",
    ai_assistant_enabled: false
  })

  React.useEffect(() => {
    if (selectedGroup) {
      const s = selectedGroup.settings || {}
      setForm({
        is_active: !!s.is_active,
        anti_link: !!s.anti_link,
        max_warnings: s.max_warnings ?? 5,
        warning_reset_days: s.warning_reset_days ?? 0,
        bad_words: s.bad_words || "",
        warning_template: s.warning_template || "Attention @{{name}}, avertissement {{count}}/{{max}} pour : {{reason}}.",
        welcome_enabled: !!s.welcome_enabled,
        welcome_template: s.welcome_template || "",
        ai_assistant_enabled: !!s.ai_assistant_enabled
      })
    }
  }, [selectedGroup])

  const handleSave = async () => {
    if (!sessionId || !selectedGroupId) return
    setIsSaving(true)
    try {
      const token = await getToken()
      await api.sessions.updateGroupSettings(sessionId, selectedGroupId, form, token || undefined)
      toast.success("Réglages groupe enregistrés")
      fetchGroups()
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement")
    } finally {
      setIsSaving(false)
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
            <h1 className="text-xl font-semibold">Sécurité & Modération</h1>
            <Badge variant="secondary" className="bg-primary/5 text-primary border-primary/20 text-[10px] uppercase font-bold tracking-widest px-2 h-5">
              {sessionId}
            </Badge>
          </div>
        </div>
        <Button size="sm" onClick={handleSave} disabled={isSaving}>
          {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Enregistrer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-start">
        {/* Sidebar: Group List */}
        <Card className="border-none shadow-none bg-muted/10 h-[calc(100vh-12rem)] flex flex-col">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
              <Input
                placeholder="Rechercher un groupe..."
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
                  {selectedGroupId === group.id && <ChevronRight className="h-3 w-3" />}
                </button>
              ))}
              {filteredGroups.length === 0 && (
                 <p className="text-center py-10 text-[10px] text-muted-foreground italic uppercase opacity-40">Aucun groupe</p>
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Main Content: Form */}
        <div className="space-y-8 animate-in fade-in duration-300">
           {!selectedGroupId ? (
             <div className="h-64 flex flex-col items-center justify-center text-muted-foreground/20">
                <Users className="h-12 w-12 mb-3" />
                <p className="text-sm font-bold uppercase tracking-widest">Sélectionnez un groupe</p>
             </div>
           ) : (
             <>
               <div className="space-y-1">
                  <h2 className="text-lg font-bold">{selectedGroup?.subject || selectedGroup?.name}</h2>
                  <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
                     ID: {selectedGroupId}
                  </p>
               </div>

               {/* Section Protection */}
               <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                     <ShieldCheck className="h-4 w-4 text-primary" /> Protection Active
                  </h3>
                  <div className="divide-y border rounded-lg bg-card">
                     <div className="flex items-center justify-between p-4">
                        <div>
                           <p className="text-sm font-medium">Statut Modérateur</p>
                           <p className="text-xs text-muted-foreground">Le bot surveille les messages de ce groupe.</p>
                        </div>
                        <Switch checked={form.is_active} onCheckedChange={(v) => setForm({...form, is_active: v})} />
                     </div>
                     <div className="flex items-center justify-between p-4">
                        <div>
                           <p className="text-sm font-medium">Anti-Liens</p>
                           <p className="text-xs text-muted-foreground">Supprimer automatiquement les liens externes.</p>
                        </div>
                        <Switch checked={form.anti_link} onCheckedChange={(v) => setForm({...form, anti_link: v})} />
                     </div>
                  </div>
               </div>

               <Separator />

               {/* Section Warnings */}
               <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                     <AlertTriangle className="h-4 w-4 text-amber-500" /> Gestion des Avertissements
                  </h3>
                  <div className="space-y-6 p-4 rounded-lg bg-muted/30 border border-dashed border-muted">
                     <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <Label className="text-xs">Seuil d&apos;exclusion (Nombre d&apos;avertissements)</Label>
                           <Badge className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-none text-[10px] font-bold">
                              {form.max_warnings} Warns = Ban
                           </Badge>
                        </div>
                        <Input
                           type="number"
                           value={form.max_warnings}
                           onChange={e => setForm({...form, max_warnings: parseInt(e.target.value)})}
                           className="h-9 w-24 text-sm"
                        />
                        <div className="space-y-1">
                           <div className="flex justify-between text-[10px] text-muted-foreground font-bold uppercase">
                              <span>Sévérité Faible</span>
                              <span>Critique</span>
                           </div>
                           <Progress value={(Math.min(10, Math.max(0, form.max_warnings)) / 10) * 100} className="h-1.5" />
                        </div>
                     </div>

                     <div className="space-y-4 pt-4 border-t border-muted">
                        <div className="flex items-center justify-between">
                           <div>
                              <Label className="text-xs font-medium">Remise à zéro automatique</Label>
                              <p className="text-[10px] text-muted-foreground">Nombre de jours avant d&apos;effacer les avertissements d&apos;un membre.</p>
                           </div>
                           <div className="flex items-center gap-2">
                              <Input
                                 type="number"
                                 value={form.warning_reset_days}
                                 onChange={e => setForm({...form, warning_reset_days: parseInt(e.target.value)})}
                                 className="h-8 w-16 text-xs text-center"
                                 placeholder="0"
                              />
                              <span className="text-[10px] font-bold text-muted-foreground uppercase">Jours</span>
                           </div>
                        </div>
                        <p className="text-[9px] italic text-muted-foreground bg-primary/5 p-2 rounded">
                           💡 Réglez sur 0 pour désactiver la remise à zéro automatique.
                        </p>
                     </div>
                  </div>
               </div>

               <Separator />

               {/* Section Content Filter */}
               <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                     <ShieldAlert className="h-4 w-4 text-destructive" /> Filtre de Contenu
                  </h3>
                  <div className="space-y-4">
                     <div className="space-y-2">
                        <Label className="text-xs">Mots Proscrits (séparés par des virgules)</Label>
                        <Textarea
                           placeholder="insulte1, insulte2, spam..."
                           className="min-h-[80px] text-sm bg-card border-border"
                           value={form.bad_words}
                           onChange={e => setForm({...form, bad_words: e.target.value})}
                        />
                     </div>
                     <div className="space-y-2">
                        <Label className="text-xs">Modèle d&apos;avertissement</Label>
                        <Textarea
                           placeholder="Attention @{{name}}, ce contenu est interdit."
                           className="min-h-[80px] text-sm bg-card border-border"
                           value={form.warning_template}
                           onChange={e => setForm({...form, warning_template: e.target.value})}
                        />
                        <div className="flex flex-wrap gap-1 mt-2">
                           {['@{{name}}', '{{warns}}', '{{max}}'].map(tag => (
                              <Badge
                                 key={tag}
                                 variant="secondary"
                                 className="text-[10px] cursor-pointer font-mono hover:bg-primary/10 h-5"
                                 onClick={() => setForm({...form, warning_template: (form.warning_template || "") + tag})}
                              >
                                 {tag}
                              </Badge>
                           ))}
                        </div>
                     </div>
                  </div>
               </div>

               <Separator />

               {/* Section Welcome */}
               <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                     <Sparkles className="h-4 w-4 text-primary" /> Message de Bienvenue
                  </h3>
                  <div className="space-y-4">
                     <div className="flex items-center justify-between">
                        <Label className="text-xs">Activer le message de bienvenue</Label>
                        <Switch checked={form.welcome_enabled} onCheckedChange={(v) => setForm({...form, welcome_enabled: v})} />
                     </div>
                     {form.welcome_enabled && (
                        <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
                           <Textarea
                              placeholder="Bienvenue @{{name}} !"
                              className="min-h-[100px] text-sm bg-card border-border"
                              value={form.welcome_template}
                              onChange={e => setForm({...form, welcome_template: e.target.value})}
                           />
                           <div className="flex flex-wrap gap-1 mt-2">
                              {['@{{name}}', '{{subject}}', '{{time}}'].map(tag => (
                                 <Badge
                                    key={tag}
                                    variant="secondary"
                                    className="text-[10px] cursor-pointer font-mono hover:bg-primary/10 h-5"
                                    onClick={() => setForm({...form, welcome_template: (form.welcome_template || "") + tag})}
                                 >
                                    {tag}
                                 </Badge>
                              ))}
                           </div>
                        </div>
                     )}
                  </div>
               </div>

               <Separator />

               {/* AI Assistant Group Toggle */}
               <div className="space-y-4">
                  <h3 className="text-sm font-semibold flex items-center gap-2">
                     <BrainCircuit className="h-4 w-4 text-primary" /> Assistant IA du Groupe
                  </h3>
                  <div className="border rounded-lg bg-primary/5 p-4 flex items-center justify-between">
                     <div>
                        <p className="text-sm font-medium">Activer l&apos;Assistant IA</p>
                        <p className="text-xs text-muted-foreground">Le bot répondra aux questions s&apos;il est tagué ou selon les réglages.</p>
                     </div>
                     <Switch
                        checked={form.ai_assistant_enabled}
                        onCheckedChange={(v) => setForm({...form, ai_assistant_enabled: v})}
                     />
                  </div>
               </div>
             </>
           )}
        </div>
      </div>
    </div>
  )
}

export default function GroupModerationPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
      <GroupModerationContent />
    </React.Suspense>
  )
}
