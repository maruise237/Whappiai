"use client"

import { motion } from "framer-motion"
import { ShieldCheck, MessageCircle, ListChecks, Zap, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const benefits = [
  {
    icon: ShieldCheck,
    title: "Coupe les liens et le spam",
    description: "Whappi détecte les liens non autorisés, supprime les messages indésirables et avertit le membre selon les règles de chaque groupe."
  },
  {
    icon: MessageCircle,
    title: "Accueille les nouveaux membres",
    description: "Chaque nouvel arrivant reçoit un message clair avec les règles, les liens utiles et le ton choisi par l'admin."
  },
  {
    icon: ListChecks,
    title: "Applique vos règles sans fatigue",
    description: "Mots interdits, avertissements, exclusions automatiques et logs d'actions : l'admin garde le contrôle sans surveiller le groupe toute la journée."
  },
  {
    icon: Zap,
    title: "Gère plusieurs groupes",
    description: "Un seul dashboard permet de piloter les paramètres, les messages programmés et l'activité récente de plusieurs communautés WhatsApp."
  }
]

export function ValueProposition() {
  return (
    <section className="py-24 px-4 bg-background relative overflow-hidden transition-colors duration-300">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-primary/5 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-normal" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-primary/5 blur-[100px] rounded-full mix-blend-multiply dark:mix-blend-normal" />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground mb-6 tracking-tight max-w-4xl mx-auto leading-tight">
            Arrêtez de passer vos journées à faire la police dans vos groupes
          </h2>
        </motion.div>

        <div className="grid md:grid-cols-2 gap-6 max-w-5xl mx-auto">
          {benefits.map((benefit, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: index * 0.1 }}
              className="bg-card border border-border p-8 rounded-2xl hover:bg-accent/50 hover:border-primary/30 transition-all duration-300 group shadow-sm hover:shadow-md"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 mb-6 text-primary group-hover:scale-110 transition-transform duration-300 bg-primary/10 rounded-xl flex items-center justify-center">
                  <benefit.icon className="w-6 h-6" strokeWidth={2} />
                </div>
                <h3 className="text-xl font-bold text-foreground mb-3">
                  {benefit.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {benefit.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="text-center mt-16"
        >
          <p className="text-primary font-medium mb-8 text-lg">
            Whappi fait le travail répétitif. Vous restez l'admin, avec plus de temps et moins de chaos.
          </p>
          <Button 
            asChild
            size="lg"
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-8 py-6 text-lg shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)] transition-all duration-300"
          >
            <Link href="/register">
              Découvrir Whappi
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
