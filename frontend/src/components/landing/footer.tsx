"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import Link from "next/link"

const footerLinks = {
  Produit: [
    { label: "Fonctionnalités", href: "#features" },
    { label: "Tarification", href: "#pricing" },
    { label: "Témoignages", href: "#testimonials" },
    { label: "Connexion", href: "/login" },
    { label: "Inscription", href: "/register" },
  ],
  Ressources: [
    { label: "Documentation", href: "/dashboard/docs" },
    { label: "Guides", href: "#" },
    { label: "Blog", href: "#" },
    { label: "Communauté", href: "#" },
  ],
  Entreprise: [
    { label: "À propos", href: "#" },
    { label: "Contact", href: "mailto:contact@whappi.com" },
    { label: "Mentions Légales", href: "#" },
  ],
}

export function Footer() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <footer ref={ref} className="border-t border-zinc-800 bg-zinc-950">
      <div className="max-w-6xl mx-auto px-4 py-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={isInView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.6 }}
          className="grid grid-cols-2 md:grid-cols-5 gap-8"
        >
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm">W</span>
              </div>
              <span className="font-semibold text-foreground">Whappi</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">Plateforme d'automatisation WhatsApp avec IA.</p>
            {/* System Status */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-card border border-border">
              <span className="w-2 h-2 rounded-full bg-primary pulse-glow" />
              <span className="text-xs text-muted-foreground">Tous les systèmes opérationnels</span>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <a href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>

        {/* Bottom */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={isInView ? { opacity: 1 } : {}}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="mt-16 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4"
        >
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Whappi, Inc. Tous droits réservés.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Twitter
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              GitHub
            </a>
            <a href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Discord
            </a>
          </div>
        </motion.div>
      </div>
    </footer>
  )
}
