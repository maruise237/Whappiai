"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { DocsContent } from "@/components/docs/docs-content"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export default function DocsPage() {
  const router = useRouter()

  React.useEffect(() => {
    // Documentation is now accessible to all authenticated users
  }, [router])

  const sections = [
    { id: "overview", label: "Vue d'ensemble" },
    { id: "authentication", label: "Authentification" },
    { id: "sessions", label: "Sessions" },
    { id: "messaging", label: "Messagerie" },
    { id: "webhooks", label: "Webhooks" },
    { id: "media", label: "Médias" },
    { id: "campaigns", label: "Campagnes" },
  ]

  return (
    <div className="flex flex-col lg:flex-row gap-12 animate-in fade-in duration-200 pb-20">
      {/* Sidebar Navigation */}
      <aside className="lg:w-80 shrink-0 lg:sticky lg:top-24 h-fit">
        <div className="bg-card/30 backdrop-blur-2xl p-8 rounded-lg border-2 border-primary/5 shadow-2xl space-y-8">
          <div className="space-y-6">
            <div className="flex items-center gap-3 px-4">
              <div className="w-2 h-6 bg-primary rounded-full" />
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/70">
                Documentation
              </h2>
            </div>
            <nav className="space-y-2">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center rounded-lg px-4 py-4 text-[11px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary transition-all duration-200 text-muted-foreground border-2 border-transparent hover:border-primary/10 active:scale-95 group"
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/20 mr-3 group-hover:bg-primary transition-colors duration-200" />
                  {section.label}
                </a>
              ))}
            </nav>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="mb-12 bg-card/30 backdrop-blur-2xl p-12 rounded-lg border-2 border-primary/5 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full -mr-32 -mt-32 blur-3xl" />
          <div className="relative z-10">
            <h1 className="text-4xl font-black tracking-tight lg:text-6xl mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent uppercase">
              Référence API
            </h1>
            <p className="text-[11px] font-black text-muted-foreground uppercase tracking-[0.2em] opacity-60 leading-relaxed max-w-2xl">
              Tout ce dont vous avez besoin pour intégrer Whappi dans vos applications de manière sécurisée et efficace.
            </p>
          </div>
        </div>
        
        <div className="prose prose-invert max-w-none">
          <DocsContent />
        </div>
      </main>
    </div>
  )
}
