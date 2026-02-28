import { Server, Code, Video } from "lucide-react"
import Link from "next/link"

export function GuideCategories() {
  return (
    <section className="py-20">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold mb-12 text-center">Guides par catégorie</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          <div className="space-y-4">
            <h3 className="font-semibold text-xl flex items-center gap-2">
              <Server className="w-5 h-5 text-primary" /> Infrastructure
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center
                  justify-between group">
                  <span>Configuration Docker Compose</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded opacity-0 group-hover:opacity-100
                    transition-opacity">5 min</span>
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center
                  justify-between group">
                  <span>Gestion des sessions multiples</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded opacity-0 group-hover:opacity-100
                    transition-opacity">8 min</span>
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center
                  justify-between group">
                  <span>Sécuriser votre instance (SSL/Auth)</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded opacity-0 group-hover:opacity-100
                    transition-opacity">10 min</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-xl flex items-center gap-2">
              <Code className="w-5 h-5 text-primary" /> Développement
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center
                  justify-between group">
                  <span>Créer un chatbot simple (Node.js)</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded opacity-0 group-hover:opacity-100
                    transition-opacity">15 min</span>
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center
                  justify-between group">
                  <span>Webhooks: Recevoir des messages</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded opacity-0 group-hover:opacity-100
                    transition-opacity">7 min</span>
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center
                  justify-between group">
                  <span>Envoyer des médias et fichiers</span>
                  <span className="text-xs bg-muted px-2 py-1 rounded opacity-0 group-hover:opacity-100
                    transition-opacity">4 min</span>
                </Link>
              </li>
            </ul>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold text-xl flex items-center gap-2">
              <Video className="w-5 h-5 text-primary" /> Tutoriels Vidéo
            </h3>
            <ul className="space-y-2">
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center
                  justify-between group">
                  <span>Whappi Crash Course 2026</span>
                  <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded">
                    Youtube
                  </span>
                </Link>
              </li>
              <li>
                <Link href="#" className="text-muted-foreground hover:text-primary transition-colors flex items-center
                  justify-between group">
                  <span>Intégration n8n & Whappi</span>
                  <span className="text-xs bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2 py-1 rounded">
                    Youtube
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}
