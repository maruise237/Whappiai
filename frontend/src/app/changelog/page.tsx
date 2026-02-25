"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function ChangelogPage() {
  const changelog = [
    {
      version: "v1.2.0",
      date: "15 Février 2026",
      title: "Gestion avancée des médias & Webhooks V2",
      type: "major",
      changes: [
        "Support complet pour l'envoi de vidéos, audios et documents",
        "Nouveau système de webhooks avec signature HMAC pour plus de sécurité",
        "Amélioration des performances de l'API (temps de réponse réduit de 30%)",
        "Correction d'un bug lors de la déconnexion simultanée de plusieurs sessions"
      ]
    },
    {
      version: "v1.1.5",
      date: "01 Février 2026",
      title: "Corrections mineures et optimisation",
      type: "patch",
      changes: [
        "Optimisation de la consommation mémoire du serveur",
        "Mise à jour des dépendances de sécurité",
        "Nouveau endpoint pour vérifier le statut d'un numéro"
      ]
    },
    {
      version: "v1.1.0",
      date: "15 Janvier 2026",
      title: "Support Multi-Sessions",
      type: "minor",
      changes: [
        "Lancement officiel du support multi-sessions",
        "Dashboard administrateur refondu",
        "Ajout de la documentation API Swagger"
      ]
    },
    {
      version: "v1.0.0",
      date: "01 Janvier 2026",
      title: "Lancement Initial",
      type: "major",
      changes: [
        "Lancement public de Whappi",
        "API REST complète pour l'envoi de messages texte",
        "Authentification via Token Bearer",
        "Support Docker initial"
      ]
    }
  ]

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <section className="pt-24 lg:pt-32 pb-12 lg:pb-20 px-4">
        <div className="container mx-auto text-center max-w-4xl">
          <Badge variant="outline" className="mb-6 py-1 px-4 border-primary/20 bg-primary/5 text-primary">
            Mises à jour
          </Badge>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-6">
            Journal des <span className="text-primary">modifications</span>
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Suivez l'évolution de Whappi et découvrez les dernières fonctionnalités ajoutées.
          </p>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4 max-w-3xl">
          <div className="space-y-12">
            {changelog.map((release, i) => (
              <div key={i} className="relative pl-8 md:pl-0">
                <div className="md:grid md:grid-cols-[200px_1fr] gap-8">
                  <div className="hidden md:block text-right pt-2">
                    <div className="font-semibold text-primary">{release.version}</div>
                    <div className="text-sm text-muted-foreground">{release.date}</div>
                  </div>
                  
                  <div className="relative border-l border-primary/20 pl-8 pb-12 last:pb-0">
                    <div className="absolute -left-[5px] top-2 w-2.5 h-2.5 rounded-full bg-primary ring-4 ring-background" />
                    
                    <div className="md:hidden mb-2">
                      <span className="font-semibold text-primary mr-2">{release.version}</span>
                      <span className="text-sm text-muted-foreground">{release.date}</span>
                    </div>

                    <h3 className="text-xl font-bold mb-2">{release.title}</h3>
                    <div className="mb-4">
                      {release.type === 'major' && <Badge>Majeur</Badge>}
                      {release.type === 'minor' && <Badge variant="secondary">Mineur</Badge>}
                      {release.type === 'patch' && <Badge variant="outline">Patch</Badge>}
                    </div>
                    
                    <ul className="list-disc list-outside ml-4 space-y-2 text-muted-foreground">
                      {release.changes.map((change, j) => (
                        <li key={j}>{change}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  )
}
