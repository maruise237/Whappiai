import { SmoothScroll } from "@/components/landing/smooth-scroll"
import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { LogoMarquee } from "@/components/landing/logo-marquee"
import { BentoGrid } from "@/components/landing/bento-grid"
import { Testimonials } from "@/components/landing/testimonials"
import { Pricing } from "@/components/landing/pricing"
import { FinalCTA } from "@/components/landing/final-cta"
import { Footer } from "@/components/landing/footer"
import { Metadata } from "next"

export const metadata: Metadata = {
  title: "Whappi | Automatisation WhatsApp & Modération IA",
  description: "Boostez l'engagement de votre communauté WhatsApp avec notre IA de support et nos outils de modération anti-spam. Essai gratuit.",
  openGraph: {
    title: "Whappi - L'IA pour vos groupes WhatsApp",
    description: "Automatisez votre support client et modérez vos communautés WhatsApp avec une IA intelligente.",
    type: "website",
    locale: "fr_FR",
    siteName: "Whappi",
  },
  keywords: ["WhatsApp API", "Chatbot WhatsApp", "Modération WhatsApp", "Support Client IA", "Automatisation WhatsApp"],
}

export default function Home() {
  return (
    <SmoothScroll>
      <main className="min-h-screen bg-background dark">
        <Navbar />
        <Hero />
        <LogoMarquee />
        <BentoGrid />
        <Testimonials />
        <Pricing />
        <FinalCTA />
        <Footer />
      </main>
    </SmoothScroll>
  )
}
