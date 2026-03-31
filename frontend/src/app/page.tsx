"use client"

import { SmoothScroll } from "@/components/landing/smooth-scroll"
import { Navbar } from "@/components/landing/navbar"
import { Hero } from "@/components/landing/hero"
import { LogoMarquee } from "@/components/landing/logo-marquee"
import { ValueProposition } from "@/components/landing/value-proposition"
import dynamic from 'next/dynamic'
import { useUser } from "@clerk/clerk-react"
import { useRouter } from "next/navigation"
import { useEffect } from "react"
import Head from "next/head"

const MainFeatures = dynamic(() => import('@/components/landing/main-features').then(mod => mod.MainFeatures), { ssr: true })
const Testimonials = dynamic(() => import('@/components/landing/testimonials').then(mod => mod.Testimonials), { ssr: true })
const Pricing = dynamic(() => import('@/components/landing/pricing').then(mod => mod.Pricing), { ssr: true })
const FAQ = dynamic(() => import('@/components/landing/faq').then(mod => mod.FAQ), { ssr: true })
const FinalCTA = dynamic(() => import('@/components/landing/final-cta').then(mod => mod.FinalCTA), { ssr: true })
const Footer = dynamic(() => import('@/components/landing/footer').then(mod => mod.Footer), { ssr: true })

export default function Home() {
  const { isSignedIn, isLoaded } = useUser()
  const router = useRouter()

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard")
    }
  }, [isLoaded, isSignedIn, router])

  if (!isLoaded || isSignedIn) {
    return <div className="min-h-screen bg-background" />
  }

  return (
    <>
      <Head>
        <title>Whappi | Automatisation WhatsApp & Modération IA</title>
        <meta name="description" content="Boostez l'engagement de votre communauté WhatsApp avec notre IA de support et nos outils de modération anti-spam. Essai gratuit." />
      </Head>
      <SmoothScroll>
        <main className="min-h-screen bg-background">
          <Navbar />
          <Hero />
          <LogoMarquee />
          <ValueProposition />
          <MainFeatures />
          <Testimonials />
          <Pricing />
          <FAQ />
          <FinalCTA />
          <Footer />
        </main>
      </SmoothScroll>
    </>
  )
}
