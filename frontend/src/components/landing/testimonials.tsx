"use client"

import { useEffect, useRef, useState } from "react"
import { motion, useInView } from "framer-motion"
import { Star, Quote } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"

// --- Data Generation ---





const MARIUSE = {
  name: "Mariuse Kamta",
  role: "CEO & Founder",
  company: "Whappi",
  content: "Whappi existe pour aider les admins qui tiennent leurs groupes à bout de bras. Le but est simple : moins de bruit, plus de contrôle.",
  avatar: "/avatars/avatar1.webp",
  rating: 5
}

const CELINE = {
  name: "Celine M.",
  role: "Admin formation",
  company: "Douala Skills",
  content: "Avant, je répétais les règles tous les jours. Maintenant les nouveaux membres sont accueillis automatiquement et les pubs disparaissent vite.",
  avatar: "/avatars/avatar2.webp",
  rating: 5
}

// 3 African Profiles (Provided by User)
const AFRICAN_PROFILES = [
  {
    name: "Moussa Diop",
    role: "Admin business",
    company: "Dakar Entrepreneurs",
    content: "Notre groupe était envahi par des liens. Le système d'avertissements a calmé les abus sans créer de disputes entre admins.",
    avatar: "/avatars/avatar3.webp",
    rating: 5
  },
  {
    name: "Awa Traoré",
    role: "Responsable tontine",
    company: "Bamako Njangi",
    content: "Les rappels programmés nous évitent les oublis de cotisation. Le groupe reste sérieux et les messages importants ne se perdent plus.",
    avatar: "/avatars/avatar4.webp",
    rating: 5
  },
  {
    name: "Kofi Mensah",
    role: "Community manager",
    company: "Accra Francophone",
    content: "Je peux suivre plusieurs groupes depuis le même tableau de bord. C'est beaucoup plus simple que tout faire à la main.",
    avatar: "/avatars/avatar5.webp",
    rating: 4
  }
]

// 4 International Profiles (White/Western)
const INTERNATIONAL_PROFILES = [
  {
    name: "Thomas Dubois",
    role: "Admin diaspora",
    company: "Diaspora Camer",
    content: "Le groupe reste ouvert sans devenir incontrôlable. Les règles sont appliquées sans que je sois connecté toute la journée.",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    rating: 5
  },
  {
    name: "Sarah Jenkins",
    role: "Coordinatrice association",
    company: "Asso Relais",
    content: "On avait besoin d'un outil simple, pas d'un gros logiciel. Whappi fait juste ce qu'un admin attend.",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    rating: 5
  },
  {
    name: "Lukas Weber",
    role: "Organisateur",
    company: "Meetup Afrique",
    content: "Les annonces programmées ont réduit les oublis. Les membres savent quoi faire et quand se présenter.",
    avatar: "https://randomuser.me/api/portraits/men/22.jpg",
    rating: 4
  },
  {
    name: "Elena Rossi",
    role: "Admin communauté",
    company: "Femmes Business",
    content: "Le filtre anti-liens a changé l'ambiance du groupe. Les vraies discussions restent visibles.",
    avatar: "https://randomuser.me/api/portraits/women/24.jpg",
    rating: 5
  }
]

const ALL_TESTIMONIALS = [
  { id: 1, ...MARIUSE },
  { id: 2, ...CELINE },
  ...AFRICAN_PROFILES.map((p, i) => ({ id: 3 + i, ...p })),
  ...INTERNATIONAL_PROFILES.map((p, i) => ({ id: 6 + i, ...p }))
]


  const TestimonialCard = ({ testimonial, className }: { testimonial: typeof ALL_TESTIMONIALS[0], className?: string }) => (
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
   testimonials: typeof ALL_TESTIMONIALS,
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
         {[...testimonials, ...testimonials, ...testimonials, ...testimonials].map((t, i) => (
           <TestimonialCard key={`${t.id}-${i}`} testimonial={t} />
         ))}
       </motion.div>
     </div>
   )
 }

 export function Testimonials() {
   const containerRef = useRef<HTMLDivElement>(null)
   const isInView = useInView(containerRef, { once: true, margin: "-10%" })

   // Distribute testimonials
   // Ensure Mariuse (ALL_TESTIMONIALS[0]) is in EVERY column
   // We distribute the other 8 profiles around him

   // Column 1: Mariuse + Celine + Moussa + Thomas
   const chunk1 = [ALL_TESTIMONIALS[0], ALL_TESTIMONIALS[1], ALL_TESTIMONIALS[2], ALL_TESTIMONIALS[5]]

   // Column 2: Awa + Mariuse + Sarah + Lukas
   const chunk2 = [ALL_TESTIMONIALS[3], ALL_TESTIMONIALS[0], ALL_TESTIMONIALS[6], ALL_TESTIMONIALS[7]]

   // Column 3: Kofi + Elena + Mariuse + Celine (Repeating Celine to fill 4th slot nicely)
   const chunk3 = [ALL_TESTIMONIALS[4], ALL_TESTIMONIALS[8], ALL_TESTIMONIALS[0], ALL_TESTIMONIALS[1]]

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
              Retours du terrain
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold tracking-tight">
              Les admins veulent surtout retrouver le contrôle
            </h2>
            <p className="text-muted-foreground text-lg mt-4 max-w-2xl mx-auto">
              Des groupes plus propres, des règles appliquées et moins de temps perdu à supprimer des messages.
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
