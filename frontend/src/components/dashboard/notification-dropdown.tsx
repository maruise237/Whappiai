"use client"

import * as React from "react"
import { Bell, Check, Info, AlertTriangle, Zap, MessageSquare } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { useWebSocket } from "@/providers/websocket-provider"
import { useNotificationSound } from "@/hooks/use-notification-sound"

function NotificationIcon({ type }: { type: string }) {
  switch (type) {
    case "credit_low": return <Zap className="h-4 w-4 text-amber-500" />
    case "subscription_expiring": return <AlertTriangle className="h-4 w-4 text-red-500" />
    case "system_update": return <Info className="h-4 w-4 text-blue-500" />
    case "message_received": return <MessageSquare className="h-4 w-4 text-primary" />
    default: return <Bell className="h-4 w-4 text-muted-foreground" />
  }
}

export function NotificationDropdown() {
  const { getToken } = useAuth()
  const { lastMessage } = useWebSocket()
  const { play: playNotificationSound } = useNotificationSound()
  const [notifications, setNotifications] = React.useState<any[]>([])
  const [unreadCount, setUnreadCount] = React.useState(0)
  const [loading, setLoading] = React.useState(false)

  const fetchNotifications = React.useCallback(async () => {
    try {
      const token = await getToken()
      const res = await api.notifications.list(false, token || undefined)
      if (res) {
        setNotifications(Array.isArray(res.notifications) ? res.notifications : [])
        setUnreadCount(typeof res.unreadCount === "number" ? res.unreadCount : 0)
      }
    } catch (error) {
      console.error("Failed to fetch notifications", error)
    }
  }, [getToken])

  React.useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  React.useEffect(() => {
    if (lastMessage?.type === "notification") {
      fetchNotifications()
      playNotificationSound()
    }
  }, [lastMessage, fetchNotifications, playNotificationSound])

  const handleMarkAsRead = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    try {
      const token = await getToken()
      await api.notifications.markAsRead(id, token || undefined)
      fetchNotifications()
    } catch (error) {
      toast.error("Erreur lors du marquage comme lu")
    }
  }

  const handleMarkAllAsRead = async () => {
    setLoading(true)
    try {
      const token = await getToken()
      await api.notifications.markAllAsRead(token || undefined)
      toast.success("Toutes les notifications ont été marquées comme lues")
      fetchNotifications()
    } catch (error) {
      toast.error("Erreur lors du marquage global")
    } finally {
      setLoading(false)
    }
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button className="relative text-muted-foreground hover:text-foreground transition-colors p-2 outline-none">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-1.5 right-1.5 flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
            </span>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between p-4 border-b">
          <DropdownMenuLabel className="p-0 font-semibold">Notifications</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-auto p-0 text-[10px] text-muted-foreground hover:text-primary transition-colors"
              onClick={handleMarkAllAsRead}
              disabled={loading}
            >
              Tout marquer comme lu
            </Button>
          )}
        </div>
        <ScrollArea className="h-80">
          <div className="flex flex-col">
            {notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                <p className="text-xs text-muted-foreground">Aucune notification</p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 p-4 border-b last:border-0 hover:bg-muted/50 transition-colors relative group",
                    !n.is_read && "bg-primary/[0.02]"
                  )}
                >
                  <div className="shrink-0 mt-0.5">
                    <NotificationIcon type={n.type} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-xs font-medium", !n.is_read ? "text-foreground" : "text-muted-foreground")}>
                      {n.title}
                    </p>
                    <p className="text-[11px] text-muted-foreground line-clamp-2 mt-0.5">
                      {n.message}
                    </p>
                    <p className="text-[9px] text-muted-foreground/60 mt-1">
                      {new Date(n.created_at).toLocaleString("fr-FR", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "2-digit" })}
                    </p>
                  </div>
                  {!n.is_read && (
                    <button
                      onClick={(e) => handleMarkAsRead(e, n.id)}
                      className="opacity-0 group-hover:opacity-100 absolute top-4 right-4 text-muted-foreground hover:text-primary transition-all"
                      title="Marquer comme lu"
                    >
                      <Check className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </ScrollArea>
        <div className="p-2 border-t text-center">
          <button className="text-[10px] text-muted-foreground hover:text-foreground transition-colors w-full py-1">
            Voir toutes les activités
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
