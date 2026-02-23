"use client"

import * as React from "react"
import { 
  Shield, 
  Search, 
  ShieldAlert,
  Zap,
} from "lucide-react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useRouter } from "next/navigation"
import { useAuth, useUser } from "@clerk/nextjs"

export default function ModerationSessionsPage() {
  const [sessions, setSessions] = React.useState<any[]>([])
  const [isLoading, setIsLoading] = React.useState(true)
  const [searchQuery, setSearchQuery] = React.useState("")
  const router = useRouter()
  const { getToken } = useAuth()
  const { user } = useUser()

  const fetchSessions = React.useCallback(async () => {
    setIsLoading(true)
    try {
      const token = await getToken()
      const data = await api.sessions.list(token || undefined)
      setSessions(data || [])
    } catch (error) {
      toast.error("Failed to load sessions")
    } finally {
      setIsLoading(false)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchSessions()
  }, [fetchSessions])

  const filteredSessions = sessions.filter(s => 
    s.sessionId.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (isLoading) return <div className="p-8 text-center">Loading...</div>

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h1 className="text-xl font-semibold">Group Management</h1>
          <p className="text-sm text-muted-foreground">Select a session to manage group moderation and animation.</p>
        </div>
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            placeholder="Search session..."
            className="pl-8 h-9 text-sm"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="flex items-center gap-3 p-3 rounded-md bg-primary/5 border border-primary/10">
        <ShieldAlert className="h-4 w-4 text-primary" />
        <p className="text-xs text-muted-foreground">Select a connected session to access groups where you are an administrator.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredSessions.length === 0 ? (
          <Card className="col-span-full py-12 text-center border-dashed">
            <Zap className="h-8 w-8 text-muted-foreground/40 mx-auto mb-3" />
            <p className="text-sm font-medium">No sessions found</p>
          </Card>
        ) : (
          filteredSessions.map(session => (
            <Card key={session.sessionId} className="border-border bg-card overflow-hidden">
              <CardHeader className="p-4 border-b flex flex-row items-center justify-between space-y-0">
                <div className="flex items-center gap-3">
                  <div className={cn("h-8 w-8 rounded-full flex items-center justify-center", session.isConnected ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground")}>
                    <Shield className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">{session.sessionId}</p>
                    <Badge className={session.isConnected
                      ? "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20"
                      : "border-border text-muted-foreground"
                    }>
                      {session.isConnected ? "Active" : "Offline"}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardFooter className="p-4 bg-muted/20 border-t grid grid-cols-2 gap-3">
                <Button size="sm" variant="outline" disabled={!session.isConnected} onClick={() => router.push(`/dashboard/moderation/groups/moderation?session=${session.sessionId}`)}>
                  Moderation
                </Button>
                <Button size="sm" variant="outline" disabled={!session.isConnected} onClick={() => router.push(`/dashboard/moderation/groups/animation?session=${session.sessionId}`)}>
                  Animation
                </Button>
              </CardFooter>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
