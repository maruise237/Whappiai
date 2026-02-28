"use client"

import { Navbar } from "@/components/landing/navbar"
import { Footer } from "@/components/landing/footer"
import { GuideHero } from "@/components/guides/GuideHero"
import { GetStarted } from "@/components/guides/GetStarted"
import { GuideCategories } from "@/components/guides/GuideCategories"

export default function GuidesPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <GuideHero />
      <GetStarted />
      <GuideCategories />
      <Footer />
    </div>
  )
}
