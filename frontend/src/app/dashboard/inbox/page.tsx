"use client"

import * as React from "react"
import { useSearchParams, useRouter } from "next/navigation"
import {
  MessageSquare,
  Search,
  User,
  Bot,
  ShieldAlert,
  Loader2,
  ChevronRight,
  Send,
  Zap,
  Clock
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function InboxPage() {
  const { getToken } = useAuth()
  const [sessions, setSessions] = React.useState<any[]>([])
  const [selectedSession, setSelectedSession] = React.useState<string>("")
  const [conversations, setConversations] = React.useState<any[]>([])
  const [selectedChat, setSelectedChat] = React.useState<string | null>(null)
  const [history, setHistory] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isChatLoading, setIsChatLoading] = React.useState(false)
  const [searchQuery, setSearchQuery] = React.useState("")

  const fetchSessions = React.useCallback(async () => {
    try {
      const token = await getToken()
      const data = await api.sessions.list(token || undefined)
      setSessions(data || [])
      if (data?.length > 0) setSelectedSession(data[0].sessionId)
    } catch (e) {
      console.error(e)
    } finally {
      setIsLoading(false)
    }
  }, [getToken])

  const fetchInbox = React.useCallback(async () => {
    if (!selectedSession) return
    try {
      const token = await getToken()
      const response = await api.sessions.getInbox(selectedSession, token || undefined)
      setConversations(response || [])
    } catch (e) {
      console.error(e)
    }
  }, [selectedSession, getToken])

  const fetchHistory = React.useCallback(async (jid: string) => {
    setIsChatLoading(true)
    try {
      const token = await getToken()
      const response = await api.sessions.getChatHistory(selectedSession, jid, token || undefined)
      setHistory(response || [])
      setSelectedChat(jid)
    } catch (e) {
      toast.error("Erreur chargement historique")
    } finally {
      setIsChatLoading(false)
    }
  }, [selectedSession, getToken])

  React.useEffect(() => { fetchSessions() }, [fetchSessions])
  React.useEffect(() => { fetchInbox() }, [fetchInbox])

  const filteredConversations = conversations.filter(c =>
    c.remote_jid.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.last_message && c.last_message.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Inbox & IA</h1>
          <p className="text-sm text-muted-foreground">Surveillez et intervenez dans les conversations gérées par l&apos;IA.</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="w-48 h-9 text-xs">
              <SelectValue placeholder="Session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map(s => <SelectItem key={s.sessionId} value={s.sessionId}>{s.sessionId}</SelectItem>)}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={fetchInbox}><Zap className="h-4 w-4 mr-2" /> Actualiser</Button>
        </div>
      </div>

      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6 min-h-0">
        {/* Liste Conversations */}
        <Card className="flex flex-col min-h-0 overflow-hidden">
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher..."
                className="pl-8 h-9 text-sm"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y">
              {filteredConversations.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground">Aucune conversation trouvée.</div>
              ) : (
                filteredConversations.map(conv => (
                  <button
                    key={conv.remote_jid}
                    onClick={() => fetchHistory(conv.remote_jid)}
                    className={cn(
                      "w-full p-4 text-left hover:bg-muted/50 transition-colors flex items-start gap-3",
                      selectedChat === conv.remote_jid && "bg-muted shadow-inner border-l-2 border-primary"
                    )}
                  >
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-semibold truncate">{conv.remote_jid.split('@')[0]}</p>
                        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                          {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground truncate mt-0.5">{conv.last_message}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </Card>

        {/* Historique Chat */}
        <Card className="flex flex-col min-h-0 overflow-hidden relative">
          {!selectedChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <MessageSquare className="h-12 w-12 text-muted-foreground/20 mb-4" />
              <h3 className="text-sm font-medium">Sélectionnez une conversation</h3>
              <p className="text-xs text-muted-foreground max-w-xs mt-1">L&apos;historique affiché provient de la mémoire de l&apos;IA Whappi.</p>
            </div>
          ) : (
            <>
              <CardHeader className="p-4 border-b flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <div>
                    <CardTitle className="text-sm">{selectedChat.split('@')[0]}</CardTitle>
                    <CardDescription className="text-[10px] flex items-center gap-1">
                      <Clock className="h-3 w-3" /> Mémoire de session active
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="bg-green-500/5 text-green-600 border-green-500/20 text-[10px]">
                  IA Autonome
                </Badge>
              </CardHeader>

              <ScrollArea className="flex-1 p-6 bg-muted/5">
                <div className="space-y-6">
                  {history.map((msg, i) => (
                    <div key={i} className={cn(
                      "flex flex-col max-w-[80%]",
                      msg.role === 'user' ? "mr-auto" : "ml-auto items-end"
                    )}>
                      <div className={cn(
                        "rounded-lg p-3 text-sm shadow-sm",
                        msg.role === 'user'
                          ? "bg-card border border-border"
                          : "bg-primary text-primary-foreground"
                      )}>
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-2 mt-1 px-1">
                        {msg.role === 'assistant' && <Bot className="h-3 w-3 text-primary" />}
                        <span className="text-[10px] text-muted-foreground">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  ))}
                  {isChatLoading && <div className="text-center py-4"><Loader2 className="h-4 w-4 animate-spin mx-auto text-muted-foreground" /></div>}
                </div>
              </ScrollArea>

              <div className="p-4 border-t bg-card">
                <div className="flex gap-2">
                  <Input placeholder="Répondre manuellement (interrompt l'IA)..." className="h-10 text-sm" />
                  <Button size="icon" className="h-10 w-10 shrink-0">
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 text-center">
                  Une réponse manuelle depuis WhatsApp ou ce dashboard activera la <b>fenêtre de silence</b>.
                </p>
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
