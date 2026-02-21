"use client"

import * as React from "react"
import {
  Terminal,
  Trash2,
  Search,
  Play,
  Square,
  Info,
  ChevronDown,
  ChevronUp,
  Maximize2
} from "lucide-react"

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
import Prism from "prismjs"
import "prismjs/components/prism-json"
import "prismjs/themes/prism-tomorrow.css"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

  const toggleExpand = (index: number) => {
    setExpandedLogs(prev => ({
      ...prev,
      [index]: !prev[index]
    }))
  }

  // Handle new logs from WebSocket
  React.useEffect(() => {
    if (lastMessage && lastMessage.type === 'log') {
      setLogs(prev => [...prev, lastMessage].slice(-200)) // Keep last 200 logs
    }
  }, [lastMessage])

  // Auto-scroll logic
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

  const clearLogs = () => setLogs([])

  const formatMessage = (message: any, index: number) => {
    try {
      const isExpanded = expandedLogs[index]

      if (typeof message === 'object') {
        const formatted = JSON.stringify(message, null, 2)
        const isLong = formatted.length > 300
        const displayContent = isLong && !isExpanded ? formatted.substring(0, 300) + '...' : formatted

        return (
          <div className="relative group/msg">
            <pre className={cn(
              "mt-1 p-2 sm:p-3 rounded-lg bg-black/50 overflow-x-auto border border-white/5 font-mono text-[9px] sm:text-[10px]",
              !isExpanded && isLong && "max-h-[80px] sm:max-h-[100px] overflow-hidden"
            )}>
              <code
                className="language-json"
                dangerouslySetInnerHTML={{
                  __html: Prism.highlight(displayContent, Prism.languages.json, 'json')
                }}
              />
            </pre>
            {isLong && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleExpand(index)}
                className="mt-2 h-7 px-2.5 text-[10px] font-medium bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10 rounded flex items-center gap-1.5 transition-colors"
              >
                {isExpanded ? (
                  <>Collapse <ChevronUp className="w-3 h-3" /></>
                ) : (
                  <>Show full ({Math.round(formatted.length / 1024)} KB) <ChevronDown className="w-3 h-3" /></>
                )}
              </Button>
            )}
          </div>
        )
      }

      // Try to parse as JSON to see if it's a JSON string
      if (typeof message === 'string' && (message.startsWith('{') || message.startsWith('['))) {
        try {
          const parsed = JSON.parse(message)
          const formatted = JSON.stringify(parsed, null, 2)
          const isLong = formatted.length > 300
          const displayContent = isLong && !isExpanded ? formatted.substring(0, 300) + '...' : formatted

          return (
            <div className="relative group/msg">
              <pre className={cn(
                "mt-1 p-2 sm:p-3 rounded-lg bg-black/50 overflow-x-auto border border-white/5 font-mono text-[9px] sm:text-[10px]",
                !isExpanded && isLong && "max-h-[80px] sm:max-h-[100px] overflow-hidden"
              )}>
                <code
                  className="language-json"
                  dangerouslySetInnerHTML={{
                    __html: Prism.highlight(displayContent, Prism.languages.json, 'json')
                  }}
                />
              </pre>
              {isLong && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => toggleExpand(index)}
                  className="mt-2 h-7 px-2.5 text-[10px] font-medium bg-primary/5 hover:bg-primary/10 text-primary border border-primary/10 rounded flex items-center gap-1.5 transition-colors"
                >
                  {isExpanded ? (
                    <>Collapse <ChevronUp className="w-3 h-3" /></>
                  ) : (
                    <>Show full ({Math.round(formatted.length / 1024)} KB) <ChevronDown className="w-3 h-3" /></>
                  )}
                </Button>
              )}
            </div>
          )
        } catch (e) { /* Fallback to string handling */ }
      }

      const textMessage = String(message)
      const isLongText = textMessage.length > 300
      const displayText = isLongText && !isExpanded ? textMessage.substring(0, 300) + '...' : textMessage

      return (
        <div className="flex flex-col gap-1.5">
          <span className="text-slate-300 break-words whitespace-pre-wrap font-mono text-[10px] sm:text-[11px] leading-relaxed">
            {displayText}
          </span>
          {isLongText && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => toggleExpand(index)}
              className="w-fit h-7 px-2.5 text-[8px] sm:text-[9px] font-black uppercase tracking-widest bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 rounded-lg flex items-center gap-1.5 active:scale-95 transition-transform"
            >
              {isExpanded ? (
                <>Collapse <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>Show full <ChevronDown className="w-3 h-3" /></>
              )}
            </Button>
          )}
        </div>
      )
    } catch (e) {
      return <span className="text-slate-300 break-all text-[10px] sm:text-[11px]">{String(message)}</span>
    }
  }

  return (
    <Card className="border border-border overflow-hidden bg-card text-foreground log-viewer shadow-sm rounded-lg w-full">
      <CardHeader className="bg-muted/30 border-b border-border p-4 sm:p-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="p-2.5 sm:p-3 rounded-lg bg-primary/10 text-primary border border-primary/20 shadow-inner shrink-0">
              <Terminal className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <CardTitle className="text-base sm:text-lg font-semibold tracking-tight text-foreground">Live System Logs</CardTitle>
                <Badge variant="outline" className="bg-primary/5 text-primary border-primary/10 font-mono text-[9px] font-medium px-2 py-0.5 rounded shadow-sm">
                  {logs.length}
                </Badge>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground cursor-help hover:text-primary transition-colors duration-200 hidden sm:block" />
                  </TooltipTrigger>
                  <TooltipContent className="bg-popover border border-border p-3 shadow-xl rounded-md">
                    <div className="p-2 font-sans">
                      <strong className="text-primary font-semibold">Real-time Stream</strong><br />
                      <span className="text-[11px] text-muted-foreground">Monitors all incoming/outgoing messages and system events from the underlying WhatsApp provider.</span>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-sm" />
                <span className="text-[10px] font-medium uppercase tracking-wider text-emerald-500/80">Stream Active</span>
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 flex-1">
            <div className="relative w-full sm:flex-1 group">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary transition-colors" />
              <Input
                placeholder="Search logs..."
                className="pl-10 bg-muted/30 border-border text-foreground placeholder:text-muted-foreground/50 h-10 rounded-md focus-visible:ring-1 focus-visible:ring-primary/20 w-full font-medium text-xs transition-all"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <div className="flex items-center gap-2 sm:gap-3 w-full sm:w-auto">
              <Select value={levelFilter} onValueChange={setLevelFilter}>
                <SelectTrigger className="flex-1 sm:w-[130px] lg:w-[150px] bg-muted/30 border-border h-10 rounded-md text-xs font-medium px-3">
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent className="bg-popover border border-border rounded-md shadow-lg">
                  <SelectItem value="all" className="text-xs font-medium">All levels</SelectItem>
                  <SelectItem value="info" className="text-blue-500 text-xs font-medium">Info</SelectItem>
                  <SelectItem value="warn" className="text-amber-500 text-xs font-medium">Warn</SelectItem>
                  <SelectItem value="error" className="text-rose-500 text-xs font-medium">Error</SelectItem>
                  <SelectItem value="debug" className="text-purple-500 text-xs font-medium">Debug</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2 bg-muted/40 p-1.5 rounded-md border border-border sm:w-auto justify-center sm:justify-start shadow-inner shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "h-9 w-9 sm:h-10 sm:w-10 rounded-lg transition-all duration-200 active:scale-95",
                    isAutoScroll ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-slate-500 hover:text-slate-300 hover:bg-white/5"
                  )}
                  onClick={() => setIsAutoScroll(!isAutoScroll)}
                >
                  {isAutoScroll ? <Square className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" /> : <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4 fill-current" />}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 sm:h-10 sm:w-10 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-400/10 transition-all duration-200 active:scale-95"
                  onClick={clearLogs}
                >
                  <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="p-0">
        <ScrollArea ref={scrollRef} className="h-[350px] sm:h-[450px] w-full bg-card font-mono">
          <div className="p-3 sm:p-6 space-y-1.5 sm:space-y-2">
            {filteredLogs.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-[300px] sm:h-[350px] text-muted-foreground/40 space-y-4">
                <div className="p-5 rounded-lg bg-muted/20 border border-border">
                  <Terminal className="w-10 h-10 opacity-20" />
                </div>
                <p className="text-[10px] font-medium uppercase tracking-widest opacity-40 px-4 text-center">Waiting for system activity...</p>
              </div>
            ) : (
              filteredLogs.map((log, i) => (
                <div key={i} className="group flex items-start gap-2.5 sm:gap-4 text-[9px] sm:text-[11px] leading-relaxed py-1.5 sm:py-2 px-2 sm:px-4 rounded-lg hover:bg-white/[0.03] transition-all duration-200 border-l-2 sm:border-l-4 border-transparent hover:border-primary/50 overflow-hidden">
                  <span className="text-slate-600 shrink-0 select-none min-w-[30px] sm:min-w-[40px] font-mono opacity-50 text-[8px] sm:text-[10px] mt-0.5">{String(i + 1).padStart(3, '0')}</span>

                  <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-slate-500 shrink-0 font-bold select-none opacity-80 whitespace-nowrap">
                        [{new Date().toLocaleTimeString([], { hour12: false })}]
                      </span>
                      <span className={cn(
                        "font-semibold uppercase px-1.5 py-0.5 rounded text-[8px] tracking-wider shrink-0 min-w-[50px] text-center",
                        log.level === 'info' && "bg-blue-500/10 text-blue-500 border border-blue-500/20",
                        log.level === 'warn' && "bg-amber-500/10 text-amber-500 border border-amber-500/20",
                        log.level === 'error' && "bg-rose-500/10 text-rose-500 border border-rose-500/20",
                        log.level === 'debug' && "bg-purple-500/10 text-purple-500 border border-purple-500/20"
                      )}>
                        {log.level}
                      </span>
                      {log.sessionId && (
                        <span className="text-primary font-semibold uppercase tracking-tight shrink-0 px-2 py-0.5 bg-primary/5 rounded border border-primary/10 text-[8px]">
                          {log.sessionId}
                        </span>
                      )}
                    </div>
                    <div className="min-w-0">
                      {formatMessage(log.message, i)}
                    </div>
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
