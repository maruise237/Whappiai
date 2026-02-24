"use client"

import * as React from "react"
import Link from "next/link"
import { 
  Bot, 
  Settings2, 
  Activity,
  MessageSquare,
  Save,
  MoreVertical,
  Zap,
  User,
  Clock,
  Send,
  Loader2,
  BrainCircuit,
  Trash2,
  RefreshCcw,
} from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { useUser, useAuth } from "@clerk/nextjs"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import confetti from "canvas-confetti"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export default function AIPage() {
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [items, setItems] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isQuickEditOpen, setIsQuickEditOpen] = React.useState(false)
  const [isMemoryOpen, setIsMemoryOpen] = React.useState(false)
  const [selectedSessionMemory, setSelectedSessionMemory] = React.useState<string | null>(null)
  const [conversations, setConversations] = React.useState<any[]>([])
  const [selectedChat, setSelectedChat] = React.useState<string | null>(null)
  const [history, setHistory] = React.useState<any[]>([])
  const [isChatLoading, setIsChatLoading] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)
  const [availableModels, setAvailableModels] = React.useState<any[]>([])
  const [isAdmin, setIsAdmin] = React.useState(false)
  
  const [formData, setFormData] = React.useState({
    sessionId: "",
    enabled: false,
    mode: "bot",
    model: "deepseek-chat",
    endpoint: "",
    key: "",
    prompt: ""
  })

  const fetchData = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const email = user?.primaryEmailAddress?.emailAddress
      setIsAdmin(email?.toLowerCase() === 'maruise237@gmail.com' || (user?.publicMetadata?.role === 'admin'))

      const models = await api.ai.listModels(token || undefined)
      setAvailableModels(models || [])
      const defaultModel = models?.find((m: any) => m.is_default) || models?.[0]

      const sessionsData = await api.sessions.list(token || undefined)
      const sessions = sessionsData || []
      
      const sessionsList = Array.isArray(sessions) ? sessions : []
      const itemsWithConfig = await Promise.all(sessionsList.map(async (s: any) => {
        try {
          if (!s || !s.sessionId) return null
          const config = await api.sessions.getAI(s.sessionId, token || undefined)
          return {
            sessionId: s.sessionId,
            isConnected: s.isConnected,
            aiConfig: {
              ...config,
              model: config.model || defaultModel?.id || "deepseek-chat",
              endpoint: config.endpoint || defaultModel?.endpoint || ""
            }
          }
        } catch (e) {
          return {
            sessionId: s.sessionId,
            isConnected: s.isConnected,
            aiConfig: { enabled: false, mode: 'bot', model: defaultModel?.id || 'deepseek-chat', prompt: '', endpoint: defaultModel?.endpoint || '', key: '' }
          }
        }
      }))
      setItems(itemsWithConfig.filter(i => i !== null))
    } catch (error) {
      toast.error("Échec du chargement des configurations IA")
    } finally {
      setIsLoading(false)
    }
  }, [getToken, user])

  React.useEffect(() => {
    if (isLoaded && user) fetchData()
  }, [isLoaded, user, fetchData])

  const handleOpenMemory = async (sessionId: string) => {
    if (!sessionId) return
    setSelectedSessionMemory(sessionId)
    setIsMemoryOpen(true)
    setSelectedChat(null)
    setHistory([])
    try {
      const token = await getToken()
      const response = await api.sessions.getInbox(sessionId, token || undefined)
      setConversations(Array.isArray(response) ? response : [])
    } catch (e: any) {
      toast.error("Échec du chargement de la mémoire: " + (e.message || "Erreur inconnue"))
    }
  }

  const handleFetchHistory = async (jid: string) => {
    if (!selectedSessionMemory) return
    setIsChatLoading(true)
    try {
      const token = await getToken()
      const response = await api.sessions.getChatHistory(selectedSessionMemory, jid, token || undefined)
      setHistory(Array.isArray(response) ? response : [])
      setSelectedChat(jid)
    } catch (e: any) {
      toast.error("Erreur historique: " + (e.message || "Erreur inconnue"))
    } finally {
      setIsChatLoading(false)
    }
  }

  const handleDeleteChat = async (e: React.MouseEvent, jid: string) => {
    e.stopPropagation()
    if (!selectedSessionMemory || !confirm("Supprimer toute cette conversation de la mémoire ?")) return

    setIsDeleting(true)
    try {
      const token = await getToken()
      await api.sessions.deleteChat(selectedSessionMemory, jid, token || undefined)
      setConversations(prev => prev.filter(c => c.remote_jid !== jid))
      if (selectedChat === jid) {
        setSelectedChat(null)
        setHistory([])
      }
      toast.success("Conversation oubliée")
    } catch (e: any) {
      toast.error("Échec de la suppression")
    } finally {
      setIsDeleting(false)
    }
  }

  const handleDeleteMessage = async (messageId: number) => {
    if (!selectedSessionMemory || !selectedChat || !confirm("Supprimer ce message ?")) return

    try {
      const token = await getToken()
      await api.sessions.deleteMessage(selectedSessionMemory, selectedChat, messageId, token || undefined)
      setHistory(prev => prev.filter(m => m.id !== messageId))
      toast.success("Message supprimé")
    } catch (e: any) {
      toast.error("Échec de la suppression")
    }
  }

  const handleOpenQuickEdit = (item: any) => {
    if (!item) return
    const config = item.aiConfig || {}
    setFormData({
      sessionId: item.sessionId || "",
      enabled: !!config.enabled,
      mode: config.mode || "bot",
      model: config.model || "",
      endpoint: config.endpoint || "",
      key: config.key || "",
      prompt: config.prompt || ""
    })
    setIsQuickEditOpen(true)
  }

  const handleSave = async () => {
    try {
      const token = await getToken()
      await api.sessions.updateAI(formData.sessionId, formData, token || undefined)
      toast.success("Configuration IA mise à jour")
      setIsQuickEditOpen(false)
      fetchData()
      if (formData.enabled) confetti({ particleCount: 150, spread: 70, origin: { y: 0.6 } })
    } catch (error: any) {
      toast.error("Échec de l'enregistrement")
    }
  }

  const toggleAI = async (item: any) => {
    if (!item || !item.sessionId) return
    const config = item.aiConfig || {}
    try {
      const token = await getToken()
      await api.sessions.updateAI(item.sessionId, { ...config, enabled: !config.enabled }, token || undefined)
      toast.success(`Assistant IA ${!config.enabled ? 'activé' : 'désactivé'}`)
      fetchData()
    } catch (error) {
      toast.error("Échec de la modification")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-lg sm:text-xl font-semibold">Assistant IA</h1>
          <p className="text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Automation Intelligente</p>
        </div>
        {isAdmin && (
          <Button variant="outline" size="sm" asChild className="w-full sm:w-auto h-8 text-[11px] font-bold uppercase tracking-widest">
            <Link href="/dashboard/ai-models">Gérer les modèles</Link>
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
        {isLoading ? (
          [1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse bg-muted/20" />)
        ) : items.length === 0 ? (
          <Card className="col-span-full py-12 text-center border-dashed">
            <Bot className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">Aucune session trouvée</p>
            <p className="text-xs text-muted-foreground">Connectez un compte WhatsApp pour activer l'IA.</p>
          </Card>
        ) : (
          items.map(item => (
            <Card key={item.sessionId} className="border-border/50 bg-card overflow-hidden flex flex-col shadow-none">
              <CardHeader className="p-3 sm:p-6 border-b flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", item.aiConfig.enabled ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{item.sessionId}</p>
                    <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-tighter h-4 px-1">{item.aiConfig.mode}</Badge>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                      <MoreVertical className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => handleOpenQuickEdit(item)}>
                      <Settings2 className="h-4 w-4 mr-2" /> Modification rapide
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleOpenMemory(item.sessionId)}>
                      <MessageSquare className="h-4 w-4 mr-2" /> Voir la mémoire
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link href={`/dashboard/ai/config?session=${item.sessionId}`}>
                        <Zap className="h-4 w-4 mr-2" /> Config avancée
                      </Link>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </CardHeader>
              <CardContent className="p-3 sm:p-6 space-y-4 flex-1">
                <div className="rounded-xl bg-muted/30 p-3 text-[11px] text-muted-foreground line-clamp-2 border border-border/50 min-h-[48px] italic">
                  &ldquo;{item.aiConfig.prompt || "Aucune instruction configurée"}&rdquo;
                </div>
                <div className="flex items-center justify-between text-[10px] uppercase font-bold tracking-widest text-muted-foreground">
                  <span className="flex items-center gap-1"><MessageSquare className="h-3 w-3" /> Envoyés</span>
                  <span className="text-foreground">{item.aiConfig.stats?.sent || 0} messages</span>
                </div>
              </CardContent>
              <CardFooter className="p-3 sm:p-4 bg-muted/10 border-t flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{item.aiConfig.enabled ? "Active" : "Inactive"}</span>
                <Switch size="sm" checked={item.aiConfig.enabled} onCheckedChange={() => toggleAI(item)} />
              </CardFooter>
            </Card>
          ))
        )}
      </div>

      <Dialog open={isQuickEditOpen} onOpenChange={setIsQuickEditOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Modification rapide de l&apos;IA</DialogTitle>
            <DialogDescription>Ajustez les paramètres IA pour {formData.sessionId}.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-4">
            <div className="flex items-center justify-between py-3 border-b border-border">
              <div>
                <p className="text-sm font-medium">Activé</p>
                <p className="text-xs text-muted-foreground">Réponses automatiques actives</p>
              </div>
              <Switch checked={formData.enabled} onCheckedChange={c => setFormData({...formData, enabled: c})} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase">Mode de réponse</Label>
              <Select value={formData.mode} onValueChange={v => setFormData({...formData, mode: v})}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bot">Bot (100% Auto)</SelectItem>
                  <SelectItem value="hybrid">Hybride (Délai)</SelectItem>
                  <SelectItem value="human">Humain (Suggestion)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium uppercase">Modèle</Label>
              <Select value={formData.model} onValueChange={v => {
                const m = availableModels.find(mod => mod.id === v);
                setFormData({...formData, model: v, endpoint: m?.endpoint || ""})
              }}>
                <SelectTrigger className="h-9 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableModels.map(m => (
                    <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button variant="outline" asChild className="w-full sm:w-auto">
              <Link href={`/dashboard/ai/config?session=${formData.sessionId}`}>Config avancée</Link>
            </Button>
            <Button onClick={handleSave} className="w-full sm:w-auto">Enregistrer les modifications</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Mémoire IA */}
      <Dialog open={isMemoryOpen} onOpenChange={setIsMemoryOpen}>
        <DialogContent className="w-[calc(100vw-2rem)] sm:max-w-[900px] h-[80vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-4 sm:p-6 pb-2 border-b">
            <DialogTitle className="flex items-center gap-2">
              <BrainCircuit className="h-5 w-5 text-primary" />
              Mémoire de l&apos;IA : {selectedSessionMemory}
            </DialogTitle>
            <DialogDescription>Consultez les derniers échanges mémorisés par l&apos;IA Whappi.</DialogDescription>
          </DialogHeader>

          <div className="flex-1 flex min-h-0 divide-x relative">
            {isDeleting && (
              <div className="absolute inset-0 bg-background/50 backdrop-blur-[1px] z-50 flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}
            {/* Liste convos */}
            <div className="w-[300px] flex flex-col min-h-0">
              <ScrollArea className="flex-1">
                <div className="divide-y">
                  {!Array.isArray(conversations) || conversations.length === 0 ? (
                    <div className="p-8 text-center text-[10px] text-muted-foreground uppercase font-bold tracking-widest">Vide</div>
                  ) : (
                    conversations.map(conv => (
                      <div
                        key={conv.remote_jid}
                        className={cn(
                          "group relative w-full p-4 text-left hover:bg-muted/50 transition-colors cursor-pointer flex flex-col gap-1",
                          selectedChat === conv.remote_jid && "bg-muted"
                        )}
                        onClick={() => handleFetchHistory(conv.remote_jid)}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold truncate">{conv.remote_jid.split('@')[0]}</span>
                          <span className="text-[9px] text-muted-foreground">
                            {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-[11px] text-muted-foreground truncate pr-6">{conv.last_message}</p>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 bottom-2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                          onClick={(e) => handleDeleteChat(e, conv.remote_jid)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Chat history */}
            <div className="flex-1 flex flex-col min-h-0 bg-muted/5">
              {!selectedChat ? (
                <div className="flex-1 flex items-center justify-center text-muted-foreground/30 flex-col gap-2">
                  <MessageSquare className="h-10 w-10" />
                  <p className="text-xs">Sélectionnez un contact</p>
                </div>
              ) : (
                <>
                  <ScrollArea className="flex-1 p-6">
                    <div className="space-y-6">
                      {Array.isArray(history) && history.map((msg, i) => (
                        <div key={msg?.id || i} className={cn(
                          "group flex flex-col max-w-[85%] relative",
                          msg.role === 'user' ? "mr-auto" : "ml-auto items-end"
                        )}>
                          <div className={cn(
                            "rounded-lg p-3 text-xs shadow-sm relative",
                            msg.role === 'user' ? "bg-card border" : "bg-primary text-primary-foreground"
                          )}>
                            {msg.content}
                            <button
                              onClick={() => handleDeleteMessage(msg.id)}
                              className={cn(
                                "absolute -top-2 -right-2 h-5 w-5 rounded-full bg-destructive text-white items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity flex shadow-sm hover:scale-110",
                                msg.role !== 'user' && "-left-2 right-auto"
                              )}
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                          <span className="text-[9px] text-muted-foreground mt-1 px-1">
                            {new Date(msg.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      ))}
                      {isChatLoading && <div className="py-4 text-center"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>}
                    </div>
                  </ScrollArea>
                  <div className="p-4 border-t bg-card">
                    <div className="flex gap-2">
                      <Input placeholder="Répondre sur WhatsApp..." className="h-9 text-xs" />
                      <Button size="icon" className="h-9 w-9 shrink-0"><Send className="h-3.5 w-3.5" /></Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
