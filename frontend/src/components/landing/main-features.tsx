"use client"

import { motion } from "framer-motion"
import { Bot, FileText, Clock, Users, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChatPreview } from "@/components/landing/chat-preview"

const features = [
  {
    icon: Bot,
    title: "Human-like Touch",
    description: "Personnalisez votre Agent pour des conversations naturelles avec un langage simple et des emojis adaptés."
  },
  {
    icon: FileText,
    title: "Access chat logs",
    description: "Consultez l'historique complet des conversations pour ne manquer aucun détail important."
  },
  {
    icon: Clock,
    title: "Réponse instantanée",
    description: "Ne perdez plus de temps avec un temps de réponse de seulement 10 secondes pour chaque nouveau message."
  },
  {
    icon: Users,
    title: "Large audience",
    description: "Touchez plus de 2 milliards d'utilisateurs WhatsApp avec votre assistant disponible 24/7."
  }
]

export function MainFeatures() {
  return (
    <section className="py-24 px-4 bg-background overflow-hidden">
      <div className="container mx-auto max-w-6xl">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-4 tracking-tight">
            Fonctionnalités principales
          </h2>
        </motion.div>

        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left Column: Features List */}
          <div className="space-y-12">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: false }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
                className="flex gap-4 sm:gap-6"
              >
                <div className="shrink-0">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <feature.icon className="w-6 h-6" />
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-foreground mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
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
            
            <ChatPreview />
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
