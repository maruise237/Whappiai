"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import { Star, Quote } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

const testimonials = [
  {
    name: "Sarah M.",
    role: "Community Manager Senior",
    company: "TechCommunity",
    content: "Whappi a divisé mon temps de modération par 4. L'IA gère 80% des questions répétitives, me laissant me concentrer sur l'animation pure.",
    avatar: "/placeholder.svg",
    initials: "SM"
  },
  {
    name: "Thomas D.",
    role: "Head of Customer Support",
    company: "E-Shop France",
    content: "Enfin une solution qui comprend le contexte. Nos clients adorent les réponses instantanées et précises, même le week-end.",
    avatar: "/placeholder.svg",
    initials: "TD"
  },
  {
    name: "Julie R.",
    role: "Directrice Marketing",
    company: "EduGroup",
    content: "Les outils d'engagement ont boosté l'activité de nos groupes de 150% en un mois. L'anti-spam est d'une efficacité redoutable.",
    avatar: "/placeholder.svg",
    initials: "JR"
  }
]

export function Testimonials() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-100px" })

  return (
    <section id="testimonials" className="py-24 px-4 bg-muted/30">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2
            className="text-3xl sm:text-4xl font-bold text-foreground mb-4"
            style={{ fontFamily: "var(--font-instrument-sans)" }}
          >
            Ils font confiance à Whappi
          </h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Découvrez comment les leaders de communauté transforment leur gestion WhatsApp.
          </p>
        </motion.div>

        <motion.div
          ref={ref}
          initial="hidden"
          animate={isInView ? "visible" : "hidden"}
          variants={{
            hidden: {},
            visible: {
              transition: {
                staggerChildren: 0.1
              }
            }
          }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {testimonials.map((testimonial, index) => (
            <motion.div
              key={index}
              variants={{
                hidden: { opacity: 0, y: 20 },
                visible: {
                  opacity: 1,
                  y: 0,
                  transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] }
                }
              }}
              className="relative p-8 rounded-2xl bg-card border border-border hover:border-primary/50 transition-all duration-300 shadow-sm hover:shadow-md flex flex-col"
            >
              <div className="absolute top-8 right-8 text-primary/10">
                <Quote size={40} strokeWidth={1} />
              </div>

              <div className="flex gap-1 mb-6 text-primary">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} size={16} fill="currentColor" strokeWidth={0} />
                ))}
              </div>

              <blockquote className="text-foreground mb-8 flex-grow relative z-10 leading-relaxed">
                "{testimonial.content}"
              </blockquote>

              <div className="flex items-center gap-4 mt-auto">
                <Avatar className="h-12 w-12 border border-border">
                  <AvatarImage src={testimonial.avatar} alt={testimonial.name} />
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {testimonial.initials}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <div className="font-semibold text-foreground">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.role}</div>
                  <div className="text-xs text-primary font-medium mt-0.5">{testimonial.company}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  )
}
