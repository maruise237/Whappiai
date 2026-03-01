import { notFound } from "next/navigation"
import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowLeft, Bot, ShieldCheck, Headphones, Calendar, ArrowRight, CheckCircle2 } from "lucide-react"

// Feature data mapping
const featuresData = {
  "auto-reply": {
    title: "Réponses Automatiques",
    icon: Bot,
    description: "Automatisez vos conversations WhatsApp pour ne jamais manquer un prospect.",
    details: [
      "Configurez des messages de bienvenue personnalisés.",
      "Gérez les absences et les horaires d"ouverture.",
      "Utilisez des variables dynamiques (nom, date, etc.).",
      "Intégration facile avec vos outils CRM existants."
    ],
    cta: "Essayer l"automatisation"
  },
  "moderation": {
    title: "Modération Intelligente",
    icon: ShieldCheck,
    description: "Gardez vos groupes propres et sécurisés grâce à notre IA de modération.",
    details: [
      "Détection et suppression automatique des liens de spam.",
      "Filtrage des contenus inappropriés et haineux.",
      "Avertissements automatiques aux utilisateurs.",
      "Rapports d"activité détaillés pour les administrateurs."
    ],
    cta: "Activer la modération"
  },
  "support": {
    title: "Support Client 24/7",
    icon: Headphones,
    description: "Offrez une assistance instantanée à vos clients, à tout moment.",
    details: [
      "Base de connaissances intégrée pour les réponses fréquentes.",
      "Escalade vers un agent humain si nécessaire.",
      "Support multilingue automatique.",
      "Analyse des sentiments des clients."
    ],
    cta: "Améliorer votre support"
  },
  "scheduling": {
    title: "Réservations & Planning",
    icon: Calendar,
    description: "Simplifiez la prise de rendez-vous directement dans WhatsApp.",
    details: [
      "Synchronisation avec Google Calendar et Outlook.",
      "Proposez des créneaux disponibles en temps réel.",
      "Rappels automatiques de rendez-vous.",
      "Gestion des annulations et reports."
    ],
    cta: "Configurer le planning"
  }
}

type FeatureKey = keyof typeof featuresData

export async function generateStaticParams() {
  return Object.keys(featuresData).map((slug) => ({
    slug: slug,
  }))
}

export default async function FeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const feature = featuresData[slug as FeatureKey]

  if (!feature) {
    notFound()
  }

  const Icon = feature.icon

  return (
    <main className="min-h-screen bg-background flex flex-col">
      <Navbar />

      <section className="flex-1 pt-32 pb-20 px-4">
        <div className="container mx-auto max-w-4xl">
          <Link
            href="/#features"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-8 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Retour aux fonctionnalités
          </Link>

          <div className="bg-card border border-border rounded-3xl p-8 md:p-12 shadow-xl">
            <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 text-primary">
              <Icon className="w-8 h-8" />
            </div>

            <h1 className="text-3xl md:text-5xl font-bold mb-6 text-foreground">
              {feature.title}
            </h1>

            <p className="text-xl text-muted-foreground mb-10 leading-relaxed max-w-2xl">
              {feature.description}
            </p>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              {feature.details.map((detail, index) => (
                <div key={index} className="flex items-start gap-3">
                  <CheckCircle2 className="w-6 h-6 text-primary shrink-0 mt-0.5" />
                  <span className="text-foreground/80">{detail}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row gap-4 pt-8 border-t border-border">
              <Button size="lg" className="rounded-full px-8" asChild>
                <Link href="/register">
                  {feature.cta}
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" className="rounded-full px-8" asChild>
                <Link href="/contact">
                  Parler à un expert
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </main>
  )
}
