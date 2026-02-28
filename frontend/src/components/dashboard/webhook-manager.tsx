"use client"

import * as React from "react"
import {
  Webhook,
  Plus,
  Trash2,
  Shield,
  Zap,
  Loader2,
  ExternalLink,
  CheckCircle2
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"

const AVAILABLE_EVENTS = [
  { id: "message_received", label: "Message Reçu" },
  { id: "ai_response", label: "Réponse IA" },
  { id: "human_takeover", label: "Reprise Humaine" },
]

export function WebhookManager({ sessionId }: { sessionId: string }) {
  const { getToken } = useAuth()
  const [webhooks, setWebhooks] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isAdding, setIsAdding] = React.useState(false)
  const [isSubmitting, setIsSubmitting] = React.useState(false)

  const [formData, setFormData] = React.useState({
    url: "",
    events: ["message_received", "ai_response"],
    secret: ""
  })

  const fetchWebhooks = React.useCallback(async () => {
    try {
      const token = await getToken()
      const response = await api.sessions.getWebhooks(sessionId, token || undefined)
      setWebhooks(Array.isArray(response) ? response : [])
    } catch (error) {
      console.error("Failed to fetch webhooks", error)
    } finally {
      setIsLoading(false)
    }
  }, [sessionId, getToken])

  React.useEffect(() => { fetchWebhooks() }, [fetchWebhooks])

  const handleAdd = async () => {
    if (!formData.url) return toast.error("URL requise")

    setIsSubmitting(true)
    try {
      const token = await getToken()
      await api.sessions.addWebhook(sessionId, formData, token || undefined)
      toast.success("Webhook ajouté")
      setIsAdding(false)
      setFormData({ url: "", events: ["message_received", "ai_response"], secret: "" })
      fetchWebhooks()
    } catch (error: any) {
      toast.error("Erreur lors de l"ajout")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (id: string) => {
    try {
      const token = await getToken()
      await api.sessions.deleteWebhook(sessionId, id, token || undefined)
      toast.success("Webhook supprimé")
      fetchWebhooks()
    } catch (error) {
      toast.error("Erreur lors de la suppression")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Webhook className="h-5 w-5 text-primary" /> Webhooks
          </h2>
          <p className="text-sm text-muted-foreground">Connectez Whappi à vos outils (Zapier, Make, CRM) en temps réel.</p>
        </div>
        <Button size="sm" onClick={() => setIsAdding(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nouveau
        </Button>
      </div>

      <div className="space-y-3">
        {isLoading ? (
          <div className="py-8 text-center"><Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" /></div>
        ) : (!Array.isArray(webhooks) || webhooks.length === 0) ? (
          <div className="p-12 text-center border-dashed border-2 rounded-lg bg-muted/20">
            <ExternalLink className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">Aucun webhook configuré.</p>
          </div>
        ) : (
          webhooks.map(wh => (
            <Card key={wh.id} className="relative group overflow-hidden">
              <div className="p-4 flex items-center justify-between">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="h-4 w-4 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate max-w-md">{wh?.url || "URL manquante"}</p>
                    <div className="flex gap-2 mt-1">
                      {(() => {
                        try {
                          const events = typeof wh?.events === "string" ? JSON.parse(wh.events || "[]") : (wh?.events || []);
                          if (!Array.isArray(events)) return null;
                          return events.map((ev: string) => (
                            <Badge key={ev} variant="secondary" className="text-[9px] uppercase">{String(ev).replace("_", " ")}</Badge>
                          ));
                        } catch (e) {
                          return <Badge variant="destructive" className="text-[9px]">ERR_PARSE</Badge>;
                        }
                      })()}
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="text-destructive group-hover:opacity-100 opacity-0 transition-opacity" onClick={() => handleDelete(wh.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isAdding} onOpenChange={setIsAdding}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Configurer un Webhook</DialogTitle>
            <DialogDescription>Les événements seront envoyés en JSON via POST.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label className="text-xs uppercase">URL de destination</Label>
              <Input placeholder="https://votre-api.com/webhook" value={formData.url} onChange={e => setFormData({...formData, url: e.target.value})} className="h-9" />
            </div>

            <div className="space-y-3">
              <Label className="text-xs uppercase">Événements</Label>
              <div className="grid grid-cols-2 gap-3">
                {AVAILABLE_EVENTS.map(ev => (
                  <div key={ev.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={ev.id}
                      checked={formData.events.includes(ev.id)}
                      onCheckedChange={(checked) => {
                        if (checked) setFormData({...formData, events: [...formData.events, ev.id]})
                        else setFormData({...formData, events: formData.events.filter(i => i !== ev.id)})
                      }}
                    />
                    <label htmlFor={ev.id} className="text-sm cursor-pointer">{ev.label}</label>
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs uppercase">Secret Signature (Optionnel)</Label>
              <Input placeholder="Clé pour vérifier l"authenticité" value={formData.secret} onChange={e => setFormData({...formData, secret: e.target.value})} className="h-9" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsAdding(false)}>Annuler</Button>
            <Button onClick={handleAdd} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
