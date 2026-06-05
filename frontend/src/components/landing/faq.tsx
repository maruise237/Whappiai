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
import { ArrowRight, MessageCircle, ShieldCheck, Zap, Users, Lock, CreditCard } from "lucide-react"

const faqData = [
  {
    question: "Est-ce que mon numéro WhatsApp peut être bloqué ?",
    answer: "Whappi fonctionne comme une session WhatsApp Web via QR code. Comme tout outil non officiel, le risque zéro n'existe pas. Nous recommandons un numéro dédié au bot, un comportement raisonnable et une configuration anti-spam stricte pour réduire le risque.",
    icon: ShieldCheck
  },
  {
    question: "Dois-je utiliser mon numéro personnel ?",
    answer: "Non. Pour un groupe sérieux, le mieux est d'utiliser un numéro secondaire dédié à Whappi. Vous gardez votre numéro personnel tranquille, et le groupe voit clairement le bot comme un co-admin.",
    icon: MessageCircle
  },
  {
    question: "Faut-il des compétences techniques pour utiliser Whappi ?",
    answer: "Non. Vous scannez un QR code, vous ajoutez le numéro Whappi dans votre groupe, puis vous le promouvez admin. Ensuite vous choisissez vos règles depuis le dashboard.",
    icon: Zap
  },
  {
    question: "Est-ce que Whappi peut gérer plusieurs groupes ?",
    answer: "Oui. Le plan Pro est pensé pour les admins qui gèrent plusieurs communautés. Vous pouvez suivre les règles, les logs, les rappels et l'activité depuis un seul dashboard.",
    icon: Users
  },
  {
    question: "Whappi lit-il tous les messages du groupe ?",
    answer: "Whappi analyse les messages nécessaires à la modération : liens, mots interdits, règles configurées et actions à journaliser. Le produit doit rester transparent : l'admin sait ce qui est surveillé et pourquoi.",
    icon: Lock
  },
  {
    question: "Comment payer depuis l'Afrique francophone ?",
    answer: "Les offres sont en FCFA. Le paiement Mobile Money est prioritaire, avec possibilité de démarrer par un encaissement direct pendant les premiers déploiements.",
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
        <div className="absolute top-1/4 left-0 w-72 h-72 bg-primary/5 rounded-full blur-[110px]" />
        <div className="absolute bottom-1/4 right-0 w-80 h-80 bg-primary/5 rounded-full blur-[110px]" />
      </div>

      <div className="container px-4 mx-auto relative z-10">
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
          >
            <Badge variant="outline" className="px-4 py-1.5 text-sm border-primary/20 bg-primary/5 text-primary mb-4 rounded-full">
              Objections fréquentes
            </Badge>
          </motion.div>
          
          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-foreground"
          >
            Les questions que les admins posent avant d&apos;essayer
          </motion.h2>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-lg text-muted-foreground"
          >
            Installation, sécurité, numéro dédié, paiement : les points à clarifier avant de confier un groupe à Whappi.
            <br className="hidden sm:block" />
            Vous ne trouvez pas votre réponse ? Demandez une démo WhatsApp.
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
                    ? "border-primary/50 shadow-sm bg-card" 
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
            <div className="px-3 text-sm font-semibold text-primary">
              FAQ terrain
            </div>
            <span className="text-sm font-medium text-center md:text-left md:mr-4">Une démo vaut mieux qu&apos;une longue promesse</span>
            <Button size="sm" className="rounded-full w-full md:w-auto" asChild>
              <Link href="/contact">
                Demander une démo <ArrowRight className="ml-2 w-4 h-4" />
              </Link>
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  )
}
