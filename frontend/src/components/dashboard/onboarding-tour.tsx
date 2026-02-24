"use client"

import * as React from "react"
import { driver } from "driver.js"
import "driver.js/dist/driver.css"
import { usePathname, useRouter } from "next/navigation"
import { useUser } from "@clerk/nextjs"
import { api } from "@/lib/api"
import { useAuth } from "@clerk/nextjs"

export function OnboardingTour() {
  const pathname = usePathname()
  const router = useRouter()
  const { user, isLoaded } = useUser()
  const { getToken } = useAuth()
  const [hasStarted, setHasStarted] = React.useState(false)

  const startTour = React.useCallback(() => {
    const driverObj = driver({
      showProgress: true,
      animate: true,
      doneBtnText: 'Terminer',
      closeBtnText: 'Fermer',
      nextBtnText: 'Suivant',
      prevBtnText: 'Précédent',
      popoverClass: 'whappi-tour-popover',
      steps: [
        {
          element: '#nav--dashboard',
          popover: {
            title: 'Bienvenue sur Whappi !',
            description: 'Voici votre tableau de bord. C\'est ici que vous gérez vos sessions WhatsApp.',
            side: "right",
            align: 'start'
          }
        },
        {
          element: '#new-session-btn',
          popover: {
            title: 'Nouvelle Session',
            description: 'Commencez par créer une nouvelle session pour connecter votre compte WhatsApp.',
            side: "bottom",
            align: 'end'
          }
        },
        {
          element: '#connection-area',
          popover: {
            title: 'Connexion WhatsApp',
            description: 'Scannez le QR code ou utilisez un code d\'appairage pour lier votre téléphone.',
            side: "top",
            align: 'center'
          }
        },
        {
          element: '#nav--dashboard-ai',
          popover: {
            title: 'Assistant IA',
            description: 'Une fois connecté, configurez votre intelligence artificielle ici pour automatiser vos réponses.',
            side: "right",
            align: 'start'
          }
        },
        {
          element: '#nav--dashboard-profile',
          popover: {
            title: 'Paramètres',
            description: 'N\'oubliez pas de configurer votre fuseau horaire et les notifications sonores.',
            side: "right",
            align: 'start'
          }
        }
      ]
    });

    driverObj.drive();
  }, []);

  React.useEffect(() => {
    const checkTour = async () => {
      if (!isLoaded || !user || hasStarted || pathname !== '/dashboard') return

      try {
        const token = await getToken()
        const sessions = await api.sessions.list(token || undefined)

        // Only auto-start if user has no sessions and hasn't seen the tour yet
        const tourSeen = localStorage.getItem('whappi_tour_seen')
        if ((!sessions || sessions.length === 0) && !tourSeen) {
          setHasStarted(true)
          localStorage.setItem('whappi_tour_seen', 'true')
          // Small delay to ensure elements are rendered
          setTimeout(startTour, 1000)
        }
      } catch (e) {
        console.error("Tour check failed", e)
      }
    }

    checkTour()
  }, [isLoaded, user, pathname, getToken, hasStarted, startTour])

  // Expose a way to manually start the tour
  React.useEffect(() => {
    (window as any).startWhappiTour = startTour
    return () => { delete (window as any).startWhappiTour }
  }, [startTour])

  return null
}
