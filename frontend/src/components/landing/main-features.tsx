"use client"

import { useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bot, ShieldCheck, Headphones, Calendar, ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChatPreview } from "@/components/landing/chat-preview"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

const features = [
  {
    icon: Bot,
    title: "Réponses Automatiques",
    description: "Accueillez chaque nouvel utilisateur instantanément avec des messages personnalisés et engageants.",
    href: "/features/auto-reply",
    details: [
      "Configurez des messages de bienvenue personnalisés.",
      "Gérez les absences et les horaires d'ouverture.",
      "Utilisez des variables dynamiques (nom, date, etc.).",
      "Intégration facile avec vos outils CRM existants."
    ],
    cta: "Essayer l'automatisation"
  },
  {
    icon: ShieldCheck,
    title: "Modération Intelligente",
    description: "Protégez votre communauté en filtrant automatiquement les spams et contenus indésirables.",
    href: "/features/moderation",
    details: [
      "Détection et suppression automatique des liens de spam.",
      "Filtrage des contenus inappropriés et haineux.",
      "Avertissements automatiques aux utilisateurs.",
      "Rapports d'activité détaillés pour les administrateurs."
    ],
    cta: "Activer la modération"
  },
  {
    icon: Headphones,
    title: "Support Client 24/7",
    description: "Répondez aux questions fréquentes à toute heure sans intervention humaine.",
    href: "/features/support",
    details: [
      "Base de connaissances intégrée pour les réponses fréquentes.",
      "Escalade vers un agent humain si nécessaire.",
      "Support multilingue automatique.",
      "Analyse des sentiments des clients."
    ],
    cta: "Améliorer votre support"
  },
  {
    icon: Calendar,
    title: "Réservations & Planning",
    description: "Gérez les prises de rendez-vous directement depuis WhatsApp, sans quitter la conversation.",
    href: "/features/scheduling",
    details: [
      "Synchronisation avec Google Calendar et Outlook.",
      "Proposez des créneaux disponibles en temps réel.",
      "Rappels automatiques de rendez-vous.",
      "Gestion des annulations et reports."
    ],
    cta: "Configurer le planning"
  }
]

export function MainFeatures() {
  const [activeFeature, setActiveFeature] = useState(0)

  return (
    <section id="features" className="py-12 lg:py-24 px-4 bg-background overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.6 }}
          className="text-center mb-8 lg:mb-16"
        >
          <h2 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground mb-4 tracking-tight">
            Fonctionnalités principales
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Features List */}
          <div className="space-y-6">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className={`relative group rounded-2xl p-6 transition-all duration-300 cursor-pointer border ${
                  activeFeature === index 
                    ? "bg-primary/5 border-primary/50 shadow-[0_0_20px_rgba(16,185,129,0.15)]" 
                    : "bg-card/50 border-transparent hover:bg-card hover:border-border/50"
                }`}
                onClick={() => setActiveFeature(index)}
              >
                {/* Active Indicator Line */}
                {activeFeature === index && (
                  <motion.div
                    layoutId="activeFeatureLine"
                    className="absolute left-0 top-6 bottom-6 w-1 bg-primary rounded-r-full"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                  />
                )}

                <div className="flex gap-4 sm:gap-6 items-start">
                  <div className="shrink-0 relative">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors duration-300 ${
                      activeFeature === index ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary"
                    }`}>
                      <feature.icon className="w-6 h-6" />
                    </div>
                    {/* Icon Glow */}
                    {activeFeature === index && (
                      <div className="absolute inset-0 bg-primary/40 blur-xl rounded-full -z-10 animate-pulse" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start">
                        <h3 className={`text-xl font-bold mb-2 transition-colors duration-300 ${
                        activeFeature === index ? "text-primary" : "text-foreground"
                        }`}>
                        {feature.title}
                        </h3>
                    </div>
                    <p className="text-muted-foreground leading-relaxed text-sm sm:text-base mb-3">
                      {feature.description}
                    </p>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button 
                            variant="link" 
                            className={`p-0 h-auto font-semibold group/btn ${activeFeature === index ? "text-primary" : "text-muted-foreground"}`}
                            onClick={(e) => e.stopPropagation()}
                        >
                            En savoir plus 
                            <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[600px] border-border/50 bg-background/95 backdrop-blur-xl">
                        <DialogHeader>
                          <div className="flex items-center gap-4 mb-4">
                             <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <feature.icon className="w-6 h-6" />
                             </div>
                             <DialogTitle className="text-2xl font-bold">{feature.title}</DialogTitle>
                          </div>
                          <DialogDescription className="text-base leading-relaxed">
                            {feature.description}
                          </DialogDescription>
                        </DialogHeader>
                        
                        <div className="grid gap-3 py-4">
                           <h4 className="font-semibold text-foreground mb-2">Ce que vous pouvez faire :</h4>
                           {feature.details?.map((detail, i) => (
                             <div key={i} className="flex items-start gap-3">
                                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                                <span className="text-muted-foreground">{detail}</span>
                             </div>
                           ))}
                        </div>

                        <div className="flex flex-col sm:flex-row justify-end gap-3 mt-4 pt-4 border-t border-border/50">
                            <Button variant="outline" asChild className="rounded-full">
                                <Link href="/contact">Parler à un expert</Link>
                            </Button>
                            <Button asChild className="rounded-full">
                                <Link href="/register">{feature.cta}</Link>
                            </Button>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Right Column: Phone Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, x: 20 }}
            whileInView={{ opacity: 1, scale: 1, x: 0 }}
            viewport={{ once: false }}
            transition={{ duration: 0.8 }}
            className="relative mx-auto lg:mr-0 lg:ml-auto w-full flex justify-center lg:justify-end"
          >
            {/* Background Glow */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-primary/20 rounded-full blur-[80px] -z-10" />
            
            <ChatPreview 
              onScenarioChange={setActiveFeature} 
              selectedIndex={activeFeature}
            />
          </motion.div>
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="flex justify-center mt-20"
        >
          <Button
            size="lg"
            className="rounded-full px-8 h-14 text-base font-semibold shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all hover:scale-105"
            asChild
          >
            <Link href="/register">
              Commencer gratuitement
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
