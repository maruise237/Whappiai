"use client"

import * as React from "react"
import { SessionCard } from "@/components/dashboard/session-card"
import { MessagingTabs } from "@/components/dashboard/messaging-tabs"
import { LogViewer } from "@/components/dashboard/log-viewer"
import { ApiUsageCard } from "@/components/dashboard/api-usage-card"
import { api } from "@/lib/api"
import { LoaderCircle, Plus } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useWebSocket } from "@/hooks/use-websocket"
import { toast } from "sonner"

export default function DashboardPage() {
  const [sessions, setSessions] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [selectedSessionId, setSelectedSessionId] = React.useState<string | null>(null)
  const [isCreateOpen, setIsCreateOpen] = React.useState(false)
  const [newSessionId, setNewSessionId] = React.useState("")
  const [creating, setCreating] = React.useState(false)
  const [activeMessagingTab, setActiveMessagingTab] = React.useState("text")

  const { lastMessage } = useWebSocket()

  // Handle real-time updates
  React.useEffect(() => {
    if (!lastMessage) return

    if (lastMessage.type === 'session-update') {
      const updates = lastMessage.data
      setSessions(prev => {
        const newSessions = [...prev]
        updates.forEach((update: any) => {
          const index = newSessions.findIndex(s => s.sessionId === update.sessionId)
          if (index !== -1) {
            newSessions[index] = { ...newSessions[index], ...update }
          } else {
            newSessions.push(update)
          }
        })
        return newSessions
      })
    } else if (lastMessage.type === 'session-deleted') {
      const { sessionId } = lastMessage.data
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId))
      if (selectedSessionId === sessionId) {
        setSelectedSessionId(null)
      }
    }
  }, [lastMessage, selectedSessionId])

  const fetchSessions = async () => {
    try {
      const data = await api.sessions.list()
      setSessions(data || [])
      if (data?.length > 0 && !selectedSessionId) {
        setSelectedSessionId(data[0].sessionId)
      }
    } catch (error) {
      console.error("Failed to fetch sessions:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateSession = async () => {
    if (!newSessionId) return
    setCreating(true)
    try {
      await api.sessions.create(newSessionId)
      await fetchSessions()
      setSelectedSessionId(newSessionId)
      setIsCreateOpen(false)
      setNewSessionId("")
      toast.success("Session created successfully")
    } catch (error: any) {
      console.error("Failed to create session:", error)
      toast.error(error.message || "Failed to create session. It might already exist.")
    } finally {
      setCreating(false)
    }
  }

  React.useEffect(() => {
    fetchSessions()
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoaderCircle className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  const selectedSession = sessions.find(s => s.sessionId === selectedSessionId)

  return (
    <div className="space-y-8 pb-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-4xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground mt-2">Manage your WhatsApp sessions and send messages via API.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          {sessions.length > 0 && (
            <div className="flex items-center gap-3 bg-muted/50 px-4 py-2 rounded-lg border border-primary/10">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Active Session:</span>
              <Select 
                value={selectedSessionId || ""} 
                onValueChange={setSelectedSessionId}
              >
                <SelectTrigger className="w-[200px] bg-background border-none shadow-none h-8">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.sessionId} value={s.sessionId}>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${s.status === 'CONNECTED' ? 'bg-emerald-500' : 'bg-red-500'}`} />
                        {s.sessionId}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <Button onClick={() => setIsCreateOpen(true)} className="gap-2 shadow-lg shadow-primary/20">
            <Plus className="w-4 h-4" />
            New Session
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1">
          <SessionCard 
            session={selectedSession} 
            onRefresh={fetchSessions} 
            onCreate={() => setIsCreateOpen(true)} 
          />
        </div>
        <div className="lg:col-span-2">
          <MessagingTabs 
            session={selectedSession} 
            sessions={sessions}
            onSessionChange={setSelectedSessionId}
            onTabChange={setActiveMessagingTab} 
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <LogViewer />
        <ApiUsageCard 
          activeTab={activeMessagingTab} 
          sessionId={selectedSession?.sessionId}
          token={selectedSession?.token}
        />
      </div>

      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Session</DialogTitle>
            <DialogDescription>
              Enter a unique ID for your new WhatsApp session.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input 
              placeholder="e.g., my-business-session" 
              value={newSessionId}
              onChange={(e) => setNewSessionId(e.target.value)}
              disabled={creating}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreateOpen(false)} disabled={creating}>
              Cancel
            </Button>
            <Button onClick={handleCreateSession} disabled={creating || !newSessionId}>
              {creating && <LoaderCircle className="w-4 h-4 mr-2 animate-spin" />}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
