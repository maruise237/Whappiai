"use client"

import * as React from "react"
import {
  Search,
  MessageSquare,
  User,
  Clock,
  Send,
  Loader2,
  Trash2,
  RefreshCcw,
  MoreVertical,
  Bot,
  BrainCircuit,
  MessageCircle,
  Smartphone,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useUser, useAuth } from "@clerk/nextjs"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useWebSocket } from "@/providers/websocket-provider"
import confetti from "canvas-confetti"
import { useI18n } from "@/i18n/i18n-provider"

export default function InboxPage() {
  const { t } = useI18n()
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const { lastMessage } = useWebSocket()

  const [sessions, setSessions] = React.useState<any[]>([])
  const [selectedSession, setSelectedSession] = React.useState<string>("")
  const [conversations, setConversations] = React.useState<any[]>([])
  const [selectedChat, setSelectedChat] = React.useState<string | null>(null)
  const [history, setHistory] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [isChatLoading, setIsChatLoading] = React.useState(false)
  const [replyText, setReplyText] = React.useState("")
  const [searchQuery, setSearchQuery] = React.useState("")
  const [isSending, setIsSending] = React.useState(false)
  const [isResuming, setIsResuming] = React.useState(false)

  const scrollRef = React.useRef<HTMLDivElement>(null)

  const fetchSessions = React.useCallback(async () => {
    try {
      const token = await getToken()
      const data = await api.sessions.list(token || undefined)
      setSessions(data || [])
      if (data && data.length > 0 && !selectedSession) {
        setSelectedSession(data[0].sessionId)
      }
    } catch (e) {} finally {
      setIsLoading(false)
    }
  }, [getToken, selectedSession])

  const fetchInbox = React.useCallback(async (sessionId: string) => {
    if (!sessionId) return
    setIsLoading(true)
    try {
      const token = await getToken()
      const data = await api.sessions.getInbox(sessionId, token || undefined)
      setConversations(Array.isArray(data) ? data : [])
    } catch (e) {
      toast.error("Échec du chargement de l'inbox")
    } finally {
      setIsLoading(false)
    }
  }, [getToken])

  const fetchHistory = React.useCallback(async (jid: string) => {
    if (!selectedSession) return
    setIsChatLoading(true)
    try {
      const token = await getToken()
      const data = await api.sessions.getChatHistory(selectedSession, jid, token || undefined)
      setHistory(Array.isArray(data) ? data : [])
      setSelectedChat(jid)
    } catch (e) {
      toast.error("Échec du chargement de l'historique")
    } finally {
      setIsChatLoading(false)
    }
  }, [getToken, selectedSession])

  React.useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  React.useEffect(() => {
    if (selectedSession) {
      fetchInbox(selectedSession)
    }
  }, [selectedSession, fetchInbox])

  // Handle real-time messages
  React.useEffect(() => {
    if (!lastMessage) return

    // If new message received for the active session
    if (lastMessage.type === 'message_received' && lastMessage.sessionId === selectedSession) {
      // Refresh inbox list
      fetchInbox(selectedSession)

      // If the message is for the currently selected chat, refresh history
      if (selectedChat === lastMessage.data?.remoteJid) {
        fetchHistory(selectedChat)
      }
    }
  }, [lastMessage, selectedSession, selectedChat, fetchInbox, fetchHistory])

  // Auto-scroll to bottom when history changes
  React.useEffect(() => {
    if (scrollRef.current) {
      const scrollArea = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight
      }
    }
  }, [history])

  const handleSend = async () => {
    if (!replyText.trim() || !selectedChat || !selectedSession || isSending) return

    setIsSending(true)
    try {
      const token = await getToken()

      await api.messages.send(selectedSession, {
        to: selectedChat,
        type: 'text',
        text: replyText
      }, token || undefined)

      setReplyText("")
      // Optimized: instead of waiting for websocket, we could append locally,
      // but fetchHistory is safer to confirm it's in the DB memory
      await fetchHistory(selectedChat)
      fetchInbox(selectedSession)

      confetti({ particleCount: 40, spread: 50, origin: { y: 0.8 } })
    } catch (e: any) {
      toast.error("Échec de l'envoi : " + e.message)
    } finally {
      setIsSending(false)
    }
  }

  const handleResumeAI = async () => {
    if (!selectedChat || !selectedSession || isResuming) return
    setIsResuming(true)
    try {
      const token = await getToken()
      await api.sessions.resumeAI(selectedSession, selectedChat, token || undefined)
      toast.success("IA réactivée pour ce contact")
    } catch (e: any) {
      toast.error("Échec de la réactivation")
    } finally {
      setIsResuming(false)
    }
  }

  const handleDeleteChat = async (jid: string) => {
    if (!confirm("Oublier cette conversation ?")) return
    try {
      const token = await getToken()
      await api.sessions.deleteChat(selectedSession, jid, token || undefined)
      setConversations(prev => prev.filter(c => c.remote_jid !== jid))
      if (selectedChat === jid) {
        setSelectedChat(null)
        setHistory([])
      }
      toast.success("Conversation supprimée de la mémoire")
    } catch (e) {
      toast.error("Échec de la suppression")
    }
  }

  const filteredConversations = conversations.filter(c =>
    c.remote_jid.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.last_message || "").toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (!isLoaded) return null

  return (
    <div className="h-[calc(100vh-7.5rem)] flex flex-col gap-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h1 className="text-lg font-bold flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" /> {t("inbox.title")}
          </h1>
          <p className="text-xs text-muted-foreground hidden sm:block">{t("inbox.desc")}</p>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 gap-1 h-7 text-[10px] hidden lg:flex">
            <Bot className="h-3 w-3" /> {t("inbox.human_takeover")}
          </Badge>

          <div className="flex items-center gap-2 bg-muted/20 p-1 rounded-md border">
            <Select value={selectedSession} onValueChange={v => { setSelectedSession(v); setSelectedChat(null); setHistory([]); }}>
               <SelectTrigger className="w-[120px] h-7 text-[10px] bg-transparent border-none shadow-none focus:ring-0">
                  <SelectValue placeholder="Session" />
               </SelectTrigger>
               <SelectContent>
                  {sessions.map(s => <SelectItem key={s.sessionId} value={s.sessionId} className="text-xs">{s.sessionId}</SelectItem>)}
               </SelectContent>
            </Select>

            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => fetchInbox(selectedSession)} disabled={isLoading}>
              <RefreshCcw className={cn("h-3.5 w-3.5", isLoading && "animate-spin")} />
            </Button>
          </div>
        </div>
      </div>

      <Card className="flex-1 flex overflow-hidden border-border bg-card shadow-lg">
        {/* Sidebar: Conversations */}
        <div className={cn(
          "w-full md:w-[300px] lg:w-[350px] flex flex-col border-r bg-muted/5 shrink-0 transition-all",
          selectedChat && "hidden md:flex"
        )}>
          <div className="p-4 border-b">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder={t("inbox.search")}
                className="pl-8 h-8 text-[11px] bg-background border-none shadow-none focus-visible:ring-1 ring-primary/20"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
              />
            </div>
          </div>
          <ScrollArea className="flex-1">
            <div className="divide-y divide-border/30">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="p-4 space-y-2 animate-pulse">
                    <div className="h-3 w-20 bg-muted rounded" />
                    <div className="h-2 w-32 bg-muted rounded" />
                  </div>
                ))
              ) : filteredConversations.length === 0 ? (
                <div className="p-12 text-center text-muted-foreground opacity-30">
                  <MessageSquare className="h-10 w-10 mx-auto mb-3" />
                  <p className="text-[10px] font-semibold tracking-widest">Vide</p>
                </div>
              ) : (
                filteredConversations.map(conv => (
                  <div
                    key={conv.remote_jid}
                    onClick={() => fetchHistory(conv.remote_jid)}
                    className={cn(
                      "group p-4 text-left hover:bg-muted/50 transition-all cursor-pointer relative border-l-2 border-transparent",
                      selectedChat === conv.remote_jid && "bg-primary/[0.03] border-primary"
                    )}
                  >
                    <div className="flex items-center justify-between gap-3 mb-1 min-w-0">
                      <span className="text-[12px] font-bold truncate flex-1 min-w-0">
                        {conv.remote_jid.includes('@g.us') ? "👥 " : ""}
                        {conv.remote_jid.split('@')[0].substring(0, 15)}
                      </span>
                      <span className="text-[9px] text-muted-foreground/60 whitespace-nowrap">
                        {new Date(conv.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-[11px] text-muted-foreground/80 line-clamp-1 pr-6 overflow-hidden">
                      {conv.last_message || "Fichier média"}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteChat(conv.remote_jid); }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-100 p-1 hover:text-destructive transition-opacity"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Main Content: Chat View */}
        <div className={cn(
          "flex-1 flex flex-col bg-background relative min-w-0",
          !selectedChat && "hidden md:flex"
        )}>
          {!selectedChat ? (
            <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground/20 p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <MessageCircle className="h-8 w-8" />
              </div>
              <h3 className="text-sm font-medium text-foreground/50">Votre Messagerie Live</h3>
              <p className="max-w-[240px] text-xs mt-1">Sélectionnez une conversation pour commencer à discuter en direct.</p>
            </div>
          ) : (
            <>
              {/* Chat Header */}
              <div className="h-14 flex items-center justify-between px-6 border-b bg-card">
                <div className="flex items-center gap-3 min-w-0">
                  <Button variant="ghost" size="icon" className="md:hidden h-8 w-8" onClick={() => setSelectedChat(null)}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center text-primary shrink-0">
                    <User className="h-4 w-4" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{selectedChat.split('@')[0]}</p>
                    <p className="text-[10px] text-muted-foreground">WhatsApp {selectedChat.includes('@g.us') ? 'Groupe' : 'Direct'}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={() => fetchHistory(selectedChat)} disabled={isChatLoading}>
                    <RefreshCcw className={cn("h-3.5 w-3.5", isChatLoading && "animate-spin")} />
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon"><MoreVertical className="h-4 w-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleDeleteChat(selectedChat)} className="text-destructive">
                        <Trash2 className="h-4 w-4 mr-2" /> Oublier la conversation
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Chat Body */}
              <ScrollArea className="flex-1 p-6" ref={scrollRef}>
                <div className="space-y-6">
                  <div className="flex justify-center">
                    <Badge variant="secondary" className="text-[10px] font-medium bg-muted/50 text-muted-foreground border-none">
                      Mémoire de l&apos;IA pour cette session
                    </Badge>
                  </div>
                  {history.map((msg, i) => (
                    <div
                      key={msg.id || i}
                      className={cn(
                        "flex flex-col max-w-[80%] group relative",
                        msg.role === 'user' ? "mr-auto" : "ml-auto items-end"
                      )}
                    >
                      <div className={cn(
                        "rounded-2xl px-4 py-2 text-sm shadow-sm relative transition-all",
                        msg.role === 'user'
                          ? "bg-muted text-foreground rounded-tl-none"
                          : "bg-primary text-primary-foreground rounded-tr-none"
                      )}>
                        {msg.content}
                      </div>
                      <div className="flex items-center gap-2 mt-1 px-1">
                        <span className="text-[9px] text-muted-foreground font-medium">
                          {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                        {msg.role === 'assistant' && (
                          <Badge variant="outline" className="text-[8px] h-3 px-1 border-primary/20 text-primary/70">IA</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                  {isChatLoading && (
                    <div className="flex justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Chat Footer */}
              <div className="p-4 border-t bg-card">
                <form
                  className="flex items-end gap-2"
                  onSubmit={(e) => { e.preventDefault(); handleSend(); }}
                >
                  <div className="flex-1 bg-muted rounded-2xl p-1 focus-within:ring-1 ring-primary/20 transition-all">
                    <Input
                      placeholder={t("inbox.type_message")}
                      className="border-none bg-transparent focus-visible:ring-0 h-10 text-sm"
                      value={replyText}
                      onChange={e => setReplyText(e.target.value)}
                      disabled={isSending}
                    />
                  </div>
                  <Button
                    type="submit"
                    size="icon"
                    className="h-10 w-10 shrink-0 rounded-full shadow-md"
                    disabled={!replyText.trim() || isSending}
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </form>
                <div className="flex items-center justify-between mt-2 px-1">
                   <div className="flex items-center gap-3">
                      <p className="text-[9px] text-muted-foreground">{t("inbox.ai_pause_notice")}</p>
                      <Button
                        variant="link"
                        size="sm"
                        className="h-auto p-0 text-[9px] font-bold text-primary hover:text-primary/80"
                        onClick={handleResumeAI}
                        disabled={isResuming}
                      >
                        {isResuming ? "..." : "RÉACTIVER MAINTENANT"}
                      </Button>
                   </div>
                   <div className="flex items-center gap-1">
                      <div className="h-1 w-1 rounded-full bg-green-500 animate-pulse" />
                      <span className="text-[9px] font-bold text-green-600 uppercase tracking-widest">{t("inbox.live")}</span>
                   </div>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </div>
  )
}
