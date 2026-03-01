"use client"

import { motion, useInView } from "framer-motion"
import { useRef, useState } from "react"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ArrowRight, MessageCircle, ShieldCheck, Zap, Globe, Lock, CreditCard } from "lucide-react"

const faqData = [
  {
    question: "Est-ce que Whappi respecte les conditions d"utilisation de WhatsApp ?",
    answer: "Absolument. Whappi est conçu pour fonctionner en harmonie avec les protocoles de WhatsApp. Nous utilisons des navigateurs isolés et des empreintes numériques uniques pour chaque session, garantissant une sécurité maximale et minimisant les risques de blocage. Notre IA de modération aide également à prévenir le spam, ce qui protège la réputation de votre numéro.",
    icon: ShieldCheck
  },
  {
    question: "Puis-je utiliser mon propre numéro de téléphone ?",
    answer: "Oui, tout à fait ! Vous scannez simplement le QR code avec votre application WhatsApp existante (Business ou personnelle) pour lier votre compte. Aucune migration complexe n"est nécessaire, et vous conservez tout votre historique de conversations.",
    icon: MessageCircle
  },
  {
    question: "Faut-il des compétences techniques pour utiliser Whappi ?",
    answer: "Aucune compétence technique n"est requise. Notre interface est conçue pour être intuitive : si vous savez utiliser WhatsApp Web, vous saurez utiliser Whappi. La configuration de l"IA et des réponses automatiques se fait via un éditeur visuel simple.",
    icon: Zap
  },
  {
    question: "L"IA peut-elle gérer plusieurs langues ?",
    answer: "Oui, notre assistant IA est multilingue et peut comprendre et répondre dans plus de 95 langues instantanément. Il détecte automatiquement la langue de votre interlocuteur pour offrir une expérience fluide et naturelle.",
    icon: Globe
  },
  {
    question: "Mes données sont-elles sécurisées ?",
    answer: "La sécurité est notre priorité absolue. Vos données sont chiffrées de bout en bout. Nous ne stockons pas vos messages sur nos serveurs de manière permanente ; ils transitent uniquement pour être traités par l"IA. De plus, notre infrastructure est conforme aux normes RGPD.",
    icon: Lock
  },
  {
    question: "Puis-je annuler mon abonnement à tout moment ?",
    answer: "Oui, sans engagement. Vous pouvez annuler votre abonnement à tout moment depuis votre tableau de bord. L"accès continuera jusqu"à la fin de la période de facturation en cours.",
    icon: CreditCard
  }
]

export function FAQ() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })
  const [activeItem, setActiveItem] = useState<string | null>(null)

  return (
    <section ref={ref} className="py-24 relative overflow-hidden bg-gradient-to-b from-background to-secondary/20">
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-0 w-72 h-72 bg-primary/5 rounded-full blur-[100px]" />
        <div className="absolute bottom-1/4 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-[100px]" />
      </div>

      <div className="container px-4 mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="px-4 py-1.5 text-sm border-primary/20 bg-primary/5 text-primary mb-4 rounded-full">
              Support & Aide
            </Badge>
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
          >
            Questions Fréquentes
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-muted-foreground"
          >
            Tout ce que vous devez savoir pour démarrer avec Whappi.
            <br className="hidden sm:block" />
            Vous ne trouvez pas votre réponse ? Contactez notre support.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="max-w-3xl mx-auto"
        >
          <Accordion type="single" collapsible className="w-full space-y-4" onValueChange={(value) => setActiveItem(value)}>
            {faqData.map((item, index) => (
              <AccordionItem
                key={index}
                value={`item-${index}`}
                className={`border border-border/50 rounded-xl px-6 bg-card/50 backdrop-blur-sm transition-all duration-300 ${
                  activeItem === `item-${index}`
                    ? "border-primary/50 shadow-[0_0_30px_-10px_rgba(var(--primary),0.2)] bg-card"
                    : "hover:border-primary/20 hover:bg-card/80"
                }`}
              >
                <AccordionTrigger className="hover:no-underline py-6 text-left">
                  <div className="flex items-center gap-4">
                    <div className={`p-2 rounded-lg transition-colors duration-300 ${
                      activeItem === `item-${index}` ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                    }`}>
                      <item.icon className="w-5 h-5" />
                    </div>
                    <span className={`text-lg font-medium transition-colors ${
                      activeItem === `item-${index}` ? "text-foreground" : "text-foreground/80"
                    }`}>
                      {item.question}
                    </span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground text-base leading-relaxed pb-6 pl-[3.25rem]">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5, delay: 0.5 }}
          className="mt-16 text-center"
        >
          <div className="inline-flex flex-col md:flex-row items-center gap-4 md:gap-2 p-4 md:p-1 bg-muted/50 rounded-2xl md:rounded-full border border-border mx-auto">
            <div className="flex -space-x-2 px-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="w-8 h-8 rounded-full border-2 border-background bg-muted flex items-center justify-center text-[10px] font-bold text-muted-foreground overflow-hidden">
                   <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="Support Agent" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
            <span className="text-sm font-medium text-center md:text-left md:mr-4">Notre équipe est là pour vous aider</span>
            <Button size="sm" className="rounded-full w-full md:w-auto" asChild>
              <Link href="/contact">
                Contacter le support <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
