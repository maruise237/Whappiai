"use client"

import { motion } from "framer-motion"
import { MessageSquare, Calendar, Users, TrendingUp, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"

const benefits = [
  {
    icon: MessageSquare,
    title: "Répond à vos clients en 10 secondes",
    description: "Ne laissez plus vos prospects en attente. Notre IA répond instantanément, 24h/24 et 7j/7."
  },
  {
    icon: Calendar,
    title: "Qualifie et prend des rendez-vous",
    description: "Automatisez la qualification de vos leads et la prise de rendez-vous directement via WhatsApp."
  },
  {
    icon: Users,
    title: "Gère des milliers de conversations",
    description: "Gérez plusieurs conversations simultanément sans jamais compromettre la qualité du service."
  },
  {
    icon: TrendingUp,
    title: "Augmente vos conversions",
    description: "Transformez plus de prospects en clients grâce à des réponses instantanées et personnalisées."
  }
]

export function ValueProposition() {
  return (
    <section className="py-24 px-4 bg-zinc-950 relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-green-500/5 blur-[100px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-green-500/5 blur-[100px] rounded-full" />
      </div>

      <div className="container mx-auto max-w-6xl relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-6 tracking-tight max-w-4xl mx-auto leading-tight">
            Et si on vous disait que vous pouviez avoir un assistant virtuel qui...
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
              className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl hover:bg-zinc-900 hover:border-green-500/30 transition-all duration-300 group"
            >
              <div className="flex flex-col items-center text-center">
                <div className="w-12 h-12 mb-6 text-green-500 group-hover:scale-110 transition-transform duration-300">
                  <benefit.icon className="w-full h-full" strokeWidth={1.5} />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {benefit.title}
                </h3>
                <p className="text-zinc-400 leading-relaxed">
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
          <p className="text-green-500 font-medium mb-8 text-lg">
            ...tout cela pendant que vous vous concentrez sur l'essentiel ?
          </p>
          <Button 
            asChild
            size="lg"
            className="bg-green-600 hover:bg-green-500 text-white rounded-full px-8 py-6 text-lg shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all duration-300"
          >
            <Link href="/register">
              Découvrir comment
              <ArrowRight className="ml-2 w-5 h-5" />
            </Link>
          </Button>
        </motion.div>
      </div>
    </section>
  )
}
