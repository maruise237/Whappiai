import { DocsContent } from "@/components/docs/docs-content"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"

export default function DocsPage() {
  const sections = [
    { id: "overview", label: "Overview" },
    { id: "authentication", label: "Authentication" },
    { id: "sessions", label: "Sessions" },
    { id: "messaging", label: "Messaging" },
    { id: "webhooks", label: "Webhooks" },
    { id: "media", label: "Media" },
    { id: "campaigns", label: "Campaigns" },
  ]

  return (
    <div className="flex flex-col lg:flex-row gap-12">
      {/* Sidebar Navigation */}
      <aside className="lg:w-64 shrink-0 lg:sticky lg:top-24 h-fit">
        <div className="space-y-4">
          <div className="px-3 py-2">
            <h2 className="mb-2 px-4 text-lg font-semibold tracking-tight">
              Documentation
            </h2>
            <div className="space-y-1">
              {sections.map((section) => (
                <a
                  key={section.id}
                  href={`#${section.id}`}
                  className="flex items-center rounded-md px-4 py-2 text-sm font-medium hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                >
                  {section.label}
                </a>
              ))}
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-w-0">
        <div className="mb-8">
          <h1 className="text-4xl font-extrabold tracking-tight lg:text-5xl mb-4">
            API Reference
          </h1>
          <p className="text-xl text-muted-foreground">
            Everything you need to integrate Whappi into your applications.
          </p>
          <Separator className="my-8" />
        </div>
        
        <DocsContent />
      </main>
    </div>
  )
}
