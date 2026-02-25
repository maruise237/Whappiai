"use client"

import * as React from "react"
import { 
  Brain,
  MessageSquare,
  Zap,
  Settings2,
  Plus,
  Trash2,
  Edit,
  MoreVertical,
  Loader2,
  Upload,
  FileText,
  ImageIcon,
  Mic,
  Video,
  Sparkles,
  Bot
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table"
import { api } from "@/lib/api"
import { useAuth, useUser } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"
import Link from "next/link"

export default function IntelligenceHub() {
  const { getToken } = useAuth()
  const { user } = useUser()

  const [sessions, setSessions] = React.useState<any[]>([])
  const [selectedSessionId, setSelectedSessionId] = React.useState<string>("")
  const [isLoading, setIsLoading] = React.useState(true)
  
  // AI Config State
  const [aiConfig, setAiConfig] = React.useState<any>(null)
  const [isAiSaving, setIsAiSaving] = React.useState(false)

  // Keywords State
  const [keywords, setKeywords] = React.useState<any[]>([])
  const [isKeywordDialogOpen, setIsKeywordDialogOpen] = React.useState(false)
  const [isUploading, setIsUploading] = React.useState(false)
  const [editingRule, setEditingRule] = React.useState<any>(null)
  const [keywordForm, setKeywordForm] = React.useState({
    keyword: "",
    match_type: "contains",
    response_type: "text",
    response_content: "",
    file_name: "",
    is_active: 1
  })

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const data = await api.sessions.list(token || undefined)
      setSessions(data || [])
      if (data && data.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data[0].sessionId)
      }
    } catch (e) {
      toast.error("Erreur de chargement")
    } finally {
      setIsLoading(false)
    }
  }, [getToken, selectedSessionId])

  const fetchSessionDetails = React.useCallback(async () => {
    if (!selectedSessionId) return
    try {
      const token = await getToken()
      const [ai, kw] = await Promise.all([
        api.sessions.getAI(selectedSessionId, token || undefined),
        api.sessions.getKeywords(selectedSessionId, token || undefined)
      ])
      setAiConfig(ai)
      setKeywords(kw || [])
    } catch (e) {
      console.error("Fetch details error", e)
    }
  }, [getToken, selectedSessionId])

  React.useEffect(() => { fetchData() }, [fetchData])
  React.useEffect(() => { fetchSessionDetails() }, [fetchSessionDetails])

  const handleSaveAI = async () => {
    if (!selectedSessionId || !aiConfig) return
    setIsAiSaving(true)
    try {
      const token = await getToken()
      await api.sessions.updateAI(selectedSessionId, aiConfig, token || undefined)
      toast.success("Intelligence mise à jour")
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } })
    } catch (e) {
      toast.error("Erreur d'enregistrement")
    } finally {
      setIsAiSaving(false)
    }
  }

  const handleCreateOrUpdateKeyword = async () => {
    if (!keywordForm.keyword || !keywordForm.response_content) {
      return toast.error("Le mot-clé et la réponse sont requis")
    }
    try {
      const token = await getToken()
      if (editingRule) {
        await api.sessions.updateKeyword(selectedSessionId, editingRule.id, keywordForm, token || undefined)
        toast.success("Règle mise à jour")
      } else {
        await api.sessions.addKeyword(selectedSessionId, keywordForm, token || undefined)
        toast.success("Règle créée")
      }
      setIsKeywordDialogOpen(false)
      setEditingRule(null)
      setKeywordForm({ keyword: "", match_type: "contains", response_type: "text", response_content: "", file_name: "", is_active: 1 })
      fetchSessionDetails()
    } catch (e) {
      toast.error("Erreur règle")
    }
  }

  const handleDeleteKeyword = async (id: string) => {
    try {
      const token = await getToken()
      await api.sessions.deleteKeyword(selectedSessionId, id, token || undefined)
      toast.success("Règle supprimée")
      fetchSessionDetails()
    } catch (e) {
      toast.error("Erreur suppression")
    }
  }

  if (isLoading) return <div className="p-8 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" /></div>

  const selectedSession = sessions.find(s => s.sessionId === selectedSessionId)

  const [groups, setGroups] = React.useState<any[]>([])
  const [selectedGroupId, setSelectedGroupId] = React.useState<string | null>(null)
  const [isGroupLoading, setIsGroupLoading] = React.useState(false)

  const fetchGroups = React.useCallback(async (sid: string) => {
    if (!sid) return
    setIsGroupLoading(true)
    try {
      const token = await getToken()
      const data = await api.sessions.getGroups(sid, token || undefined)
      setGroups(Array.isArray(data) ? data : [])
    } catch (e) {} finally { setIsGroupLoading(false) }
  }, [getToken])

  React.useEffect(() => { if (selectedSessionId) fetchGroups(selectedSessionId) }, [selectedSessionId, fetchGroups])

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-10">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> Configuration Bot
          </h1>
          <p className="text-sm text-muted-foreground">Paramétrez l&apos;intelligence et la modération.</p>
        </div>

        <div className="flex items-center gap-2">
           <Label className="text-[10px] uppercase font-bold text-muted-foreground mr-2 hidden sm:block">Session :</Label>
           <Select value={selectedSessionId} onValueChange={setSelectedSessionId}>
             <SelectTrigger className="w-full sm:w-40 h-8 text-[11px] bg-muted/50 border-none">
               <SelectValue placeholder="Session" />
             </SelectTrigger>
             <SelectContent>
               {sessions.map(s => (
                 <SelectItem key={s.sessionId} value={s.sessionId} className="text-xs">{s.sessionId}</SelectItem>
               ))}
             </SelectContent>
           </Select>
        </div>
      </div>

      {!selectedSessionId ? (
        <Card className="p-16 text-center border-2 border-dashed bg-muted/5 rounded-xl">
          <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mx-auto mb-4">
             <Zap className="h-6 w-6 text-muted-foreground/30" />
          </div>
          <h3 className="text-sm font-bold uppercase tracking-widest text-muted-foreground mb-1">Aucune connexion</h3>
          <p className="text-xs text-muted-foreground max-w-[200px] mx-auto mb-6 opacity-60">Couplez d&apos;abord votre compte WhatsApp.</p>
          <Button asChild variant="outline" size="sm" className="rounded-full">
            <Link href="/dashboard">Aller au Tableau de Bord</Link>
          </Button>
        </Card>
      ) : (
        <Tabs defaultValue="ia" className="space-y-6">
          <TabsList className="flex bg-muted/30 p-1 rounded-lg h-auto gap-1">
            <TabsTrigger value="ia" className="flex-1 py-2 text-xs gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Sparkles className="h-3 w-3" /> IA & Prompt</TabsTrigger>
            <TabsTrigger value="keywords" className="flex-1 py-2 text-xs gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Zap className="h-3 w-3" /> Mots-clés</TabsTrigger>
            <TabsTrigger value="groups" className="flex-1 py-2 text-xs gap-2 data-[state=active]:bg-background data-[state=active]:shadow-sm"><Users className="h-3 w-3" /> Modération</TabsTrigger>
          </TabsList>

          <TabsContent value="ia" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <Card className="border-primary/10 shadow-sm">
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="text-sm font-semibold">Cerveau Principal</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground">L&apos;IA utilise vos instructions pour répondre de manière fluide.</CardDescription>
                  </div>
                  <Switch
                    checked={!!aiConfig?.enabled}
                    onCheckedChange={v => setAiConfig({...aiConfig, enabled: v})}
                  />
                </div>
              </CardHeader>
              <CardContent className="space-y-6 pt-0">
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest">Instructions (Prompt)</Label>
                    <Badge variant="outline" className="text-[10px] font-mono border-primary/20 text-primary">Modèle : {aiConfig?.model || 'Par défaut'}</Badge>
                  </div>
                  <Textarea
                    placeholder="Tu es un assistant commercial poli et efficace..."
                    className="min-h-[200px] text-sm leading-relaxed resize-none focus-visible:ring-primary/20"
                    value={aiConfig?.prompt || ""}
                    onChange={e => setAiConfig({...aiConfig, prompt: e.target.value})}
                  />
                  <p className="text-[10px] text-muted-foreground italic">Conseil : Décrivez la personnalité, le ton et les limites de votre bot.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t">
                  <div className="space-y-3">
                    <Label className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest">Mode de réponse</Label>
                    <div className="grid grid-cols-1 gap-2">
                       {[
                         { id: 'bot', name: '100% Automatique', desc: 'L\'IA gère tout.' },
                         { id: 'human', name: 'Suggestion', desc: 'L\'IA propose, vous validez.' }
                       ].map(m => (
                         <button
                           key={m.id}
                           onClick={() => setAiConfig({...aiConfig, mode: m.id})}
                           className={cn(
                             "flex flex-col gap-1 p-3 text-left border rounded-md transition-all",
                             aiConfig?.mode === m.id ? "bg-primary/5 border-primary ring-1 ring-primary/20" : "hover:bg-muted"
                           )}
                         >
                           <span className="text-xs font-bold">{m.name}</span>
                           <span className="text-[10px] text-muted-foreground">{m.desc}</span>
                         </button>
                       ))}
                    </div>
                  </div>
                  <div className="space-y-3">
                    <Label className="text-[11px] font-bold uppercase text-muted-foreground tracking-widest">Réglages rapides</Label>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Répondre aux tags (@)</span>
                        <Switch size="sm" checked={!!aiConfig?.respond_to_tags} onCheckedChange={v => setAiConfig({...aiConfig, respond_to_tags: v})} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs">Rejet d&apos;appels auto</span>
                        <Switch size="sm" checked={!!aiConfig?.reject_calls} onCheckedChange={v => setAiConfig({...aiConfig, reject_calls: v})} />
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="bg-muted/30 border-t p-4 flex justify-end">
                <Button size="sm" onClick={handleSaveAI} disabled={isAiSaving}>
                  {isAiSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Sparkles className="h-4 w-4 mr-2" />}
                  Mettre à jour le Cerveau
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="groups" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
             <Card className="border-primary/10">
                <CardHeader>
                   <CardTitle className="text-sm">Gendarme de Groupe</CardTitle>
                   <CardDescription className="text-xs">Le bot protège vos groupes contre le spam et les liens.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                   {isGroupLoading ? (
                      <div className="py-10 text-center"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
                   ) : groups.length === 0 ? (
                      <div className="p-10 text-center text-muted-foreground opacity-40">
                         <Shield className="h-8 w-8 mx-auto mb-2" />
                         <p className="text-xs">Aucun groupe administré trouvé.</p>
                      </div>
                   ) : (
                      <div className="grid grid-cols-1 md:grid-cols-[200px_1fr] gap-6">
                         <ScrollArea className="h-[300px] border-r pr-4">
                            <div className="space-y-1">
                               {groups.map(g => (
                                  <button
                                     key={g.id}
                                     onClick={() => setSelectedGroupId(g.id)}
                                     className={cn(
                                        "w-full text-left p-2 rounded text-[11px] transition-colors",
                                        selectedGroupId === g.id ? "bg-primary/10 text-primary font-bold" : "hover:bg-muted text-muted-foreground"
                                     )}
                                  >
                                     {g.subject || g.name}
                                  </button>
                               ))}
                            </div>
                         </ScrollArea>

                         <div className="min-h-[300px]">
                            {!selectedGroupId ? (
                               <p className="text-center mt-20 text-[10px] uppercase font-bold text-muted-foreground/30">Choisissez un groupe</p>
                            ) : (
                               <div className="space-y-6 animate-in fade-in duration-200">
                                  <div className="flex items-center justify-between">
                                     <span className="text-xs font-bold text-primary truncate max-w-[150px]">
                                        {groups.find(g => g.id === selectedGroupId)?.subject}
                                     </span>
                                     <Button size="sm" className="h-8 text-[10px]" onClick={async () => {
                                        const group = groups.find(g => g.id === selectedGroupId);
                                        const token = await getToken();
                                        await api.sessions.updateGroupSettings(selectedSessionId, selectedGroupId, group.settings, token || undefined);
                                        toast.success("Réglages groupe enregistrés");
                                        fetchGroups(selectedSessionId);
                                     }}>Appliquer</Button>
                                  </div>
                                  <Separator />
                                  <div className="grid grid-cols-1 gap-4">
                                     <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                           <Label className="text-xs">Modération active</Label>
                                           <p className="text-[10px] text-muted-foreground">Le bot surveille ce groupe.</p>
                                        </div>
                                        <Switch
                                           checked={!!groups.find(g => g.id === selectedGroupId)?.settings?.is_active}
                                           onCheckedChange={v => {
                                              const newGroups = [...groups];
                                              const idx = newGroups.findIndex(g => g.id === selectedGroupId);
                                              newGroups[idx].settings = { ...(newGroups[idx].settings || {}), is_active: v };
                                              setGroups(newGroups);
                                           }}
                                        />
                                     </div>
                                     <div className="flex items-center justify-between">
                                        <div className="space-y-0.5">
                                           <Label className="text-xs">Anti-Lien</Label>
                                           <p className="text-[10px] text-muted-foreground">Supprime les liens externes.</p>
                                        </div>
                                        <Switch
                                           checked={!!groups.find(g => g.id === selectedGroupId)?.settings?.anti_link}
                                           onCheckedChange={v => {
                                              const newGroups = [...groups];
                                              const idx = newGroups.findIndex(g => g.id === selectedGroupId);
                                              newGroups[idx].settings = { ...(newGroups[idx].settings || {}), anti_link: v };
                                              setGroups(newGroups);
                                           }}
                                        />
                                     </div>
                                  </div>
                               </div>
                            )}
                         </div>
                      </div>
                   )}
                </CardContent>
             </Card>
          </TabsContent>

          <TabsContent value="keywords" className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            <div className="flex items-center justify-between px-1">
              <div className="space-y-0.5">
                <h3 className="text-sm font-semibold">Réponses par Mots-clés</h3>
                <p className="text-xs text-muted-foreground">Économisez des crédits en répondant aux questions fréquentes sans IA.</p>
              </div>
              <Button size="sm" onClick={() => { setEditingRule(null); setIsKeywordDialogOpen(true); }}>
                <Plus className="h-4 w-4 mr-2" /> Nouvelle règle
              </Button>
            </div>

            <Card>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-[10px] uppercase font-bold">Déclencheur</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">Réponse</TableHead>
                    <TableHead className="text-[10px] uppercase font-bold">Statut</TableHead>
                    <TableHead className="text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {keywords.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-12 text-xs text-muted-foreground">
                        Aucun mot-clé configuré.
                      </TableCell>
                    </TableRow>
                  ) : (
                    keywords.map(kw => (
                      <TableRow key={kw.id} className="group">
                        <TableCell className="font-medium text-xs">{kw.keyword}</TableCell>
                        <TableCell className="text-xs text-muted-foreground truncate max-w-[200px]">
                           {kw.response_type === 'text' ? kw.response_content : kw.file_name || 'Fichier média'}
                        </TableCell>
                        <TableCell>
                          <Switch
                            size="sm"
                            checked={kw.is_active === 1}
                            onCheckedChange={async (v) => {
                              const token = await getToken()
                              await api.sessions.updateKeyword(selectedSessionId, kw.id, { is_active: v ? 1 : 0 }, token || undefined)
                              fetchSessionDetails()
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-7 w-7"><MoreVertical className="h-3.5 w-3.5" /></Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => { setEditingRule(kw); setKeywordForm(kw); setIsKeywordDialogOpen(true); }}><Edit className="h-4 w-4 mr-2" /> Modifier</DropdownMenuItem>
                              <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteKeyword(kw.id)}><Trash2 className="h-4 w-4 mr-2" /> Supprimer</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Dialog Mot-clé */}
      <Dialog open={isKeywordDialogOpen} onOpenChange={setIsKeywordDialogOpen}>
        <DialogContent className="sm:max-w-[450px]">
          <DialogHeader>
            <DialogTitle className="text-base">{editingRule ? 'Modifier' : 'Ajouter'} une réponse auto</DialogTitle>
            <DialogDescription className="text-xs">Répondez instantanément dès qu&apos;un mot précis est détecté.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Mot-clé</Label>
                <Input placeholder="ex: Tarifs" value={keywordForm.keyword} onChange={e => setKeywordForm({...keywordForm, keyword: e.target.value})} />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] uppercase font-bold text-muted-foreground">Correspondance</Label>
                <Select value={keywordForm.match_type} onValueChange={v => setKeywordForm({...keywordForm, match_type: v})}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exact">Mot exact</SelectItem>
                    <SelectItem value="contains">Contient le mot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
               <Label className="text-[10px] uppercase font-bold text-muted-foreground">Réponse</Label>
               <Textarea
                 placeholder="Tapez votre réponse ici..."
                 className="min-h-[100px] text-sm"
                 value={keywordForm.response_content}
                 onChange={e => setKeywordForm({...keywordForm, response_content: e.target.value})}
               />
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" size="sm" onClick={() => setIsKeywordDialogOpen(false)}>Annuler</Button>
            <Button size="sm" onClick={handleCreateOrUpdateKeyword}>Enregistrer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
