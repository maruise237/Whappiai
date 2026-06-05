"use client"

import { useState } from "react"
import { motion } from "framer-motion"
import { MessageCircle, ShieldCheck, Ban, Calendar, ArrowRight, CheckCircle2 } from "lucide-react"
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
    icon: MessageCircle,
    title: "Bienvenue dans le groupe",
    description: "Accueillez chaque nouveau membre avec un message personnalisé, les règles du groupe et les liens importants.",
    href: "/features/welcome",
    details: [
      "Message de bienvenue par groupe.",
      "Mention automatique du nouveau membre.",
      "Envoi uniquement dans le groupe.",
      "Modèles rapides pour église, école, business ou tontine."
    ],
    cta: "Configurer l'accueil"
  },
  {
    icon: ShieldCheck,
    title: "Anti-liens & anti-spam",
    description: "Bloquez les liens douteux, les pubs sauvages et les messages qui perturbent votre communauté.",
    href: "/features/moderation",
    details: [
      "Détection des liens non autorisés.",
      "Liste blanche de domaines utiles.",
      "Suppression automatique des messages interdits.",
      "Notification claire dans le groupe après action."
    ],
    cta: "Activer l'anti-spam"
  },
  {
    icon: Ban,
    title: "Avertissements + ban auto",
    description: "Définissez vos seuils : Whappi avertit, compte les violations et exclut automatiquement si nécessaire.",
    href: "/features/warnings",
    details: [
      "Compteur d'avertissements par membre.",
      "Seuil configurable par groupe.",
      "Exclusion automatique au nombre limite.",
      "Historique des actions pour vérifier chaque décision."
    ],
    cta: "Créer les règles"
  },
  {
    icon: Calendar,
    title: "Messages programmés",
    description: "Planifiez rappels, annonces et messages récurrents pour garder vos membres informés sans répétition manuelle.",
    href: "/features/scheduled-messages",
    details: [
      "Rappels de cotisation, cours, culte ou réunion.",
      "Programmation par jour et heure.",
      "Messages différents selon le groupe.",
      "Vue calendrier depuis le dashboard."
    ],
    cta: "Planifier un message"
  }
]

export function MainFeatures() {
  const [activeFeature, setActiveFeature] = useState(0)

  return (
    <section id="features" className="py-24 px-4 bg-background overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Ce que Whappi fait pour vos groupes
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
                    ? "bg-primary/5 border-primary/50 shadow-sm" 
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
                           {feature.details?.map((detail) => (
                             <div key={detail} className="flex items-start gap-3">
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
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[110%] bg-primary/10 rounded-full blur-[90px] -z-10" />
            
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
            className="rounded-full px-8 h-14 text-base font-semibold shadow-md shadow-primary/20 transition-all hover:scale-105"
            asChild
          >
            <Link href="/register">
              Tester sur mon groupe
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
