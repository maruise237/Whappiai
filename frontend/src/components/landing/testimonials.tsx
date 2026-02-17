"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { Star, Quote } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// --- Data Generation ---
const ROLES = ["Directeur Marketing", "Fondateur", "Service Client", "Développeur", "Community Manager", "Commercial", "Responsable Tech"]
const COMPANIES = ["AfriTech Solutions", "Dakar Digital", "Abidjan Startups", "TechCamer", "Lagos Ventures", "Kinshasa Connect", "Bamako Innovations"]
const NAMES = ["Amara", "Kwame", "Chioma", "Tunde", "Zainab", "Idrissa", "Fatou", "Kofi", "Nia", "Malik", "Awa", "Bakary", "Jelani", "Zola", "Oumar"]
const LAST_NAMES = ["Diop", "Kone", "Sow", "Diallo", "Traore", "Kamara", "Mensah", "Okafor", "Ndiaye", "Cisse"]

const HUMAN_COMMENTS = [
  "Franchement, c'est du lourd. J'ai configuré mon bot en 10 minutes et ça tourne nickel.",
  "Le support est incroyable. J'avais un petit souci de webhook, ils m'ont réglé ça en deux temps trois mouvements.",
  "Je ne pensais pas que ce serait aussi simple. L'interface est super propre, ça change des usines à gaz habituelles.",
  "Pour le prix, c'est imbattable. On a économisé une fortune en passant chez Whappi.",
  "L'API est super stable, on envoie des milliers de messages par jour sans aucun bug.",
  "Enfin une solution WhatsApp qui pense aux développeurs ! La doc est claire et les exemples fonctionnent.",
  "J'adore la fonction multi-agents, mon équipe gère les clients beaucoup plus rapidement maintenant.",
  "C'est exactement ce qu'il nous fallait pour automatiser nos relances clients. Merci la team !",
  "Une vraie pépite. Je recommande à tous mes collègues entrepreneurs.",
  "Le système de templates est top, plus besoin de copier-coller des messages toute la journée.",
  "On a vu une vraie différence sur notre taux de conversion depuis qu'on utilise Whappi.",
  "Simple, efficace, pas cher. Que demander de plus ?",
  "J'étais sceptique au début, mais après la période d'essai, je suis conquis.",
  "L'intégration avec notre CRM s'est faite sans douleur. Bravo pour le boulot.",
  "Le dashboard est super intuitif, même pour ceux qui ne sont pas techniques.",
  "La mise en place a pris moins d'une heure, c'est impressionnant.",
  "Nos clients apprécient vraiment la réactivité de notre bot WhatsApp.",
  "Le rapport qualité-prix est imbattable sur le marché actuel.",
  "Les fonctionnalités de diffusion sont parfaites pour nos campagnes marketing.",
  "Aucune coupure de service depuis 6 mois, une fiabilité à toute épreuve.",
  "L'équipe technique est très compétente et aide vraiment à l'intégration.",
  "L'interface utilisateur est moderne et très agréable à utiliser au quotidien.",
  "Whappi nous a permis de centraliser tous nos échanges WhatsApp.",
  "La gestion des contacts est fluide et l'import/export fonctionne bien.",
  "Les réponses automatiques sont très flexibles et personnalisables.",
  "C'est l'outil qu'il manquait à notre stack technique.",
  "La documentation API est l'une des meilleures que j'ai vues.",
  "Le support multi-langues est un vrai plus pour notre activité internationale.",
  "Les statistiques nous aident à mieux comprendre nos interactions clients."
]

// Specific Profiles
const MARIUSE = {
  name: "Mariuse Kamta",
  role: "CEO & Founder",
  company: "Whappi",
  content: "Notre mission est de rendre l'automatisation WhatsApp accessible à toutes les entreprises africaines, sans compromis sur la qualité.",
  avatar: "https://i.ibb.co/1tkgLkgd/Gemini-Generated-Image-1ykssf1ykssf1dyks.png",
  rating: 5
}

const CELINE = {
  name: "Celine M.",
  role: "Responsable Service Client",
  company: "InnovCorp",
  content: "Whappi a transformé notre façon de gérer le support. Nos clients sont ravis de la réactivité, et mon équipe est moins stressée.",
  avatar: "https://i.ibb.co/hx78Kb9z/Annotation-2026-02-16-211337.png",
  rating: 5
}

const OTHER_AVATARS = [
  "https://i.ibb.co/zTL3Q6t9/Male-Professional-Headshot-East-African.jpg",
  "https://i.ibb.co/kg0ppRdz/Create-your-professional-DP-and-add-it-to-your.jpg",
  "https://i.ibb.co/QW6p9bH/t-l-chargement-2.jpg"
]

const generateTestimonials = (count: number) => {
  const testimonials = []
  
  // Generate random profiles
  for (let i = 0; i < count; i++) {
    const firstName = NAMES[i % NAMES.length]
    const lastName = LAST_NAMES[i % LAST_NAMES.length]
    testimonials.push({
      id: i,
      name: `${firstName} ${lastName}`,
      role: ROLES[i % ROLES.length],
      company: COMPANIES[i % COMPANIES.length],
      content: HUMAN_COMMENTS[i % HUMAN_COMMENTS.length],
      avatar: OTHER_AVATARS[i % OTHER_AVATARS.length],
      rating: Math.random() > 0.3 ? 5 : 4
    })
  }
  
  return testimonials
}

const GENERIC_TESTIMONIALS = generateTestimonials(30)

// Helper to inject Mariuse/Celine into chunks
const createChunk = (baseData: typeof GENERIC_TESTIMONIALS, includeMariuse: boolean, includeCeline: boolean, offset: number) => {
    let chunk = [...baseData]
    if (includeCeline) {
        chunk.splice(2, 0, { id: 998, ...CELINE }) // Insert Celine at index 2
    }
    if (includeMariuse) {
        chunk.splice(offset, 0, { id: 999, ...MARIUSE }) // Insert Mariuse at specific offset
    }
    return chunk
}
 
 const TestimonialCard = ({ testimonial, className }: { testimonial: typeof GENERIC_TESTIMONIALS[0], className?: string }) => (
   <div className={cn(
     "relative bg-card p-6 rounded-2xl border border-border shadow-sm mb-6 break-inside-avoid hover:shadow-md transition-shadow duration-300",
     className
   )}>
     <div className="flex items-center gap-1 mb-4 text-yellow-500">
       {[...Array(5)].map((_, i) => (
         <Star 
           key={i} 
           size={14} 
           fill={i < testimonial.rating ? "currentColor" : "none"} 
           className={cn("opacity-80", i >= testimonial.rating && "text-muted-foreground opacity-30")} 
         />
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
   testimonials: typeof GENERIC_TESTIMONIALS, 
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
 
   // Distribute testimonials and inject key profiles
   // Chunk 1: Mariuse at top (index 0)
   const chunk1 = createChunk(GENERIC_TESTIMONIALS.slice(0, 10), true, true, 0)
   
   // Chunk 2: Mariuse in middle (index 5)
   const chunk2 = createChunk(GENERIC_TESTIMONIALS.slice(10, 20), true, false, 5)
   
   // Chunk 3: Mariuse near end (index 8)
   const chunk3 = createChunk(GENERIC_TESTIMONIALS.slice(20, 30), true, false, 8)
 
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
