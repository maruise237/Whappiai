"use client"

import * as React from "react"
import { Terminal, Trash2, Search, Play, Square, ChevronDown, ChevronUp } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useWebSocket } from "@/providers/websocket-provider"
import { cn } from "@/lib/utils"

interface LogEntry {
  type: string;
  level: string;
  message: any;
  sessionId: string;
  [key: string]: any;
}

export function LogViewer() {
  const [isAutoScroll, setIsAutoScroll] = React.useState(true)
  const [logs, setLogs] = React.useState<LogEntry[]>([])
  const [search, setSearch] = React.useState("")
  const [levelFilter, setLevelFilter] = React.useState("all")
  const [expandedLogs, setExpandedLogs] = React.useState<Record<number, boolean>>({})
  const scrollRef = React.useRef<HTMLDivElement>(null)

  const { lastMessage } = useWebSocket()

  React.useEffect(() => {
    if (lastMessage && lastMessage.type === 'log') {
      setLogs(prev => [...prev, lastMessage].slice(-100))
    }
  }, [lastMessage])

  React.useEffect(() => {
    if (isAutoScroll && scrollRef.current) {
      const scrollContainer = scrollRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [logs, isAutoScroll])

  const filteredLogs = logs.filter(log => {
    const logMsg = typeof log.message === 'string' ? log.message : JSON.stringify(log.message)
    const matchesSearch = logMsg.toLowerCase().includes(search.toLowerCase()) ||
      (log.sessionId && log.sessionId.toLowerCase().includes(search.toLowerCase()))
    const matchesLevel = levelFilter === "all" || log.level.toLowerCase() === levelFilter.toLowerCase()
    return matchesSearch && matchesLevel
  })

  const formatMessage = (message: any, index: number) => {
    const isExpanded = expandedLogs[index]
    const content = typeof message === 'object' ? JSON.stringify(message, null, 2) : String(message)
    const isLong = content.length > 200
    const displayContent = isLong && !isExpanded ? content.substring(0, 200) + '...' : content

    return (
      <div className="space-y-1">
        <pre className={cn(
          "text-[11px] font-mono leading-relaxed break-all whitespace-pre-wrap",
          logLevelColor(filteredLogs[index]?.level)
        )}>
          {displayContent}
        </pre>
        {isLong && (
          <button
            onClick={() => setExpandedLogs(prev => ({ ...prev, [index]: !prev[index] }))}
            className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-1"
          >
            {isExpanded ? <>Voir moins <ChevronUp className="h-3 w-3" /></> : <>Voir plus <ChevronDown className="h-3 w-3" /></>}
          </button>
        )}
      </div>
    )
  }

  const logLevelColor = (level: string) => {
    switch (level?.toLowerCase()) {
      case 'error': return 'text-destructive';
      case 'warn': return 'text-amber-500';
      case 'info': return 'text-blue-500';
      default: return 'text-foreground/80';
    }
  }

  return (
    <Card className="border-border bg-card">
      <CardHeader className="p-4 border-b">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-sm font-semibold">Logs Système</CardTitle>
            <Badge variant="secondary" className="text-[10px]">{logs.length}</Badge>
          </div>
          <div className="flex flex-1 items-center gap-2 max-w-md">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Filtrer les logs..."
                className="pl-8 h-8 text-xs"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-24 h-8 text-xs">
                <SelectValue placeholder="Niveau" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Avertissement</SelectItem>
                <SelectItem value="error">Erreur</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setIsAutoScroll(!isAutoScroll)}>
              {isAutoScroll ? <Square className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setLogs([])}>
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea ref={scrollRef} className="h-80 w-full bg-muted/10">
          <div className="p-4 space-y-3">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-64 text-muted-foreground/40">
                <Terminal className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-xs">Aucun log disponible</p>
              </div>
            ) : (
              filteredLogs.map((log, i) => (
                <div key={i} className="flex gap-3 text-[11px] font-mono border-l border-border pl-3">
                  <span className="text-muted-foreground/50 shrink-0 select-none w-8">{String(i + 1).padStart(3, '0')}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-muted-foreground font-bold">[{new Date().toLocaleTimeString([], { hour12: false })}]</span>
                      {log.sessionId && <span className="text-primary font-medium">{log.sessionId}</span>}
                    </div>
                    {formatMessage(log.message, i)}
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
