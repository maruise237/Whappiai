import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { BookOpen } from "lucide-react"

export function GuideHero() {
  return (
    <section className="pt-32 pb-20 px-4">
      <div className="container mx-auto text-center max-w-4xl">
        <Badge variant="outline" className="mb-6 py-1 px-4 border-primary/20 bg-primary/5 text-primary">
          Centre d"apprentissage
        </Badge>
        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
          Guides & <span className="text-primary">Tutoriels</span>
        </h1>
        <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
          Maîtrisez l"API WhatsApp avec nos guides étape par étape, des bases aux intégrations avancées.
        </p>

        <div className="relative w-full max-w-lg mx-auto">
          <input
            type="text"
            placeholder="Rechercher un guide (ex: chatbot, nodejs, webhooks...)"
            className="w-full h-12 pl-4 pr-12 rounded-lg border border-input bg-background ring-offset-background
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
          <Button size="icon" className="absolute right-1 top-1 h-10 w-10 rounded-md">
            <BookOpen className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </section>
  )
}
