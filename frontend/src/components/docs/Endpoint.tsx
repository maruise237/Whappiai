import * as React from "react"
import { Badge } from "@/components/ui/badge"

export function Endpoint({ method, path, children }: { method: string, path: string, children: React.ReactNode }) {
  const methodColor = {
    GET: "bg-emerald-500/10 text-emerald-500 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]",
    POST: "bg-sky-500/10 text-sky-500 border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.1)]",
    PUT: "bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]",
    DELETE: "bg-red-500/10 text-red-500 border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]",
  }[method] || "bg-slate-500/10 text-slate-500 border-slate-500/20"

  return (
    <div className="mb-16 last:mb-0 bg-card/20 backdrop-blur-sm rounded-lg p-8 border-2 border-primary/5 hover:border-primary/10 transition-all duration-200 group">
      <div className="flex items-center gap-4 mb-6">
        <Badge variant="outline" className={`${methodColor} font-black px-3 py-1 rounded-lg text-[10px] tracking-[0.2em] border-2`}>
          {method}
        </Badge>
        <code className="text-[11px] font-black text-primary bg-primary/5 px-4 py-2 rounded-lg border-2 border-primary/5 shadow-inner tracking-tight">
          {path}
        </code>
      </div>
      <div className="space-y-4">
        {children}
      </div>
    </div>
  )
}
