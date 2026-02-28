import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Rocket, Terminal, Code } from "lucide-react"

export function GetStarted() {
  return (
    <section className="py-12 bg-muted/30">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl font-bold mb-8">Par où commencer ?</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Rocket className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              </div>
              <CardTitle>Démarrage rapide</CardTitle>
              <CardDescription>
                Envoyez votre premier message en moins de 5 minutes avec notre guide Quickstart.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-green-100 dark:bg-green-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Terminal className="w-6 h-6 text-green-600 dark:text-green-400" />
              </div>
              <CardTitle>Installation Serveur</CardTitle>
              <CardDescription>
                Déployez votre propre instance Whappi sur Docker ou VPS en quelques commandes.
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="hover:border-primary/50 transition-colors cursor-pointer group">
            <CardHeader>
              <div className="w-12 h-12 rounded-lg bg-purple-100 dark:bg-purple-900/20 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Code className="w-6 h-6 text-purple-600 dark:text-purple-400" />
              </div>
              <CardTitle>API Reference</CardTitle>
              <CardDescription>
                Documentation complète de tous les endpoints, paramètres et réponses de l'API.
              </CardDescription>
            </CardHeader>
          </Card>
        </div>
      </div>
    </section>
  )
}
