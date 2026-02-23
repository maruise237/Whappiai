"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Users,
  Search,
  Save,
  Shield,
  ChevronRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"
import { useAuth } from "@clerk/nextjs"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

function ModerationPageContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const sessionId = searchParams.get('session')
  const { getToken } = useAuth()

  const [groups, setGroups] = React.useState<any[]>([])
  const [filteredGroups, setFilteredGroups] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isSaving, setIsSaving] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedGroup, setSelectedGroup] = React.useState<any>(null)

  const [formData, setFormData] = React.useState({
    is_active: false,
    anti_link: false,
    bad_words: "",
    warning_template: "",
    max_warnings: 5,
    welcome_enabled: false,
    welcome_template: ""
  })

  const fetchGroups = async () => {
    if (!sessionId) return
    try {
      setIsLoading(true)
      const token = await getToken()
      const data = await api.sessions.getGroups(sessionId, token || undefined)
      const groupsArray = Array.isArray(data) ? data : []
      setGroups(groupsArray)
      setFilteredGroups(groupsArray)
      if (groupsArray.length > 0) handleSelectGroup(groupsArray[0])
    } catch (error) {
      toast.error("Échec du chargement des groupes")
    } finally {
      setIsLoading(false)
    }
  }

  React.useEffect(() => { fetchGroups() }, [sessionId])

  React.useEffect(() => {
    const lower = searchQuery.toLowerCase()
    setFilteredGroups(groups.filter(g => (g.subject || g.name || '').toLowerCase().includes(lower)))
  }, [searchQuery, groups])

  const handleSelectGroup = (group: any) => {
    if (!group) return
    setSelectedGroup(group)
    const settings = group.settings || {}
    setFormData({
      is_active: !!settings.is_active,
      anti_link: !!settings.anti_link,
      bad_words: settings.bad_words || "",
      warning_template: settings.warning_template || "Attention @{{name}}, {{count}}/{{max}} pour : {{reason}}.",
      max_warnings: settings.max_warnings || 5,
      welcome_enabled: !!settings.welcome_enabled,
      welcome_template: settings.welcome_template || "Bienvenue @{{name}} dans {{group_name}} !"
    })
  }

  const handleSave = async () => {
    if (!selectedGroup || !sessionId) return
    setIsSaving(true)
    try {
      const token = await getToken()
      await api.sessions.updateGroupSettings(sessionId, selectedGroup.id, formData, token || undefined)
      toast.success("Paramètres enregistrés")
      fetchGroups()
    } catch (error) {
      toast.error("Échec de l'enregistrement")
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading) return <div className="p-8 text-center">Chargement des groupes...</div>
  if (!sessionId) return <div className="p-8 text-center">Session non spécifiée.</div>


  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="space-y-1">
            <h1 className="text-xl font-semibold">Modération</h1>
            <Badge variant="secondary">{sessionId}</Badge>
          </div>
        </div>
        <Button onClick={handleSave} disabled={isSaving || !selectedGroup}>
          <Save className="h-4 w-4 mr-2" />
          Enregistrer
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-8 items-start">
        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Rechercher des groupes..."
              className="pl-8 h-9 text-sm"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
          <Card>
            <ScrollArea className="h-[500px]">
              <div className="p-2 space-y-1">
                {filteredGroups.map(g => (
                  <button
                    key={g.id}
                    onClick={() => handleSelectGroup(g)}
                    className={cn(
                      "w-full flex items-center justify-between p-3 text-sm rounded-md transition-colors text-left",
                      selectedGroup?.id === g.id ? "bg-muted font-medium" : "hover:bg-muted/50 text-muted-foreground"
                    )}
                  >
                    <span className="truncate flex-1">{g.subject || g.name || 'Sans titre'}</span>
                    <ChevronRight className="h-3 w-3 opacity-50" />
                  </button>
                ))}
              </div>
            </ScrollArea>
          </Card>
        </div>

        <div className="space-y-8">
          {!selectedGroup ? (
            <div className="p-12 text-center border-dashed border-2 rounded-lg">
              <p className="text-sm text-muted-foreground">Sélectionnez un groupe à configurer</p>
            </div>
          ) : (
            <div className="space-y-10">
              <section className="space-y-6">
                <p className="text-xs font-semibold text-muted-foreground">Protection</p>
                <div className="space-y-1">
                  <ToggleRow label="Statut de modération" desc="Activez la modération automatisée pour ce groupe." value={formData.is_active} onChange={v => setFormData({...formData, is_active: v})} />
                  <ToggleRow label="Anti-Lien" desc="Supprime automatiquement les liens externes." value={formData.anti_link} onChange={v => setFormData({...formData, anti_link: v})} />
                </div>
              </section>

              <Separator />

              <section className="space-y-6">
                <p className="text-xs font-semibold text-muted-foreground">Avertissements</p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                  <div className="space-y-2">
                    <Label className="text-xs font-medium">Avertissements max</Label>
                    <Input type="number" value={formData.max_warnings} onChange={e => setFormData({...formData, max_warnings: parseInt(e.target.value) || 1})} className="w-24 h-9" />
                  </div>
                  <div className="space-y-2 flex-1">
                    <div className="flex justify-between text-[10px] font-medium text-muted-foreground">
                      <span>Sévérité</span>
                      <span>{formData.max_warnings <= 3 ? "Élevée" : "Normale"}</span>
                    </div>
                    <Progress value={Math.min(100, (formData.max_warnings / 10) * 100)} className="h-1.5" />
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-6">
                <p className="text-xs font-semibold text-muted-foreground">Filtre de contenu</p>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs">Mots proscrits (séparés par des virgules)</Label>
                    <Textarea value={formData.bad_words} onChange={e => setFormData({...formData, bad_words: e.target.value})} placeholder="arnaque, insulte, spam..." className="min-h-[80px] text-sm" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs">Template d&apos;avertissement</Label>
                    <Textarea value={formData.warning_template} onChange={e => setFormData({...formData, warning_template: e.target.value})} className="min-h-[80px] text-sm" />
                    <VariableTags tags={['@{{name}}', '{{count}}', '{{max}}', '{{reason}}']} onTagClick={t => setFormData({...formData, warning_template: formData.warning_template + t})} />
                  </div>
                </div>
              </section>

              <Separator />

              <section className="space-y-6">
                <p className="text-xs font-semibold text-muted-foreground">Message de bienvenue</p>
                <div className="space-y-4">
                  <ToggleRow label="Activer le bienvenue" desc="Saluez automatiquement les nouveaux membres." value={formData.welcome_enabled} onChange={v => setFormData({...formData, welcome_enabled: v})} />
                  {formData.welcome_enabled && (
                    <div className="space-y-2 animate-in fade-in slide-in-from-top-2">
                      <Textarea value={formData.welcome_template} onChange={e => setFormData({...formData, welcome_template: e.target.value})} className="min-h-[100px] text-sm" />
                      <VariableTags tags={['@{{name}}', '{{group_name}}', '{{date}}']} onTagClick={t => setFormData({...formData, welcome_template: formData.welcome_template + t})} />
                    </div>
                  )}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function ToggleRow({ label, desc, value, onChange }: { label: string; desc: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between py-3 border-b border-border last:border-0">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  )
}

function VariableTags({ tags, onTagClick }: { tags: string[]; onTagClick: (t: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {tags.map(tag => (
        <Badge key={tag} variant="secondary" className="text-[10px] cursor-pointer font-mono hover:bg-primary/10 transition-colors" onClick={() => onTagClick(tag)}>
          {tag}
        </Badge>
      ))}
    </div>
  )
}

export default function ModerationPage() {
  return (
    <React.Suspense fallback={<div className="p-8 text-center">Chargement...</div>}>
      <ModerationPageContent />
    </React.Suspense>
  )
}
