"use client"

import { useState, useRef, useEffect } from "react"
import { motion } from "framer-motion"
import { Menu, X, Sun, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useUser } from "@clerk/nextjs"

const navItems = [
  { label: "Fonctionnalités", href: "/#features" },
  { label: "Tarifs", href: "/#pricing" },
  { label: "Témoignages", href: "/#testimonials" },
  { label: "Documentation", href: "/docs" },
]

export function Navbar() {
  const { isSignedIn, isLoaded } = useUser()
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [isDark, setIsDark] = useState(true)
  const navRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches
    const isDarkTheme = savedTheme === "dark" || (!savedTheme && prefersDark)
    
    setIsDark(isDarkTheme)
    if (isDarkTheme) {
      document.documentElement.classList.add("dark")
    } else {
      document.documentElement.classList.remove("dark")
    }
  }, [])

  const toggleDarkMode = () => {
    const newIsDark = !isDark
    setIsDark(newIsDark)
    if (newIsDark) {
      document.documentElement.classList.add("dark")
      localStorage.setItem("theme", "dark")
    } else {
      document.documentElement.classList.remove("dark")
      localStorage.setItem("theme", "light")
    }
  }

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-5xl"
    >
      <nav
        ref={navRef}
        className="relative flex items-center justify-between px-4 py-3 rounded-full bg-background/40 backdrop-blur-md border border-border"
      >
        {/* Logo */}
        <a href="#" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-primary-foreground font-bold text-sm">W</span>
          </div>
          <span className="font-semibold text-foreground hidden sm:block">Whappi</span>
        </a>

        {/* Desktop Nav Items */}
        <div className="hidden md:flex items-center gap-1 relative">
          {navItems.map((item, index) => (
            <Link
              key={item.label}
              href={item.href}
              className="relative px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {hoveredIndex === index && (
                <motion.div
                  layoutId="navbar-hover"
                  className="absolute inset-0 bg-muted rounded-full"
                  initial={false}
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
              <span className="relative z-10">{item.label}</span>
            </Link>
          ))}
        </div>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={toggleDarkMode}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-muted" asChild>
            <Link href="/login">Connexion</Link>
          </Button>
          <Button size="sm" className="shimmer-btn bg-primary text-primary-foreground hover:bg-secondary rounded-full px-4" asChild>
            <Link href="/register">Essai Gratuit</Link>
          </Button>
        </div>

        {/* Mobile Menu Button */}
        <div className="md:hidden flex items-center gap-2">
          <button
            onClick={toggleDarkMode}
            className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted rounded-full transition-colors"
            aria-label="Toggle dark mode"
          >
            {isDark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            className="p-2 text-muted-foreground hover:text-foreground"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute top-full left-0 right-0 mt-2 p-4 rounded-2xl bg-background/95 backdrop-blur-md border border-border shadow-lg"
          >
            <div className="flex flex-col gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.label}
                  href={item.href}
                  className="px-4 py-3 text-sm text-muted-foreground hover:text-foreground hover:bg-muted rounded-lg transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {item.label}
                </Link>
              ))}
              <hr className="border-border my-2" />
              {isLoaded && isSignedIn ? (
                <Button variant="ghost" className="justify-start text-muted-foreground hover:text-foreground w-full" asChild>
                  <Link href="/dashboard">Dashboard</Link>
                </Button>
              ) : (
                <Button variant="ghost" className="justify-start text-muted-foreground hover:text-foreground w-full" asChild>
                  <Link href="/login">Connexion</Link>
                </Button>
              )}
              <Button className="shimmer-btn bg-primary text-primary-foreground hover:bg-secondary rounded-full w-full" asChild>
                <Link href="/register">Essai Gratuit</Link>
              </Button>
            </div>
          </motion.div>
        )}
      </nav>
    </motion.header>
  )
}
