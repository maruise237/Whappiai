"use client"

import * as React from "react"
import { 
  Terminal, 
  Trash2, 
  Search, 
  Play, 
  Square
} from "lucide-react"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useWebSocket } from "@/hooks/use-websocket"

interface LogEntry {
  type: string;
  level: string;
  message: string;
  sessionId: string;
  [key: string]: any;
}

export function LogViewer() {
  const [isAutoScroll, setIsAutoScroll] = React.useState(true)
  const [logs, setLogs] = React.useState<LogEntry[]>([])
  const [search, setSearch] = React.useState("")
  const [levelFilter, setLevelFilter] = React.useState("all")
  const scrollRef = React.useRef<HTMLDivElement>(null)
  
  const { lastMessage } = useWebSocket()

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
    const matchesSearch = log.message.toLowerCase().includes(search.toLowerCase()) || 
                         log.sessionId.toLowerCase().includes(search.toLowerCase())
    const matchesLevel = levelFilter === "all" || log.level.toLowerCase() === levelFilter.toLowerCase()
    return matchesSearch && matchesLevel
  })

  const clearLogs = () => setLogs([])

  return (
    <Card className="border-2 border-primary/10 overflow-hidden bg-[#0f172a] text-slate-200">
      <CardHeader className="bg-slate-900/50 border-b border-slate-800 pb-3">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-bold text-white">System Logs</CardTitle>
          </div>
          
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative flex-1 md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
              <Input 
                placeholder="Search logs..." 
                className="pl-9 bg-slate-950 border-slate-800 text-slate-200 placeholder:text-slate-600 h-9" 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-[110px] bg-slate-950 border-slate-800 h-9">
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 border-slate-800 text-slate-200">
                <SelectItem value="all">All Levels</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="warn">Warning</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>

            <div className="flex items-center gap-1 border border-slate-800 rounded-md p-0.5 bg-slate-950">
              <Button 
                variant="ghost" 
                size="icon" 
                className={`h-8 w-8 ${isAutoScroll ? 'text-primary bg-primary/10' : 'text-slate-500'}`}
                onClick={() => setIsAutoScroll(!isAutoScroll)}
                title={isAutoScroll ? "Disable Auto-scroll" : "Enable Auto-scroll"}
              >
                {isAutoScroll ? <Play className="h-4 w-4 fill-current" /> : <Square className="h-4 w-4 fill-current" />}
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 text-slate-500 hover:text-red-400"
                onClick={clearLogs}
                title="Clear Logs"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea ref={scrollRef} className="h-[450px] w-full font-mono text-[13px] leading-relaxed">
          <div className="p-4 space-y-1">
            {filteredLogs.length === 0 ? (
              <div className="text-slate-600 text-center py-8 italic">
                {logs.length === 0 ? "Waiting for logs..." : "No logs match your filters."}
              </div>
            ) : (
              filteredLogs.map((log, i) => (
                <div key={i} className={`flex gap-3 hover:bg-white/5 px-2 py-0.5 rounded transition-colors group ${log.level === 'ERROR' ? 'border-l-2 border-red-500/50' : ''}`}>
                  <span className="text-slate-500 shrink-0">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour12: false })}
                  </span>
                  <span className={`font-bold shrink-0 w-12 text-center rounded text-[10px] uppercase h-5 flex items-center justify-center mt-0.5 ${
                    log.level === 'INFO' ? 'text-emerald-400 bg-emerald-400/10' :
                    log.level === 'WARN' ? 'text-amber-400 bg-amber-400/10' :
                    log.level === 'ERROR' ? 'text-red-400 bg-red-400/10' :
                    'text-slate-400 bg-slate-400/10'
                  }`}>
                    {log.level}
                  </span>
                  <span className="text-sky-400 font-semibold shrink-0 cursor-pointer hover:underline truncate max-w-[80px]">
                    {log.sessionId}
                  </span>
                  <span className="text-slate-300 break-all">
                    {typeof log.message === 'object' ? JSON.stringify(log.message) : log.message}
                    {log.details && (
                      <span className="ml-2 text-slate-500 text-[11px] italic">
                        {typeof log.details === 'object' ? JSON.stringify(log.details) : log.details}
                      </span>
                    )}
                  </span>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
