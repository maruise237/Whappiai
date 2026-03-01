"use client"

import { motion, useInView } from "framer-motion"
import { useRef } from "react"
import Link from "next/link"
import Image from "next/image"

const footerLinks = {
  Produit: [
    { label: "Fonctionnalités", href: "#features" },
    { label: "Tarification", href: "#pricing" },
    { label: "Témoignages", href: "#testimonials" },
    { label: "Connexion", href: "/login" },
    { label: "Inscription", href: "/register" },
  ],
  Ressources: [
    { label: "Documentation", href: "/docs" },
    { label: "Guides", href: "/guides" },
    { label: "Blog", href: "/blog" },
    { label: "Communauté", href: "/community" },
  ],
  Entreprise: [
    { label: "À propos", href: "/about" },
    { label: "Contact", href: "/contact" },
    { label: "Conditions Générales", href: "/terms" },
    { label: "Confidentialité", href: "/privacy" },
    { label: "Mentions Légales", href: "/legal" },
  ],
}

export function Footer() {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin: "-50px" })

  return (
    <footer ref={ref} className="border-t border-border bg-background">
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
              <Image src="/icon.png" width={32} height={32} alt="Whappi Logo" className="object-contain" />
              <span className="font-semibold text-foreground">Whappi</span>
            </Link>
            <p className="text-sm text-muted-foreground mb-4">Enterprise-grade WhatsApp automation powered by AI.</p>
            {/* System Status */}
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-muted/20 border border-border">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">All systems operational</span>
            </div>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h4 className="text-sm font-semibold text-foreground mb-4">{title}</h4>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.href + link.label}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                      {link.label}
                    </Link>
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
          <p className="text-sm text-muted-foreground">&copy; {new Date().getFullYear()} Whappi, Inc. All rights reserved.</p>
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
