"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  ArrowLeft,
  Save,
  Loader2,
  Users
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { GroupListSidebar } from "@/components/dashboard/moderation/GroupListSidebar"
import { GroupSettingsForm } from "@/components/dashboard/moderation/GroupSettingsForm"

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
        <GroupListSidebar
          groups={groups}
          selectedGroupId={selectedGroupId}
          setSelectedGroupId={setSelectedGroupId}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />

        <div className="space-y-8 animate-in fade-in duration-300">
           {!selectedGroupId ? (
             <div className="h-64 flex flex-col items-center justify-center text-muted-foreground/20">
                <Users className="h-12 w-12 mb-3" />
                <p className="text-sm font-bold uppercase tracking-widest">Sélectionnez un groupe</p>
             </div>
           ) : (
             <GroupSettingsForm
               selectedGroup={selectedGroup}
               form={form}
               setForm={setForm}
             />
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
