import * as React from "react"
import {
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Sparkles,
  BrainCircuit
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Separator } from "@/components/ui/separator"
import { Progress } from "@/components/ui/progress"

interface GroupSettingsFormProps {
  selectedGroup: any
  form: any
  setForm: (form: any) => void
}

export function GroupSettingsForm({
  selectedGroup,
  form,
  setForm
}: GroupSettingsFormProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <div className="space-y-1">
        <h2 className="text-lg font-bold">{selectedGroup?.subject || selectedGroup?.name}</h2>
        <p className="text-xs text-muted-foreground flex items-center gap-1.5 font-mono">
          ID: {selectedGroup?.id}
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
            <Switch checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
          </div>
          <div className="flex items-center justify-between p-4">
            <div>
              <p className="text-sm font-medium">Anti-Liens</p>
              <p className="text-xs text-muted-foreground">Supprimer automatiquement les liens externes.</p>
            </div>
            <Switch checked={form.anti_link} onCheckedChange={(v) => setForm({ ...form, anti_link: v })} />
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
              onChange={e => setForm({ ...form, max_warnings: parseInt(e.target.value) || 0 })}
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
                  onChange={e => setForm({ ...form, warning_reset_days: parseInt(e.target.value) || 0 })}
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
              onChange={e => setForm({ ...form, bad_words: e.target.value })}
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">Modèle d&apos;avertissement</Label>
            <Textarea
              placeholder="Attention @{{name}}, ce contenu est interdit."
              className="min-h-[80px] text-sm bg-card border-border"
              value={form.warning_template}
              onChange={e => setForm({ ...form, warning_template: e.target.value })}
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {['@{{name}}', '{{warns}}', '{{max}}'].map(tag => (
                <Badge
                  key={tag}
                  variant="secondary"
                  className="text-[10px] cursor-pointer font-mono hover:bg-primary/10 h-5"
                  onClick={() => setForm({ ...form, warning_template: (form.warning_template || "") + tag })}
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
            <Switch checked={form.welcome_enabled} onCheckedChange={(v) => setForm({ ...form, welcome_enabled: v })} />
          </div>
          {form.welcome_enabled && (
            <div className="space-y-2 animate-in slide-in-from-top-2 duration-200">
              <Textarea
                placeholder="Bienvenue @{{name}} !"
                className="min-h-[100px] text-sm bg-card border-border"
                value={form.welcome_template}
                onChange={e => setForm({ ...form, welcome_template: e.target.value })}
              />
              <div className="flex flex-wrap gap-1 mt-2">
                {['@{{name}}', '{{subject}}', '{{time}}'].map(tag => (
                  <Badge
                    key={tag}
                    variant="secondary"
                    className="text-[10px] cursor-pointer font-mono hover:bg-primary/10 h-5"
                    onClick={() => setForm({ ...form, welcome_template: (form.welcome_template || "") + tag })}
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
            onCheckedChange={(v) => setForm({ ...form, ai_assistant_enabled: v })}
          />
        </div>
      </div>
    </div>
  )
}
