"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { Star, Quote } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// --- Data Generation ---
const ROLES = ["CEO", "CTO", "Marketing Director", "Community Manager", "Product Owner", "Developer", "Support Lead"]
const COMPANIES = ["TechFlow", "DataSystems", "CloudNine", "GrowthHacker", "DevCorp", "SoftSolutions", "EcoTech"]
const NAMES = ["Alexandre", "Sarah", "Thomas", "Julie", "Kevin", "Laura", "David", "Emma", "Lucas", "Sophie"]
const CONTENTS = [
  "Whappi a révolutionné notre gestion client. L'IA est bluffante de précision.",
  "Le gain de temps est phénoménal. On a divisé le temps de réponse par 3.",
  "Intégration super simple, en 5 minutes tout était opérationnel. Bravo à l'équipe.",
  "La modération automatique nous a sauvés d'une vague de spam massive.",
  "Le support est réactif et à l'écoute. Une vraie relation de confiance.",
  "Enfin une API WhatsApp qui ne coûte pas un bras et qui fonctionne vraiment.",
  "Les webhooks sont ultra rapides, parfait pour nos automatisations.",
  "J'adore l'interface, c'est propre, moderne et intuitif.",
  "La fonctionnalité multi-agents est un game changer pour notre équipe support.",
  "On a pu scaler notre acquisition sans recruter 10 personnes au support.",
  "L'API est stable, la documentation est claire. Rien à redire.",
  "Le meilleur investissement SaaS de l'année pour notre agence.",
  "Les clients adorent la rapidité des réponses automatiques.",
  "Un outil indispensable pour tout business qui utilise WhatsApp.",
  "La gestion des templates est super fluide et bien pensée."
]

const generateTestimonials = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    name: `${NAMES[i % NAMES.length]} ${String.fromCharCode(65 + (i % 26))}.`,
    role: ROLES[i % ROLES.length],
    company: COMPANIES[i % COMPANIES.length],
    content: CONTENTS[i % CONTENTS.length],
    avatar: `https://i.pravatar.cc/150?u=${i + 10}`,
    rating: 5
  }))
}

const TESTIMONIALS = generateTestimonials(30) // Generate enough for 3 columns

const TestimonialCard = ({ testimonial, className }: { testimonial: typeof TESTIMONIALS[0], className?: string }) => (
  <div className={cn(
    "relative bg-card p-6 rounded-2xl border border-border shadow-sm mb-6 break-inside-avoid hover:shadow-md transition-shadow duration-300",
    className
  )}>
    <div className="flex items-center gap-1 mb-4 text-yellow-500">
      {[...Array(5)].map((_, i) => (
        <Star key={i} size={14} fill="currentColor" className="opacity-80" />
      ))}
    </div>
    <p className="text-muted-foreground text-sm leading-relaxed mb-6">
      "{testimonial.content}"
    </p>
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10 border border-border">
        <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
        <AvatarFallback>{testimonial.name[0]}</AvatarFallback>
      </Avatar>
      <div>
        <p className="text-sm font-semibold text-foreground">{testimonial.name}</p>
        <p className="text-xs text-muted-foreground">{testimonial.role} @ {testimonial.company}</p>
      </div>
    </div>
  </div>
)

const MarqueeColumn = ({ 
  testimonials, 
  duration = 40, 
  reverse = false,
  className 
}: { 
  testimonials: typeof TESTIMONIALS, 
  duration?: number, 
  reverse?: boolean,
  className?: string
}) => {
  return (
    <div className={cn("relative flex flex-col overflow-hidden h-[800px]", className)}>
      <motion.div
        initial={{ y: reverse ? "-50%" : "0%" }}
        animate={{ y: reverse ? "0%" : "-50%" }}
        transition={{
          duration: duration,
          repeat: Infinity,
          ease: "linear",
          repeatType: "loop"
        }}
        className="flex flex-col pb-6"
      >
        {[...testimonials, ...testimonials].map((t, i) => (
          <TestimonialCard key={`${t.id}-${i}`} testimonial={t} />
        ))}
      </motion.div>
    </div>
  )
}

export function Testimonials() {
  const containerRef = useRef<HTMLDivElement>(null)
  const isInView = useInView(containerRef, { once: true, margin: "-10%" })

  // Split testimonials into 3 chunks
  const chunk1 = TESTIMONIALS.slice(0, 10)
  const chunk2 = TESTIMONIALS.slice(10, 20)
  const chunk3 = TESTIMONIALS.slice(20, 30)

  return (
    <section 
      ref={containerRef} 
      className="py-24 relative overflow-hidden bg-background"
      aria-label="Témoignages clients"
    >
      <div className="container px-4 mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-16 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={isInView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.6 }}
          >
            <Badge variant="outline" className="mb-4 px-4 py-1 rounded-full bg-primary/5 text-primary border-primary/20">
              Wall of Love
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Ils adorent <span className="text-primary">Whappi</span>
            </h2>
            <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
              Découvrez pourquoi plus de 500 entreprises nous font confiance pour leur automatisation WhatsApp.
            </p>
          </motion.div>
        </div>

        {/* Marquee Grid */}
        <div className="relative h-[600px] overflow-hidden">
          {/* Gradient Masks */}
          <div className="absolute top-0 left-0 right-0 h-32 bg-gradient-to-b from-background to-transparent z-20 pointer-events-none" />
          <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-background to-transparent z-20 pointer-events-none" />

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 h-full">
            <MarqueeColumn testimonials={chunk1} duration={45} />
            <div className="hidden md:block">
               <MarqueeColumn testimonials={chunk2} duration={55} reverse />
            </div>
            <div className="hidden lg:block">
               <MarqueeColumn testimonials={chunk3} duration={50} />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
