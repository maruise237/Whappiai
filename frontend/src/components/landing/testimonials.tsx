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

// 3 African Profiles (Provided by User)
const AFRICAN_PROFILES = [
  {
    name: "Moussa Diop",
    role: "Directeur Commercial",
    company: "Dakar Immo",
    content: "L'outil idéal pour gérer nos leads immobiliers. Simple, rapide et efficace.",
    avatar: "https://i.ibb.co/zTL3Q6t9/Male-Professional-Headshot-East-African.jpg",
    rating: 5
  },
  {
    name: "Awa Traoré",
    role: "Fondatrice",
    company: "Bamako Tech",
    content: "Le service client est impeccable. Ils comprennent vraiment les besoins des entrepreneurs.",
    avatar: "https://i.ibb.co/kg0ppRdz/Create-your-professional-DP-and-add-it-to-your.jpg",
    rating: 5
  },
  {
    name: "Kofi Mensah",
    role: "Développeur Senior",
    company: "Accra Soft",
    content: "L'API est robuste et bien documentée. Une intégration sans douleur.",
    avatar: "https://i.ibb.co/QW6p9bH/t-l-chargement-2.jpg",
    rating: 4
  }
]

// 4 International Profiles (White/Western)
const INTERNATIONAL_PROFILES = [
  {
    name: "Thomas Dubois",
    role: "Product Manager",
    company: "Paris Solutions",
    content: "A game changer for our customer engagement strategy. Highly recommended.",
    avatar: "https://randomuser.me/api/portraits/men/32.jpg",
    rating: 5
  },
  {
    name: "Sarah Jenkins",
    role: "Marketing Lead",
    company: "London Agency",
    content: "Finally, a WhatsApp tool that just works. The automation features are superb.",
    avatar: "https://randomuser.me/api/portraits/women/44.jpg",
    rating: 5
  },
  {
    name: "Lukas Weber",
    role: "CTO",
    company: "Berlin Startups",
    content: "Great performance and reliability. We use it for all our notifications.",
    avatar: "https://randomuser.me/api/portraits/men/22.jpg",
    rating: 4
  },
  {
    name: "Elena Rossi",
    role: "Designer",
    company: "Milano Creative",
    content: "Beautiful interface and very easy to use. My team loves it.",
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
